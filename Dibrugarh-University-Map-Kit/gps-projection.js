/* WGS84 phone fixes <-> metric campus coordinates. No artwork calibration. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./assets/proj4.js'));
  else root.CampusGPS=factory(root.proj4);
})(typeof globalThis!=='undefined'?globalThis:this,function(proj4){
  'use strict';
  const UTM='+proj=utm +zone=46 +datum=WGS84 +units=m +no_defs';
  function check(lat,lon){
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat < -90||lat > 90||lon < -180||lon > 180)throw new Error('Invalid WGS84 latitude/longitude');
  }
  function project(lat,lon,meta){
    check(lat,lon);
    // UTM 46N is intentionally local. Reject unrelated continents / reversed input.
    if(lat<0||lat>84||lon<90||lon>96)throw new Error('Location is outside UTM zone 46N');
    const [easting,northing]=proj4('EPSG:4326',UTM,[lon,lat]);
    return {x:easting-meta.utmOrigin[0],y:meta.utmOrigin[1]-northing,easting,northing,lat,lon};
  }
  function unproject(x,y,meta){
    if(!Number.isFinite(x)||!Number.isFinite(y))throw new Error('Invalid map coordinate');
    const [lon,lat]=proj4(UTM,'EPSG:4326',[x+meta.utmOrigin[0],meta.utmOrigin[1]-y]);
    check(lat,lon);return {lat,lon};
  }
  function inExtent(point,meta){return point.x>=0&&point.y>=0&&point.x<=meta.width&&point.y<=meta.height;}
  function fixStatus(fix,now=Date.now()){
    if(!fix||![fix.lat,fix.lon,fix.accuracy,fix.timestamp].every(Number.isFinite)||fix.accuracy<0||fix.lat < -90||fix.lat > 90||fix.lon < -180||fix.lon > 180)return 'invalid';
    if(fix.timestamp>now+5000)return 'invalid';
    if(now-fix.timestamp>15000)return 'stale';
    return fix.accuracy>25?'weak':'fresh';
  }
  return {project,unproject,inExtent,fixStatus,projection:UTM};
});
