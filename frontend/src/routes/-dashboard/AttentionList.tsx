import { useMemo } from "react";
import { CheckCircle2 } from "lucide-react";
import { getAttendancePct, tierTextClassFromPct } from "@/lib/attendance-utils";

interface AttendanceRecord {
  id?: string;
  cfmsId?: string;
  cfms_id?: string;
  name: string;
  department?: string;
  designation?: string;
  presentDays?: number;
  present_days?: number;
  absentDays?: number;
  absent_days?: number;
  leaveDays?: number;
  leave_days?: number;
  [key: string]: any;
}

interface AttentionListProps {
  records: AttendanceRecord[];
  workingDays: number;
  maxDisplay?: number;
}

export function AttentionList({ records, workingDays, maxDisplay = 6 }: AttentionListProps) {
  const attentionList = useMemo(() => {
    return records
      .filter((r) => {
        const pct = getAttendancePct(r);
        return pct < 75;
      })
      .sort((a, b) => {
        const pA = getAttendancePct(a);
        const pB = getAttendancePct(b);
        return pA - pB;
      });
  }, [records]);

  if (attentionList.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <CheckCircle2 className="size-4 text-emerald-500" /> All faculty meet the 75% minimum threshold!
      </div>
    );
  }

  return (
    <div className="divide-y divide-border max-h-72 overflow-y-auto">
      {attentionList.slice(0, maxDisplay).map((f) => {
        const pct = getAttendancePct(f);
        return (
          <div key={f.id || f.cfmsId || f.cfms_id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-semibold text-foreground">{f.name}</span>
              <p className="text-[10px] text-muted-foreground font-mono">
                {f.department} · {f.cfmsId || f.cfms_id || "CFMS missing"}
              </p>
            </div>
            <div className="text-right">
              <span className={`font-mono font-bold ${tierTextClassFromPct(pct)}`}>
                {pct}%
              </span>
              <p className="text-[10px] text-muted-foreground">
                {f.presentDays || f.present_days || 0} / {workingDays} days
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
