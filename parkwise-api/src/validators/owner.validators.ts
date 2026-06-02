import { z } from 'zod';
import {
  emailField,
  latitudeField,
  longitudeField,
  nameField,
  passwordField,
  phoneField,
} from './common';

const apiDetailsSchema = z.object({
  endpointUrl: z.string().trim().url('A valid API endpoint URL is required.'),
  authToken: z.string().trim().min(1, 'API auth token is required.').max(500),
  refreshIntervalSeconds: z.coerce.number().int().min(30).max(86_400).default(300),
});

export const createFacilitySchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    address: z.string().trim().min(2).max(255),
    latitude: latitudeField,
    longitude: longitudeField,
    totalSpaces: z.coerce.number().int().positive().max(100_000),
    availableSpaces: z.coerce.number().int().nonnegative().max(100_000),
    facilityType: z.enum(['MANUAL', 'API_INTEGRATED']).default('MANUAL'),
    hourlyPrice: z.coerce.number().nonnegative().max(100_000),
    congestionLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
    api: apiDetailsSchema.optional(),
  })
  .refine((v) => v.availableSpaces <= v.totalSpaces, {
    message: 'Available spaces cannot exceed total spaces.',
    path: ['availableSpaces'],
  })
  .refine((v) => v.facilityType !== 'API_INTEGRATED' || v.api !== undefined, {
    message: 'API integration details are required for API_INTEGRATED facilities.',
    path: ['api'],
  });

export const updateFacilitySchema = z
  .object({
    name: z.string().trim().min(2).max(160).optional(),
    address: z.string().trim().min(2).max(255).optional(),
    latitude: latitudeField.optional(),
    longitude: longitudeField.optional(),
    totalSpaces: z.coerce.number().int().positive().max(100_000).optional(),
    hourlyPrice: z.coerce.number().nonnegative().max(100_000).optional(),
    congestionLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update.' });

export const createParkingAdminSchema = z.object({
  name: nameField,
  email: emailField,
  phoneNumber: phoneField,
  temporaryPassword: passwordField,
});

export const assignAdminSchema = z.object({
  parkingAdminId: z.string().uuid(),
  notes: z.string().trim().max(500).optional(),
});

export const replaceAssignmentSchema = z.object({
  newParkingAdminId: z.string().uuid(),
  notes: z.string().trim().max(500).optional(),
});

export const updateApiIntegrationSchema = apiDetailsSchema
  .partial()
  .extend({ isEnabled: z.boolean().optional() })
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update.' });

export type CreateFacilityInput = z.infer<typeof createFacilitySchema>;
export type UpdateFacilityInput = z.infer<typeof updateFacilitySchema>;
export type CreateParkingAdminInput = z.infer<typeof createParkingAdminSchema>;
export type AssignAdminInput = z.infer<typeof assignAdminSchema>;
export type ReplaceAssignmentInput = z.infer<typeof replaceAssignmentSchema>;
export type UpdateApiIntegrationInput = z.infer<typeof updateApiIntegrationSchema>;
