import { describe, it, expect } from 'vitest';
import { haversineKm, round } from '../../src/lib/geo/haversine';

describe('haversineKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineKm({ lat: 9.0, lng: 38.75 }, { lat: 9.0, lng: 38.75 })).toBe(0);
  });

  it('is symmetric', () => {
    const a = { lat: 8.9948, lng: 38.7885 };
    const b = { lat: 9.0105, lng: 38.7445 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 9);
  });

  it('computes a known Addis Ababa distance within tolerance', () => {
    // Bole Medhanialem → Mexico Square ≈ 5 km.
    const km = haversineKm({ lat: 8.9948, lng: 38.7885 }, { lat: 9.0105, lng: 38.7445 });
    expect(km).toBeGreaterThan(3);
    expect(km).toBeLessThan(7);
  });

  it('rounds to the requested precision', () => {
    expect(round(1.23456, 2)).toBe(1.23);
    expect(round(1.235, 2)).toBe(1.24);
  });
});
