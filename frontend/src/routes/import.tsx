import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  FileSpreadsheet,
  UploadCloud,
  XCircle,
  Loader2,
  Calendar,
  Layers,
  Users,
  CalendarDays,
  Sparkles,
  Check,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calendarQuery } from "@/lib/queries";
import { useAttendanceImport } from "@/lib/import/useAttendanceImport";
import { toast } from "sonner";
import { MONTH_NAMES } from "@/lib/constants";
import { useMonthYearSelector, getYearRange } from "@/hooks/useMonthYearSelector";

export const Route = createFileRoute("/import")({
  head: () => ({
    meta: [
      { title: "Import Attendance Data — e-Office Jntugv" },
      {
        name: "description",
        content: "Upload the monthly biometric Excel sheet, automatically sync with CFMS IDs and Academic Calendar holidays, and seed into database.",
      },
    ],
  }),
  component: ImportPage,
});

function ImportPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch official Academic Calendar holidays
  const { data: calendarData } = useQuery(calendarQuery());
  const allHolidays = calendarData?.holidays || [];

  const {
    monthStr: selectedMonth,
    yearStr: selectedYear,
    setMonthStr: setSelectedMonth,
    setYearStr: setSelectedYear,
    month: selectedMonthNum,
    year: selectedYearNum,
  } = useMonthYearSelector();

  // Filter holidays for the selected month/year
  const monthHolidaysList = useMemo(() => {
    const mPad = String(selectedMonth).padStart(2, "0");
    const prefix = `${selectedYear}-${mPad}`;
    return allHolidays.filter((h) => h.date && h.date.startsWith(prefix));
  }, [allHolidays, selectedMonth, selectedYear]);

  const holidayDateSet = useMemo(() => {
    return new Set(monthHolidaysList.map((h) => h.date));
  }, [monthHolidaysList]);

  // Hook orchestration
  const {
    parseFile,
    importData,
    reset,
    status,
    fileName,
    parsedCount,
    errorMsg,
    parsedRecords,
    monthWorkingDays,
    monthHolidaysCount,
    isImporting,
  } = useAttendanceImport();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await parseFile(file, selectedMonth, selectedYear, holidayDateSet);
      if (res && res.detected.month && res.detected.year) {
        setSelectedMonth(String(res.detected.month));
        setSelectedYear(String(res.detected.year));
        toast.info(`Auto-detected reporting period: ${MONTHS[res.detected.month - 1]} ${res.detected.year}`);
      }
      toast.success(`Successfully parsed ${res?.records.length} faculty attendance records.`);
    } catch (err) {
      // Errors already reported by hook
    }

    if (fileRef.current) fileRef.current.value = "";
  };

  const handleProcess = async () => {
    if (!parsedRecords.length || isImporting) return;

    const monthNum = parseInt(selectedMonth, 10);
    const yearNum = parseInt(selectedYear, 10);

    try {
      const res = await importData(monthNum, yearNum);
      const savedRecords = res?.data?.records || [];
      if (res?.warnings && res.warnings.length > 0) {
        toast.warning(
          `Synced ${savedRecords.length} records. Skipped ${res.warnings.length} unregistered CFMS IDs: ${res.warnings.join(", ")}`,
          { duration: 8000 }
        );
      } else {
        toast.success(
          `Successfully synced ${savedRecords.length} records into database for ${MONTHS[monthNum - 1]} ${yearNum}`
        );
      }
      void navigate({ to: "/reports" });
    } catch (err: any) {
      toast.error(err.message || "Failed to persist attendance to database.");
    }
  };

  const handleClear = () => {
    reset();
  };

  return (
    <AppShell
      roles={["admin"]}
      title="Import Attendance Data"
      subtitle="Upload biometric Excel sheets — automatically syncs with faculty CFMS IDs and Academic Calendar holidays"
    >
      <div className="mx-auto max-w-4xl space-y-6">
        {/* ── Period Selector & Dropzone ── */}
        <section className="surface-panel p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Reporting Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reporting Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getYearRange(10, 5).map((y) => (
                    <SelectItem key={String(y)} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Academic Calendar Auto-Sync Notice */}
          <div className="mt-4 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-primary shrink-0" />
              <div>
                <span className="font-semibold text-foreground">Academic Calendar Auto-Sync: </span>
                <span className="text-muted-foreground">
                  {MONTH_NAMES[selectedMonthNum - 1]} {selectedYear} has{" "}
                  <strong className="text-foreground">{monthHolidaysList.length}</strong> official calendar holidays.
                </span>
              </div>
            </div>
            {monthHolidaysList.length > 0 && (
              <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary font-semibold">
                {monthHolidaysList.map((h) => h.name).join(", ")}
              </span>
            )}
          </div>

          <div
            onClick={() => fileRef.current?.click()}
            className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/30"
          >
            <UploadCloud className="size-10 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">Click to upload biometric Excel sheet (.xlsx)</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Compatible with APFRS biometric monthly exports (e.g. 22130304001_REGULAR_Jan2025.xlsx)
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Status Feedback */}
          {status === "parsing" ? (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" />
              Parsing biometric attendance sheet &amp; syncing academic calendar…
            </div>
          ) : null}

          {status === "error" ? (
            <div className="mt-4 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              <XCircle className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : null}

          {status === "done" ? (
            <div className="mt-4 rounded-lg border border-[var(--linear-border-strong)] bg-[var(--badge-accent-bg)] p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-5 text-[var(--badge-accent-fg)]" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      Period: <strong className="text-foreground">{MONTHS[parseInt(selectedMonth, 10) - 1]} {selectedYear}</strong> · {parsedCount} Faculty records parsed
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleClear}>
                  Clear
                </Button>
              </div>

              {/* Sync Metrics Info Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--linear-border)] text-xs font-mono">
                <div className="rounded bg-card p-2 border border-border">
                  <span className="text-muted-foreground block text-[10px]">Total Faculty:</span>
                  <strong className="text-foreground text-sm">{parsedCount}</strong>
                </div>
                <div className="rounded bg-card p-2 border border-border">
                  <span className="text-muted-foreground block text-[10px]">Working Days:</span>
                  <strong className="text-[var(--status-present-fg)] text-sm">{monthWorkingDays} Days</strong>
                </div>
                <div className="rounded bg-card p-2 border border-border">
                  <span className="text-muted-foreground block text-[10px]">Sundays / Holidays:</span>
                  <strong className="text-[var(--status-leave-fg)] text-sm">{monthHolidaysCount} Days</strong>
                </div>
                <div className="rounded bg-card p-2 border border-border">
                  <span className="text-muted-foreground block text-[10px]">Calendar Status:</span>
                  <strong className="text-[var(--badge-accent-fg)] text-sm">Synced ✓</strong>
                </div>
              </div>

              {/* Parsed Preview Table */}
              <div className="max-h-56 overflow-y-auto rounded border border-border bg-card">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-muted/90 font-medium text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">CFMS ID</th>
                      <th className="px-3 py-2">Faculty Name</th>
                      <th className="px-3 py-2">Cadre</th>
                      <th className="px-3 py-2 text-right">Days Parsed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parsedRecords.slice(0, 15).map((r, i) => (
                      <tr key={i} className="hover:bg-muted/40">
                        <td className="px-3 py-1.5 font-mono text-muted-foreground">{r.cfmsId || "—"}</td>
                        <td className="px-3 py-1.5 font-medium">{r.name}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{r.jobStatus || "Regular"}</td>
                        <td className="px-3 py-1.5 text-right font-mono">{r.attendance.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-3">
                <Button onClick={handleProcess} disabled={isImporting} className="w-full sm:w-auto">
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Seeding &amp; Syncing into Database…
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 size-4" />
                      Seed &amp; Sync to Database
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
