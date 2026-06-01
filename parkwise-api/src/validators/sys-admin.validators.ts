import { z } from 'zod';

export const facilityStatusQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']).optional(),
});

export const reviewSchema = z.object({
  notes: z.string().trim().max(1000).optional(),
});

export const auditQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).default(50),
  entityType: z.string().trim().max(60).optional(),
});

export type FacilityStatusQuery = z.infer<typeof facilityStatusQuerySchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type AuditQuery = z.infer<typeof auditQuerySchema>;
