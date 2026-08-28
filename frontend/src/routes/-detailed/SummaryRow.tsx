import {
  getAttendancePct,
  getJobStatus,
  getPresentDays,
  getAbsentDays,
  getLeaveDays,
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
      <td className="py-3 px-4 font-medium text-foreground">{record.department || "—"}</td>
      <td className="py-3 px-4 text-muted-foreground">{record.designation || "—"}</td>
      <td className="py-3 px-4 text-center">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
            isRegular
              ? "bg-[var(--badge-accent-bg)] text-[var(--badge-accent-fg)] border-[rgba(94,106,210,0.2)]"
              : "bg-[var(--badge-muted-bg)] text-[var(--badge-muted-fg)] border-[rgba(255,255,255,0.08)]"
          }`}
        >
          {getJobStatus(record)}
        </span>
      </td>
      <td className="py-3 px-3 text-center font-mono font-bold text-[var(--status-present-fg)]">
        {getPresentDays(record)}
      </td>
      <td className="py-3 px-3 text-center font-mono font-bold text-[var(--status-absent-fg)]">
        {getAbsentDays(record)}
      </td>
      <td className="py-3 px-3 text-center font-mono font-medium text-[var(--status-leave-fg)]">
        {getLeaveDays(record)}
      </td>
      <td className="py-3 px-3 text-center font-mono text-muted-foreground">
        {getWorkingDays(record, workingDays)}
      </td>
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
