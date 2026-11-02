// Stable IDs are stored in the database. Accept older label-valued rows when reading.
import { CAMPUS_LOCATION_COORDS } from './site/demoData.js';

export const campusLocations = CAMPUS_LOCATION_COORDS as Record<string, { lat: number; lng: number; name: string }>;

export function resolveLocationId(value: string | null | undefined): string | null {
  if (!value) return null;
  if (Object.prototype.hasOwnProperty.call(campusLocations, value)) return value;
  const normalized = value.trim().toLocaleLowerCase();
  return Object.entries(campusLocations).find(([, p]) => p.name.toLocaleLowerCase() === normalized)?.[0] ?? null;
}

export function locationLabel(value: string | null | undefined): string | null {
  const id = resolveLocationId(value);
  return id ? campusLocations[id].name : value?.trim() || null;
}
