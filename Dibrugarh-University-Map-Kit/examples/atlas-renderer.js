/* Geographic vectors shared with Android. No external tiles or map keys. */
'use strict';
window.HuntAtlas=(()=>{
 const base=new URL('../',document.currentScript.src);let cache;
 function path(g){const p=new Path2D();function line(c,closed){c.forEach((v,i)=>i?p.lineTo(v[0],v[1]):p.moveTo(v[0],v[1]));if(closed)p.closePath();}
  if(g.type==='Polygon')g.coordinates.forEach(c=>line(c,true));else if(g.type==='MultiPolygon')g.coordinates.forEach(a=>a.forEach(c=>line(c,true)));
  else if(g.type==='LineString')line(g.coordinates,false);else if(g.type==='MultiLineString')g.coordinates.forEach(c=>line(c,false));return p;}
 async function load(){return cache??=(async()=>{const r=await fetch(new URL('map-data.json',base));if(!r.ok)throw Error('Campus atlas could not load (HTTP '+r.status+').');const d=await r.json();
  const characters=new Image();characters.src=new URL('elements/team-characters.webp',base);
  return {d,characters,roads:d.roads.map(p=>({p:path(p.geometry),kind:p.highway})),roofs:d.buildings.map(p=>path(p.geometry)),boundary:path(d.boundary)};})().catch(e=>{cache=null;throw e;});}
 class Map {
  constructor(canvas,source,onTap){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.source=source;this.meta=source.d.meta;this.x=this.meta.width/2;this.y=this.meta.height/2;this.z=1;this.teams=[];this.checkpoints=[];this.onTap=onTap;this.pointers=new globalThis.Map();this.hits=[];
   source.characters.onload=()=>this.draw();
   this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);canvas.style.touchAction='none';canvas.tabIndex=0;
   canvas.onwheel=e=>{e.preventDefault();this.zoomAt(Math.exp(-e.deltaY*.0015),e.offsetX,e.offsetY);};
   canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,[e.offsetX,e.offsetY]);this.moved=false;};
   canvas.onpointermove=e=>{const old=this.pointers.get(e.pointerId);if(!old)return;const before=[...this.pointers.values()];this.pointers.set(e.pointerId,[e.offsetX,e.offsetY]);const after=[...this.pointers.values()];
    if(after.length===2){const dist=a=>Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]);this.zoomAt(dist(after)/Math.max(1,dist(before)),(after[0][0]+after[1][0])/2,(after[0][1]+after[1][1])/2);this.moved=true;}
    else {this.x-=(e.offsetX-old[0])/this.z;this.y-=(e.offsetY-old[1])/this.z;if(Math.hypot(e.offsetX-old[0],e.offsetY-old[1])>2)this.moved=true;this.draw();}};
   const up=e=>{if(!this.pointers.has(e.pointerId))return;const tap=this.pointers.size===1&&!this.moved;this.pointers.delete(e.pointerId);if(tap)this.tap(e.offsetX,e.offsetY);};canvas.onpointerup=up;canvas.onpointercancel=e=>this.pointers.delete(e.pointerId);
   canvas.onkeydown=e=>{if(e.key==='+'||e.key==='=')this.zoom(1.5);else if(e.key==='-')this.zoom(1/1.5);else if(e.key==='Home')this.fit();else return;e.preventDefault();};this.resize(true);
  }
  destroy(){this.observer.disconnect();}
  resize(first=false){const c=this.canvas;this.w=c.clientWidth;this.h=c.clientHeight;const r=Math.min(devicePixelRatio||1,2);c.width=this.w*r;c.height=this.h*r;this.r=r;if(first||!this.fitted)this.fit();else this.draw();}
  fit(){if(!this.w||!this.h)return;this.x=this.meta.width/2;this.y=this.meta.height/2;this.z=Math.min(this.w/this.meta.width,this.h/this.meta.height)*.94;this.fitted=true;this.draw();}
  xy(x,y){return [(x-this.x)*this.z+this.w/2,(y-this.y)*this.z+this.h/2];}
  world(x,y){return {x:(x-this.w/2)/this.z+this.x,y:(y-this.h/2)/this.z+this.y};}
  zoom(f){this.zoomAt(f,this.w/2,this.h/2);}
  zoomAt(f,x,y){if(!Number.isFinite(f)||f<=0)return;const a=this.world(x,y);this.z=Math.max(.05,Math.min(12,this.z*f));const b=this.world(x,y);this.x+=a.x-b.x;this.y+=a.y-b.y;this.draw();}
  setData(teams=[],checkpoints=[]){this.teams=teams;this.checkpoints=checkpoints;this.draw();}
  project(lat,lon){try{return CampusGPS.project(lat,lon,this.meta);}catch{return null;}}
  tap(x,y){const hit=this.hits.find(p=>Math.hypot(x-p.x,y-p.y)<18);if(hit){this.onTap?.({team:hit.team});return;}const w=this.world(x,y);if(CampusGPS.inExtent(w,this.meta))this.onTap?.({...w,...CampusGPS.unproject(w.x,w.y,this.meta)});}
  draw(){if(!this.w||!this.h)return;const c=this.ctx,d=this.source.d;c.setTransform(this.r,0,0,this.r,0,0);c.fillStyle='#e0e5c4';c.fillRect(0,0,this.w,this.h);c.save();c.translate(this.w/2,this.h/2);c.scale(this.z,this.z);c.translate(-this.x,-this.y);
   c.fillStyle='#dce6b8';c.fill(this.source.boundary);c.lineCap='round';c.lineJoin='round';
   for(const r of this.source.roads){c.lineWidth=(r.kind==='primary'?13:5)+2;c.strokeStyle='#a0a17d';c.stroke(r.p);c.lineWidth-=2;c.strokeStyle='#fff3d6';c.stroke(r.p);}
   c.fillStyle='#e0aa83';c.strokeStyle='#956548';c.lineWidth=.6;for(const p of this.source.roofs){c.fill(p,'evenodd');if(this.z>.35)c.stroke(p);}
   c.strokeStyle='#c97455';c.lineWidth=2/this.z;c.setLineDash([7/this.z,5/this.z]);c.stroke(this.source.boundary);c.setLineDash([]);c.restore();
   c.font='11px system-ui';const points=d.places.map(p=>{const [x,y]=this.xy(...p.geometry.coordinates);return {id:p.id,p,x,y,priority:p.priority};}).filter(p=>p.x>0&&p.y>0&&p.x<this.w&&p.y<this.h),boxes=[];
   for(const g of CampusLabels.groups(points,25)){const p=g.anchor;c.fillStyle='#285a43';c.beginPath();c.arc(p.x,p.y,g.members.length>1?9:3,0,Math.PI*2);c.fill();
    if(g.members.length>1){c.fillStyle='white';c.textAlign='center';c.fillText(g.members.length,p.x,p.y+4);c.textAlign='left';}
    const name=this.z>.85?p.p.name:p.p.display_name;const lines=CampusLabels.wrap(name||p.p.name,s=>c.measureText(s).width,145);const w=Math.max(...lines.map(s=>c.measureText(s).width))+12,h=lines.length*14+8;
    const b={x:p.x+12,y:p.y-h/2,w,h};if(b.x+w>this.w||b.y<0||b.y+h>this.h||boxes.some(a=>b.x<a.x+a.w&&b.x+w>a.x&&b.y<a.y+a.h&&b.y+h>a.y))continue;boxes.push(b);c.fillStyle='#fffef0ed';c.fillRect(b.x,b.y,w,h);c.fillStyle='#224837';lines.forEach((s,i)=>c.fillText(s,b.x+6,b.y+14+i*14));}
   for(const p of this.checkpoints){const q=this.project(p.lat,p.lon);if(!q)continue;const [x,y]=this.xy(q.x,q.y);c.strokeStyle=p.verified?'#5a3f99':'#a96128';c.lineWidth=2;c.strokeRect(x-5,y-5,10,10);}
   this.hits=[];const now=Date.now();for(const t of this.teams){const p=t.location;if(!p)continue;const q=this.project(p.lat,p.lon);if(!q||!CampusGPS.inExtent(q,this.meta))continue;const [x,y]=this.xy(q.x,q.y);const fresh=now-(p.sampled_at??p.received_at)<30000;c.fillStyle=p.mock?'#b45d24':fresh?'#784bb3':'#727b85';c.globalAlpha=.13;c.beginPath();c.arc(x,y,Math.max(4,p.accuracy*this.z),0,Math.PI*2);c.fill();c.globalAlpha=fresh?1:.5;const id=Math.max(0,Number(t.avatar_id)||0),n=id%60;c.imageSmoothingEnabled=false;if(this.source.characters.complete&&this.source.characters.naturalWidth){c.drawImage(this.source.characters,(n%10)*64,Math.floor(n/10)*80,64,80,x-24,y-52,48,60);}else{c.fillStyle='hsl('+n*137.508%360+' 60% 48%)';c.fillRect(x-9,y-26,18,20);c.fillStyle='#f3c7a3';c.fillRect(x-7,y-39,14,13);c.fillStyle='#30213e';c.fillRect(x-10,y-42,20,5);c.fillRect(x-7,y-7,5,8);c.fillRect(x+2,y-7,5,8);}c.globalAlpha=1;c.fillStyle='#19122b';c.fillText(t.name||'Unnamed team',x+24,y-20);if(id>=60)c.fillText(String(Math.floor(id/60)+1),x+14,y);this.hits.push({x,y,team:t});}
   this.canvas.dataset.teamMarkers=String(this.hits.length);this.canvas.dataset.zoom=this.z.toFixed(3);
  }
 }
 async function create(canvas,onTap){return new Map(canvas,await load(),onTap);}
 return {create,load};
})();
