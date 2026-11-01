"""Independent PROJ vs browser Proj4js validation and coverage invariants."""
import json
import math
import subprocess
from pathlib import Path
from pyproj import Transformer
from shapely.geometry import shape, Point
from PIL import Image

ROOT=Path(__file__).parent
d=json.loads((ROOT/'map-data.json').read_text('utf-8'))
meta=d['meta']; fwd=Transformer.from_crs(4326,32646,always_xy=True)
west,south,east,north=meta['boundsLonLat']; samples=[]
for i in range(21):
    for j in range(21):
        lon=west+(east-west)*i/20; lat=south+(north-south)*j/20
        e,n=fwd.transform(lon,lat)
        samples.append({'lat':lat,'lon':lon,'x':e-meta['utmOrigin'][0],'y':meta['utmOrigin'][1]-n})
for p in d['places']:
    samples.append({'lat':p['lat'],'lon':p['lon'],'x':p['geometry']['coordinates'][0],'y':p['geometry']['coordinates'][1]})
js="""
const G=require('./gps-projection.js');let input='';process.stdin.on('data',x=>input+=x);process.stdin.on('end',()=>{
 const {meta,samples}=JSON.parse(input);let maxMetres=0,maxDegrees=0;
 for(const s of samples){const p=G.project(s.lat,s.lon,meta),q=G.unproject(p.x,p.y,meta);maxMetres=Math.max(maxMetres,Math.hypot(p.x-s.x,p.y-s.y));maxDegrees=Math.max(maxDegrees,Math.abs(q.lat-s.lat),Math.abs(q.lon-s.lon));}
 const now=1000000,base={lat:27.45,lon:94.9,accuracy:8,timestamp:now};
 const checks=[G.fixStatus(base,now)==='fresh',G.fixStatus({...base,accuracy:80},now)==='weak',G.fixStatus({...base,timestamp:now-15001},now)==='stale',G.fixStatus({...base,accuracy:-1},now)==='invalid',G.fixStatus({...base,timestamp:now+6000},now)==='invalid',G.inExtent({x:0,y:0},meta),!G.inExtent({x:-1,y:0},meta),!G.inExtent({x:meta.width+1,y:20},meta)];
 let invalidRejected=0;for(const [lat,lon]of [[NaN,94],[94.9,27.45],[27,Infinity],[27,-74]])try{G.project(lat,lon,meta)}catch{invalidRejected++}
 if(checks.some(v=>!v)||invalidRejected!==4||maxMetres>.01||maxDegrees>1e-8)throw Error('Projection validation failed');
 console.log(JSON.stringify({points:samples.length,maxMetres,maxDegrees,fixChecks:checks.length,invalidCoordinatesRejected:invalidRejected}));
});
"""
r=subprocess.run(['node','-e',js],input=json.dumps({'meta':meta,'samples':samples}),text=True,cwd=ROOT,capture_output=True,check=True)
report=json.loads(r.stdout)
boundary=shape(d['boundary']); buffer=shape(d['buffer'])
assert boundary.is_valid and buffer.is_valid
assert buffer.covers(boundary)
distances=[Point(p).distance(boundary.boundary) for p in buffer.exterior.coords]
assert max(abs(x-500) for x in distances)<.02
assert len(d['roads'])==meta['roads']
assert all(shape(r['geometry']).is_valid and not shape(r['geometry']).is_empty for r in d['roads'])
assert len({r['id'] for r in d['roads']})==len(d['roads'])
assert len(d['buildings'])==meta['buildings']
assert len(d['places'])==meta['places']
labels=json.loads((ROOT/'label-placement.json').read_text('utf-8'))
assert {p['index'] for p in labels}=={p['index'] for p in d['places']}
for i,a in enumerate(labels):
    ax,ay,aw,ah=a['box']
    for b in labels[i+1:]:
        bx,by,bw,bh=b['box']
        assert not (ax<bx+bw and ax+aw>bx and ay<by+bh and ay+ah>by)
report['bufferMaxVertexErrorMetres']=max(abs(x-500) for x in distances)
report['allRoadsValid']=True;report['staticLabelsWithoutOverlap']=len(labels)
png=Image.open(ROOT/'Dibrugarh-University-Pixel-Map.png')
a,rot_y,rot_x,e,c,f=[float(v) for v in (ROOT/'Dibrugarh-University-Pixel-Map.pgw').read_text().splitlines()]
assert rot_y==rot_x==0 and a>0 and e<0
assert abs((c-a/2)-meta['utmOrigin'][0])<1e-8
assert abs((f-e/2)-(meta['utmOrigin'][1]+150))<1e-8
assert abs(a*png.width-meta['width'])<1e-8
assert abs(-e*png.height-(meta['height']+285))<1e-8
report['pngGeoreferencingIncludesHeader']=True
report['caveat']='Numerical projection validation only; not a field survey or GPS receiver accuracy claim.'
(ROOT/'verification.json').write_text(json.dumps(report,indent=2),'utf-8')
print(json.dumps(report,indent=2))
