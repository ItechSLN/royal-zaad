import { DEFAULT_RANKING, proximityScore, rank, rankingConfigFromEnv, type Candidate } from './ranking';

const c = (id: string, over: Partial<Candidate> = {}): Candidate => ({
  id,
  relevance: 1,
  distanceKm: null,
  available: 5,
  rating: null,
  price: 10,
  createdAt: new Date('2026-01-01'),
  ...over,
});

const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

describe('search ranking', () => {
  it('a nearby weak match never outranks a distant strong match', () => {
    const result = rank(
      [c('weak-near', { relevance: 0.35, distanceKm: 0.2 }), c('strong-far', { relevance: 1, distanceKm: 800 })],
      { hasQuery: true, sort: 'relevance' },
    );
    expect(ids(result)).toEqual(['strong-far', 'weak-near']);
  });

  it('among equally relevant matches, the nearer shop ranks first', () => {
    const result = rank(
      [c('far', { relevance: 1, distanceKm: 40 }), c('near', { relevance: 0.95, distanceKm: 2 })],
      { hasQuery: true, sort: 'relevance' },
    );
    expect(ids(result)).toEqual(['near', 'far']);
  });

  it('changing the customer location changes the order', () => {
    const a = (d: number) => c('shop-a', { distanceKm: d });
    const b = (d: number) => c('shop-b', { distanceKm: d });
    expect(ids(rank([a(1), b(30)], { hasQuery: true, sort: 'relevance' }))).toEqual(['shop-a', 'shop-b']);
    expect(ids(rank([a(30), b(1)], { hasQuery: true, sort: 'relevance' }))).toEqual(['shop-b', 'shop-a']);
  });

  it('drops results far below the best match', () => {
    const result = rank([c('good', { relevance: 1 }), c('noise', { relevance: 0.05, distanceKm: 0 })], {
      hasQuery: true,
      sort: 'relevance',
    });
    expect(ids(result)).toEqual(['good']);
  });

  it('shops without a location are kept, ranked as if far away', () => {
    const result = rank([c('unknown', { distanceKm: null }), c('near', { distanceKm: 3 })], {
      hasQuery: true,
      sort: 'relevance',
    });
    expect(ids(result)).toEqual(['near', 'unknown']);
  });

  it('works without any location (permission denied)', () => {
    const result = rank([c('b', { relevance: 0.7 }), c('a', { relevance: 1 })], { hasQuery: true, sort: 'relevance' });
    expect(ids(result)).toEqual(['a', 'b']);
    expect(result.every((r) => r.proximity === 0)).toBe(true);
  });

  it('nearest sorts by distance with unlocated shops last', () => {
    const result = rank([c('x', { distanceKm: null }), c('y', { distanceKm: 9 }), c('z', { distanceKm: 1 })], {
      hasQuery: false,
      sort: 'nearest',
    });
    expect(ids(result)).toEqual(['z', 'y', 'x']);
  });

  it('price sorts ignore tiers and order by price', () => {
    const rows = [c('mid', { price: 20 }), c('low', { price: 5, relevance: 0.5 }), c('high', { price: 50 })];
    expect(ids(rank(rows, { hasQuery: true, sort: 'price_asc' }))).toEqual(['low', 'mid', 'high']);
    expect(ids(rank(rows, { hasQuery: true, sort: 'price_desc' }))).toEqual(['high', 'mid', 'low']);
  });

  it('in-stock outranks out-of-stock at equal relevance and distance', () => {
    const result = rank([c('none', { available: 0 }), c('some', { available: 3 })], { hasQuery: true, sort: 'relevance' });
    expect(ids(result)).toEqual(['some', 'none']);
  });

  it('proximity halves at the configured scale', () => {
    expect(proximityScore(0, 10)).toBe(1);
    expect(proximityScore(10, 10)).toBeCloseTo(0.5);
    expect(proximityScore(null, 10)).toBe(0);
  });

  it('weights are configurable — turning proximity off ranks purely by relevance', () => {
    const config = { ...DEFAULT_RANKING, weights: { ...DEFAULT_RANKING.weights, proximity: 0 } };
    const result = rank([c('near', { relevance: 0.9, distanceKm: 0 }), c('far', { relevance: 1, distanceKm: 50 })], {
      hasQuery: true,
      sort: 'relevance',
      config,
    });
    expect(ids(result)).toEqual(['far', 'near']);
  });

  it('reads overrides from SEARCH_RANKING and ignores malformed JSON', () => {
    expect(rankingConfigFromEnv('{"weights":{"proximity":0.9}}').weights.proximity).toBe(0.9);
    expect(rankingConfigFromEnv('{"weights":{"proximity":0.9}}').weights.relevance).toBe(1);
    expect(rankingConfigFromEnv('not json')).toEqual(DEFAULT_RANKING);
  });
});
