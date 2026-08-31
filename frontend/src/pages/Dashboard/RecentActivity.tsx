import { Link } from "react-router-dom";
import { History, UploadCloud, Send, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AttendanceRecord {
  id?: string;
  cfmsId?: string;
  cfms_id?: string;
  name: string;
  department?: string;
  designation?: string;
  [key: string]: any;
}

interface RecentActivityProps {
  records: AttendanceRecord[];
  batches: any[];
  monthName: string;
  selectedYear: number;
  workingDays: number;
}

export function RecentActivity({
  records,
  batches,
  monthName,
  selectedYear,
  workingDays,
}: RecentActivityProps) {
  return (
    <section className="surface-panel p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <History className="size-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Recent Activity</h2>
        </div>
        <span className="text-xs text-muted-foreground font-mono">Workflow audit</span>
      </div>

      <div className="space-y-3">
        {/* Latest Import Info */}
        <div className="rounded-lg border border-border bg-card p-3.5 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground flex items-center gap-1.5 flex-row">
              <UploadCloud className="size-3.5 text-primary" /> Active Biometric Sheet
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">{monthName} {selectedYear}</span>
          </div>
          <p className="text-muted-foreground">
            {records.length} faculty attendance records loaded ({workingDays} working days).
          </p>
        </div>

        {/* Latest Dispatch Info */}
        <div className="rounded-lg border border-border bg-card p-3.5 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground flex items-center gap-1.5 flex-row">
              <Send className="size-3.5 text-amber-500" /> Recent Dispatch Batches
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {batches.length} recorded
            </span>
          </div>
          {batches.length > 0 ? (
            <p className="text-muted-foreground font-mono text-[11px]">
              Last batch: {batches[0].sent} sent, {batches[0].failed} failed
            </p>
          ) : (
            <p className="text-muted-foreground italic">No dispatches executed yet this cycle.</p>
          )}
        </div>
      </div>

      <div className="pt-2 flex items-center gap-2">
        <Button size="sm" variant="outline" asChild className="w-full text-xs gap-1.5">
          <Link to="/detailed">
            <History className="size-3.5" /> View Attendance
          </Link>
        </Button>
        <Button size="sm" variant="outline" asChild className="w-full text-xs gap-1.5">
          <Link to="/consolidated">
            <Send className="size-3.5" /> Dispatch Statements
          </Link>
        </Button>
      </div>
    </section>
  );
}
