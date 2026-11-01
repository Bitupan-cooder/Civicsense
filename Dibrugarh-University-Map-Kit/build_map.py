"""Reproducible vector campus preview. Never changes the event's production map.

Coordinates are UTM 46N metres; source geometries and provenance are retained.
The historical audit outline is approximate, not an authoritative cadastral boundary.
"""
import base64
import collections
import csv
import html
import json
import math
from pathlib import Path
import random
import xml.etree.ElementTree as ET
import cv2
import numpy as np
from pyproj import Transformer
from shapely.geometry import Point, Polygon, LineString, shape, mapping, box
from shapely.ops import transform, unary_union
from review_places import apply_review

ROOT = Path(__file__).parent
DATA = ROOT/'data'
FWD = Transformer.from_crs(4326, 32646, always_xy=True).transform
BACK = Transformer.from_crs(32646, 4326, always_xy=True).transform
AUDIT_URL = 'https://oldweb.dibru.ac.in/wp-content/uploads/2021/11/Green-and-Carbon-Audit_BP2.pdf'
# Digitized from the coordinate-labelled land-use figure, printed p30/PDF p32.
# Pixel-to-lon/lat controls: x170=94.8864, x978=94.9024;
# y168=27.453, y630=27.444. Expect tens of metres of uncertainty.
AUDIT_OUTLINE = [(40,197),(110,174),(137,184),(190,128),(257,174),(310,217),
 (432,178),(438,191),(459,186),(468,204),(516,190),(512,172),(540,160),
 (610,146),(678,141),(753,116),(780,111),(787,105),(833,95),(847,97),
 (892,94),(965,135),(981,164),(1017,218),(1026,242),(1049,285),
 (1060,338),(1059,407),(1054,458),(1030,490),(976,515),(884,553),
 (794,576),(711,590),(594,605),(576,568),(553,533),(532,507),(515,486),
 (516,506),(499,511),(490,501),(469,505),(461,488),(446,491),(444,511),
 (431,517),(410,517),(406,506),(366,506),(354,498),(339,502),(317,498),
 (299,479),(292,463),(267,461),(263,444),(244,442),(237,437),(199,440),
 (164,414),(139,414),(142,478),(115,478),(118,443),(118,395),(110,370),
 (100,355),(57,353),(53,348),(54,310),(49,287),(52,273),(40,197)]

def audit_ll(x,y): return (94.8864+(x-170)*.016/808, 27.453-(y-168)*.009/462)
def tags(e): return {t.attrib['k']:t.attrib['v'] for t in e.findall('tag')}
def valid(g): return g if g.is_valid else g.buffer(0)
def parts(g):
    if g.is_empty: return []
    if g.geom_type in ('MultiPolygon','MultiLineString','GeometryCollection'):
        return [p for child in g.geoms for p in parts(child)]
    return [g]

def main():
    tree=ET.parse(DATA/'dibrugarh-source.osm').getroot()
    nodes={n.attrib['id']:(float(n.attrib['lon']),float(n.attrib['lat'])) for n in tree.findall('node')}
    way=next(w for w in tree.findall('way') if w.attrib['id']=='1370897159')
    osm=transform(FWD,Polygon([nodes[n.attrib['ref']] for n in way.findall('nd')]))
    audit=transform(FWD,Polygon([audit_ll(x,y) for x,y in AUDIT_OUTLINE]))
    campus=unary_union([valid(osm),valid(audit)])
    buffer=campus.buffer(500,quad_segs=256)
    extent=box(*buffer.buffer(70).bounds)
    x0,y0,x1,y1=extent.bounds
    def local(g): return transform(lambda x,y: (np.asarray(x)-x0,y1-np.asarray(y)),g)
    def feature(g,id,kind,name='',source='OpenStreetMap',**extra):
        return {'id':str(id),'kind':kind,'name':name,'source':source,'geometry':mapping(local(g)),**extra}
    roads=[]; areas=[]; buildings=[]; places=[]
    named_ids=set()
    for w in tree.findall('way'):
        t=tags(w); coords=[nodes[n.attrib['ref']] for n in w.findall('nd') if n.attrib['ref'] in nodes]
        if len(coords)<2: continue
        closed=coords[0]==coords[-1] and len(coords)>3
        geo=transform(FWD,valid(Polygon(coords)) if closed and 'highway' not in t else LineString(coords))
        if not geo.intersects(buffer): continue
        id='osm-way-'+w.attrib['id']
        if 'highway' in t:
            roads.append(feature(geo.intersection(buffer),id,'road',t.get('name',t.get('ref','')),highway=t['highway'],access=t.get('access','unspecified'),surface=t.get('surface','unknown')))
        elif 'railway' in t:
            roads.append(feature(geo.intersection(buffer),id,'rail',t.get('name',''),highway='railway',access='no'))
        elif t.get('building'):
            buildings.append(feature(geo,id,'building',t.get('name','')))
        elif w is not way and closed:
            kind='water' if t.get('natural')=='water' or t.get('water') else 'forest' if t.get('natural') in ['wood','scrub'] or t.get('landuse')=='forest' else 'field' if t.get('landuse') in ['farmland','orchard','meadow','grass'] else 'pitch' if t.get('leisure') in ['pitch','track'] else 'land'
            areas.append(feature(geo.intersection(buffer),id,kind,t.get('name','')))
        if t.get('name') and w is not way and 'highway' not in t and 'railway' not in t:
            point=geo.representative_point()
            if buffer.covers(point):
                places.append(feature(point,id+'-label','place',t['name'],category=t.get('amenity',t.get('building',t.get('leisure','landmark'))),status='Source location; not field verified'))
                named_ids.add(id)
    for n in tree.findall('node'):
        t=tags(n)
        if not t.get('name'): continue
        geo=transform(FWD,Point(nodes[n.attrib['id']]))
        if buffer.covers(geo): places.append(feature(geo,'osm-node-'+n.attrib['id'],'place',t['name'],category=t.get('amenity','landmark'),status='Source location; not field verified'))
    # Overture fills the unrecorded building footprints; prefer OSM where they overlap.
    osm_building_union=unary_union([shape(f['geometry']) for f in buildings])
    overture_path=DATA/'overture-buildings.geojson'
    if overture_path.exists() and overture_path.stat().st_size>100:
        for f in json.loads(overture_path.read_text('utf-8'))['features']:
            geo=transform(FWD,valid(shape(f['geometry'])))
            if not geo.intersects(buffer): continue
            glocal=local(geo)
            if not osm_building_union.is_empty and glocal.intersection(osm_building_union).area > glocal.area*.45: continue
            p=f['properties']; buildings.append(feature(geo,f.get('id',p.get('id')),'building',(p.get('names') or {}).get('primary',''),'Overture Maps',providers=sorted({s.get('dataset','') for s in (p.get('sources') or [])})))
    for file in ['overture-places-retry.geojson','overture-places.geojson']:
        path=DATA/file
        if not path.exists() or path.stat().st_size<100: continue
        try: collection=json.loads(path.read_text('utf-8'))['features']
        except json.JSONDecodeError: continue
        for f in collection:
            p=f['properties']; geo=transform(FWD,shape(f['geometry'])); name=(p.get('names') or {}).get('primary','')
            if not name or not buffer.covers(geo): continue
            # Preserve source names, including alternate duplicate listings, for review.
            if any(q['name'].casefold()==name.casefold() and shape(q['geometry']).distance(local(geo))<50 for q in places): continue
            places.append(feature(geo,f.get('id',p.get('id')),'place',name,'Overture Maps',category=(p.get('taxonomy') or {}).get('primary') or (p.get('categories') or {}).get('primary') or p.get('basic_category','place'),confidence=p.get('confidence'),status=p.get('operating_status') or 'Not field verified'))
        break
    # Public map names are reviewed independently of source road/building geometry.
    places,place_review=apply_review(places,feature,FWD,local,buffer,campus)
    # Historical land cover is a separate explicitly dated layer, never invented terrain.
    im=cv2.imread(str(DATA/'audit-map-original.jpg'))
    hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV)
    historical=[]
    for kind,low,high in [('forest',(30,70,40),(95,255,210)),('field',(10,75,110),(29,240,230)),('water',(85,90,80),(115,255,255)),('pitch',(23,120,160),(37,255,255))]:
        mask=cv2.inRange(hsv,np.array(low,dtype=np.uint8),np.array(high,dtype=np.uint8))
        mask[610:,:]=0; mask[:85,:]=0; mask[:,:35]=0; mask[:,1065:]=0
        contours,_=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
        for i,c in enumerate(contours):
            if cv2.contourArea(c)<18: continue
            pts=cv2.approxPolyDP(c,1,True).reshape(-1,2)
            if len(pts)<3: continue
            g=transform(FWD,valid(Polygon([audit_ll(float(x),float(y)) for x,y in pts]))).intersection(audit)
            if g.is_empty: continue
            historical.append(feature(g,f'audit-{kind}-{i}',kind,'','University audit 2020',approximate=True))
    # Vector tree symbols are decorative; their locations are sampled only inside mapped vegetation.
    forest=unary_union([shape(f['geometry']) for f in historical+areas if f['kind']=='forest'])
    road_clearance=unary_union([shape(f['geometry']).buffer(8) for f in roads])
    building_clearance=unary_union([shape(f['geometry']).buffer(3) for f in buildings])
    forest=forest.difference(road_clearance).difference(building_clearance)
    rng=random.Random(6465); symbols=[]
    if not forest.is_empty:
        bounds=forest.bounds
        for y in np.arange(bounds[1],bounds[3],17):
            for x in np.arange(bounds[0],bounds[2],17):
                px,py=float(x+rng.uniform(-5,5)),float(y+rng.uniform(-5,5))
                if forest.covers(Point(px,py)):
                    symbols.append([round(px,2),round(py,2),round(rng.uniform(15,23),2)])
    # Flags mark review needs rather than silently treating crowdsourced data as surveyed.
    local_campus=local(campus)
    places.sort(key=lambda p:(0 if local_campus.covers(shape(p['geometry'])) else 1,p['name'].casefold()))
    for i,p in enumerate(places,1): p['index']=i
    for p in places:
        point=shape(p['geometry']); p['campus']=local(campus).covers(point)
        p['lon'],p['lat']=BACK(point.x+x0,y1-point.y)
    geojson={'type':'FeatureCollection','features':[]}
    all_features=roads+areas+buildings+places+historical
    for f in all_features:
        localgeo=shape(f['geometry'])
        utm=transform(lambda x,y:(np.asarray(x)+x0,y1-np.asarray(y)),localgeo)
        geojson['features'].append({'type':'Feature','geometry':mapping(transform(BACK,utm)),'properties':{k:v for k,v in f.items() if k!='geometry'}})
    for g,id,name in [(osm,'osm-campus-boundary','OpenStreetMap university outline'),(audit,'audit-campus-outline','Approximate 2020 campus extent'),(buffer,'buffer-500m','500 m buffer of combined review outlines')]:
        geojson['features'].append({'type':'Feature','geometry':mapping(transform(BACK,g)),'properties':{'id':id,'name':name,'approximate':True}})
    (ROOT/'campus-data.geojson').write_text(json.dumps(geojson,ensure_ascii=False,separators=(',',':')),'utf-8')
    summary={'retrieved':'2026-10-17','overtureRelease':'2026-09-23.1','crs':'EPSG:32646','width':round(x1-x0,2),'height':round(y1-y0,2),'utmOrigin':[x0,y1],'bufferMetres':500,'roads':sum(r['kind']=='road' for r in roads),'roadVertices':sum(len(p.coords) for r in roads for p in parts(shape(r['geometry'])) if p.geom_type=='LineString'),'roadClasses':dict(collections.Counter(r['highway'] for r in roads if r['kind']=='road')),'buildings':len(buildings),'places':len(places),'campusPlaces':sum(p['campus'] for p in places),'approximateCampusAreaM2':round(campus.area),'boundsLonLat':list(transform(BACK,extent).bounds),'limitations':['The combined boundary is a review envelope, not a surveyed legal boundary.','Western outline and land cover are approximately georeferenced from the 2020 university audit.','All available source roads are retained, including unnamed roads. Source completeness and current access are not guaranteed.','Overture footprints may be machine detected. Source places may be duplicated or displaced.','Google Maps was not used as an exhaustive label or geometry database.','Decorative tree symbols do not locate individual real trees.']}
    data={'meta':summary,'roads':roads,'areas':areas,'buildings':buildings,'places':places,'historical':historical,'trees':symbols,'boundary':mapping(local(campus)),'osmBoundary':mapping(local(osm)),'auditBoundary':mapping(local(audit)),'buffer':mapping(local(buffer))}
    summary['placeReview']=place_review['reviewed_on'];summary['reviewedPlaceReferences']=place_review['reviewed_references']
    summary['limitations']=[s for s in summary['limitations'] if 'Google Maps' not in s]+place_review['limitations']
    (ROOT/'map-data.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),'utf-8')
    (ROOT/'coverage-report.json').write_text(json.dumps(summary,indent=2),'utf-8')
    with (ROOT/'place-index.csv').open('w',encoding='utf-8-sig',newline='') as out:
        writer=csv.DictWriter(out,fieldnames=['index','name','category','source','lat','lon','campus','status']);writer.writeheader()
        for p in places: writer.writerow({k:p.get(k,'') for k in writer.fieldnames})
    print(json.dumps(summary,indent=2))

if __name__=='__main__': main()
