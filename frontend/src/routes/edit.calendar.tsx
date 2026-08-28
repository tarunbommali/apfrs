// frontend/src/routes/edit.calendar.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MONTH_NAMES } from "@/lib/constants";
import {
  Braces,
  CalendarDays,
  ArrowLeft,
  SlidersHorizontal,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

// Import split components
import { YearSelector } from "./-edit-calendar/YearSelector";
import { JSONEditor } from "./-edit-calendar/JSONEditor";
import { MonthlyCard } from "./-edit-calendar/MonthlyCard";
import { HolidayFormDialog } from "./-edit-calendar/HolidayFormDialog";

export const Route = createFileRoute("/edit/calendar")({
  head: () => ({
    meta: [
      { title: "Edit Academic Calendar — e-Office Jntugv" },
      {
        name: "description",
        content: "Manage institutional holidays and academic schedule manually or via bulk JSON.",
      },
    ],
  }),
  component: EditAcademicCalendarPage,
});

export type HolidayType = "Public holiday" | "Institutional" | "Academic" | "Vacation";

export type Holiday = {
  id?: string;
  date: string; // yyyy-mm-dd
  label: string;
  type: HolidayType;
};

export const HOLIDAY_TYPES: HolidayType[] = ["Public holiday", "Institutional", "Academic", "Vacation"];

const YEAR_RANGE = { past: 5, future: 10 };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const formatDayLabel = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y!, (m ?? 1) - 1, d!);
  return dt.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

function parseHolidaysJson(text: string): { holidays: Holiday[]; error: null } | { holidays: null; error: string } {
  if (text.trim() === "") {
    return { holidays: null, error: "JSON is empty — add at least one holiday object." };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { holidays: null, error: `Invalid JSON: ${e instanceof Error ? e.message : "parse error"}` };
  }

  if (!Array.isArray(raw)) {
    return { holidays: null, error: 'Expected a JSON array, e.g. [{ "date": "2026-08-15", "label": "…", "type": "…" }]' };
  }

  const out: Holiday[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const item = raw[i] as Record<string, unknown> | null;
    const where = `Entry ${i + 1}`;
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      return { holidays: null, error: `${where}: must be an object with date, label and type.` };
    }
    const date = item["date"];
    if (typeof date !== "string" || !DATE_RE.test(date)) {
      return { holidays: null, error: `${where}: "date" must be a string in yyyy-mm-dd format.` };
    }
    const label = item["label"];
    if (typeof label !== "string" || label.trim() === "") {
      return { holidays: null, error: `${where}: "label" must be a non-empty string.` };
    }
    let type = item["type"];
    if (type === undefined || type === null || type === "") type = "Public holiday";
    if (typeof type !== "string" || !HOLIDAY_TYPES.includes(type as HolidayType)) {
      return {
        holidays: null,
        error: `${where}: "type" must be one of ${HOLIDAY_TYPES.map((t) => `"${t}"`).join(", ")}.`,
      };
    }
    out.push({ date, label: label.trim(), type: type as HolidayType });
  }

  const seen = new Set<string>();
  for (const h of out) {
    if (seen.has(h.date)) {
      return { holidays: null, error: `Duplicate date "${h.date}" — each date can appear only once.` };
    }
    seen.add(h.date);
  }

  return { holidays: out, error: null };
}

function EditAcademicCalendarPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"manual" | "json">("manual");
  const [draft, setDraft] = useState<Holiday | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [categoryFilter] = useState<string>("all");

  // Bulk JSON editor state
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Load holidays from DB
  const loadCalendar = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ holidays: Holiday[] }>("/api/admin/calendar");
      if (res && Array.isArray(res.holidays)) {
        const sorted = [...res.holidays].sort((a, b) => a.date.localeCompare(b.date));
        setHolidays(sorted);
        setJsonText(JSON.stringify(sorted, null, 2));
      } else {
        throw new Error("Invalid calendar data received from database.");
      }
    } catch (err: any) {
      setError(err?.message || "Unable to load academic calendar from database.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCalendar();
  }, []);

  const persist = async (next: Holiday[]) => {
    const sorted = [...next].sort((a, b) => a.date.localeCompare(b.date));
    if (isAdmin) {
      try {
        await apiFetch<{ holidays: Holiday[] }>("/api/admin/calendar", {
          method: "POST",
          body: { holidays: sorted },
        });
        setHolidays(sorted);
        setJsonText(JSON.stringify(sorted, null, 2));
        return true;
      } catch (err: any) {
        toast.error(err?.message || "Could not save calendar to backend database.");
        return false;
      }
    } else {
      toast.error("Unauthorized: Only administrators can modify the academic calendar.");
      return false;
    }
  };

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const minYear = Math.min(year, current - YEAR_RANGE.past);
    const maxYear = Math.max(year, current + YEAR_RANGE.future);
    const years: number[] = [];
    for (let y = minYear; y <= maxYear; y++) {
      years.push(y);
    }
    return years;
  }, [year]);

  const yearHolidaysCount = useMemo(() => {
    const map = new Map<number, number>();
    holidays.forEach((h) => {
      const y = parseInt(h.date.slice(0, 4), 10);
      if (!isNaN(y)) {
        map.set(y, (map.get(y) ?? 0) + 1);
      }
    });
    return map;
  }, [holidays]);

  const yearPrefix = `${year}-`;
  const yearHolidays = useMemo(
    () => holidays.filter((h) => h.date.startsWith(yearPrefix)),
    [holidays, yearPrefix]
  );

  const totalAnnualHolidays = yearHolidays.length;
  const totalAnnualWorkingDays = useMemo(() => {
    let total = 0;
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const prefix = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
      const monthHolidays = yearHolidays.filter((h) => h.date.startsWith(prefix));
      const totalDays = new Date(year, monthIndex + 1, 0).getDate();
      let sundaysCount = 0;
      for (let d = 1; d <= totalDays; d += 1) {
        if (new Date(year, monthIndex, d).getDay() === 0) sundaysCount += 1;
      }
      const nonWorkingWeekdayHolidays = monthHolidays.filter((h) => {
        const dayNum = Number(h.date.slice(8, 10));
        return new Date(year, monthIndex, dayNum).getDay() !== 0;
      });
      total += Math.max(0, totalDays - sundaysCount - nonWorkingWeekdayHolidays.length);
    }
    return total;
  }, [year, yearHolidays]);

  const classifiedMonths = useMemo(() => {
    return MONTH_NAMES.map((monthName, monthIndex) => {
      const prefix = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
      const list = yearHolidays.filter((h) => {
        const matchMonth = h.date.startsWith(prefix);
        const matchCategory = categoryFilter === "all" || h.type === categoryFilter;
        return matchMonth && matchCategory;
      });

      const totalDays = new Date(year, monthIndex + 1, 0).getDate();

      let sundaysCount = 0;
      for (let d = 1; d <= totalDays; d += 1) {
        if (new Date(year, monthIndex, d).getDay() === 0) sundaysCount += 1;
      }

      const nonWorkingWeekdayHolidays = list.filter((h) => {
        const dayNum = Number(h.date.slice(8, 10));
        return new Date(year, monthIndex, dayNum).getDay() !== 0;
      });

      const workingDays = Math.max(0, totalDays - sundaysCount - nonWorkingWeekdayHolidays.length);

      return {
        monthIndex,
        monthName,
        totalDays,
        sundaysCount,
        workingDays,
        holidays: list,
      };
    });
  }, [year, yearHolidays, categoryFilter]);

  const handleOpenAddForMonth = (monthIndex: number) => {
    setIsNew(true);
    setDraft({
      date: iso(year, monthIndex, 1),
      label: "",
      type: "Public holiday",
    });
  };

  const handleOpenAddGeneric = () => {
    setIsNew(true);
    setDraft({
      date: iso(year, 0, 1),
      label: "",
      type: "Public holiday",
    });
  };

  const handleEditHoliday = (holiday: Holiday) => {
    setIsNew(false);
    setDraft(holiday);
  };

  const saveDraft = async () => {
    if (!draft || draft.label.trim() === "") return;
    const cleanDraft = { ...draft, label: draft.label.trim() };
    const success = await persist([
      ...holidays.filter((h) => h.date !== cleanDraft.date),
      cleanDraft,
    ]);
    if (success) {
      toast.success(`Holiday saved for ${formatDayLabel(cleanDraft.date)}`);
      setDraft(null);
    }
  };

  const removeDate = async (date: string) => {
    const success = await persist(holidays.filter((h) => h.date !== date));
    if (success) {
      toast.info(`Holiday removed for ${formatDayLabel(date)}`);
      setDraft(null);
    }
  };

  const onJsonChange = async (value: string) => {
    setJsonText(value);
    const result = parseHolidaysJson(value);
    if (result.error !== null) {
      setJsonError(result.error);
    } else {
      setJsonError(null);
      await persist(result.holidays);
    }
  };

  const formatJson = () => {
    const result = parseHolidaysJson(jsonText);
    if (result.error !== null) {
      setJsonError(result.error);
      return;
    }
    const sorted = [...result.holidays].sort((a, b) => a.date.localeCompare(b.date));
    setJsonText(JSON.stringify(sorted, null, 2));
    setJsonError(null);
  };

  // ── Loading & Error States ──
  if (isLoading) {
    return (
      <AppShell roles={["admin"]} title="Edit Academic Calendar">
        <div className="surface-panel flex flex-col items-center justify-center p-16 text-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground/60 mb-3" />
          <p className="text-sm text-muted-foreground">Loading academic calendar...</p>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell roles={["admin"]} title="Edit Academic Calendar">
        <div className="surface-panel flex flex-col items-center justify-center p-16 text-center border-destructive/20 bg-destructive/5">
          <AlertTriangle className="size-10 text-destructive mb-3" />
          <h3 className="text-base font-semibold text-destructive">Unable to load calendar</h3>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => void loadCalendar()}>
            Retry Connection
          </Button>
        </div>
      </AppShell>
    );
  }

  // ── Render ──
  return (
    <AppShell
      roles={["admin"]}
      title="Edit Academic Calendar"
      subtitle="Configure holidays and working days manually by month or using the two-way bulk JSON editor"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/calendar">
              <ArrowLeft className="size-4 mr-1.5" /> Back to Calendar
            </Link>
          </Button>
          <div className="flex rounded-lg border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setMode("manual")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                mode === "manual"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <SlidersHorizontal className="size-3.5" /> Manually
            </button>
            <button
              type="button"
              onClick={() => {
                setJsonText(JSON.stringify(holidays, null, 2));
                setMode("json");
              }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                mode === "json"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Braces className="size-3.5" /> JSON Editor
            </button>
          </div>
        </div>
      }
    >
      {/* ── Year Selector & Metrics ── */}
      <YearSelector
        year={year}
        onYearChange={setYear}
        totalHolidays={totalAnnualHolidays}
        totalWorkingDays={totalAnnualWorkingDays}
        yearOptions={yearOptions}
        yearHolidaysCount={yearHolidaysCount}
        onAddHoliday={handleOpenAddGeneric}
      />

      {/* ── Mode 1: JSON Editor ── */}
      {mode === "json" ? (
        <JSONEditor
          jsonText={jsonText}
          onJsonChange={onJsonChange}
          jsonError={jsonError}
          holidayCount={holidays.length}
          onFormat={formatJson}
        />
      ) : (
        /* ── Mode 2: Manual Monthly Cards ── */
        <>
          {yearHolidays.length === 0 ? (
            <div className="surface-panel flex flex-col items-center justify-center p-16 text-center mb-6">
              <CalendarDays className="size-12 text-muted-foreground/30 mb-3" />
              <h3 className="text-base font-semibold">No holidays mapped for {year}</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                There are no public, institutional, academic, or vacation days mapped in the database for the year {year}.
              </p>
              <Button className="mt-4" onClick={handleOpenAddGeneric}>
                Add first holiday for {year}
              </Button>
            </div>
          ) : null}

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {classifiedMonths.map((m) => (
              <MonthlyCard
                key={m.monthIndex}
                monthIndex={m.monthIndex}
                monthName={m.monthName}
                year={year}
                holidays={m.holidays}
                workingDays={m.workingDays}
                totalDays={m.totalDays}
                sundaysCount={m.sundaysCount}
                onAddHoliday={handleOpenAddForMonth}
                onEditHoliday={handleEditHoliday}
                onRemoveHoliday={removeDate}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Holiday Form Dialog ── */}
      <HolidayFormDialog
        open={draft !== null}
        onOpenChange={() => setDraft(null)}
        draft={draft}
        isNew={isNew}
        onSave={saveDraft}
        onRemove={removeDate}
        onDraftChange={setDraft}
      />
    </AppShell>
  );
}

export default EditAcademicCalendarPage;
