// frontend/src/routes/my-attendance.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, ArrowLeft, Clock } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { facultyProfileQuery, facultyMonthlyAttendanceQuery } from "@/lib/queries";
import { MONTH_NAMES } from "@/lib/constants";

// Import split components
import { HistoryTable } from "./-my-attendance/HistoryTable";
import { DetailView } from "./-my-attendance/DetailView";

export const Route = createFileRoute("/my-attendance")({
  head: () => ({
    meta: [
      { title: "My Attendance Statement — e-Office Jntugv" },
      {
        name: "description",
        content: "View your personal biometric monthly attendance breakdown, check-in punch times, and download PDF statements.",
      },
    ],
  }),
  component: MyAttendancePage,
});

function MyAttendancePage() {
  const [viewDetailsPeriod, setViewDetailsPeriod] = useState<{ month: number; year: number } | null>(null);

  // 1. Fetch faculty profile
  const { data: profileData } = useQuery(facultyProfileQuery());
  const me = profileData?.profile;

  // 2. Fetch monthly attendance data
  const { data: attendanceData, isLoading, error } = useQuery(
    facultyMonthlyAttendanceQuery(
      viewDetailsPeriod ? String(viewDetailsPeriod.month) : undefined,
      viewDetailsPeriod ? String(viewDetailsPeriod.year) : undefined
    )
  );

  const report = attendanceData?.monthlyRecords;
  const history = attendanceData?.history || [];

  const handleDownloadPdf = () => {
    if (!viewDetailsPeriod) return;
    window.open(
      `/api/faculty/attendance/report/pdf?month=${viewDetailsPeriod.month}&year=${viewDetailsPeriod.year}`,
      "_blank"
    );
  };

  // ── VIEW 1: MASTER ATTENDANCE SHEETS HISTORY ──
  if (!viewDetailsPeriod) {
    return (
      <AppShell
        roles={["faculty", "admin"]}
        title="My Attendance"
        subtitle="Manage and view all your monthly attendance records uploaded in the registry"
      >
        <div className="mx-auto max-w-5xl space-y-6">
          <section className="surface-panel p-6 space-y-4">
            <div className="border-b border-border pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Available Monthly Statements</h2>
                <p className="text-xs text-muted-foreground">All biometric cycles stored in database for your account</p>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-mono font-medium text-foreground">
                {history.length} cycles
              </span>
            </div>

            <HistoryTable
              history={history}
              isLoading={isLoading}
              onViewDetails={(month, year) => setViewDetailsPeriod({ month, year })}
            />
          </section>
        </div>
      </AppShell>
    );
  }

  // ── VIEW 2: MONTH DAY-WISE PUNCH TIMES BREAKDOWN ──
  return (
    <AppShell
      roles={["faculty", "admin"]}
      title="My Attendance Details"
      subtitle={`${MONTH_NAMES[viewDetailsPeriod.month - 1]} ${viewDetailsPeriod.year} · Personal breakdown`}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewDetailsPeriod(null)}
            className="gap-1.5 h-9 text-xs"
          >
            <ArrowLeft className="size-4" /> Back to History
          </Button>

          <Button
            onClick={handleDownloadPdf}
            disabled={!report}
            className="gap-2 h-9 text-xs"
          >
            <Download className="size-4" /> Download PDF Statement
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-5xl space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-3 surface-panel">
            <Clock className="size-8 text-indigo-400 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading attendance report details...</p>
          </div>
        ) : (
          <DetailView
            period={viewDetailsPeriod}
            report={report}
            profile={me}
            error={error}
          />
        )}
      </div>
    </AppShell>
  );
}

export default MyAttendancePage;
