import { z } from 'zod';
import { latitudeField, longitudeField } from './common';

export const nearbyQuerySchema = z.object({
  lat: latitudeField,
  lng: longitudeField,
  radiusKm: z.coerce.number().positive().max(100).default(5),
});

export const rankQuerySchema = z.object({
  lat: latitudeField,
  lng: longitudeField,
  radiusKm: z.coerce.number().positive().max(100).default(5),
});

export const searchQuerySchema = z.object({
  lat: latitudeField.optional(),
  lng: longitudeField.optional(),
  maxDistanceKm: z.coerce.number().positive().max(100).optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  minAvailableSpaces: z.coerce.number().int().nonnegative().optional(),
  facilityType: z.enum(['MANUAL', 'API_INTEGRATED']).optional(),
  availability: z.enum(['any', 'available']).default('any'),
});

export type NearbyQuery = z.infer<typeof nearbyQuerySchema>;
export type RankQuery = z.infer<typeof rankQuerySchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
