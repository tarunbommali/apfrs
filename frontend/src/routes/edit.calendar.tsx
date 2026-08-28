import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MONTH_NAMES } from "@/lib/constants";
import {
  AlertTriangle,
  Braces,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Wand2,
  Briefcase,
  Layers,
  Sparkles,
  Calendar as CalendarIcon,
  ArrowLeft,
  SlidersHorizontal,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

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

const typeStyles: Record<HolidayType, string> = {
  "Public holiday": "border-destructive/40 bg-destructive/10 text-destructive",
  Institutional: "border-accent/50 bg-accent/15 text-accent-foreground",
  Academic: "border-primary/40 bg-primary/10 text-primary",
  Vacation: "border-border bg-muted text-muted-foreground",
};

const STORAGE_KEY = "apfrs.academic-calendar.v1";

type HolidayTemplate = {
  monthDay: string; // "MM-DD"
  label: string;
  type: HolidayType;
};

const defaultHolidayTemplates: HolidayTemplate[] = [
  { monthDay: "01-14", label: "Makara Sankranti / Pongal", type: "Public holiday" },
  { monthDay: "01-26", label: "Republic Day", type: "Public holiday" },
  { monthDay: "03-22", label: "Ugadi (Telugu New Year)", type: "Public holiday" },
  { monthDay: "04-05", label: "Babu Jagjivan Ram Birthday", type: "Public holiday" },
  { monthDay: "04-14", label: "Dr. B.R. Ambedkar Jayanthi", type: "Public holiday" },
  { monthDay: "08-15", label: "Independence Day", type: "Public holiday" },
  { monthDay: "08-22", label: "Vinayaka Chavithi", type: "Public holiday" },
  { monthDay: "09-02", label: "Mid-term examinations begin", type: "Academic" },
  { monthDay: "09-05", label: "Teachers' Day", type: "Institutional" },
  { monthDay: "10-02", label: "Mahatma Gandhi Jayanti", type: "Public holiday" },
  { monthDay: "10-20", label: "Vijaya Dasami / Dussehra", type: "Public holiday" },
  { monthDay: "11-08", label: "Diwali", type: "Public holiday" },
  { monthDay: "12-25", label: "Christmas", type: "Public holiday" },
];

export function buildDefaultHolidays(year: number): Holiday[] {
  return defaultHolidayTemplates.map((t) => ({
    date: `${year}-${t.monthDay}`,
    label: t.label,
    type: t.type,
  }));
}

const YEAR_RANGE = { past: 5, future: 10 };

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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseHolidaysJson(text: string): { holidays: Holiday[]; error: null } | { holidays: null; error: string } {
  if (text.trim() === "") return { holidays: null, error: "JSON is empty — add at least one holiday object." };

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
    if (seen.has(h.date)) return { holidays: null, error: `Duplicate date "${h.date}" — each date can appear only once.` };
    seen.add(h.date);
  }

  return { holidays: out, error: null };
}

function EditAcademicCalendarPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [holidays, setHolidays] = useState<Holiday[]>(() => buildDefaultHolidays(now.getFullYear()));
  const [mode, setMode] = useState<"manual" | "json">("manual");
  const [draft, setDraft] = useState<Holiday | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Bulk JSON editor state
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Load holidays from DB
  useEffect(() => {
    async function loadCalendar() {
      try {
        const res = await apiFetch<{ holidays: Holiday[] }>("/api/admin/calendar");
        if (res && Array.isArray(res.holidays) && res.holidays.length > 0) {
          setHolidays(res.holidays);
          setJsonText(JSON.stringify(res.holidays, null, 2));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(res.holidays));
          return;
        }
      } catch {
        // Local storage fallback
      }

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Holiday[];
          setHolidays(parsed);
          setJsonText(JSON.stringify(parsed, null, 2));
        }
      } catch {
        /* ignore */
      }
    }

    void loadCalendar();
  }, []);

  const persist = async (next: Holiday[]) => {
    const sorted = [...next].sort((a, b) => a.date.localeCompare(b.date));
    setHolidays(sorted);
    setJsonText(JSON.stringify(sorted, null, 2));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
    } catch {
      /* storage unavailable */
    }

    if (isAdmin) {
      try {
        await apiFetch<{ holidays: Holiday[] }>("/api/admin/calendar", {
          method: "POST",
          body: { holidays: sorted },
        });
      } catch (err) {
        console.warn("Could not sync calendar to backend:", err);
      }
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
    [holidays, yearPrefix],
  );

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

  const totalAnnualHolidays = yearHolidays.length;
  const totalAnnualWorkingDays = classifiedMonths.reduce((acc, m) => acc + m.workingDays, 0);

  const handleOpenAddForMonth = (monthIndex: number) => {
    setIsNew(true);
    setDraft({
      date: iso(year, monthIndex, 1),
      label: "",
      type: "Public holiday",
    });
  };

  const handleEditHoliday = (holiday: Holiday) => {
    setIsNew(false);
    setDraft(holiday);
  };

  const saveDraft = () => {
    if (!draft || draft.label.trim() === "") return;
    void persist([...holidays.filter((h) => h.date !== draft.date), { ...draft, label: draft.label.trim() }]);
    toast.success(`Holiday saved for ${formatDayLabel(draft.date)}`);
    setDraft(null);
  };

  const removeDate = (date: string) => {
    void persist(holidays.filter((h) => h.date !== date));
    toast.info(`Holiday removed for ${formatDayLabel(date)}`);
    setDraft(null);
  };

  const onJsonChange = (value: string) => {
    setJsonText(value);
    const result = parseHolidaysJson(value);
    if (result.error !== null) {
      setJsonError(result.error);
    } else {
      setJsonError(null);
      void persist(result.holidays);
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

  const resetJson = () => {
    const defaults = buildDefaultHolidays(year);
    const otherYears = holidays.filter((h) => !h.date.startsWith(`${year}-`));
    const merged = [...otherYears, ...defaults];
    void persist(merged);
    setJsonText(JSON.stringify(merged, null, 2));
    setJsonError(null);
    toast.info(`Reset holidays to standard AP academic defaults for ${year}.`);
  };

  return (
    <AppShell
      roles={["admin"]}
      title="Edit Academic Calendar"
      subtitle="Configure holidays and working days manually by month or using the two-way bulk JSON editor"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/calendar">
              <ArrowLeft className="size-4" /> Back to Calendar
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
      {/* ── Year Selector & Quick Metrics ── */}
      <div className="surface-panel mb-6 flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setYear((y) => y - 1)}
            aria-label="Previous year"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v, 10))}>
            <SelectTrigger className="h-9 w-32 font-mono text-base font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => {
                const count = yearHolidaysCount.get(y) ?? 0;
                const isVerified = count >= 6;
                return (
                  <SelectItem key={y} value={String(y)}>
                    <div className="flex items-center justify-between gap-2.5 w-full">
                      <span>{y}</span>
                      {isVerified ? (
                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          Verified
                        </span>
                      ) : null}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setYear((y) => y + 1)}
            aria-label="Next year"
          >
            <ChevronRight className="size-4" />
          </Button>

          <span className="ml-2 font-mono text-xs font-semibold text-muted-foreground">
            {totalAnnualHolidays} holidays · {totalAnnualWorkingDays} annual working days
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIsNew(true);
              setDraft({ date: iso(year, 0, 1), label: "", type: "Public holiday" });
            }}
          >
            <Plus className="size-4" /> Add holiday
          </Button>
          <Button size="sm" variant="outline" onClick={resetJson}>
            <RotateCcw className="size-4" /> Seed defaults ({year})
          </Button>
        </div>
      </div>

      {/* ── Mode 1: Two-way JSON Editor ── */}
      {mode === "json" ? (
        <div className="surface-panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-base font-semibold">Two-Way JSON Editor</h2>
              <p className="text-xs text-muted-foreground">
                Edit holiday definitions directly in JSON. Changes synchronize to MySQL and the manual view live.
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={formatJson}>
                <Wand2 className="size-4" /> Format JSON
              </Button>
              <Button size="sm" variant="outline" onClick={resetJson}>
                <RotateCcw className="size-4" /> Reset defaults
              </Button>
            </div>
          </div>

          <Textarea
            value={jsonText}
            onChange={(e) => onJsonChange(e.target.value)}
            spellCheck={false}
            aria-label="Holidays JSON editor"
            className="min-h-[500px] w-full resize-y rounded-none border-0 font-mono text-xs leading-relaxed focus-visible:ring-0"
          />

          <div
            className={`flex items-start gap-2 border-t px-5 py-3 text-xs ${
              jsonError
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-border bg-muted/40 text-muted-foreground"
            }`}
          >
            {jsonError ? (
              <>
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span className="font-mono">{jsonError}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Valid JSON — <strong className="text-foreground">{holidays.length}</strong> total holidays
                  saved in database.
                </span>
              </>
            )}
          </div>
        </div>
      ) : (
        /* ── Mode 2: Manual Monthly Classified Cards ── */
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {classifiedMonths.map((m) => {
            const hasHolidays = m.holidays.length > 0;

            return (
              <div
                key={m.monthIndex}
                className="surface-panel flex flex-col justify-between overflow-hidden border border-border/80 transition-all hover:border-border"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3.5">
                    <h3 className="font-semibold text-foreground">
                      {m.monthName} <span className="font-mono text-xs font-normal text-muted-foreground">{year}</span>
                    </h3>
                    <div className="flex items-center gap-1.5 font-mono text-xs">
                      <span className="rounded bg-accent/15 px-2 py-0.5 font-semibold text-accent-foreground">
                        {m.workingDays} w-days
                      </span>
                      {hasHolidays ? (
                        <span className="rounded bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                          {m.holidays.length} hols
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="p-4">
                    {hasHolidays ? (
                      <ul className="space-y-2.5">
                        {m.holidays.map((h) => (
                          <li
                            key={h.date}
                            className="group flex items-start justify-between gap-2 rounded-md border border-border/60 bg-card p-3 transition-colors hover:bg-muted/40"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-foreground">
                                  {formatDayLabel(h.date)}
                                </span>
                                <span
                                  className={`rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold ${
                                    typeStyles[h.type]
                                  }`}
                                >
                                  {h.type}
                                </span>
                              </div>
                              <p className="mt-1 truncate text-xs font-medium text-foreground">{h.label}</p>
                            </div>

                            <div className="flex shrink-0 items-center gap-0.5 opacity-80 group-hover:opacity-100">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                onClick={() => handleEditHoliday(h)}
                                aria-label={`Edit ${h.label}`}
                              >
                                <Pencil className="size-3.5 text-muted-foreground" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                onClick={() => removeDate(h.date)}
                                aria-label={`Remove ${h.label}`}
                              >
                                <Trash2 className="size-3.5 text-destructive" />
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-muted-foreground">
                        <CalendarIcon className="mb-1.5 size-5 opacity-40" />
                        <p>No holidays mapped</p>
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/80">
                          {m.totalDays} total days · {m.sundaysCount} Sundays
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-border/60 bg-muted/20 px-4 py-2 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => handleOpenAddForMonth(m.monthIndex)}
                  >
                    <Plus className="mr-1 size-3" /> Add to {m.monthName}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Holiday Dialog Modal ── */}
      <Dialog open={draft !== null} onOpenChange={(o) => (o ? null : setDraft(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isNew ? "Map a holiday or academic event" : "Edit holiday"}</DialogTitle>
            <DialogDescription>
              Mapped holidays immediately synchronize with monthly attendance calculations.
            </DialogDescription>
          </DialogHeader>

          {draft ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="holiday-date">Date</Label>
                <Input
                  id="holiday-date"
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="holiday-label">Occasion / Event Title</Label>
                <Input
                  id="holiday-label"
                  value={draft.label}
                  placeholder="e.g. Independence Day / Semester Exam Begins"
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={draft.type}
                  onValueChange={(v) => setDraft({ ...draft, type: v as HolidayType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOLIDAY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:justify-between">
            {draft && !isNew ? (
              <Button variant="ghost" onClick={() => removeDate(draft.date)}>
                <Trash2 className="size-4 text-destructive" /> Remove
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Button onClick={saveDraft} disabled={!draft || draft.label.trim() === ""}>
                Save holiday
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
