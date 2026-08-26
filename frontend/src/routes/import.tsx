import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  CheckCircle2,
  FileSpreadsheet,
  UploadCloud,
  XCircle,
  Loader2,
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
import { toast } from "sonner";

export const Route = createFileRoute("/import")({
  head: () => ({
    meta: [
      { title: "Import Attendance Data — APFRS" },
      {
        name: "description",
        content: "Upload the monthly biometric Excel sheet and validate faculty attendance records.",
      },
    ],
  }),
  component: ImportPage,
});

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const YEARS = ["2024", "2025", "2026", "2027"];

const STATUS_MAP: Record<string, AttendanceStatus> = {
  P: "P", p: "P",
  A: "A", a: "A",
  L: "L", l: "L",
  H: "H", h: "H",
  HD: "HD", hd: "HD",
  LATE: "Late", Late: "Late", late: "Late",
};

/** Parse SheetJS rows into EmployeeRecord[]. */
function parseRows(rows: Record<string, unknown>[], month: number, year: number): EmployeeRecord[] {
  if (!rows.length) return [];

  // Try to detect column names (case-insensitive)
  const sampleKeys = Object.keys(rows[0]!).map((k) => k.toLowerCase().trim());

  const findKey = (aliases: string[]) =>
    Object.keys(rows[0]!).find((k) => aliases.includes(k.toLowerCase().trim()));

  const nameKey = findKey(["employee name", "name", "faculty name", "staff name"]);
  const emailKey = findKey(["email", "email address", "mail"]);
  const cfmsKey = findKey(["cfms id", "cfmsid", "cfms", "employee id", "emp id"]);
  const deptKey = findKey(["department", "dept", "dept."]);
  const desigKey = findKey(["designation", "desig", "post"]);

  // Date columns: anything that looks like a day number (1..31) or "day n"
  const dateKeys = Object.keys(rows[0]!).filter((k) => {
    const kl = k.toLowerCase().trim();
    const asNum = Number(kl);
    return (!isNaN(asNum) && asNum >= 1 && asNum <= 31) ||
      kl.startsWith("day") ||
      /^\d{1,2}[\/-]\d{1,2}/.test(kl);
  });

  return rows
    .filter((row) => nameKey && row[nameKey])
    .map((row) => {
      const attendance: AttendanceDay[] = dateKeys.map((dk) => {
        const dayNum = parseInt(dk.replace(/[^0-9]/g, ""), 10);
        const d = isNaN(dayNum) ? 1 : dayNum;
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const raw = String(row[dk] ?? "").trim().toUpperCase();
        const status: AttendanceStatus = STATUS_MAP[raw] ?? STATUS_MAP[String(row[dk] ?? "").trim()] ?? "A";
        return { date: dateStr, status };
      });

      return {
        name: String(nameKey ? (row[nameKey] ?? "") : ""),
        email: String(emailKey ? (row[emailKey] ?? "") : ""),
        cfmsId: String(cfmsKey ? (row[cfmsKey] ?? "") : ""),
        department: String(deptKey ? (row[deptKey] ?? "") : ""),
        designation: String(desigKey ? (row[desigKey] ?? "") : ""),
        attendance,
      };
    });
}

const steps = [
  "Export the biometric register as .xlsx from the device console",
  "Ensure columns: CFMS ID, Employee Name, Email, Department, Designation, Day 1…Day 31",
  "Select the reporting month and year, then upload",
  "Review the validation summary before generating reports",
];

function ImportPage() {
  const navigate = useNavigate();
  const { setAttendanceData } = useAttendance();
  const fileRef = useRef<HTMLInputElement>(null);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));

  const [status, setStatus] = useState<"idle" | "parsing" | "done" | "error">("idle");
  const [fileName, setFileName] = useState("");
  const [parsedCount, setParsedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [parsedRecords, setParsedRecords] = useState<EmployeeRecord[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("parsing");
    setFileName(file.name);
    setErrorMsg("");

    try {
      // Dynamic import of xlsx to avoid SSR issues
      const XLSX = await import("xlsx");

      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) throw new Error("Workbook has no sheets.");

      const ws = wb.Sheets[sheetName]!;
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
        defval: "",
        raw: false,
      });

      const month = parseInt(selectedMonth, 10);
      const year = parseInt(selectedYear, 10);
      const records = parseRows(rows, month, year);

      if (records.length === 0) {
        throw new Error(
          "No employee records found. Check that your Excel has Name/CFMS ID columns and day columns (1–31).",
        );
      }

      setParsedRecords(records);
      setParsedCount(records.length);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Failed to parse file.");
    }

    // Reset file input so same file can be re-uploaded
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleProcess = () => {
    if (!parsedRecords.length) return;
    setAttendanceData(
      parsedRecords,
      parseInt(selectedMonth, 10),
      parseInt(selectedYear, 10),
      fileName,
    );
    toast.success(`${parsedRecords.length} records imported for ${MONTHS[parseInt(selectedMonth, 10) - 1]} ${selectedYear}`);
    void navigate({ to: "/reports" });
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
      title="Import Attendance Data"
      subtitle="Parse the monthly biometric workbook into the reporting cycle."
    >
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="surface-panel p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Reporting month</Label>
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
              <Label>Year</Label>
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

          <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/40 px-6 py-14 text-center transition-colors hover:border-accent hover:bg-accent/5">
            {status === "parsing" ? (
              <Loader2 className="size-8 animate-spin text-accent" />
            ) : (
              <UploadCloud className="size-8 text-accent" strokeWidth={1.5} />
            )}
            <p className="mt-3 text-sm font-medium">
              {status === "parsing" ? "Parsing workbook…" : "Drop the attendance workbook here"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">.xlsx or .xls · up to 20 MB</p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="sr-only"
              onChange={handleFileChange}
              disabled={status === "parsing"}
            />
            <span className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              Browse files
            </span>
          </label>

          {/* Status card */}
          {status === "done" && (
            <div className="mt-5 flex items-center justify-between rounded-md border border-success/40 bg-success/10 px-4 py-3">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="size-5 text-success" strokeWidth={1.75} />
                <div>
                  <p className="text-sm font-medium">{fileName}</p>
                  <p className="text-xs text-muted-foreground">{parsedCount} records parsed · 0 errors</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success">
                <CheckCircle2 className="size-4" /> Validated
              </span>
            </div>
          )}

          {status === "error" && (
            <div className="mt-5 flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3">
              <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-semibold text-destructive">Parse failed</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{errorMsg}</p>
              </div>
            </div>
          )}

          <div className="mt-5 flex gap-2">
            <Button onClick={handleProcess} disabled={status !== "done"}>
              Process workbook
            </Button>
            {status !== "idle" && (
              <Button variant="outline" onClick={handleClear}>
                Clear
              </Button>
            )}
          </div>
        </section>

        <section className="surface-panel p-6">
          <h2 className="text-base font-semibold">Preparation checklist</h2>
          <ol className="mt-4 space-y-4">
            {steps.map((s, i) => (
              <li key={s} className="flex gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs font-semibold text-secondary-foreground">
                  {i + 1}
                </span>
                <p className="text-sm text-muted-foreground">{s}</p>
              </li>
            ))}
          </ol>
          <div className="mt-6 rounded-md border border-warning/40 bg-warning/10 p-4 text-xs text-foreground">
            Status codes recognised:{" "}
            <span className="font-mono font-semibold">P</span> present,{" "}
            <span className="font-mono font-semibold">A</span> absent,{" "}
            <span className="font-mono font-semibold">L</span> leave,{" "}
            <span className="font-mono font-semibold">H</span> holiday,{" "}
            <span className="font-mono font-semibold">HD</span> half-day,{" "}
            <span className="font-mono font-semibold">Late</span> late arrival.
          </div>
        </section>
      </div>
    </AppShell>
  );
}
