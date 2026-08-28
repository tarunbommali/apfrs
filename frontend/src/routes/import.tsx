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
import { useAttendance, type EmployeeRecord, type AttendanceDay, type AttendanceStatus } from "@/lib/attendance-context";
import { useImportAttendance, calendarQuery } from "@/lib/queries";
import { toast } from "sonner";

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

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_ALIASES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const YEARS = ["2024", "2025", "2026", "2027", "2028"];

const STATUS_MAP: Record<string, AttendanceStatus> = {
  P: "P", p: "P", PRESENT: "P",
  A: "A", a: "A", ABSENT: "A",
  L: "L", l: "L", LEAVE: "L", CL: "L", OD: "L",
  H: "H", h: "H", HOLIDAY: "H",
  HD: "HD", hd: "HD", HALF: "HD",
  LATE: "Late", Late: "Late", late: "Late",
};

/** Detect month and year from filename, e.g. 22130304001_REGULAR_Jan2025.xlsx */
function detectMonthYearFromFileName(name: string): { month: number | null; year: number | null } {
  const match = name.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-_]?(\d{4})/i);
  if (match && match[1] && match[2]) {
    const mIdx = MONTH_ALIASES.indexOf(match[1].toLowerCase().slice(0, 3));
    if (mIdx !== -1) {
      return {
        month: mIdx + 1,
        year: parseInt(match[2], 10),
      };
    }
  }
  return { month: null, year: null };
}

function dpad(n: number) {
  return String(n).padStart(2, "0");
}

/** Robust parser for APFRS Biometric Excel Sheets syncing with Academic Calendar holidays */
function parseBiometricSheet(
  rawMatrix: unknown[][],
  month: number,
  year: number,
  holidayDateSet: Set<string>
): { records: EmployeeRecord[]; workingDaysCount: number; holidaysCount: number } {
  if (!rawMatrix || rawMatrix.length < 2) return { records: [], workingDaysCount: 27, holidaysCount: 4 };

  const headerRow = (rawMatrix[0] || []).map((h) => String(h ?? "").trim());
  const headerLower = headerRow.map((h) => h.toLowerCase());

  // Find column indices
  const nameIdx = headerLower.findIndex((h) =>
    ["name", "employee name", "faculty name", "staff name", "person name"].some((a) => h.includes(a))
  );
  const cfmsIdx = headerLower.findIndex((h) =>
    ["cfms id", "cfmsid", "cfms", "cfms_id", "employee id", "emp id", "empid"].some((a) => h === a || h.includes(a))
  );
  const desigIdx = headerLower.findIndex((h) =>
    ["designation", "desig", "role"].some((a) => h.includes(a))
  );
  const typeIdx = headerLower.findIndex((h) =>
    ["emp type", "emptype", "job status", "job_status", "type", "cadre"].some((a) => h.includes(a))
  );
  const deptIdx = headerLower.findIndex((h) =>
    ["department", "dept", "dept.", "branch"].some((a) => h.includes(a))
  );
  const emailIdx = headerLower.findIndex((h) =>
    ["email", "mail", "e-mail", "email address"].some((a) => h.includes(a))
  );

  const daysInMonth = new Date(year, month, 0).getDate();

  // Compute official working days from calendar for this month
  let officialWorkingDays = 0;
  let holidaysCount = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dPad = String(d).padStart(2, "0");
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${dPad}`;
    const dayOfWeek = new Date(year, month - 1, d).getDay();
    const isSunday = dayOfWeek === 0;
    const isHoliday = holidayDateSet.has(dateStr);

    if (isSunday || isHoliday) {
      holidaysCount++;
    } else {
      officialWorkingDays++;
    }
  }
  if (officialWorkingDays === 0) officialWorkingDays = 27;

  const records: EmployeeRecord[] = [];

  for (let r = 1; r < rawMatrix.length; r++) {
    const row = rawMatrix[r];
    if (!row || !row[nameIdx !== -1 ? nameIdx : 0]) continue;

    const name = String(row[nameIdx !== -1 ? nameIdx : 0] ?? "").trim();
    if (!name || name.toLowerCase() === "total" || name.toLowerCase() === "grand total") continue;

    const cfmsId = cfmsIdx !== -1 ? String(row[cfmsIdx] ?? "").trim() : "";
    const designation = desigIdx !== -1 ? String(row[desigIdx] ?? "").trim() : "";
    const empType = typeIdx !== -1 ? String(row[typeIdx] ?? "").trim() : "Regular";
    const department = deptIdx !== -1 ? String(row[deptIdx] ?? "").trim() : "";
    const email = emailIdx !== -1 ? String(row[emailIdx] ?? "").trim() : "";

    // Parse all 1..daysInMonth daily records
    const attendance: AttendanceDay[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dPad = String(d).padStart(2, "0");
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${dPad}`;
      const dayOfWeek = new Date(year, month - 1, d).getDay();
      const isSunday = dayOfWeek === 0;
      const isCalendarHoliday = holidayDateSet.has(dateStr);
      const isOfficialNonWorking = isSunday || isCalendarHoliday;

      // Look for status column or punch in column
      const statusColIdx = headerLower.findIndex(
        (h) => h === `${dpad(d)} status` || h === `${d} status` || h === `day ${d}` || h === `day${d}`
      );
      const inColIdx = headerLower.findIndex(
        (h) => h === `${dpad(d)} in` || h === `${d} in` || h === `in ${d}`
      );
      const outColIdx = headerLower.findIndex(
        (h) => h === `${dpad(d)} out` || h === `${d} out` || h === `out ${d}`
      );

      const rawStatus = statusColIdx !== -1 ? String(row[statusColIdx] ?? "").trim().toUpperCase() : "";
      const inVal = inColIdx !== -1 ? String(row[inColIdx] ?? "").trim() : "";
      const outVal = outColIdx !== -1 ? String(row[outColIdx] ?? "").trim() : "";

      let status: AttendanceStatus = "A";
      if (rawStatus === "P" || rawStatus === "PRESENT" || inVal !== "" || outVal !== "") {
        status = "P";
      } else if (rawStatus === "HD" || rawStatus === "HALF") {
        status = "HD";
      } else if (rawStatus === "L" || rawStatus === "CL" || rawStatus === "OD" || rawStatus === "LEAVE") {
        status = "L";
      } else if (rawStatus === "H" || rawStatus === "HOLIDAY" || isOfficialNonWorking) {
        status = "H";
      } else if (STATUS_MAP[rawStatus]) {
        status = STATUS_MAP[rawStatus]!;
      } else {
        status = "A";
      }

      attendance.push({
        date: dateStr,
        status,
        inTime: inVal || undefined,
        outTime: outVal || undefined,
      });
    }

    records.push({
      name,
      cfmsId,
      designation: designation || "Assistant Professor",
      department: department || "General",
      email,
      jobStatus: empType.toLowerCase() === "regular" ? "Regular" : "contract",
      attendance,
    });
  }

  return { records, workingDaysCount: officialWorkingDays, holidaysCount };
}

function ImportPage() {
  const navigate = useNavigate();
  const { setAttendanceData } = useAttendance();
  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch official Academic Calendar holidays
  const { data: calendarData } = useQuery(calendarQuery());
  const allHolidays = calendarData?.holidays || [];

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));

  const [status, setStatus] = useState<"idle" | "parsing" | "done" | "error">("idle");
  const [fileName, setFileName] = useState("");
  const [parsedCount, setParsedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [parsedRecords, setParsedRecords] = useState<EmployeeRecord[]>([]);
  const [monthWorkingDays, setMonthWorkingDays] = useState(27);
  const [monthHolidaysCount, setMonthHolidaysCount] = useState(4);

  // Filter holidays for the selected month/year
  const monthHolidaysList = useMemo(() => {
    const mPad = String(selectedMonth).padStart(2, "0");
    const prefix = `${selectedYear}-${mPad}`;
    return allHolidays.filter((h) => h.date && h.date.startsWith(prefix));
  }, [allHolidays, selectedMonth, selectedYear]);

  const holidayDateSet = useMemo(() => {
    return new Set(monthHolidaysList.map((h) => h.date));
  }, [monthHolidaysList]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("parsing");
    setFileName(file.name);
    setErrorMsg("");

    try {
      // Auto-detect month and year from filename
      const detected = detectMonthYearFromFileName(file.name);
      let targetMonth = parseInt(selectedMonth, 10);
      let targetYear = parseInt(selectedYear, 10);

      if (detected.month && detected.year) {
        targetMonth = detected.month;
        targetYear = detected.year;
        setSelectedMonth(String(detected.month));
        setSelectedYear(String(detected.year));
        toast.info(`Auto-detected reporting period: ${MONTHS[detected.month - 1]} ${detected.year}`);
      }

      // Build target holiday set
      const mPad = String(targetMonth).padStart(2, "0");
      const prefix = `${targetYear}-${mPad}`;
      const targetHolidays = allHolidays.filter((h) => h.date && h.date.startsWith(prefix));
      const targetHolidaySet = new Set(targetHolidays.map((h) => h.date));

      // Dynamic import of xlsx
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) throw new Error("Excel workbook has no sheets.");

      const ws = wb.Sheets[sheetName]!;
      const rawMatrix = XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1,
        defval: "",
        raw: false,
      });

      const { records, workingDaysCount, holidaysCount } = parseBiometricSheet(
        rawMatrix,
        targetMonth,
        targetYear,
        targetHolidaySet
      );

      if (records.length === 0) {
        throw new Error(
          "No faculty records found in Excel sheet. Ensure the file contains CFMS ID, Name, and day status columns."
        );
      }

      setParsedRecords(records);
      setParsedCount(records.length);
      setMonthWorkingDays(workingDaysCount);
      setMonthHolidaysCount(holidaysCount);
      setStatus("done");
      toast.success(`Successfully parsed ${records.length} faculty attendance records with Academic Calendar sync.`);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Failed to parse file.");
    }

    if (fileRef.current) fileRef.current.value = "";
  };

  const importAttendance = useImportAttendance();
  const [saving, setSaving] = useState(false);

  const handleProcess = async () => {
    if (!parsedRecords.length || saving) return;
    setSaving(true);

    const monthNum = parseInt(selectedMonth, 10);
    const yearNum = parseInt(selectedYear, 10);

    try {
      // 1. Seed & persist into MySQL database (auto-syncs with CFMS IDs and academic calendar)
      const res = await importAttendance.mutateAsync({
        records: parsedRecords,
        month: monthNum,
        year: yearNum,
        fileName: fileName || `attendance-${yearNum}-${monthNum}.xlsx`,
      });

      // 2. Update client context store using the database-seeded records returned by backend
      const savedRecords = res.data?.records || [];
      setAttendanceData(
        savedRecords.map((r: any) => ({
          ...r,
          cfmsId: r.cfmsId || r.cfms_id || "",
          jobStatus: r.jobStatus || r.job_status || "Regular",
        })),
        monthNum,
        yearNum,
        fileName
      );

      if (res.warnings && res.warnings.length > 0) {
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
    } catch (err) {
      toast.error(
        err instanceof Error
          ? `Database save failed: ${err.message}`
          : "Failed to persist attendance to database."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setStatus("idle");
    setFileName("");
    setParsedCount(0);
    setErrorMsg("");
    setParsedRecords([]);
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
                  {MONTHS.map((m, i) => (
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
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={y}>
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
                  {MONTHS[parseInt(selectedMonth, 10) - 1]} {selectedYear} has{" "}
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
                <Button onClick={handleProcess} disabled={saving} className="w-full sm:w-auto">
                  {saving ? (
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
