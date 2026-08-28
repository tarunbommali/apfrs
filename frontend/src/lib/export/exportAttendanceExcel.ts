import {
  getAttendancePct,
  getPresentDays,
  getAbsentDays,
  getLeaveDays,
  getWorkingDays,
  getCfmsId,
  getJobStatus,
} from "@/lib/attendance-utils";
import { monthName } from "@/lib/constants";

function buildSummaryRow(r: any, idx: number, fallbackWorkingDays: number) {
  return {
    "S.No": idx + 1,
    "CFMS ID": getCfmsId(r),
    "Faculty Name": r.name ?? "",
    "Department": r.department ?? "",
    "Designation": r.designation ?? "",
    "Cadre": getJobStatus(r),
    "Present Days": getPresentDays(r),
    "Absent Days": getAbsentDays(r),
    "Leave Days": getLeaveDays(r),
    "Total Working Days": getWorkingDays(r, fallbackWorkingDays),
    "Attendance %": `${getAttendancePct(r)}%`,
  };
}

function buildDailyRow(r: any, idx: number, dayNumbers: number[]) {
  const daily = Array.isArray(r.attendance)
    ? r.attendance
    : Array.isArray(r.dailyRecords)
    ? r.dailyRecords
    : Array.isArray(r.daily_records)
    ? r.daily_records
    : [];

  const row: Record<string, any> = {
    "S.No": idx + 1,
    "CFMS ID": getCfmsId(r),
    "Faculty Name": r.name ?? "",
    "Department": r.department ?? "",
    "Designation": r.designation ?? "",
    "Cadre": getJobStatus(r),
  };

  dayNumbers.forEach((day) => {
    const pad = String(day).padStart(2, "0");
    const rec = daily[day - 1] ?? daily.find((d: any) => String(d?.date).endsWith(`-${pad}`));
    row[`Day ${day}`] = rec?.status ?? "—";
  });

  row["Present"] = getPresentDays(r);
  row["Absent"] = getAbsentDays(r);
  row["Leaves"] = getLeaveDays(r);
  row["Working Days"] = getWorkingDays(r);
  row["Attendance %"] = `${getAttendancePct(r)}%`;

  return row;
}

/**
 * Single-sheet attendance export. Covers both the summary view (reports.tsx)
 * and the daily grid view (detailed.tsx) — pass `dayNumbers` for the daily
 * breakdown, omit it for a plain summary sheet.
 */
export async function exportAttendanceExcel(
  records: any[],
  month: number,
  year: number,
  options?: { dayNumbers?: number[]; fallbackWorkingDays?: number; sheetLabel?: string }
) {
  if (!records.length) {
    throw new Error("No records to export.");
  }

  const XLSX = await import("xlsx");
  const name = monthName(month);
  const label = options?.sheetLabel ?? (options?.dayNumbers ? "Daily" : "Summary");

  const rows = options?.dayNumbers
    ? records.map((r, i) => buildDailyRow(r, i, options.dayNumbers!))
    : records.map((r, i) => buildSummaryRow(r, i, options?.fallbackWorkingDays ?? 0));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${label}_${name}_${year}`.slice(0, 31));
  XLSX.writeFile(wb, `Attendance_${label}_${name}_${year}.xlsx`);

  return rows.length;
}
