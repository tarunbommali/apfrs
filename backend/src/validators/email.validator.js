// backend/src/validators/email.validator.js
import { z } from 'zod';

export const emailSchema = z.object({
  config: z
    .object({
      host: z.string().optional(),
      port: z.union([z.number(), z.string()]).optional(),
      secure: z.boolean().optional(),
      user: z.string().optional(),
      password: z.string().optional(),
      pass: z.string().optional(),
    })
    .optional(),
  emailData: z.object({
    to: z.union([z.string(), z.array(z.string())]),
    from: z.string().optional(),
    subject: z.string(),
    html: z.string().optional(),
    text: z.string().optional(),
    replyTo: z.string().optional(),
    attachments: z.array(z.any()).optional(),
  }),
});

export const bulkEmailSchema = z.object({
  config: z
    .object({
      host: z.string().optional(),
      port: z.union([z.number(), z.string()]).optional(),
      secure: z.boolean().optional(),
      user: z.string().optional(),
      password: z.string().optional(),
      pass: z.string().optional(),
    })
    .optional(),
  emails: z
    .array(
      z.object({
        to: z.union([z.string(), z.array(z.string())]),
        from: z.string().optional(),
        subject: z.string().optional(),
        html: z.string().optional(),
        text: z.string().optional(),
        employeeId: z.string().optional(),
        employeeName: z.string().optional(),
      })
    )
    .min(1, 'At least one email is required'),
});

export const testSMTPSchema = z.object({
  config: z
    .object({
      host: z.string().optional(),
      port: z.union([z.number(), z.string()]).optional(),
      secure: z.boolean().optional(),
      user: z.string().optional(),
      password: z.string().optional(),
      pass: z.string().optional(),
    })
    .optional(),
});

export default {
  emailSchema,
  bulkEmailSchema,
  testSMTPSchema,
};
