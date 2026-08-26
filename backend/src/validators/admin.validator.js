// backend/src/validators/admin.validator.js
import { z } from 'zod';
import { JOB_STATUS } from '../config/constants.js';

export const facultyCreateSchema = z.object({
  name: z.string().min(1, 'Faculty name is required'),
  email: z.string().email('Invalid faculty email address'),
  cfms_id: z.string().min(1, 'CFMS ID is required'),
  designation: z.string().optional(),
  department: z.string().min(1, 'Department is required'),
  mobile: z.string().optional(),
  job_status: z.enum(Object.values(JOB_STATUS)).optional(),
});

export const facultyUpdateSchema = facultyCreateSchema.partial();

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
  attendanceSendSchema,
};
