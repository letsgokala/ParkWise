import { z } from 'zod';

export const setMockAvailabilitySchema = z.object({
  availableSpaces: z.coerce.number().int().nonnegative().max(100_000),
});

export type SetMockAvailabilityInput = z.infer<typeof setMockAvailabilitySchema>;
