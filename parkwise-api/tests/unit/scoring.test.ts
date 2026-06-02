import { describe, it, expect } from 'vitest';
import {
  rankFacilities,
  CONGESTION_SCORES,
  DEFAULT_WEIGHTS,
  type ScoringCandidate,
} from '../../src/lib/ai/scoring';

const base: ScoringCandidate = {
  id: 'base',
  latitude: 9.0,
  longitude: 38.75,
  hourlyPrice: 20,
  availableSpaces: 50,
  totalSpaces: 100,
  congestionLevel: 'MEDIUM',
};

const origin = { lat: 9.0, lng: 38.75 };

describe('AI coefficient scoring model', () => {
  it('returns an empty list for no candidates', () => {
    expect(rankFacilities([], origin)).toEqual([]);
  });

  it('assigns sequential ranks starting at 1', () => {
    const ranked = rankFacilities(
      [
        { ...base, id: 'a' },
        { ...base, id: 'b', hourlyPrice: 40 },
        { ...base, id: 'c', hourlyPrice: 10 },
      ],
      origin,
      { maxDistanceKm: 5 },
    );
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it('ranks a close, cheap, available, low-congestion facility first', () => {
    const best: ScoringCandidate = {
      id: 'best',
      latitude: 9.0,
      longitude: 38.75,
      hourlyPrice: 5,
      availableSpaces: 90,
      totalSpaces: 100,
      congestionLevel: 'LOW',
    };
    const worst: ScoringCandidate = {
      id: 'worst',
      latitude: 9.2, // far
      longitude: 38.95,
      hourlyPrice: 100,
      availableSpaces: 1,
      totalSpaces: 100,
      congestionLevel: 'HIGH',
    };
    const ranked = rankFacilities([worst, best], origin, { maxDistanceKm: 30 });
    expect(ranked[0]!.facility.id).toBe('best');
    expect(ranked[1]!.facility.id).toBe('worst');
    expect(ranked[0]!.finalScore).toBeGreaterThan(ranked[1]!.finalScore);
  });

  it('excludes full facilities from a winning position via 0 availability score', () => {
    const full: ScoringCandidate = { ...base, id: 'full', availableSpaces: 0 };
    const ranked = rankFacilities([full], origin, { maxDistanceKm: 5 });
    expect(ranked[0]!.scoreBreakdown.availabilityScore).toBe(0);
    expect(ranked[0]!.isFull).toBe(true);
  });

  it('computes finalScore exactly from the documented formula', () => {
    // Single candidate at the origin: distance 0 → distanceScore 1.
    // maxPrice == its own price → priceScore 0. availability 50/100 = 0.5.
    // congestion MEDIUM → 0.55.
    const [only] = rankFacilities([base], origin, { maxDistanceKm: 5 });
    const b = only!.scoreBreakdown;
    expect(b.distanceScore).toBe(1);
    expect(b.priceScore).toBe(0);
    expect(b.availabilityScore).toBe(0.5);
    expect(b.congestionScore).toBe(CONGESTION_SCORES.MEDIUM);

    const expected =
      1 * DEFAULT_WEIGHTS.distance +
      0 * DEFAULT_WEIGHTS.price +
      0.5 * DEFAULT_WEIGHTS.availability +
      0.55 * DEFAULT_WEIGHTS.congestion;
    expect(only!.finalScore).toBeCloseTo(expected, 4);
  });

  it('maps congestion levels to the specified scores', () => {
    expect(CONGESTION_SCORES.LOW).toBe(1);
    expect(CONGESTION_SCORES.MEDIUM).toBe(0.55);
    expect(CONGESTION_SCORES.HIGH).toBe(0.2);
  });

  it('gives the cheapest facility the best price score', () => {
    const ranked = rankFacilities(
      [
        { ...base, id: 'cheap', hourlyPrice: 10 },
        { ...base, id: 'pricey', hourlyPrice: 50 },
      ],
      origin,
      { maxDistanceKm: 5 },
    );
    const cheap = ranked.find((r) => r.facility.id === 'cheap')!;
    const pricey = ranked.find((r) => r.facility.id === 'pricey')!;
    expect(cheap.scoreBreakdown.priceScore).toBeGreaterThan(pricey.scoreBreakdown.priceScore);
  });
});
