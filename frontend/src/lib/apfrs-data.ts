/**
 * APFRS shared types.
 *
 * NOTE: All hardcoded data arrays have been removed. Pages now fetch
 * live data from the backend API via TanStack Query (see lib/queries.ts).
 * Attendance data is parsed client-side from Excel uploads and stored
 * in AttendanceContext (see lib/attendance-context.tsx).
 */

export type JobStatus = "Regular" | "contract";

export type InchargeRole = "None" | "HOD" | "Principal" | "Vice Principal" | "Vice Chancellor (VC)" | "Registrar";

export const inchargeRoles: InchargeRole[] = [
  "None",
  "HOD",
  "Principal",
  "Vice Principal",
  "Vice Chancellor (VC)",
  "Registrar",
];

export type Faculty = {
  id: string;
  cfmsId: string;
  name: string;
  email: string;
  designation: string;
  department: string;
  mobile: string;
  gender?: "male" | "female" | "other";
  jobStatus: JobStatus;
  incharge?: InchargeRole | string;
  present: number;
  absent: number;
  leave: number;
  workingDays: number;
};

export type DeliveryStatus = "sent" | "failed" | "pending";

export const departments = [
  "IT",
  "CSE",
  "ECE",
  "EEE",
  "ME",
  "MECH",
  "CIVIL",
  "CE",
  "MET",
  "Math",
  "Maths",
  "Physics",
  "Chemistry",
  "BS&HSS",
  "Commerce",
  "Administration",
];

export const attendancePct = (f: Faculty) =>
  f.workingDays > 0 ? Math.round((f.present / f.workingDays) * 100) : 0;
