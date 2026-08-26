import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";
import type { Faculty, JobStatus } from "./apfrs-data";

// ─── Faculty ─────────────────────────────────────────────────────────────────

export type FacultyListFilters = {
  search?: string;
  department?: string;
  job_status?: JobStatus;
  page?: number;
  limit?: number;
};

type PaginatedFaculty = {
  faculty: Faculty[];
  total: number;
  page: number;
  limit: number;
};

export const facultyListQuery = (filters: FacultyListFilters = {}) => {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.department && filters.department !== "all")
    params.set("department", filters.department);
  if (filters.job_status) params.set("job_status", filters.job_status);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();

  return queryOptions({
    queryKey: ["faculty", "list", filters],
    queryFn: () =>
      apiFetch<PaginatedFaculty>(`/api/admin/faculty${qs ? `?${qs}` : ""}`),
  });
};

export const facultyByIdQuery = (id: string) =>
  queryOptions({
    queryKey: ["faculty", "detail", id],
    queryFn: () => apiFetch<{ faculty: Faculty }>(`/api/admin/faculty/${id}`),
    enabled: !!id,
  });

export function useCreateFaculty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Faculty, "id">) =>
      apiFetch<{ faculty: Faculty }>("/api/admin/faculty", { method: "POST", body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faculty"] });
    },
  });
}

export function useUpdateFaculty(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Faculty>) =>
      apiFetch<{ faculty: Faculty }>(`/api/admin/faculty/${id}`, {
        method: "PUT",
        body: data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faculty"] });
    },
  });
}

export function useDeleteFaculty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/admin/faculty/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faculty"] });
    },
  });
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export type AdminStats = {
  stats: {
    faculty: {
      total: number;
      byDepartment: Array<{ department: string; count: number }>;
      byJobStatus: Array<{ job_status: string; count: number }>;
    };
    attendance: {
      totalBatches: number;
      lastBatch?: {
        id: string;
        month: string;
        year: string;
        total: number;
        sent: number;
        failed: number;
      };
    };
    lastUpdated: string;
  };
};

export const statsQuery = () =>
  queryOptions({
    queryKey: ["admin", "stats"],
    queryFn: () => apiFetch<AdminStats>("/api/admin/stats"),
    staleTime: 60_000,
  });

// ─── Attendance Batches ───────────────────────────────────────────────────────

export type EmailBatch = {
  id: string;
  month: string;
  year: string;
  triggered_by: string;
  total: number;
  sent: number;
  failed: number;
  created_at: string;
  status: "pending" | "processing" | "completed" | "failed";
};

export const batchesQuery = (filters: { page?: number; limit?: number } = {}) => {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();

  return queryOptions({
    queryKey: ["batches", filters],
    queryFn: () =>
      apiFetch<{ batches: EmailBatch[]; total: number }>(
        `/api/admin/attendance/batches${qs ? `?${qs}` : ""}`,
      ),
    staleTime: 30_000,
  });
};

// ─── Faculty Profile (Faculty role) ──────────────────────────────────────────

export type FacultyProfile = {
  id: string;
  name: string;
  email: string;
  cfmsId: string;
  designation: string;
  department: string;
  mobile: string;
  jobStatus: JobStatus;
};

export const facultyProfileQuery = () =>
  queryOptions({
    queryKey: ["faculty", "profile"],
    queryFn: () => apiFetch<{ profile: FacultyProfile }>("/api/faculty/profile"),
  });

export const facultyAttendanceQuery = () =>
  queryOptions({
    queryKey: ["faculty", "attendance"],
    queryFn: () => apiFetch<{ attendance: unknown[] }>("/api/faculty/attendance"),
  });

export const facultyDepartmentQuery = () =>
  queryOptions({
    queryKey: ["faculty", "department"],
    queryFn: () => apiFetch<{ stats: unknown }>("/api/faculty/department"),
  });

// ─── Email Send ───────────────────────────────────────────────────────────────

export type SendAttendancePayload = {
  attendanceData: unknown[];
  emailTemplate?: string;
  sentBy?: string;
};

export function useSendAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SendAttendancePayload) =>
      apiFetch("/api/admin/attendance/send", { method: "POST", body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["batches"] });
    },
  });
}

export function useSendEmail() {
  return useMutation({
    mutationFn: (payload: {
      to: string;
      subject: string;
      html: string;
      smtpConfig: Record<string, unknown>;
      attachments?: unknown[];
    }) => apiFetch("/api/send-email", { method: "POST", body: payload }),
  });
}
