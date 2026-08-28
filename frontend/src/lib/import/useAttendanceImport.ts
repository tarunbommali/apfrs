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
