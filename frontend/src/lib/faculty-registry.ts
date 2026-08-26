/**
 * Faculty registry — now backed by the real REST API.
 * The hook uses TanStack Query; mutations invalidate the list cache automatically.
 * The Zod schema is kept for form validation in the add/edit forms.
 */
import { z } from "zod";
import type { JobStatus } from "@/lib/apfrs-data";

export { type Faculty } from "@/lib/apfrs-data";

export const jobStatuses: JobStatus[] = ["Regular", "contract", "AEE", "N/A"];

export const facultySchema = z.object({
  cfmsId: z
    .string()
    .trim()
    .min(4, "CFMS ID must be at least 4 characters")
    .max(20, "CFMS ID must be under 20 characters")
    .regex(/^[0-9A-Za-z-]+$/, "CFMS ID may contain letters, numbers and hyphens only"),
  name: z.string().trim().min(2, "Name is required").max(100, "Name must be under 100 characters"),
  email: z.string().trim().email("Enter a valid email").max(255, "Email is too long"),
  designation: z.string().trim().min(2, "Designation is required").max(80, "Designation is too long"),
  department: z.string().trim().min(1, "Department is required").max(40, "Department is too long"),
  mobile: z.string().trim().regex(/^[0-9]{10}$/, "Mobile must be exactly 10 digits"),
  jobStatus: z.enum(["Regular", "contract", "AEE", "N/A"]),
  present: z.coerce.number().int().min(0).max(31).default(0),
  absent: z.coerce.number().int().min(0).max(31).default(0),
  leave: z.coerce.number().int().min(0).max(31).default(0),
  workingDays: z.coerce.number().int().min(1).max(31).default(24),
});

export type FacultyInput = z.infer<typeof facultySchema>;

// Re-export query hooks from queries.ts so consumers only need one import
export {
  facultyListQuery,
  facultyByIdQuery,
  useCreateFaculty,
  useUpdateFaculty,
  useDeleteFaculty,
} from "@/lib/queries";
