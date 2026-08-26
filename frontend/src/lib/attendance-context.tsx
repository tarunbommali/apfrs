/**
 * Lightweight attendance data store backed by localStorage.
 * Attendance is parsed client-side from uploaded Excel files
 * and persisted so it survives page reloads.
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

export type AttendanceStatus = "P" | "A" | "L" | "H" | "HD" | "Late";

export type AttendanceDay = {
  date: string; // yyyy-mm-dd or "Day N" label
  status: AttendanceStatus;
  duration?: string;
};

export type EmployeeRecord = {
  name: string;
  email: string;
  cfmsId: string;
  department: string;
  designation: string;
  attendance: AttendanceDay[];
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
  setAttendanceData: (data: EmployeeRecord[], month: number, year: number, fileName: string) => void;
  clearAttendanceData: () => void;
};

const STORAGE_KEY = "apfrs.attendance.v1";

const AttendanceContext = createContext<AttendanceValue | null>(null);

export function AttendanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AttendanceState>({
    records: [],
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    fileName: "",
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AttendanceState;
        if (parsed.records && Array.isArray(parsed.records)) {
          setState(parsed);
        }
      }
    } catch {
      /* ignore malformed storage */
    }
    setReady(true);
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
      setAttendanceData,
      clearAttendanceData,
    }),
    [state, ready, setAttendanceData, clearAttendanceData],
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
