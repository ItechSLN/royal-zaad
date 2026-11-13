import { Injectable, Logger } from '@nestjs/common';
import type { LatLng } from './distance';

export type GeocodeResult = LatLng & { label: string };

export type GeocodeQuery = {
  /** Free text: "Olaya, Riyadh", a postcode, a city… */
  text?: string;
  line1?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

/**
 * Deterministic places for development and automated tests (GEOCODER=fixture),
 * so nothing calls an external service and distances are predictable.
 */
export const FIXTURE_PLACES: Record<string, GeocodeResult> = {
  riyadh: { latitude: 24.7136, longitude: 46.6753, label: 'Riyadh, Saudi Arabia' },
  olaya: { latitude: 24.6907, longitude: 46.6853, label: 'Olaya, Riyadh, Saudi Arabia' },
  diriyah: { latitude: 24.7342, longitude: 46.5752, label: 'Diriyah, Saudi Arabia' },
  jeddah: { latitude: 21.4858, longitude: 39.1925, label: 'Jeddah, Saudi Arabia' },
  dammam: { latitude: 26.4207, longitude: 50.0888, label: 'Dammam, Saudi Arabia' },
  dubai: { latitude: 25.2048, longitude: 55.2708, label: 'Dubai, United Arab Emirates' },
  doha: { latitude: 25.2854, longitude: 51.531, label: 'Doha, Qatar' },
  austin: { latitude: 30.2672, longitude: -97.7431, label: 'Austin, Texas, United States' },
  '12345': { latitude: 24.7136, longitude: 46.6753, label: '12345, Riyadh' },
  '11564': { latitude: 24.6907, longitude: 46.6853, label: '11564, Olaya, Riyadh' },
  '21442': { latitude: 21.4858, longitude: 39.1925, label: '21442, Jeddah' },
  '73301': { latitude: 30.2672, longitude: -97.7431, label: '73301, Austin' },
};

/**
 * Turns addresses, postcodes or place names into coordinates.
 *
 * GEOCODER=nominatim (default in production) uses OpenStreetMap Nominatim —
 * set GEOCODER_URL to a self-hosted or commercial endpoint and GEOCODER_USER_AGENT
 * to identify the app, as Nominatim's usage policy requires. GEOCODER=fixture
 * (default in development) uses FIXTURE_PLACES. Never throws: an address that
 * can't be located simply has no coordinates, and nothing measures from it.
 */
@Injectable()
export class GeocoderService {
  private readonly logger = new Logger(GeocoderService.name);
  private readonly mode =
    process.env.GEOCODER ??
    (process.env.NODE_ENV === 'production' ? 'nominatim' : 'fixture');

  async geocode(query: GeocodeQuery): Promise<GeocodeResult | null> {
    const parts = query.text
      ? [query.text]
      : [query.line1, query.city, query.state, query.postalCode].filter(
          (p): p is string => !!p && !!p.trim(),
        );
    if (!parts.length) return null;

    return this.mode === 'fixture'
      ? this.fromFixture(parts, query)
      : this.fromNominatim(parts, query.country);
  }

  private fromFixture(parts: string[], query: GeocodeQuery): GeocodeResult | null {
    // Most specific first: postcode, then each part (city, district, text).
    const candidates = [query.postalCode, ...parts.slice().reverse(), query.city]
      .filter((p): p is string => !!p)
      .flatMap((p) => [p, ...p.split(/[,\s]+/)])
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean);

    for (const key of candidates) {
      if (FIXTURE_PLACES[key]) return FIXTURE_PLACES[key];
    }
    return null;
  }

  private async fromNominatim(
    parts: string[],
    country?: string | null,
  ): Promise<GeocodeResult | null> {
    const base = (process.env.GEOCODER_URL ?? 'https://nominatim.openstreetmap.org').replace(/\/$/, '');
    const params = new URLSearchParams({ q: parts.join(', '), format: 'jsonv2', limit: '1' });
    if (country) params.set('countrycodes', country.toLowerCase());

    try {
      const res = await fetch(`${base}/search?${params}`, {
        headers: { 'User-Agent': process.env.GEOCODER_USER_AGENT ?? 'royal-zaad-marketplace' },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const [hit] = (await res.json()) as { lat: string; lon: string; display_name: string }[];
      if (!hit) return null;
      return { latitude: Number(hit.lat), longitude: Number(hit.lon), label: hit.display_name };
    } catch (error) {
      this.logger.warn(`Geocoding failed for "${parts.join(', ')}": ${(error as Error).message}`);
      return null;
    }
  }
}
