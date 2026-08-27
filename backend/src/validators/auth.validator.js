// backend/src/validators/auth.validator.js
import { z } from 'zod';

export const loginSchema = z.object({
  email:    z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword:     z.string().min(8, 'New password must be at least 8 characters'),
});

// Phase 8: activation endpoint validator
export const activateAccountSchema = z.object({
  token:       z.string().min(64, 'Invalid activation token'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

// Phase 10: refreshTokenSchema removed — the refresh endpoint is being removed.
// The frontend never integrated token refresh; the endpoint was dead code.

export default {
  loginSchema,
  changePasswordSchema,
  activateAccountSchema,
};
