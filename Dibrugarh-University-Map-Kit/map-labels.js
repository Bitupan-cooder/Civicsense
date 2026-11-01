(function(root){
 'use strict';
 function groups(points,radius){
  if(!Number.isFinite(radius)||radius<=0)throw Error('Invalid cluster radius');
  const result=[],seen=new Set();
  for(const p of [...points].filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)).sort((a,b)=>(b.priority||0)-(a.priority||0)||a.id.localeCompare(b.id))){
   if(seen.has(p.id))continue;seen.add(p.id);
   const group=result.find(g=>Math.hypot(p.x-g.anchor.x,p.y-g.anchor.y)<=radius);
   if(group)group.members.push(p);else result.push({anchor:p,members:[p]});
  }return result;
 }
 function wrap(text,measure,maxWidth){
  const lines=[''];for(const word of text.split(/\s+/)){const trial=(lines.at(-1)+' '+word).trim();if(lines.at(-1)&&measure(trial)>maxWidth)lines.push(word);else lines[lines.length-1]=trial;}return lines;
 }
 const api={groups,wrap};if(typeof module==='object'&&module.exports)module.exports=api;else root.CampusLabels=api;
})(typeof globalThis==='object'?globalThis:this);
