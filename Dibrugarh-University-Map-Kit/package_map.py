"""Package a completely offline interactive viewer and scalable map artwork."""
import base64
import html
import json
import math
import textwrap
from pathlib import Path
import pymupdf
from PIL import Image
from shapely.geometry import shape

ROOT=Path(__file__).parent
esc=html.escape

def path(g):
    def ring(coords,closed):
        return 'M'+' L'.join(f'{x:.2f},{y:.2f}' for x,y in coords)+('Z' if closed else '')
    t=g['type']; c=g.get('coordinates',[])
    if t=='Polygon': return ' '.join(ring(r,True) for r in c)
    if t=='MultiPolygon': return ' '.join(ring(r,True) for p in c for r in p)
    if t=='LineString': return ring(c,False)
    if t=='MultiLineString': return ' '.join(ring(r,False) for r in c)
    if t=='GeometryCollection': return ' '.join(path(x) for x in g['geometries'])
    return ''

def main():
    d=json.loads((ROOT/'map-data.json').read_text('utf-8'))
    # Packaging resize only; the original generated artwork is preserved unchanged.
    # A 128 px pixel sprite prevents thousands of repeated full-size image decodes.
    Image.open(ROOT/'assets/tree-canopy.png').resize((128,128),Image.Resampling.NEAREST).save(ROOT/'assets/tree-canopy-128.png',optimize=True)
    tree=base64.b64encode((ROOT/'assets/tree-canopy-128.png').read_bytes()).decode()
    font=base64.b64encode((ROOT/'assets/PressStart2P-Regular.ttf').read_bytes()).decode()
    template=(ROOT/'viewer.template.html').read_text('utf-8')
    # Escape the HTML script-closing delimiter without changing user-visible names.
    payload=json.dumps(d,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
    viewer=template.replace('__MAP_DATA__',payload).replace('__TREE__',tree).replace('__FONT__',font).replace('__PROJ4__',(ROOT/'assets/proj4.js').read_text('utf-8')).replace('__GPS_MODULE__',(ROOT/'gps-projection.js').read_text('utf-8'))
    viewer=viewer.replace('__LABEL_MODULE__',(ROOT/'map-labels.js').read_text('utf-8'))
    (ROOT/'index.html').write_text(viewer,'utf-8')
    w,h=d['meta']['width'],d['meta']['height']
    top=150; bottom=135
    svg=[f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="6400" height="{round((h+top+bottom)/w*6400)}" viewBox="0 {-top} {w} {h+top+bottom}" preserveAspectRatio="none">',
         '<title>Dibrugarh University — pixel atlas, campus and 500 metre surroundings</title>',
         '<desc>Geographic review preview. All downloaded OpenStreetMap roads in the buffer are retained. Campus extent is approximate and includes a georeferenced 2020 audit outline; not a cadastral survey. Tree symbols are decorative.</desc>',
         '<defs><pattern id="grass" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#dce6b8"/><path d="M3 5h2v2H3z M11 12h1v2h-1z" fill="#c7d7a3"/></pattern>',
         f'<image id="tree" width="1" height="1" xlink:href="data:image/png;base64,{tree}"/>',
         '<pattern id="water" width="24" height="19" patternUnits="userSpaceOnUse"><rect width="24" height="19" fill="#72bdca"/><path d="M3 6h6 M14 14h5" stroke="#b2e5df" stroke-width="1.2"/></pattern></defs>',
         f'<rect x="0" y="{-top}" width="{w}" height="{h+top+bottom}" fill="#f7f3df"/>',
         f'<text x="40" y="-104" fill="#456f50" font-family="monospace" font-size="13" letter-spacing="4">CAMPUS HUNT / WORLD ATLAS 01</text>',
         f'<text x="40" y="-52" fill="#234b37" font-family="sans-serif" font-size="39" font-weight="bold">DIBRUGARH UNIVERSITY</text>',
         f'<text x="{w-40}" y="-95" text-anchor="end" fill="#456f50" font-family="sans-serif" font-size="14">CAMPUS + 500 METRE SURROUNDINGS</text>',
         f'<text x="{w-40}" y="-63" text-anchor="end" fill="#956447" font-family="sans-serif" font-size="12">APPROXIMATE BOUNDARY · PLACE REVIEW 18 OCT 2026</text>',
         f'<rect width="{w}" height="{h}" fill="#e0e5c4"/>',
         f'<path d="{path(d["buffer"])}" fill="#d1ddb0"/>',
         f'<path d="{path(d["boundary"])}" fill="#dce6b8"/>']
    palette={'forest':'#79a16a','field':'#d8ca86','water':'#72bdca','pitch':'#b5cd81','land':'#d2dcb9'}
    for f in d['areas']+d['historical']:
        svg.append(f'<path d="{path(f["geometry"])}" fill="{palette.get(f["kind"],"#d2dcb9")}" fill-rule="evenodd"/>')
    svg.append('<g style="image-rendering:pixelated">')
    for x,y,s in d['trees']: svg.append(f'<use xlink:href="#tree" transform="translate({x-s/2:.2f},{y-s/2:.2f}) scale({s})"/>')
    svg.append('</g><g fill="none" stroke-linejoin="round" stroke-linecap="round">')
    for f in d['roads']:
        width=13 if f['highway']=='primary' else 3 if f['highway']=='track' else 4 if f['highway']=='service' else 6
        pp=path(f['geometry']); svg.append(f'<path d="{pp}" stroke="#9c9e79" stroke-width="{width+2.5}"/>')
        dashed=' stroke-dasharray="4 3"' if f['highway']=='track' else ''
        svg.append(f'<path d="{pp}" stroke="#f7efd4" stroke-width="{width}"{dashed}/>')
        if f['highway']=='primary': svg.append(f'<path d="{pp}" stroke="#cdbd8c" stroke-width=".8" stroke-dasharray="7 5"/>')
    svg.append('</g><g fill-rule="evenodd">')
    for f in d['buildings']:
        pp=path(f['geometry']); fill='#cf8c67' if f['source']=='OpenStreetMap' else '#e0aa83'
        svg.append(f'<path d="{pp}" transform="translate(1.8 2.4)" fill="#748062" fill-opacity=".4"/><path d="{pp}" fill="{fill}" stroke="#956548" stroke-width=".55"/>')
    svg.append('</g>')
    svg.append(f'<path d="{path(d["buffer"])}" fill="none" stroke="#438eab" stroke-width="2.4" stroke-dasharray="9 6"/>')
    svg.append(f'<path d="{path(d["boundary"])}" fill="none" stroke="#d66643" stroke-width="3" stroke-dasharray="9 5"/>')
    # Stable label placement with leader lines; every retained source name appears.
    boxes=[]; placements=[]
    for p in d['places']:
        x,y=p['geometry']['coordinates']; name=p['name']
        # Retain complete original Unicode names in data/viewer. English alias on the
        # static sheet avoids unsupported glyphs in standalone SVG rasterizers.
        if any(ord(ch)>127 for ch in name):
            ascii_name=''.join(ch if ord(ch)<128 else ' ' for ch in name).strip()
            if ascii_name: name=' '.join(ascii_name.split())
        lines=textwrap.wrap(str(p['index'])+' · '+name,width=35,break_long_words=False)
        fs=9.3; ww=max(len(s) for s in lines)*fs*.51+12; hh=len(lines)*12+8
        candidates=[]
        for radius in [12,28,48,72,105,140,180,230,280]:
            for angle in [0,-math.pi/2,math.pi/2,math.pi,math.pi/4,-math.pi/4,3*math.pi/4,-3*math.pi/4]:
                bx=x+math.cos(angle)*radius;by=y+math.sin(angle)*radius-hh/2
                if math.cos(angle)<-.1: bx-=ww
                if abs(math.cos(angle))<.1: bx-=ww/2
                if bx<6 or by<6 or bx+ww>w-6 or by+hh>h-6: continue
                if any(bx<a[0]+a[2]+4 and bx+ww+4>a[0] and by<a[1]+a[3]+4 and by+hh+4>a[1] for a in boxes): continue
                candidates.append((radius,bx,by));break
            if candidates:break
        if not candidates: raise RuntimeError('No clear static label placement for '+p['name'])
        _,bx,by=candidates[0];boxes.append((bx,by,ww,hh));placements.append({'index':p['index'],'box':[bx,by,ww,hh]})
        nx=max(bx,min(bx+ww,x));ny=max(by,min(by+hh,y))
        svg.append(f'<path d="M{x:.2f},{y:.2f} L{nx:.2f},{ny:.2f}" fill="none" stroke="#496d4c" stroke-width=".7"/><rect x="{x-2:.2f}" y="{y-2:.2f}" width="4" height="4" fill="#285a3d"/>')
        svg.append(f'<rect x="{bx:.2f}" y="{by:.2f}" width="{ww:.2f}" height="{hh:.2f}" rx="3" fill="#fffef0" fill-opacity=".94" stroke="#c6d1ad" stroke-width=".5"/>')
        for i,line in enumerate(lines):svg.append(f'<text x="{bx+6:.2f}" y="{by+12+i*12:.2f}" font-family="sans-serif" font-weight="bold" font-size="{fs}" fill="#264d38">{esc(line)}</text>')
    # Compass / scale use actual metric projection, independent of source imagery scale.
    svg += [f'<g transform="translate({w-80},70)"><path d="M0,-28 L-11,8 L0,1 L11,8Z" fill="#2b5139"/><text y="-39" text-anchor="middle" font-size="14" font-family="monospace" fill="#2b5139">N</text></g>',
      f'<path d="M40,{h+35}h200m-200,-6v12m100,-12v12m100,-12v12" stroke="#244d38" stroke-width="2"/>',
      f'<text x="40" y="{h+62}" font-family="sans-serif" font-size="12" fill="#244d38">0</text><text x="240" y="{h+62}" text-anchor="end" font-family="sans-serif" font-size="12" fill="#244d38">200 metres</text>',
      f'<path d="M350,{h+35}h45" stroke="#d66643" stroke-width="3" stroke-dasharray="8 5"/><text x="410" y="{h+40}" font-family="sans-serif" font-size="13" fill="#3c6047">Approximate campus extent</text>',
      f'<path d="M760,{h+35}h45" stroke="#438eab" stroke-width="3" stroke-dasharray="8 5"/><text x="820" y="{h+40}" font-family="sans-serif" font-size="13" fill="#3c6047">500 m surrounding buffer</text>',
      f'<text x="{w-40}" y="{h+40}" text-anchor="end" font-family="sans-serif" font-size="13" fill="#3c6047">{d["meta"]["roads"]} source road ways · {d["meta"]["buildings"]:,} building footprints · {d["meta"]["places"]} source names</text>',
      f'<text x="40" y="{h+96}" font-family="sans-serif" font-size="11" fill="#63735c">© OpenStreetMap contributors (ODbL) · Overture Maps Foundation · Google Open Buildings / Microsoft · DU Green and Carbon Audit 2020, p30</text>',
      f'<text x="40" y="{h+117}" font-family="sans-serif" font-size="10" fill="#77785e">Review draft: source labels may be misplaced or duplicated; historical terrain and boundary need field verification. Decorative trees do not locate real trees. Not a complete Google Maps inventory.</text></svg>']
    vector=''.join(svg)
    (ROOT/'Dibrugarh-University-Pixel-Map.svg').write_text(vector,'utf-8')
    (ROOT/'label-placement.json').write_text(json.dumps(placements),'utf-8')
    doc=pymupdf.open(stream=vector.encode('utf-8'),filetype='svg')
    page=doc[0]; full=page.get_pixmap(matrix=pymupdf.Matrix(6400/page.rect.width,6400/page.rect.width),alpha=False)
    full.save(str(ROOT/'Dibrugarh-University-Pixel-Map.png'))
    # PNG includes the title above the map. World-file origin accounts for that
    # header and for pixel centres, so GIS import has no header-height offset.
    mx=w/full.width; my=(h+top+bottom)/full.height
    origin_x,origin_y=d['meta']['utmOrigin']
    (ROOT/'Dibrugarh-University-Pixel-Map.pgw').write_text('\n'.join(str(v) for v in [mx,0,0,-my,origin_x+mx/2,origin_y+top-my/2])+'\n','ascii')
    from pyproj import CRS
    (ROOT/'Dibrugarh-University-Pixel-Map.prj').write_text(CRS.from_epsg(32646).to_wkt(version='WKT1_GDAL'),'utf-8')
    page.get_pixmap(matrix=pymupdf.Matrix(2200/page.rect.width,2200/page.rect.width),alpha=False).save(str(ROOT/'Map-overview.png'))
    # A close-up is useful for judging road/building clarity at a practical phone zoom.
    b=shape(d['osmBoundary']).bounds
    # SVG viewport origin includes the header; use page coordinates rather than pretending raw metres are pixels.
    sx=page.rect.width/w
    clip=pymupdf.Rect((b[0]-50)*sx,(b[1]+top-50)*sx,(b[2]+50)*sx,(b[3]+top+50)*sx)
    page.get_pixmap(matrix=pymupdf.Matrix(2200/clip.width,2200/clip.width),clip=clip,alpha=False).save(str(ROOT/'Campus-detail.png'))
    print(json.dumps({'viewerBytes':(ROOT/'index.html').stat().st_size,'vectorBytes':(ROOT/'Dibrugarh-University-Pixel-Map.svg').stat().st_size,'pngSize':[full.width,full.height],'labelsPlaced':len(placements)}))

if __name__=='__main__': main()
