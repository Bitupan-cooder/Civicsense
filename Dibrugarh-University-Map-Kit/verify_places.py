"""Check reviewed provenance, excluded units and lossless zoom grouping."""
import json, subprocess
from pathlib import Path
from pyproj import Geod
from review_places import MERGE, EXCLUDE

ROOT=Path(__file__).parent
d=json.loads((ROOT/'map-data.json').read_text('utf-8'))
review=json.loads((ROOT/'data/reviewed-places.json').read_text('utf-8'))
places=d['places']; rows={r[3]:r for r in review['rows']}
assert len(rows)==len(review['rows'])
mapped={p['id'].removeprefix('review-'):p for p in places}
assert set(mapped)==set(rows)-set(MERGE)-set(EXCLUDE)
assert len({p['id'] for p in places})==len(places)
assert all(p['reviewed_on']==review['reviewed_on'] and not p['field_verified'] for p in places)
assert all(p['source_url']=='https://www.google.com/maps?cid='+cid for cid,p in mapped.items())
for cid,p in mapped.items():
    _,lat,lon,_=rows[cid]
    assert abs(p['lat']-lat)<1e-9 and abs(p['lon']-lon)<1e-9
    assert len(p['references'])==1+sum(v==cid for v in MERGE.values())
names='\n'.join(p['name']+' '+str(p['aliases']) for p in places).casefold()
assert 'centre for studies in languages' not in names
assert 'physical education' not in names
chem=mapped['5700347662257954613'];cse=mapped['6284986668016053283']
hostel=next(p for p in places if 'Aideu' in p['name'])
assert abs(chem['lat']-27.448067)<1e-9 and abs(chem['lon']-94.8953513)<1e-9
assert cse['lon']<94.893 and cse['lat']>27.451
separation=Geod(ellps='WGS84').inv(chem['lon'],chem['lat'],hostel['lon'],hostel['lat'])[2]
assert separation>400
assert any('Computer Science and Applications' in p['name'] for p in places)
assert all('Appled Geography' not in p['name'] for p in places)
asset=ROOT/'android/app/src/main/assets/campus_atlas.json'
assert asset.read_bytes()==(ROOT/'map-data.json').read_bytes()
js="""
const assert=require('node:assert/strict'),L=require('./map-labels.js');let input='';
process.stdin.on('data',x=>input+=x);process.stdin.on('end',()=>{
 const places=JSON.parse(input),counts=[];
 for(const scale of [.12,.4,1,3,10,80]){
  const points=places.map(p=>({id:p.id,x:p.geometry.coordinates[0]*scale,y:p.geometry.coordinates[1]*scale,priority:p.priority}));
  const groups=L.groups(points,30),members=groups.flatMap(g=>g.members);
  assert.equal(members.length,places.length);assert.equal(new Set(members.map(p=>p.id)).size,places.length);
  for(const g of groups){assert.ok(g.members.includes(g.anchor));for(const p of g.members)assert.ok(Math.hypot(p.x-g.anchor.x,p.y-g.anchor.y)<=30);}
  assert.deepEqual(L.groups([...points].reverse(),30),groups);counts.push({scale,groups:groups.length,representedPlaces:members.length});
 }
 const same=[{id:'a',x:5,y:8},{id:'b',x:5,y:8}];assert.equal(L.groups(same,30)[0].members.length,2);
 const long='Dr. Bhupen Hazarika Centre for Studies in Performing Arts';
 assert.equal(L.wrap(long,s=>s.length*8,160).join(' '),long);
 assert.throws(()=>L.groups([],0));assert.equal(L.groups([{id:'bad',x:NaN,y:8}],30).length,0);
 console.log(JSON.stringify({zoomGrouping:counts,fullNameWrapping:true}));
});
"""
r=subprocess.run(['node','-e',js],input=json.dumps(places),text=True,cwd=ROOT,capture_output=True,check=True)
report=dict(reviewedReferences=len(rows),mappedDestinations=len(places),campusDestinations=sum(p['campus'] for p in places),
    duplicateListingsMerged=len(MERGE),conflictingOrGenericListingsExcluded=len(EXCLUDE),
    chemistryToAideuHostelMetres=round(separation,2),excludedUnits=review['user_excluded'],
    originalRoadWaysPreserved=len(d['roads']),originalRoofsPreserved=len(d['buildings']),
    androidAssetMatches=True,**json.loads(r.stdout))
(ROOT/'place-verification.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n','utf-8')
print(json.dumps(report,indent=2))
