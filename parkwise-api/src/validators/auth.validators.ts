import { z } from 'zod';
import { emailField, nameField, passwordField, phoneField } from './common';

export const registerDriverSchema = z.object({
  name: nameField,
  email: emailField,
  phoneNumber: phoneField,
  password: passwordField,
});

export const registerOwnerSchema = z.object({
  fullName: nameField,
  organizationName: z.string().trim().min(2, 'Organization name is required.').max(160),
  email: emailField,
  phoneNumber: phoneField,
  password: passwordField,
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required.'),
});

export type RegisterDriverInput = z.infer<typeof registerDriverSchema>;
export type RegisterOwnerInput = z.infer<typeof registerOwnerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
