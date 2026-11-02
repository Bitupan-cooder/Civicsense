import { useEffect, useMemo, useState } from 'react';
import type { MapPin } from '../pages/CampusMapPage';

type Point = [number, number];
type Geometry = { type: string; coordinates: Point[] | Point[][] | Point[][][] };
type MapData = {
  meta: { width: number; height: number; utmOrigin: Point };
  boundary: Geometry;
  buildings: { geometry: Geometry }[];
  roads: { geometry: Geometry }[];
};
const colors: Record<number, string> = { 1: '#b42318', 2: '#a65d05', 3: '#1a7a3a', 4: '#526783' };

function path(g: Geometry): string {
  const line = (points: Point[], close = false) => points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ') + (close ? 'Z' : '');
  if (g.type === 'LineString') return line(g.coordinates as Point[]);
  if (g.type === 'MultiLineString') return (g.coordinates as Point[][]).map((p) => line(p)).join(' ');
  if (g.type === 'Polygon') return (g.coordinates as Point[][]).map((p) => line(p, true)).join(' ');
  if (g.type === 'MultiPolygon') return (g.coordinates as Point[][][]).flatMap((p) => p.map((r) => line(r, true))).join(' ');
  return '';
}

/** Offline campus geometry, projected by the same UTM map kit as the student map. */
export function ComplaintMap({ pins, onSelect }: { pins: MapPin[]; onSelect: (pin: MapPin) => void }) {
  const [data, setData] = useState<MapData | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<Point | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    fetch('/Dibrugarh-University-Map-Kit/map-data.json', { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error('Campus map could not be loaded.'); return r.json(); })
      .then(setData).catch((e) => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, [attempt]);
  const paths = useMemo(() => data ? {
    boundary: path(data.boundary), buildings: data.buildings.map((b) => path(b.geometry)).join(' '), roads: data.roads.map((r) => path(r.geometry)).join(' '),
  } : null, [data]);
  const markers = useMemo(() => {
    const gps = (window as unknown as { CampusGPS?: { project(lat: number, lng: number, meta: MapData['meta']): { x: number; y: number } } }).CampusGPS;
    if (!data || !gps) return [];
    return pins.flatMap((pin) => {
      if (pin.lat === null || pin.lng === null) return [];
      try { return [{ pin, ...gps.project(pin.lat, pin.lng, data.meta) }]; } catch { return []; }
    });
  }, [data, pins]);
  const width = (data?.meta.width || 1) / zoom, height = (data?.meta.height || 1) / zoom;
  const cx = center?.[0] ?? (data?.meta.width || 1) / 2, cy = center?.[1] ?? (data?.meta.height || 1) / 2;
  const pan = (x: number, y: number) => setCenter([cx + width * x, cy + height * y]);
  return (
    <div className="campus-map-frame">
      <div className="map-controls" aria-label="Map controls">
        <button type="button" aria-label="Zoom in" disabled={zoom >= 5} onClick={() => setZoom((z) => Math.min(5, z * 1.5))}>+</button>
        <button type="button" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom((z) => Math.max(1, z / 1.5))}>−</button>
        <button type="button" onClick={() => { setZoom(1); setCenter(null); }}>Fit campus</button>
        <button type="button" aria-label="Pan west" onClick={() => pan(-.2, 0)}>←</button>
        <button type="button" aria-label="Pan north" onClick={() => pan(0, -.2)}>↑</button>
        <button type="button" aria-label="Pan south" onClick={() => pan(0, .2)}>↓</button>
        <button type="button" aria-label="Pan east" onClick={() => pan(.2, 0)}>→</button>
      </div>
      {error ? <p role="alert">{error} <button type="button" onClick={() => setAttempt((n) => n + 1)}>Retry</button></p> : !data ? <p role="status">Loading campus map…</p> : (
        <svg viewBox={`${cx - width / 2} ${cy - height / 2} ${width} ${height}`} role="group" aria-label="Dibrugarh University complaint map">
          <path d={paths?.boundary} fill="#e0f0d0" stroke="#b8d9aa" strokeWidth={4} />
          <path d={paths?.roads} fill="none" stroke="#fffdf9" strokeWidth={12} />
          <path d={paths?.buildings} fill="#c1c9b7" stroke="#b8d9aa" strokeWidth={1} />
          {markers.map(({ pin, x, y }) => (
            <g key={pin.locationId} transform={`translate(${x} ${y}) scale(${1 / zoom})`} role="button" tabIndex={0}
              aria-label={`${pin.name}: ${pin.complaints.length} complaints, priority ${pin.priority ?? 'unknown'}`}
              onClick={() => onSelect(pin)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(pin); } }}>
              <title>{pin.name}</title>
              <circle r={42} fill={colors[pin.priority || 3]} stroke="white" strokeWidth={6} />
              <text textAnchor="middle" dominantBaseline="central" fill="white" fontSize={34} fontWeight={700}>{pin.complaints.length}</text>
            </g>
          ))}
        </svg>
      )}
      <div className="map-legend">{Object.entries(colors).map(([p, color]) => <span key={p}><i style={{ background: color }} />P{p} · {['', 'Urgent', 'High', 'Normal', 'Minor'][Number(p)]}</span>)}</div>
      <p className="map-credit">Dibrugarh University · OpenStreetMap contributors / Overture Maps. Approximate campus locations. Select a numbered pin to view its complaints.</p>
    </div>
  );
}
