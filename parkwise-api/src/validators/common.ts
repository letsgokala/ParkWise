import { z } from 'zod';

// Reusable field schemas shared across all domains.
export const emailField = z.string().trim().email('A valid email is required.').toLowerCase();
export const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(100, 'Password must be at most 100 characters.');
export const nameField = z.string().trim().min(2, 'Name is too short.').max(120);
export const phoneField = z.string().trim().min(7, 'A valid phone number is required.').max(20);
export const latitudeField = z.coerce.number().min(-90).max(90);
export const longitudeField = z.coerce.number().min(-180).max(180);

/** Build a Zod schema for route params containing UUID ids. */
export function uuidParams<K extends string>(...keys: K[]) {
  const shape = Object.fromEntries(keys.map((k) => [k, z.string().uuid('Invalid id.')])) as Record<
    K,
    z.ZodString
  >;
  return z.object(shape);
}
