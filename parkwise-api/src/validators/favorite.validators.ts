import { z } from 'zod';

export const favoriteAlertsSchema = z
  .object({
    notifyOnAvailability: z.boolean().optional(),
    notifyOnPriceDrop: z.boolean().optional(),
  })
  .refine((v) => v.notifyOnAvailability !== undefined || v.notifyOnPriceDrop !== undefined, {
    message: 'Provide at least one alert preference to update.',
  });

export type FavoriteAlertsInput = z.infer<typeof favoriteAlertsSchema>;
