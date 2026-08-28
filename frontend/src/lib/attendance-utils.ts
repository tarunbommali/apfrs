// backend/src/controllers/faculty.controller.js and database models return attendance percentage
// under different keys (attendancePercentage, percentage, attendance_percentage).
// This utility function consolidates them safely.
export function getAttendancePct(record: any): number {
  const raw =
    record?.attendancePercentage ??
    record?.percentage ??
    record?.attendance_percentage ??
    0;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

export function getPresentDays(record: any): number {
  return parseInt(record?.presentDays ?? record?.present_days ?? 0, 10) || 0;
}

export function getAbsentDays(record: any): number {
  return parseInt(record?.absentDays ?? record?.absent_days ?? 0, 10) || 0;
}

export function getLeaveDays(record: any): number {
  return parseInt(record?.leaveDays ?? record?.leave_days ?? 0, 10) || 0;
}

export function getWorkingDays(record: any, fallback = 0): number {
  return (
    parseInt(record?.totalWorkingDays ?? record?.total_working_days ?? 0, 10) ||
    fallback
  );
}

export function getCfmsId(record: any): string {
  return record?.cfmsId ?? record?.cfms_id ?? "";
}

export function getJobStatus(record: any): string {
  return record?.jobStatus ?? record?.job_status ?? "Regular";
}

// Attendance policy thresholds. Change the numbers once, every screen follows.
export type AttendanceTier = "high" | "normal" | "low";

export function attendanceTier(pct: number): AttendanceTier {
  if (pct >= 90) return "high";
  if (pct < 75) return "low";
  return "normal";
}

// Maps a tier to the existing CSS variables already used across the app.
export function tierTextClass(tier: AttendanceTier): string {
  switch (tier) {
    case "high":
      return "text-[var(--status-present-fg)] font-semibold";
    case "low":
      return "text-[var(--status-absent-fg)] font-semibold";
    default:
      return "text-foreground";
  }
}

export function tierTextClassFromPct(pct: number): string {
  return tierTextClass(attendanceTier(pct));
}
