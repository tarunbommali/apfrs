import { Clock, AlertCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MONTH_NAMES } from "@/lib/constants";
import {
  getAttendancePct,
  tierTextClassFromPct,
  getPresentDays,
  getAbsentDays,
  getWorkingDays,
  calculateTotalWorkingHours,
} from "@/lib/attendance-utils";

interface AttendanceHistoryRow {
  month: number;
  year: number;
  presentDays?: number;
  present_days?: number;
  absentDays?: number;
  absent_days?: number;
  leaveDays?: number;
  leave_days?: number;
  holidayDays?: number;
  holiday_days?: number;
  dailyRecords?: any[];
  attendance?: any[];
  [key: string]: any;
}

interface HistoryTableProps {
  history: AttendanceHistoryRow[];
  isLoading: boolean;
  onViewDetails: (month: number, year: number) => void;
}

export function HistoryTable({ history, isLoading, onViewDetails }: HistoryTableProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-3">
        <Clock className="size-8 text-indigo-400 animate-spin" />
        <p className="text-sm text-muted-foreground">Loading attendance history...</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-3 border border-dashed border-border/80">
        <AlertCircle className="size-8 text-muted-foreground" />
        <p className="font-semibold text-sm">No attendance records found</p>
        <p className="text-xs text-muted-foreground text-center">
          There are no attendance statements uploaded for your CFMS ID or email yet.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="border-b border-border bg-muted/30 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
          <tr>
            <th className="py-3 px-4">Period</th>
            <th className="py-3 px-4 text-center">Present / Working Days</th>
            <th className="py-3 px-4 text-center">Absent Days</th>
            <th className="py-3 px-4 text-center">Holidays & Sundays</th>
            <th className="py-3 px-4 text-center">Working Hours</th>
            <th className="py-3 px-4 text-center">Attendance %</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {history.map((row, idx) => {
            const pct = getAttendancePct(row);
            return (
              <tr key={idx} className="hover:bg-muted/20 transition-colors">
                <td className="py-3.5 px-4 font-semibold text-foreground">
                  {MONTH_NAMES[row.month - 1]} {row.year}
                </td>
                <td className="py-3.5 px-4 text-center font-mono font-medium text-foreground">
                  {getPresentDays(row)} / {getWorkingDays(row)}
                </td>
                <td className="py-3.5 px-4 text-center font-mono font-medium text-[var(--status-absent-fg)]">
                  {getAbsentDays(row)}
                </td>
                <td className="py-3.5 px-4 text-center font-mono text-muted-foreground">
                  {row.holidayDays ?? row.holiday_days ?? 0}
                </td>
                <td className="py-3.5 px-4 text-center font-mono text-muted-foreground">
                  {calculateTotalWorkingHours(row.dailyRecords || row.attendance)}
                </td>
                <td className="py-3.5 px-4 text-center font-mono">
                  <span className={tierTextClassFromPct(pct)}>{pct}%</span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewDetails(row.month, row.year)}
                    className="gap-1.5 h-8 text-xs font-semibold"
                  >
                    <Eye className="size-3.5" /> Open Details
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
