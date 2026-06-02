import { z } from 'zod';
import { latitudeField, longitudeField } from './common';

export const routeQuerySchema = z.object({
  fromLat: latitudeField,
  fromLng: longitudeField,
  toLat: latitudeField,
  toLng: longitudeField,
});

export type RouteQuery = z.infer<typeof routeQuerySchema>;
