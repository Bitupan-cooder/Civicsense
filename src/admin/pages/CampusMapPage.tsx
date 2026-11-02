// /map (PRD P1 "Campus map", officials): complaint pins grouped by campus place, coloured by priority, with filters
// for status, priority and category. UNSTYLED ON PURPOSE and WITHOUT A MAP: this page provides the pin data
// (`pins` below: lat/lng, worst priority, complaints) as a list. The frontend draws the map (PRD: Leaflet with
// OpenStreetMap tiles; one marker per pin, colour by `pin.priority`, cluster by `pin.complaints.length`).
//
// Data: console.ts store (complaints the official can see + routing[id].location_id / priority / ai_category);
// coordinates: CAMPUS_LOCATION_COORDS in src/site/demoData.js.
import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../i18n';
import { CATEGORIES, CATEGORY_LABELS, STATUS_NAMES, ticketRef } from '../../logic';
import { useFeatures } from '../../NotificationBell';
import { priorityLabel } from '../../RouteTracker';
import { CAMPUS_LOCATION_COORDS } from '../../site/demoData.js';
import { openDocket, useConsole } from '../console';
import { PageState } from './ConsoleNav';
import { ComplaintMap } from '../components/ComplaintMap';
import { resolveLocationId } from '../../locations';

export interface MapPin {
  locationId: string | null;
  name: string;
  lat: number | null;
  lng: number | null;
  /** most urgent priority among the pin's complaints (1 = urgent) */
  priority: number | null;
  complaints: { id: string; title: string; status: string; priority: number | null; category: string | null }[];
}

const COORDS = CAMPUS_LOCATION_COORDS as Record<string, { lat: number; lng: number; name: string }>;

export function CampusMapPage() {
  const { t, lang } = useLanguage();
  const { routing: installed } = useFeatures();
  const s = useConsole();
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [category, setCategory] = useState('all');
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  useEffect(() => { setSelectedPlace(null); }, [status, priority, category]);

  const pins = useMemo<MapPin[]>(() => {
    const groups = new Map<string, MapPin>();
    for (const c of s.complaints) {
      const r = s.routing[c.id];
      const cat = r?.ai_category ?? null;
      if (status !== 'all' && c.status !== status) continue;
      if (priority !== 'all' && String(r?.priority ?? '') !== priority) continue;
      if (category !== 'all' && cat !== category) continue;
      const loc = resolveLocationId(r?.location_id) || resolveLocationId(r?.location_text);
      const key = loc ?? '__none';
      const pin = groups.get(key) ?? {
        locationId: loc, name: loc ? COORDS[loc].name : t('map.noPlace'),
        lat: loc ? COORDS[loc].lat : null, lng: loc ? COORDS[loc].lng : null, priority: null, complaints: [],
      };
      pin.complaints.push({ id: c.id, title: c.title, status: c.status, priority: r?.priority ?? null, category: cat });
      if (r?.priority && (pin.priority === null || r.priority < pin.priority)) pin.priority = r.priority;
      groups.set(key, pin);
    }
    return [...groups.values()].sort((a, b) => (a.priority ?? 9) - (b.priority ?? 9));
  }, [s.complaints, s.routing, status, priority, category, t]);

  return (
    <section className="workflow-page" aria-label={t('map.title')}>
      <h1>{t('map.title')}</h1>
      <PageState notInstalled={!installed} loading={s.loading} error={s.loadError} />
      <form onSubmit={(e) => e.preventDefault()}>
        <label>{t('map.filterStatus')}{' '}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">{t('map.all')}</option>
            {Object.keys(STATUS_NAMES).map((k) => <option key={k} value={k}>{STATUS_NAMES[k][lang]}</option>)}
          </select>
        </label>
        <label>{t('map.filterPriority')}{' '}
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="all">{t('map.all')}</option>
            {[1, 2, 3, 4].map((p) => <option key={p} value={String(p)}>{priorityLabel(p)}</option>)}
          </select>
        </label>
        <label>{t('map.filterCategory')}{' '}
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">{t('map.all')}</option>
            {CATEGORIES.map((k) => <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>)}
          </select>
        </label>
      </form>
      <ComplaintMap pins={pins} onSelect={(pin) => setSelectedPlace(pin.locationId)} />
      {selectedPlace && <p><button type="button" onClick={() => setSelectedPlace(null)}>Show all locations</button></p>}
      {s.loaded && !pins.length && <p role="status">No complaints match these filters.</p>}
      <ul>
        {pins.filter((pin) => !selectedPlace || pin.locationId === selectedPlace).map((pin) => (
          <li key={pin.locationId ?? 'none'} data-priority={pin.priority ?? ''} data-lat={pin.lat ?? ''} data-lng={pin.lng ?? ''}>
            <strong>{pin.name}</strong> ({pin.complaints.length}){pin.priority ? ` · ${priorityLabel(pin.priority)}` : ''}
            <ul>
              {pin.complaints.map((c) => (
                <li key={c.id}><button type="button" onClick={() => openDocket(c.id)}>{ticketRef(c.id)} · {c.title}</button> · {STATUS_NAMES[c.status]?.[lang] ?? c.status}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
