// backend/src/validators/admin.validator.js
import { z } from 'zod';
import { JOB_STATUS } from '../config/constants.js';
import { VALID_INCHARGE_ROLES } from '../models/InchargeAssignment.js';

const urlSchema = z
  .string()
  .max(500, 'Photo URL must not exceed 500 characters')
  .refine(
    (val) => !val || /^https?:\/\/.+/i.test(val),
    'Photo URL must start with http:// or https://'
  )
  .nullable()
  .optional();

export const facultyCreateSchema = z.object({
  name: z.string().min(1, 'Faculty name is required'),
  email: z.string().email('Invalid faculty email address'),
  cfms_id: z.string().min(1, 'CFMS ID is required'),
  photo_url: urlSchema,
  photoURL: urlSchema,
  designation: z.string().optional(),
  department: z.string().min(1, 'Department is required'),
  mobile: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  job_status: z.enum(Object.values(JOB_STATUS)).optional(),
});

export const facultyUpdateSchema = facultyCreateSchema.partial();

export const inchargeCreateSchema = z.object({
  role: z.enum(VALID_INCHARGE_ROLES, {
    errorMap: () => ({ message: `Role must be one of: ${VALID_INCHARGE_ROLES.join(', ')}` }),
  }),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
    .nullable()
    .optional(),
});

export const inchargeUpdateSchema = inchargeCreateSchema.partial();

export const attendanceSendSchema = z.object({
  attendanceData: z
    .array(
      z.object({
        employeeId: z.string(),
        employeeName: z.string(),
        email: z.string().email(),
        month: z.string().optional(),
        year: z.union([z.string(), z.number()]).optional(),
        stats: z.any().optional(),
      })
    )
    .min(1, 'At least one attendance record is required'),
  emailTemplate: z
    .object({
      subject: z.string().optional(),
      html: z.string().optional(),
    })
    .optional(),
  sentBy: z.string().optional(),
});

export default {
  facultyCreateSchema,
  facultyUpdateSchema,
  inchargeCreateSchema,
  inchargeUpdateSchema,
  attendanceSendSchema,
};
