# APFRS Biometric Import and Consolidation Pipeline Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Refactor the attendance data import process. Extract the Excel parsing, normalizations, and UI states from `import.tsx` into a modular frontend custom hook (`useAttendanceImport`) and pure parsing script (`excel-parser.ts`). Centralize attendance aggregation on the backend and secure writes with transactional safety.

---

### Task 1: Create Frontend Excel Parser & Custom Hook Modules

**Files:**
* Create: `frontend/src/lib/import/excel-parser.ts`
* Create: `frontend/src/lib/import/useAttendanceImport.ts`

**Step 1: Write `excel-parser.ts`**
* Move file name month/year detection, Excel workbook reading, and column-index matching into a pure utility:
```typescript
import { EmployeeRecord, AttendanceDay, AttendanceStatus } from '../attendance-context';

const MONTH_ALIASES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const STATUS_MAP: Record<string, AttendanceStatus> = {
  P: "P", p: "P", PRESENT: "P",
  A: "A", a: "A", ABSENT: "A",
  L: "L", l: "L", LEAVE: "L", CL: "L", OD: "L",
  H: "H", h: "H", HOLIDAY: "H",
  HD: "HD", hd: "HD", HALF: "HD",
  LATE: "Late", Late: "Late", late: "Late",
};

export function detectMonthYearFromFileName(name: string): { month: number | null; year: number | null } {
  const match = name.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-_]?(\d{4})/i);
  if (match && match[1] && match[2]) {
    const mIdx = MONTH_ALIASES.indexOf(match[1].toLowerCase().slice(0, 3));
    if (mIdx !== -1) {
      return { month: mIdx + 1, year: parseInt(match[2], 10) };
    }
  }
  return { month: null, year: null };
}

export function parseBiometricSheet(
  rawMatrix: unknown[][],
  month: number,
  year: number,
  holidayDateSet: Set<string>
): { records: EmployeeRecord[]; workingDaysCount: number; holidaysCount: number } {
  if (!rawMatrix || rawMatrix.length < 2) return { records: [], workingDaysCount: 27, holidaysCount: 4 };

  const headerRow = (rawMatrix[0] || []).map((h) => String(h ?? "").trim());
  const headerLower = headerRow.map((h) => h.toLowerCase());

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

    const attendance: AttendanceDay[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dPad = String(d).padStart(2, "0");
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${dPad}`;
      const dayOfWeek = new Date(year, month - 1, d).getDay();
      const isSunday = dayOfWeek === 0;
      const isCalendarHoliday = holidayDateSet.has(dateStr);
      const isOfficialNonWorking = isSunday || isCalendarHoliday;

      const statusColIdx = headerLower.findIndex(
        (h) => h === `${String(d).padStart(2, "0")} status` || h === `${d} status` || h === `day ${d}` || h === `day${d}`
      );
      const inColIdx = headerLower.findIndex(
        (h) => h === `${String(d).padStart(2, "0")} in` || h === `${d} in` || h === `in ${d}`
      );
      const outColIdx = headerLower.findIndex(
        (h) => h === `${String(d).padStart(2, "0")} out` || h === `${d} out` || h === `out ${d}`
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
```

**Step 2: Write `useAttendanceImport.ts`**
* Create React hook encapsulating state orchestration, XLS parsing calls, and API mutations:
```typescript
import { useState } from 'react';
import { useImportAttendance } from '../queries';
import { useAttendance } from '../attendance-context';
import { parseBiometricSheet, detectMonthYearFromFileName } from './excel-parser';
import { toast } from 'sonner';

export function useAttendanceImport() {
  const [status, setStatus] = useState<"idle" | "parsing" | "done" | "error">("idle");
  const [fileName, setFileName] = useState("");
  const [parsedCount, setParsedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [parsedRecords, setParsedRecords] = useState<any[]>([]);
  const [monthWorkingDays, setMonthWorkingDays] = useState(27);
  const [monthHolidaysCount, setMonthHolidaysCount] = useState(4);
  const [detectedMonth, setDetectedMonth] = useState<number | null>(null);
  const [detectedYear, setDetectedYear] = useState<number | null>(null);

  const importMutation = useImportAttendance();
  const { setAttendanceData } = useAttendance();

  const parseFile = async (file: File, selectedMonth: string, selectedYear: string, holidayDateSet: Set<string>) => {
    setStatus("parsing");
    setFileName(file.name);
    setErrorMsg("");

    try {
      const detected = detectMonthYearFromFileName(file.name);
      setDetectedMonth(detected.month);
      setDetectedYear(detected.year);

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

      const targetMonth = detected.month || parseInt(selectedMonth, 10);
      const targetYear = detected.year || parseInt(selectedYear, 10);

      const { records, workingDaysCount, holidaysCount } = parseBiometricSheet(
        rawMatrix,
        targetMonth,
        targetYear,
        holidayDateSet
      );

      if (records.length === 0) {
        throw new Error("No faculty records found in Excel sheet.");
      }

      setParsedRecords(records);
      setParsedCount(records.length);
      setMonthWorkingDays(workingDaysCount);
      setMonthHolidaysCount(holidaysCount);
      setStatus("done");
      return { records, detected, workingDaysCount, holidaysCount };
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "Failed to parse file.");
      toast.error(err.message || "Failed to parse file.");
      throw err;
    }
  };

  const importData = async (monthNum: number, yearNum: number) => {
    if (!parsedRecords.length) return;
    try {
      const res = await importMutation.mutateAsync({
        records: parsedRecords,
        month: monthNum,
        year: yearNum,
        fileName: fileName || `attendance-${yearNum}-${monthNum}.xlsx`,
      });

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
      return res;
    } catch (err: any) {
      toast.error(err.message || "Import failed");
      throw err;
    }
  };

  return {
    parseFile,
    importData,
    status,
    fileName,
    parsedCount,
    errorMsg,
    parsedRecords,
    monthWorkingDays,
    monthHolidaysCount,
    detectedMonth,
    detectedYear,
    isImporting: importMutation.isPending,
  };
}
```

---

### Task 2: Refactor `/import` Route UI Page

**Files:**
* Modify: `frontend/src/routes/import.tsx`

**Step 1: Clean up page imports & code blocks**
* Import `useAttendanceImport` from `../lib/import/useAttendanceImport`.
* Delete `parseBiometricSheet`, `detectMonthYearFromFileName`, and React states that have been extracted.
* Hook the UI buttons and pickers to the hook results.

---

### Task 3: Implement Backend Safe Database Transactions

**Files:**
* Modify: `backend/src/repositories/monthly-attendance.repository.js`

**Step 1: Rewrite saveMonthlySheetAndRecords**
* Wrap the bulk insertion logic inside `db.transaction(async (conn) => { ... })`.
* Ensure that all database queries inside this transaction use `conn.query()` instead of `db.query()`.

---

### Task 4: Run Verification & Syntax Checks

**Step 1: Verify frontend compilation and linting**
* `npm run lint --prefix frontend`
* `npm run build --prefix frontend`

**Step 2: Verify backend syntax correctness**
* `node --check backend/src/repositories/monthly-attendance.repository.js`
