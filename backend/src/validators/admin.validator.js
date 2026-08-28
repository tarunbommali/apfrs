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
        month: z.union([z.string(), z.number()]).optional(),
        year: z.union([z.string(), z.number()]).optional(),
        stats: z.any().optional(),
      })
    )
    .optional(),
  month: z.union([z.string(), z.number()]).optional(),
  year: z.union([z.string(), z.number()]).optional(),
  facultyIds: z.array(z.string()).optional(),
  emailTemplate: z
    .object({
      subject: z.string().optional(),
      html: z.string().optional(),
    })
    .optional(),
  sentBy: z.string().optional(),
});

export const departmentCreateSchema = z.object({
  name: z.string().min(1, 'Department name is required'),
  code: z.string().min(1, 'Department code is required'),
  description: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).optional(),
  hodId: z.string().optional().nullable(),
  eapcet_code: z.string().optional().nullable(),
  eapcetCode: z.string().optional().nullable(),
  branch_code: z.string().optional().nullable(),
  branchCode: z.string().optional().nullable(),
});

export const departmentUpdateSchema = departmentCreateSchema.partial();

export const departmentStatusSchema = z.object({
  status: z.enum(['active', 'inactive'], {
    errorMap: () => ({ message: 'Status must be active or inactive' }),
  }),
});

export const departmentInchargeSchema = z.object({
  hodId: z.string().nullable().optional(),
  role: z.enum(VALID_INCHARGE_ROLES).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format').optional().nullable(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format').optional().nullable(),
});

export default {
  facultyCreateSchema,
  facultyUpdateSchema,
  inchargeCreateSchema,
  inchargeUpdateSchema,
  attendanceSendSchema,
  departmentCreateSchema,
  departmentUpdateSchema,
  departmentStatusSchema,
  departmentInchargeSchema,
};
