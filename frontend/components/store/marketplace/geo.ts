/** Great-circle distance in km between two coordinates (haversine). */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  // Same sphere as the API's earthdistance, so shown distances match search results.
  const R = 6378.168;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Distance from the customer to a shop, only when the shop's (verified)
 * coordinates are known. Never guesses.
 */
export function distanceToShop(
  from: { lat: number; lng: number } | null,
  shop: { latitude: number | null; longitude: number | null } | null | undefined
) {
  if (!from || !shop || shop.latitude == null || shop.longitude == null) return null;
  return haversineKm(from.lat, from.lng, shop.latitude, shop.longitude);
}

export function formatDistance(km: number | null | undefined) {
  if (km == null || !Number.isFinite(km)) return null;
  if (km < 0.05) return "Under 50 m away";
  if (km < 1) return `${Math.round((km * 1000) / 50) * 50} m away`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km away`;
}

export function osmLink(lat: number, lng: number) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;
}

export const money = (n: number | string | null | undefined) => `$${Number(n ?? 0).toFixed(2)}`;
