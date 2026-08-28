import { Checkbox } from "@/components/ui/checkbox";
import {
  getAttendancePct,
  tierTextClassFromPct,
  getPresentDays,
  getWorkingDays,
  getJobStatus,
} from "@/lib/attendance-utils";

interface RecipientRowProps {
  record: any;
  isChecked: boolean;
  onToggle: (id: string) => void;
  workingDays: number;
}

export function RecipientRow({ record, isChecked, onToggle, workingDays }: RecipientRowProps) {
  const recId = record.id || record.cfmsId || record.cfms_id;
  const pct = getAttendancePct(record);

  return (
    <tr
      onClick={() => onToggle(recId)}
      className={`cursor-pointer transition-colors ${
        isChecked ? "bg-primary/5" : "hover:bg-muted/20"
      }`}
    >
      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isChecked}
          onCheckedChange={() => onToggle(recId)}
        />
      </td>
      <td className="py-3 px-4">
        <div className="font-semibold text-foreground">{record.name}</div>
        <div className="text-[10px] text-muted-foreground font-mono">{record.email}</div>
      </td>
      <td className="py-3 px-4">
        <div className="font-medium text-foreground">{record.department}</div>
        <div className="text-[10px] text-muted-foreground">
          {getJobStatus(record)} · {record.designation}
        </div>
      </td>
      <td className="py-3 px-3 text-center font-mono font-bold text-foreground">
        {getPresentDays(record)} / {getWorkingDays(record, workingDays)}
      </td>
      <td className="py-3 px-3 text-center font-mono font-bold">
        <span className={tierTextClassFromPct(pct)}>
          {pct}%
        </span>
      </td>
      <td className="py-3 px-4 text-center">
        {record.dispatchStatus === "sent" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
            Delivered
          </span>
        ) : record.dispatchStatus === "failed" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium text-destructive">
            Failed
          </span>
        ) : record.dispatchStatus === "pending" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-600 animate-pulse">
            Processing
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Ready to send
          </span>
        )}
      </td>
    </tr>
  );
}
