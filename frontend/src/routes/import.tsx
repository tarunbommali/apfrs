// frontend/src/routes/import.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { calendarQuery } from "@/lib/queries";
import { useAttendanceImport } from "@/lib/import/useAttendanceImport";
import { toast } from "sonner";
import { MONTH_NAMES } from "@/lib/constants";
import { useMonthYearSelector } from "@/hooks/useMonthYearSelector";

// Import split components
import { PeriodSelector } from "./-import/PeriodSelector";
import { Dropzone } from "./-import/Dropzone";
import { StatusFeedback } from "./-import/StatusFeedback";
import { Preview } from "./-import/Preview";

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
    const mPad = String(selectedMonthNum).padStart(2, "0");
    const prefix = `${selectedYearNum}-${mPad}`;
    return allHolidays.filter((h) => h.date && h.date.startsWith(prefix));
  }, [allHolidays, selectedMonthNum, selectedYearNum]);

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

  const handleFileSelected = async (file: File) => {
    try {
      const res = await parseFile(file, selectedMonth, selectedYear, holidayDateSet);
      if (res && res.detected.month && res.detected.year) {
        setSelectedMonth(String(res.detected.month));
        setSelectedYear(String(res.detected.year));
        toast.info(`Auto-detected reporting period: ${MONTH_NAMES[res.detected.month - 1]} ${res.detected.year}`);
      }
      toast.success(`Successfully parsed ${res?.records.length} faculty attendance records.`);
    } catch (err: any) {
      // Errors already reported by hook
    }
  };

  const handleProcess = async () => {
    if (!parsedRecords.length || isImporting) return;

    try {
      const res = await importData(selectedMonthNum, selectedYearNum);
      const savedRecords = res?.data?.records || [];
      if (res?.warnings && res.warnings.length > 0) {
        toast.warning(
          `Synced ${savedRecords.length} records. Skipped ${res.warnings.length} unregistered CFMS IDs: ${res.warnings.join(", ")}`,
          { duration: 8000 }
        );
      } else {
        toast.success(
          `Successfully synced ${savedRecords.length} records into database for ${MONTH_NAMES[selectedMonthNum - 1]} ${selectedYearNum}`
        );
      }
      void navigate({ to: "/detailed" });
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
          <PeriodSelector
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            holidayCount={monthHolidaysList.length}
            holidayNames={monthHolidaysList.map((h) => h.name || h.label || "Holiday")}
          />

          <Dropzone onFileSelected={handleFileSelected} />

          {/* Status Feedback */}
          <StatusFeedback status={status} errorMsg={errorMsg} />

          {/* Preview */}
          {status === "done" && (
            <Preview
              fileName={fileName}
              parsedCount={parsedCount}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              monthWorkingDays={monthWorkingDays}
              monthHolidaysCount={monthHolidaysCount}
              parsedRecords={parsedRecords}
              onClear={handleClear}
              onProcess={handleProcess}
              isImporting={isImporting}
            />
          )}
        </section>
      </div>
    </AppShell>
  );
}

export default ImportPage;
