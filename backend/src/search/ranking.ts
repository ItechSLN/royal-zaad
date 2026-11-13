/**
 * Marketplace search ranking — pure and side-effect free, so it is unit
 * tested directly (ranking.spec.ts) and tuned through RankingConfig.
 *
 * The rule: relevance decides *whether* and *how strongly* a product matches;
 * proximity only reorders products that match about equally well. A nearby
 * shop can never lift a weak match above a strong one.
 */

export type RankingConfig = {
  /** Below this share of the best match's relevance, a result is dropped. */
  minRelevanceRatio: number;
  /** Tier boundaries as shares of the best relevance, strongest first. */
  tierThresholds: number[];
  weights: { relevance: number; proximity: number; availability: number; rating: number };
  /** Distance (km) at which proximity has halved — 1 / (1 + d / scale). */
  proximityScaleKm: number;
};

export const DEFAULT_RANKING: RankingConfig = {
  minRelevanceRatio: 0.15,
  tierThresholds: [0.6, 0.3],
  weights: { relevance: 1, proximity: 0.6, availability: 0.15, rating: 0.1 },
  proximityScaleKm: 10,
};

/** Overrides from SEARCH_RANKING (JSON), e.g. {"weights":{"proximity":0.8}}. */
export function rankingConfigFromEnv(raw = process.env.SEARCH_RANKING): RankingConfig {
  if (!raw) return DEFAULT_RANKING;
  try {
    const parsed = JSON.parse(raw) as Partial<RankingConfig>;
    return {
      ...DEFAULT_RANKING,
      ...parsed,
      weights: { ...DEFAULT_RANKING.weights, ...(parsed.weights ?? {}) },
    };
  } catch {
    return DEFAULT_RANKING;
  }
}

export type Candidate = {
  id: string;
  /** Raw text relevance from retrieval (0 when there is no query). */
  relevance: number;
  distanceKm: number | null;
  available: number;
  rating: number | null;
  price: number;
  createdAt: Date;
};

export type SortMode = 'relevance' | 'nearest' | 'price_asc' | 'price_desc';

export type Ranked<T extends Candidate> = T & {
  tier: number;
  score: number;
  relevanceRatio: number;
  proximity: number;
};

export const proximityScore = (distanceKm: number | null, scaleKm: number) =>
  distanceKm === null ? 0 : 1 / (1 + Math.max(0, distanceKm) / scaleKm);

export function rank<T extends Candidate>(
  candidates: T[],
  options: { hasQuery: boolean; sort: SortMode; config?: RankingConfig },
): Ranked<T>[] {
  const config = options.config ?? DEFAULT_RANKING;
  const best = Math.max(0, ...candidates.map((c) => c.relevance));

  const scored = candidates
    .map((c) => {
      // With no query every product is equally relevant; ordering then comes
      // from proximity, stock and rating alone.
      const relevanceRatio = options.hasQuery ? (best > 0 ? c.relevance / best : 0) : 1;
      const tier = options.hasQuery
        ? config.tierThresholds.findIndex((t) => relevanceRatio >= t) === -1
          ? config.tierThresholds.length
          : config.tierThresholds.findIndex((t) => relevanceRatio >= t)
        : 0;
      const proximity = proximityScore(c.distanceKm, config.proximityScaleKm);
      const w = config.weights;
      const score =
        w.relevance * relevanceRatio +
        w.proximity * proximity +
        w.availability * (c.available > 0 ? 1 : 0) +
        w.rating * ((c.rating ?? 0) / 5);
      return { ...c, tier, score, relevanceRatio, proximity };
    })
    .filter((c) => !options.hasQuery || c.relevanceRatio >= config.minRelevanceRatio);

  const byRelevance = (a: Ranked<T>, b: Ranked<T>) =>
    a.tier - b.tier || b.score - a.score || b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id);

  const sorters: Record<SortMode, (a: Ranked<T>, b: Ranked<T>) => number> = {
    relevance: byRelevance,
    nearest: (a, b) =>
      (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) || byRelevance(a, b),
    price_asc: (a, b) => a.price - b.price || byRelevance(a, b),
    price_desc: (a, b) => b.price - a.price || byRelevance(a, b),
  };

  return scored.sort(sorters[options.sort]);
}
