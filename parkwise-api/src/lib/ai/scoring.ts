import { haversineKm, round, type Coordinates } from '../geo/haversine';

/**
 * Deterministic, explainable AI-assisted coefficient scoring model.
 *
 * This is intentionally NOT a machine-learning black box. Every factor is
 * normalized to a 0..1 score where higher is better, combined with fixed
 * weights, and fully reproducible — which makes it testable and lets the UI
 * show an exact score breakdown.
 *
 * finalScore =
 *   distanceScore * 0.35 +
 *   priceScore    * 0.25 +
 *   availabilityScore * 0.25 +
 *   congestionScore   * 0.15
 */

export type Congestion = 'LOW' | 'MEDIUM' | 'HIGH';

export const CONGESTION_SCORES: Record<Congestion, number> = {
  LOW: 1,
  MEDIUM: 0.55,
  HIGH: 0.2,
};

export interface ScoringWeights {
  distance: number;
  price: number;
  availability: number;
  congestion: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  distance: 0.35,
  price: 0.25,
  availability: 0.25,
  congestion: 0.15,
};

export interface ScoringCandidate {
  id: string;
  latitude: number;
  longitude: number;
  hourlyPrice: number;
  availableSpaces: number;
  totalSpaces: number;
  congestionLevel: Congestion;
}

export interface ScoreBreakdown {
  distanceScore: number;
  priceScore: number;
  availabilityScore: number;
  congestionScore: number;
  weights: ScoringWeights;
}

export interface RankedFacility<T extends ScoringCandidate> {
  facility: T;
  distanceKm: number;
  finalScore: number;
  scorePercent: number;
  rank: number;
  isFull: boolean;
  scoreBreakdown: ScoreBreakdown;
}

export interface RankOptions {
  /** Search radius used to normalize distance (closer = better). */
  maxDistanceKm?: number;
  weights?: ScoringWeights;
}

const clamp01 = (value: number): number => Math.min(Math.max(value, 0), 1);

/**
 * Rank a list of candidate facilities from best to worst.
 *
 * Callers are responsible for passing only APPROVED facilities; SUSPENDED /
 * PENDING / REJECTED facilities must never reach this function. Full
 * facilities (availableSpaces <= 0) are heavily penalized (availabilityScore
 * = 0) so they sink to the bottom but remain visible, per the use-case spec.
 */
export function rankFacilities<T extends ScoringCandidate>(
  candidates: T[],
  origin: Coordinates,
  options: RankOptions = {},
): RankedFacility<T>[] {
  const weights = options.weights ?? DEFAULT_WEIGHTS;

  if (candidates.length === 0) return [];

  const withDistance = candidates.map((facility) => ({
    facility,
    distanceKm: haversineKm(origin, { lat: facility.latitude, lng: facility.longitude }),
  }));

  // Normalization references derived from the current candidate list.
  const maxDistanceKm =
    options.maxDistanceKm && options.maxDistanceKm > 0
      ? options.maxDistanceKm
      : Math.max(...withDistance.map((c) => c.distanceKm), 0);

  const maxPrice = Math.max(...candidates.map((c) => c.hourlyPrice), 0);

  const scored = withDistance.map(({ facility, distanceKm }) => {
    // Closer is better.
    const distanceScore =
      maxDistanceKm > 0 ? 1 - Math.min(distanceKm / maxDistanceKm, 1) : 1;

    // Cheaper is better, normalized against the most expensive candidate.
    const priceScore = maxPrice > 0 ? 1 - clamp01(facility.hourlyPrice / maxPrice) : 1;

    // More free spaces (relative to capacity) is better; full = 0.
    const availabilityScore =
      facility.totalSpaces > 0 && facility.availableSpaces > 0
        ? clamp01(facility.availableSpaces / facility.totalSpaces)
        : 0;

    const congestionScore = CONGESTION_SCORES[facility.congestionLevel] ?? CONGESTION_SCORES.MEDIUM;

    const finalScore =
      distanceScore * weights.distance +
      priceScore * weights.price +
      availabilityScore * weights.availability +
      congestionScore * weights.congestion;

    return {
      facility,
      distanceKm: round(distanceKm, 3),
      finalScore: round(finalScore, 4),
      scorePercent: Math.round(finalScore * 100),
      isFull: facility.availableSpaces <= 0,
      scoreBreakdown: {
        distanceScore: round(distanceScore, 4),
        priceScore: round(priceScore, 4),
        availabilityScore: round(availabilityScore, 4),
        congestionScore: round(congestionScore, 4),
        weights,
      },
    } satisfies Omit<RankedFacility<T>, 'rank'>;
  });

  // Best score first; break ties by nearer distance, then by id for stability.
  scored.sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
    return a.facility.id.localeCompare(b.facility.id);
  });

  return scored.map((item, index) => ({ ...item, rank: index + 1 }));
}
