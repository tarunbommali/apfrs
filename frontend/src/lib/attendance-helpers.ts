// frontend/src/lib/attendance-helpers.ts
/**
 * Attendance calculation, analytics, and export utilities
 * Adapted from old repo core/attendance and utils/export
 */
import * as XLSX from "xlsx";

export type PerformanceTier = "excellent" | "satisfactory" | "average" | "needs-attention";

export function getPerformanceTier(percentage: number): {
  tier: PerformanceTier;
  label: string;
  badgeClass: string;
  bgHex: string;
  textHex: string;
} {
  if (percentage >= 90) {
    return {
      tier: "excellent",
      label: "Excellent (≥90%)",
      badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
      bgHex: "#ecfdf5",
      textHex: "#059669",
    };
  }
  if (percentage >= 75) {
    return {
      tier: "satisfactory",
      label: "Satisfactory (75-89%)",
      badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
      bgHex: "#eff6ff",
      textHex: "#2563eb",
    };
  }
  if (percentage >= 50) {
    return {
      tier: "average",
      label: "Average (50-74%)",
      badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
      bgHex: "#fffbeb",
      textHex: "#d97706",
    };
  }
  return {
    tier: "needs-attention",
    label: "Needs Attention (<50%)",
    badgeClass: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    bgHex: "#fef2f2",
    textHex: "#dc2626",
  };
}

export function calculateOverallStats(records: any[], workingDaysCount = 27) {
  const totalEmployees = records.length;
  if (totalEmployees === 0) {
    return {
      totalEmployees: 0,
      averagePercentage: 0,
      totalPresent: 0,
      totalAbsent: 0,
      workingDays: workingDaysCount,
      excellentCount: 0,
      satisfactoryCount: 0,
      averageCount: 0,
      needsAttentionCount: 0,
    };
  }

  let totalPctSum = 0;
  let totalPresent = 0;
  let totalAbsent = 0;
  let excellentCount = 0;
  let satisfactoryCount = 0;
  let averageCount = 0;
  let needsAttentionCount = 0;

  for (const r of records) {
    const pDays = r.presentDays ?? r.present_days ?? r.pDays ?? 0;
    const aDays = r.absentDays ?? r.absent_days ?? r.aDays ?? Math.max(0, workingDaysCount - pDays);
    const pct = parseFloat(r.attendancePercentage ?? r.percentage ?? (workingDaysCount > 0 ? ((pDays / workingDaysCount) * 100).toFixed(1) : 0));

    totalPresent += pDays;
    totalAbsent += aDays;
    totalPctSum += pct;

    if (pct >= 90) excellentCount++;
    else if (pct >= 75) satisfactoryCount++;
    else if (pct >= 50) averageCount++;
    else needsAttentionCount++;
  }

  const averagePercentage = Math.round((totalPctSum / totalEmployees) * 10) / 10;

  return {
    totalEmployees,
    averagePercentage,
    totalPresent,
    totalAbsent,
    workingDays: workingDaysCount,
    excellentCount,
    satisfactoryCount,
    averageCount,
    needsAttentionCount,
  };
}

/**
 * Export attendance records to formatted CSV string
 */
export function exportToCSV(records: any[], monthName = "January", year = 2025): string {
  const headers = [
    "S.No",
    "Faculty Name",
    "CFMS ID",
    "Designation",
    "Department",
    "Cadre",
    "Email",
    "Present Days",
    "Total Working Days",
    "Absent Days",
    "Attendance Rate (%)",
  ];

  const rows = records.map((r, idx) => {
    const pDays = r.presentDays ?? r.present_days ?? r.pDays ?? 0;
    const wDays = r.workingDays ?? r.total_working_days ?? r.wDays ?? 27;
    const aDays = r.absentDays ?? r.absent_days ?? r.aDays ?? Math.max(0, wDays - pDays);
    const pct = r.attendancePercentage ?? r.percentage ?? (wDays > 0 ? ((pDays / wDays) * 100).toFixed(1) : 0);

    return [
      idx + 1,
      `"${(r.name || "").replace(/"/g, '""')}"`,
      `"${r.cfmsId || r.cfms_id || ""}"`,
      `"${(r.designation || "").replace(/"/g, '""')}"`,
      `"${(r.department || "").replace(/"/g, '""')}"`,
      `"${r.jobStatus || r.job_status || "Regular"}"`,
      `"${r.email || ""}"`,
      pDays,
      wDays,
      aDays,
      `${pct}%`,
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Export attendance records to multi-sheet Excel Workbook (.xlsx)
 */
export function exportToExcelWorkbook(records: any[], monthName = "January", year = 2025, daysInMonth = 31) {
  const wb = XLSX.utils.book_new();

  // 1. Summary Sheet
  const summaryRows = records.map((r, idx) => {
    const pDays = r.presentDays ?? r.present_days ?? r.pDays ?? 0;
    const wDays = r.workingDays ?? r.total_working_days ?? r.wDays ?? 27;
    const aDays = r.absentDays ?? r.absent_days ?? r.aDays ?? Math.max(0, wDays - pDays);
    const pct = parseFloat(r.attendancePercentage ?? r.percentage ?? (wDays > 0 ? ((pDays / wDays) * 100).toFixed(1) : 0));

    return {
      "S.No": idx + 1,
      "Faculty Name": r.name || "",
      "CFMS ID": r.cfmsId || r.cfms_id || "",
      "Designation": r.designation || "",
      "Department": r.department || "",
      "Cadre": r.jobStatus || r.job_status || "Regular",
      "Email": r.email || "",
      "Present Days": pDays,
      "Total Working Days": wDays,
      "Absent Days": aDays,
      "Attendance %": pct,
    };
  });

  const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, summaryWs, "Monthly Summary");

  // 2. Detailed Daily Matrix Sheet (if daily attendance array exists)
  const detailedRows = records.map((r, idx) => {
    const row: Record<string, any> = {
      "S.No": idx + 1,
      "Faculty Name": r.name || "",
      "CFMS ID": r.cfmsId || r.cfms_id || "",
      "Department": r.department || "",
    };

    const dailyArray = r.daily || r.attendance || [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayRecord = dailyArray[d - 1];
      const status = dayRecord ? (dayRecord.status || (dayRecord.inTime ? "P" : "A")) : "";
      row[`Day ${d}`] = status;
    }

    const pDays = r.presentDays ?? r.present_days ?? r.pDays ?? 0;
    const wDays = r.workingDays ?? r.total_working_days ?? r.wDays ?? 27;
    row["P / W"] = `${pDays} / ${wDays}`;
    return row;
  });

  const detailedWs = XLSX.utils.json_to_sheet(detailedRows);
  XLSX.utils.book_append_sheet(wb, detailedWs, "Daily Matrix");

  // 3. Department Breakdown Sheet
  const deptMap = new Map<string, any[]>();
  records.forEach((r) => {
    const dept = r.department || "General";
    const list = deptMap.get(dept) || [];
    list.push(r);
    deptMap.set(dept, list);
  });

  const deptRows = Array.from(deptMap.entries()).map(([dept, list]) => {
    const total = list.length;
    const totalPct = list.reduce((sum, r) => sum + parseFloat(r.attendancePercentage ?? r.percentage ?? "0"), 0);
    const avgPct = total > 0 ? Math.round((totalPct / total) * 10) / 10 : 0;
    const regularCount = list.filter((r) => (r.jobStatus || r.job_status || "").toLowerCase() === "regular").length;
    const contractCount = total - regularCount;

    return {
      "Department": dept,
      "Total Faculty": total,
      "Regular Cadre": regularCount,
      "Contract Cadre": contractCount,
      "Average Attendance %": avgPct,
    };
  });

  const deptWs = XLSX.utils.json_to_sheet(deptRows);
  XLSX.utils.book_append_sheet(wb, deptWs, "Department Stats");

  // Trigger download
  const fileName = `JNTUGV_APFRS_${monthName}_${year}_Report.xlsx`;
  XLSX.writeFile(wb, fileName);
}
