import { getWorkingDays } from "@/lib/attendance-utils";

interface StatsSidebarProps {
  report: any;
  profile: any;
}

export function StatsSidebar({ report, profile }: StatsSidebarProps) {
  const workingDays = getWorkingDays(report);

  return (
    <div className="space-y-6">
      <div className="surface-panel p-5 space-y-4">
        <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Additional Statistics</h4>
        
        <div className="space-y-3.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Working Days</span>
            <span className="font-bold font-mono">{workingDays} Days</span>
          </div>
          <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
            <span className="text-muted-foreground">Holidays & Sundays</span>
            <span className="font-bold font-mono">{report.holidayDays || report.holiday_days || 0} Days</span>
          </div>
          <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
            <span className="text-muted-foreground">Half Days</span>
            <span className="font-bold font-mono">{report.halfDays || 0} Days</span>
          </div>
          <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
            <span className="text-muted-foreground">Late Check-ins</span>
            <span className="font-bold font-mono">{report.lateDays || 0} Days</span>
          </div>
        </div>
      </div>

      <div className="surface-panel p-5 space-y-3">
        <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Employee Details</h4>
        <div className="space-y-2 text-xs">
          <div>
            <span className="text-[10px] uppercase text-muted-foreground">Designation</span>
            <p className="font-medium text-foreground mt-0.5">
              {profile?.designation || report.designation || "Assistant Professor"}
            </p>
          </div>
          <div className="pt-2 border-t border-border/60">
            <span className="text-[10px] uppercase text-muted-foreground">Department</span>
            <p className="font-medium text-foreground mt-0.5">
              {profile?.department || report.department}
            </p>
          </div>
          <div className="pt-2 border-t border-border/60">
            <span className="text-[10px] uppercase text-muted-foreground">CFMS ID</span>
            <p className="font-medium font-mono mt-0.5">
              {profile?.cfms_id || profile?.cfmsId || report.cfmsId}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
