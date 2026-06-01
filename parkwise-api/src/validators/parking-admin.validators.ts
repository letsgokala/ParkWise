import { z } from 'zod';

export const updateAvailabilitySchema = z.object({
  availableSpaces: z.coerce.number().int().nonnegative().max(100_000),
});

export const updatePriceSchema = z.object({
  hourlyPrice: z.coerce.number().nonnegative().max(100_000),
});

export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;
export type UpdatePriceInput = z.infer<typeof updatePriceSchema>;
