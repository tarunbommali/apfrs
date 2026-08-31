import {
  getAttendancePct,
  getJobStatus,
  getPresentDays,
  getWorkingDays,
} from "@/lib/attendance-utils";

interface SummaryRowProps {
  record: any;
  index: number;
  workingDays: number;
}

export function SummaryRow({ record, index, workingDays }: SummaryRowProps) {
  const pct = getAttendancePct(record);
  const isLow = pct < 75;
  const isRegular = getJobStatus(record).toLowerCase() === "regular";
  const present = getPresentDays(record);
  const working = getWorkingDays(record, workingDays);

  return (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="py-3 px-4 text-center font-mono text-muted-foreground">{index + 1}</td>
      <td className="py-3 px-4 font-mono font-medium text-foreground">
        {record.cfmsId || record.cfms_id || "—"}
      </td>
      <td className="py-3 px-4">
        <div className="font-semibold text-foreground">{record.name}</div>
        <div className="text-[10px] text-muted-foreground font-mono">{record.email || ""}</div>
      </td>
      <td className="py-3 px-4">
        <span className="inline-flex items-center font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[var(--badge-accent-bg)] text-[var(--badge-accent-fg)] border border-primary/20">
          {record.department || "—"}
        </span>
      </td>
      <td className="py-3 px-4 text-muted-foreground">{record.designation || "—"}</td>
      <td className="py-3 px-4 text-center">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
            isRegular
              ? "bg-[var(--badge-accent-bg)] text-[var(--badge-accent-fg)] border-primary/20"
              : "bg-muted text-muted-foreground border-border"
          }`}
        >
          {getJobStatus(record)}
        </span>
      </td>

      {/* Present / Working Days — merged column */}
      <td className="py-3 px-3 text-center font-mono">
        <span className={present > 0 ? "font-bold text-[var(--status-present-fg)]" : "text-muted-foreground"}>
          {present}
        </span>
        <span className="text-muted-foreground mx-0.5">/</span>
        <span className="text-muted-foreground">{working}</span>
      </td>

      {/* Attendance % */}
      <td className="py-3 px-4 text-right">
        <span
          className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-xs ${
            isLow
              ? "bg-[var(--status-absent-bg)] text-[var(--status-absent-fg)]"
              : "bg-[var(--status-present-bg)] text-[var(--status-present-fg)]"
          }`}
        >
          {pct}%
        </span>
      </td>
    </tr>
  );
}
