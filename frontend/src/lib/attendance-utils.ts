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
  const raw: string = record?.jobStatus ?? record?.job_status ?? "Regular";
  const normalised = raw.trim().toLowerCase();
  if (normalised === "regular") return "Regular";
  if (normalised === "contract") return "Contract";
  // Fallback: title-case whatever value comes in
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
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

export function calculateTotalWorkingHours(dailyRecords: any[]): string {
  let totalMinutes = 0;
  (dailyRecords || []).forEach((d: any) => {
    if (d.inTime && d.outTime) {
      const [inH, inM, inS] = d.inTime.split(':').map(Number);
      const [outH, outM, outS] = d.outTime.split(':').map(Number);
      const diffMs = new Date(2000, 0, 1, outH, outM, outS || 0).getTime() - new Date(2000, 0, 1, inH, inM, inS || 0).getTime();
      if (diffMs > 0) {
        totalMinutes += Math.floor(diffMs / 60000);
      }
    }
  });
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export function normalizeDepartmentCode(
  dept: string | null | undefined,
  managedDepts: Array<{ code?: string; name?: string }> = []
): string {
  if (!dept) return "Uncategorized";
  const clean = dept.trim();
  const lower = clean.toLowerCase();

  // 1. Direct match on code or name from managed departments
  for (const md of managedDepts) {
    if (md.code && md.code.toLowerCase() === lower) return md.code;
    if (md.name && md.name.toLowerCase() === lower) return md.code || md.name;
  }

  // 2. Standard aliases mapping to college managed department codes
  if (lower === "ce" || lower === "civil" || lower.includes("civil")) return "CIVIL";
  if (lower === "cse" || lower.includes("computer science")) return "CSE";
  if (lower === "ece" || lower.includes("electronics & communication") || lower.includes("electronics and communication")) return "ECE";
  if (lower === "eee" || lower.includes("electrical & electronics") || lower.includes("electrical and electronics")) return "EEE";
  if (lower === "it" || lower.includes("information technology")) return "IT";
  if (lower === "me" || lower === "mech" || lower.includes("mechanical")) return "ME";
  if (lower === "met" || lower.includes("metallurg")) return "MET";
  if (
    lower === "bs&hss" ||
    lower === "bsh" ||
    lower === "bs&h" ||
    lower.includes("basic science") ||
    lower === "math" ||
    lower === "maths" ||
    lower.includes("mathematics") ||
    lower === "physics" ||
    lower === "chemistry" ||
    lower === "commerce" ||
    lower === "humanities" ||
    lower === "english"
  ) {
    return "BS&HSS";
  }

  return clean;
}

