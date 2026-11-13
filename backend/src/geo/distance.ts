/**
 * The sphere PostgreSQL's earthdistance uses (earth() = 6,378,168 m). Using the
 * same one here means a shop's distance is identical in search, the delivery
 * radius check at checkout and the UI.
 */
const EARTH_RADIUS_KM = 6378.168;

export type LatLng = { latitude: number; longitude: number };

/** Great-circle distance in km (haversine) on earthdistance's sphere. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const isValidCoordinate = (lat?: number | null, lng?: number | null) =>
  typeof lat === 'number' &&
  typeof lng === 'number' &&
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= -90 &&
  lat <= 90 &&
  lng >= -180 &&
  lng <= 180;
