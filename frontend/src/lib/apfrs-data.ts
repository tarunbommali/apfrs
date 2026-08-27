/**
 * APFRS shared types.
 *
 * NOTE: All hardcoded data arrays have been removed. Pages now fetch
 * live data from the backend API via TanStack Query (see lib/queries.ts).
 */

export type JobStatus = "Regular" | "contract";

export const INCHARGE_ROLES = [
  "HOD",
  "Principal",
  "Vice Principal",
  "Vice Chancellor (VC)",
  "Registrar",
] as const;

export type InchargeRole = (typeof INCHARGE_ROLES)[number];

export const inchargeRoles = INCHARGE_ROLES;

export type InchargeAssignment = {
  id: string;
  facultyId?: string;
  faculty_id?: string;
  role: InchargeRole | string;
  startDate: string;
  start_date?: string;
  endDate: string | null;
  end_date?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Faculty = {
  id: string;
  cfmsId: string;
  cfms_id?: string;
  name: string;
  email: string;
  photoURL?: string | null;
  photo_url?: string | null;
  designation: string;
  department: string;
  mobile: string;
  gender?: "male" | "female" | "other";
  jobStatus: JobStatus;
  job_status?: JobStatus;
  incharge?: string;
  currentIncharge?: InchargeAssignment | null;
  inchargeHistory?: InchargeAssignment[];
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
