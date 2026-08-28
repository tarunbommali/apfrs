import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";
import type { Faculty, JobStatus, InchargeAssignment } from "./apfrs-data";

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
      qc.invalidateQueries({ queryKey: ["attendance"] });
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

// ─── Faculty Incharge Assignments ───────────────────────────────────────────

export const facultyInchargeQuery = (facultyId: string) =>
  queryOptions({
    queryKey: ["faculty", "incharge", facultyId],
    queryFn: () =>
      apiFetch<{
        facultyId: string;
        currentIncharge: InchargeAssignment | null;
        inchargeHistory: InchargeAssignment[];
      }>(`/api/admin/faculty/${facultyId}/incharge`),
    enabled: !!facultyId,
  });

export function useCreateInchargeAssignment(facultyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { role: string; startDate: string; endDate?: string | null }) =>
      apiFetch<{ assignment: InchargeAssignment; message: string }>(`/api/admin/faculty/${facultyId}/incharge`, {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faculty"] });
    },
  });
}

export function useUpdateInchargeAssignment(facultyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      ...data
    }: {
      assignmentId: string;
      role?: string;
      startDate?: string;
      endDate?: string | null;
    }) =>
      apiFetch<{ assignment: InchargeAssignment; message: string }>(
        `/api/admin/faculty/${facultyId}/incharge/${assignmentId}`,
        {
          method: "PUT",
          body: data,
        }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faculty"] });
    },
  });
}

export function useEndInchargeAssignment(facultyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, endDate }: { assignmentId: string; endDate?: string }) =>
      apiFetch<{ assignment: InchargeAssignment; message: string }>(
        `/api/admin/faculty/${facultyId}/incharge/${assignmentId}/end`,
        {
          method: "POST",
          body: { endDate },
        }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faculty"] });
    },
  });
}

export function useDeleteInchargeAssignment(facultyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) =>
      apiFetch<{ success: boolean; message: string }>(
        `/api/admin/faculty/${facultyId}/incharge/${assignmentId}`,
        {
          method: "DELETE",
        }
      ),
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
  status: "pending" | "processing" | "completed" | "failed" | "partial_failed";
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

export const facultyMonthlyAttendanceQuery = (month?: string, year?: string) => {
  const params = new URLSearchParams();
  if (month) params.append("month", month);
  if (year) params.append("year", year);
  const qStr = params.toString() ? `?${params.toString()}` : "";
  return queryOptions({
    queryKey: ["faculty", "attendance", "monthly", month, year],
    queryFn: () => apiFetch<{ attendance: any[]; monthlyRecords: any }>("/api/faculty/attendance" + qStr),
  });
};

export const facultyDepartmentQuery = () =>
  queryOptions({
    queryKey: ["faculty", "department"],
    queryFn: () => apiFetch<{ stats: unknown }>("/api/faculty/department"),
  });

// ─── Email Send ───────────────────────────────────────────────────────────────

export type SendAttendancePayload = {
  attendanceData?: unknown[];
  emailTemplate?: string;
  sentBy?: string;
  month?: number;
  year?: number;
  facultyIds?: string[];
  forceResend?: boolean;
};

export function useSendAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SendAttendancePayload) =>
      apiFetch<{ success: boolean; message: string; batchId: string }>("/api/admin/attendance/send", { method: "POST", body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["batches"] });
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useRetryBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) =>
      apiFetch<{ success: boolean; message: string; batchId: string }>(
        `/api/admin/attendance/batches/${batchId}/retry`,
        { method: "POST" }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["batches"] });
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export type BatchItem = {
  id: string;
  faculty_id: string;
  employee_id: string;
  employee_name: string;
  email: string;
  month: string;
  year: string;
  status: "queued" | "processing" | "sent" | "failed";
  attempts: number;
  provider: string | null;
  message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export const batchItemsQuery = (batchId: string) =>
  queryOptions({
    queryKey: ["batch-items", batchId],
    queryFn: () =>
      apiFetch<{ items: BatchItem[]; total: number }>(
        `/api/admin/attendance/batches/${batchId}/items`
      ),
    enabled: !!batchId,
    staleTime: 5_000,
  });

export function useRetryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recordId: string) =>
      apiFetch<{ success: boolean; message: string }>(
        `/api/admin/attendance/records/${recordId}/retry`,
        { method: "POST" }
      ),
    onSuccess: (_data, _recordId, _ctx) => {
      qc.invalidateQueries({ queryKey: ["batch-items"] });
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

// ─── Monthly Attendance (Database-Backed) ───────────────────────────────────

export type MonthlyAttendanceResponse = {
  month: number;
  year: number;
  fileName: string;
  totalFaculty: number;
  records: any[];
  sheet?: {
    id: string;
    month: number;
    year: number;
    fileName: string;
    totalFaculty: number;
    uploadedBy: string;
    createdAt: string;
  };
};

export const monthlyAttendanceQuery = (month?: number, year?: number) => {
  const qs = new URLSearchParams();
  if (month) qs.set("month", String(month));
  if (year) qs.set("year", String(year));
  const queryStr = qs.toString();

  return queryOptions({
    queryKey: ["attendance", "monthly", month, year],
    queryFn: () =>
      apiFetch<MonthlyAttendanceResponse>(`/api/admin/attendance/records${queryStr ? `?${queryStr}` : ""}`),
  });
};

export const attendanceMonthsQuery = () =>
  queryOptions({
    queryKey: ["attendance", "months"],
    queryFn: () =>
      apiFetch<{ months: Array<{ id: string; month: number; year: number; fileName: string; totalFaculty: number }> }>("/api/admin/attendance/months"),
  });

export type CalendarHoliday = {
  id: string;
  date: string;
  name: string;
  label?: string;
  type?: "Public holiday" | "Institutional" | "Academic" | "Vacation" | string;
  description?: string;
};

export const calendarQuery = (month?: number, year?: number) => {
  const qs = new URLSearchParams();
  if (month) qs.set("month", String(month));
  if (year) qs.set("year", String(year));
  const queryStr = qs.toString();

  return queryOptions({
    queryKey: ["academic-calendar", month ?? "all", year ?? "all"],
    queryFn: () =>
      apiFetch<{
        holidays: CalendarHoliday[];
        month?: number;
        year?: number;
        totalDays?: number;
        workingDays?: number;
        sundaysCount?: number;
      }>(`/api/admin/calendar${queryStr ? `?${queryStr}` : ""}`),
  });
};

export function useAddHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { date: string; name: string; type: string }) =>
      apiFetch<{ holiday: CalendarHoliday; message: string }>("/api/admin/calendar/holidays", {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academic-calendar"] });
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useUpdateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; date: string; name: string; type: string }) =>
      apiFetch<{ holiday: CalendarHoliday; message: string }>(`/api/admin/calendar/holidays/${id}`, {
        method: "PUT",
        body: payload,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academic-calendar"] });
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ success: boolean; message: string }>(`/api/admin/calendar/holidays/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academic-calendar"] });
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useSyncCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (holidays: CalendarHoliday[]) =>
      apiFetch<{ success: boolean; holidays: CalendarHoliday[]; message: string }>("/api/admin/calendar", {
        method: "POST",
        body: { holidays },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academic-calendar"] });
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useImportAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { records: any[]; month: number; year: number; fileName: string }) =>
      apiFetch<{ success: boolean; message: string; data: MonthlyAttendanceResponse }>("/api/admin/attendance/import", {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
      qc.invalidateQueries({ queryKey: ["faculty"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

// ─── Email Configuration & Multi-Provider Settings ─────────────────────────

export type EmailConfigSettings = {
  id: string;
  active_provider: "smtp" | "resend";
  fallback_enabled: boolean | number;
  fallback_order: "smtp_first" | "resend_first";
  smtp_host: string;
  smtp_port: number;
  smtp_encryption: "none" | "tls" | "ssl";
  smtp_username: string;
  smtp_password?: string;
  smtp_pool_size: number;
  smtp_timeout: number;
  resend_api_key?: string;
  resend_domain: string;
  resend_webhook_url?: string;
  resend_tag: string;
  from_name: string;
  from_email: string;
  reply_to: string;
  subject_template: string;
  signature?: string;
  retries: number;
  batch_delay: number;
  sandbox_mode: boolean | number;
  hasSmtpPassword?: boolean;
  hasResendApiKey?: boolean;
  updated_at?: string;
};

export type EmailConfigLog = {
  id: string;
  updated_by: string;
  changed_fields: Array<{ field: string; old: any; new: any }> | string;
  summary: string;
  created_at: string;
};

export const emailConfigQuery = () =>
  queryOptions({
    queryKey: ["email-config", "settings"],
    queryFn: () =>
      apiFetch<{ settings: EmailConfigSettings; logs: EmailConfigLog[] }>("/api/admin/email-config"),
  });

export const emailConfigLogsQuery = () =>
  queryOptions({
    queryKey: ["email-config", "logs"],
    queryFn: () =>
      apiFetch<{ logs: EmailConfigLog[] }>("/api/admin/email-config/logs"),
  });

export function useUpdateEmailConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<EmailConfigSettings> & Record<string, any>) =>
      apiFetch<{ settings: EmailConfigSettings; message: string }>("/api/admin/email-config", {
        method: "PUT",
        body: payload,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-config"] });
    },
  });
}

export function useSendTestEmail() {
  return useMutation({
    mutationFn: (payload: { recipientEmail: string; providerOverride?: string; tempConfig?: Record<string, any> }) =>
      apiFetch<{ message: string; error?: string; result: { success: boolean; messageId: string; providerUsed: string; durationMs: number } }>(
        "/api/admin/email-config/test",
        {
          method: "POST",
          body: payload,
        }
      ),
  });
}

// ─── Departments Management (TanStack Query Hooks) ──────────────────────────

export type Department = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: "active" | "inactive";
  hod_id: string | null;
  hod_name?: string | null;
  hod_email?: string | null;
  hod_photo_url?: string | null;
  faculty_count?: number;
  eapcet_code?: string | null;
  branch_code?: string | null;
  eapcetCode?: string | null;
  branchCode?: string | null;
  created_at: string;
  updated_at: string;
};

export const departmentsQuery = (filters: { status?: string; search?: string } = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  const qs = params.toString();

  return queryOptions({
    queryKey: ["departments", filters],
    queryFn: () =>
      apiFetch<{ departments: Department[] }>(
        `/api/admin/departments${qs ? `?${qs}` : ""}`,
      ),
  });
};

export const departmentByIdQuery = (id: string) =>
  queryOptions({
    queryKey: ["departments", "detail", id],
    queryFn: () =>
      apiFetch<{ department: Department }>(`/api/admin/departments/${id}`),
    enabled: !!id,
  });

export const departmentFacultyQuery = (id: string) =>
  queryOptions({
    queryKey: ["departments", "faculty", id],
    queryFn: () =>
      apiFetch<{ faculty: Faculty[] }>(`/api/admin/departments/${id}/faculty`),
    enabled: !!id,
  });

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      code: string;
      description?: string;
      status?: "active" | "inactive";
      hodId?: string | null;
      eapcet_code?: string | null;
      branch_code?: string | null;
    }) =>
      apiFetch<{ department: Department; message: string }>("/api/admin/departments", {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useUpdateDepartment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name?: string;
      code?: string;
      description?: string | null;
      status?: "active" | "inactive";
      eapcet_code?: string | null;
      branch_code?: string | null;
    }) =>
      apiFetch<{ department: Department; message: string }>(`/api/admin/departments/${id}`, {
        method: "PUT",
        body: data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ success: boolean; message: string }>(`/api/admin/departments/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useAssignDepartmentIncharge(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { hodId: string | null; role: string; startDate?: string | null; endDate?: string | null }) =>
      apiFetch<{ department: Department; message: string }>(`/api/admin/departments/${id}/incharge`, {
        method: "PUT",
        body: data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      qc.invalidateQueries({ queryKey: ["faculty"] });
    },
  });
}

export function useUpdateDepartmentStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: "active" | "inactive") =>
      apiFetch<{ department: Department; message: string }>(`/api/admin/departments/${id}/status`, {
        method: "PUT",
        body: { status },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

