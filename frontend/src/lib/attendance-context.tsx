/**
 * Attendance data store synchronized with the MySQL database backend.
 * Attendance is parsed client-side from uploaded Excel files, persisted
 * directly to MySQL, and fetched automatically across reloads and devices.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { apiFetch } from "./api";
import { getAuthToken } from "./auth";

export type AttendanceStatus = "P" | "A" | "L" | "H" | "HD" | "Late";

export type AttendanceDay = {
  date: string; // yyyy-mm-dd or "Day N" label
  status: AttendanceStatus;
  duration?: string;
};

export type EmployeeMetrics = {
  present: number;
  absent: number;
  leave: number;
  halfDay: number;
  late: number;
  holiday: number;
  workingDays: number;
  percentage: number;
};

export type EmployeeRecord = {
  name: string;
  email: string;
  cfmsId: string;
  department: string;
  designation: string;
  attendance: AttendanceDay[];
  metrics?: EmployeeMetrics;
};

type AttendanceState = {
  records: EmployeeRecord[];
  month: number; // 1–12
  year: number;
  fileName: string;
};

type AttendanceValue = {
  records: EmployeeRecord[];
  month: number;
  year: number;
  fileName: string;
  hasData: boolean;
  ready: boolean;
  loading: boolean;
  setAttendanceData: (data: EmployeeRecord[], month: number, year: number, fileName: string) => void;
  loadMonth: (month: number, year: number) => Promise<void>;
  refreshFromDb: () => Promise<void>;
  clearAttendanceData: () => void;
};

const STORAGE_KEY = "apfrs.attendance.v1";

function normalizeRecords(records: EmployeeRecord[]): EmployeeRecord[] {
  if (!Array.isArray(records)) return [];
  return records.map((r) => ({
    ...r,
    attendance: Array.isArray(r.attendance)
      ? r.attendance
      : Array.isArray((r as any).dailyRecords)
      ? (r as any).dailyRecords
      : Array.isArray((r as any).daily_records)
      ? (r as any).daily_records
      : [],
  }));
}

const AttendanceContext = createContext<AttendanceValue | null>(null);

export function AttendanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AttendanceState>({
    records: [],
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    fileName: "",
  });
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  // Restore local cache immediately on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AttendanceState;
        if (parsed.records && Array.isArray(parsed.records) && parsed.records.length > 0) {
          setState(parsed);
        }
      }
    } catch {
      /* ignore malformed storage */
    }
  }, []);

  // Fetch latest active attendance from MySQL
  const refreshFromDb = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setReady(true);
      return;
    }

    try {
      setLoading(true);
      const res = await apiFetch<{
        month: number;
        year: number;
        fileName: string;
        totalFaculty: number;
        records: EmployeeRecord[];
      }>("/api/admin/attendance/records");

      if (res && res.records && res.records.length > 0) {
        const next: AttendanceState = {
          records: normalizeRecords(res.records),
          month: res.month,
          year: res.year,
          fileName: res.fileName || "",
        };
        setState(next);
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* ignore storage quota */
        }
      }
    } catch {
      // Backend not reached / unauthenticated — keep local cache
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refreshFromDb();
  }, [refreshFromDb]);



  const loadMonth = useCallback(async (month: number, year: number) => {
    try {
      setLoading(true);
      const res = await apiFetch<{
        month: number;
        year: number;
        fileName: string;
        totalFaculty: number;
        records: EmployeeRecord[];
      }>(`/api/admin/attendance/records?month=${month}&year=${year}`);

      if (res && res.records) {
        const next: AttendanceState = {
          records: normalizeRecords(res.records),
          month: res.month || month,
          year: res.year || year,
          fileName: res.fileName || "",
        };
        setState(next);
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* ignore storage quota */
        }
      }
    } catch (err) {
      console.warn("Could not load month attendance:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const setAttendanceData = useCallback(
    (records: EmployeeRecord[], month: number, year: number, fileName: string) => {
      const next: AttendanceState = { records, month, year, fileName };
      setState(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* storage full — continue in-memory */
      }
    },
    [],
  );

  const clearAttendanceData = useCallback(() => {
    const next: AttendanceState = {
      records: [],
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      fileName: "",
    };
    setState(next);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo<AttendanceValue>(
    () => ({
      records: state.records,
      month: state.month,
      year: state.year,
      fileName: state.fileName,
      hasData: state.records.length > 0,
      ready,
      loading,
      setAttendanceData,
      loadMonth,
      refreshFromDb,
      clearAttendanceData,
    }),
    [state, ready, loading, setAttendanceData, loadMonth, refreshFromDb, clearAttendanceData],
  );

  return (
    <AttendanceContext.Provider value={value}>
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const ctx = useContext(AttendanceContext);
  if (!ctx) throw new Error("useAttendance must be used inside AttendanceProvider");
  return ctx;
}
