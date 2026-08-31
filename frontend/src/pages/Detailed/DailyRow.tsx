import { DailyCell } from "./DailyCell";
import {
  getAttendancePct,
  getJobStatus,
  getPresentDays,
  getAbsentDays,
  tierTextClassFromPct,
} from "@/lib/attendance-utils";

interface DailyRowProps {
  record: any;
  index: number;
  dayNumbers: number[];
}

export function DailyRow({ record, index, dayNumbers }: DailyRowProps) {
  const daily = Array.isArray(record.attendance)
    ? record.attendance
    : Array.isArray(record.dailyRecords)
    ? record.dailyRecords
    : Array.isArray(record.daily_records)
    ? record.daily_records
    : [];

  const pct = getAttendancePct(record);

  return (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="py-2.5 px-3 text-center font-mono text-muted-foreground sticky left-0 bg-card z-10">
        {index + 1}
      </td>
      <td className="py-2.5 px-4 sticky left-10 bg-card z-10 border-r border-border">
        <div className="font-semibold text-foreground truncate">{record.name}</div>
        <div className="text-[10px] text-muted-foreground truncate">
          {record.department} · {getJobStatus(record)}
        </div>
      </td>

      {dayNumbers.map((dayNum) => {
        const dayPad = String(dayNum).padStart(2, "0");
        const rec = daily[dayNum - 1] || daily.find((d: any) => String(d?.date).endsWith(`-${dayPad}`));
        const status = rec?.status || "—";
        return (
          <td key={dayNum} className="py-2 px-1 text-center font-mono">
            <DailyCell status={status} />
          </td>
        );
      })}

      <td className="py-2.5 px-3 text-center font-mono font-bold text-[var(--status-present-fg)] border-l border-border bg-card sticky right-16">
        {getPresentDays(record)}
      </td>
      <td className="py-2.5 px-3 text-center font-mono font-bold text-[var(--status-absent-fg)] bg-card sticky right-8">
        {getAbsentDays(record)}
      </td>
      <td className="py-2.5 px-3 text-right font-mono font-bold bg-card sticky right-0">
        <span className={tierTextClassFromPct(pct)}>
          {pct}%
        </span>
      </td>
    </tr>
  );
}
