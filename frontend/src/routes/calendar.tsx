import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  Briefcase,
  Layers,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Academic Calendar — e-Office Jntugv" },
      {
        name: "description",
        content:
          "View and interact with the academic calendar: college holidays, working days and examination periods.",
      },
      { property: "og:title", content: "Academic Calendar — e-Office Jntugv" },
      {
        property: "og:description",
        content: "Working days and holiday configuration for attendance cycles.",
      },
    ],
  }),
  component: AcademicCalendar,
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
  wrapsToNextYear?: boolean;
};

const defaultHolidayTemplates: HolidayTemplate[] = [
  { monthDay: "08-15", label: "Independence Day", type: "Public holiday" },
  { monthDay: "08-22", label: "Vinayaka Chavithi", type: "Public holiday" },
  { monthDay: "09-02", label: "Mid-term examinations begin", type: "Academic" },
  { monthDay: "09-05", label: "Teachers' Day", type: "Institutional" },
  { monthDay: "10-02", label: "Mahatma Gandhi Jayanti", type: "Public holiday" },
  { monthDay: "10-20", label: "Vijaya Dasami / Dussehra", type: "Public holiday" },
  { monthDay: "11-08", label: "Diwali", type: "Public holiday" },
  { monthDay: "12-25", label: "Christmas", type: "Public holiday" },
  { monthDay: "01-14", label: "Makara Sankranti / Pongal", type: "Public holiday", wrapsToNextYear: true },
  { monthDay: "01-26", label: "Republic Day", type: "Public holiday", wrapsToNextYear: true },
];

export function buildDefaultHolidays(baseAcademicYear: number): Holiday[] {
  return defaultHolidayTemplates.map((t) => {
    const y = t.wrapsToNextYear ? baseAcademicYear + 1 : baseAcademicYear;
    return {
      date: `${y}-${t.monthDay}`,
      label: t.label,
      type: t.type,
    };
  });
}

const YEAR_RANGE = { past: 5, future: 10 };

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const monthLabel = (y: number, m: number) =>
  new Date(y, m, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

const prettyDate = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d!).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/** Monday-first grid cells for a month; null = padding. */
function buildGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function AcademicCalendar() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const initialAcademicYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  const [holidays, setHolidays] = useState<Holiday[]>(() => buildDefaultHolidays(initialAcademicYear));
  const [draft, setDraft] = useState<Holiday | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Fetch holidays from database / fallback local storage
  useEffect(() => {
    async function loadCalendar() {
      try {
        const res = await apiFetch<{ holidays: Holiday[] }>("/api/admin/calendar");
        if (res && Array.isArray(res.holidays) && res.holidays.length > 0) {
          setHolidays(res.holidays);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(res.holidays));
          return;
        }
      } catch {
        // Fallback to local storage
      }

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) setHolidays(JSON.parse(raw) as Holiday[]);
      } catch {
        /* ignore corrupt storage */
      }
    }

    void loadCalendar();
  }, []);

  const persist = async (next: Holiday[]) => {
    const sorted = [...next].sort((a, b) => a.date.localeCompare(b.date));
    setHolidays(sorted);
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

  const byDate = useMemo(() => {
    const map = new Map<string, Holiday>();
    holidays.forEach((h) => map.set(h.date, h));
    return map;
  }, [holidays]);

  // Academic year coverage tracking
  const yearCoverage = useMemo(() => {
    const map = new Map<number, number>();
    holidays.forEach((h) => {
      const parts = h.date.split("-").map(Number);
      if (parts.length >= 2) {
        const y = parts[0];
        const m = parts[1];
        if (y !== undefined && m !== undefined) {
          const academicYear = m >= 8 ? y : y - 1;
          map.set(academicYear, (map.get(academicYear) ?? 0) + 1);
        }
      }
    });
    return map;
  }, [holidays]);

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

  const cells = useMemo(() => buildGrid(year, month), [year, month]);

  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthHolidays = useMemo(
    () => holidays.filter((h) => h.date.startsWith(monthPrefix)),
    [holidays, monthPrefix],
  );

  // ── Metrics Calculation (Dynamic & Synchronized) ───────────────────────────
  const totalDays = new Date(year, month + 1, 0).getDate();

  // All Sundays in this month
  const sundaysCount = cells.filter((d) => {
    if (d === null) return false;
    const wd = new Date(year, month, d).getDay();
    return wd === 0;
  }).length;

  // Non-working holidays that fall on Mon–Sat
  const nonWorkingWeekdayHolidays = monthHolidays.filter((h) => {
    const dayNum = Number(h.date.slice(8, 10));
    const isSunday = new Date(year, month, dayNum).getDay() === 0;
    return !isSunday;
  });

  const holidayOnWorkday = nonWorkingWeekdayHolidays.length;

  // Final Total Working Days
  const workingDays = Math.max(0, totalDays - sundaysCount - holidayOnWorkday);

  const selectedAcademicYear = month >= 7 ? year : year - 1;
  const currentAcademicCoverage = yearCoverage.get(selectedAcademicYear) ?? 0;

  const shiftMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };

  const openDay = (day: number) => {
    if (!isAdmin) return;
    const date = iso(year, month, day);
    const existing = byDate.get(date);
    setIsNew(!existing);
    setDraft(existing ?? { date, label: "", type: "Public holiday" });
  };

  const saveDraft = () => {
    if (!draft || draft.label.trim() === "") return;
    void persist([...holidays.filter((h) => h.date !== draft.date), { ...draft, label: draft.label.trim() }]);
    toast.success(`Holiday saved for ${prettyDate(draft.date)}`);
    setDraft(null);
  };

  const removeDate = (date: string) => {
    void persist(holidays.filter((h) => h.date !== date));
    toast.info(`Holiday removed for ${prettyDate(date)}`);
    setDraft(null);
  };

  const calendarSection = (
    <section className="surface-panel p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button variant="ghost" size="icon" onClick={() => shiftMonth(-1)} aria-label="Previous month">
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v, 10))}>
            <SelectTrigger className="h-8 w-32 font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((m, i) => (
                <SelectItem key={m} value={String(i)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v, 10))}>
            <SelectTrigger className="h-8 w-28 font-mono font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => {
                const count = yearCoverage.get(y) ?? 0;
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
        </div>
        <Button variant="ghost" size="icon" onClick={() => shiftMonth(1)} aria-label="Next month">
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="label-caps py-2">
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`pad-${i}`} className="aspect-square" />;
          const date = iso(year, month, d);
          const holiday = byDate.get(date);
          const sunday = new Date(year, month, d).getDay() === 0;
          return (
            <button
              key={date}
              type="button"
              onClick={() => openDay(d)}
              disabled={!isAdmin}
              title={holiday ? `${holiday.label} (${holiday.type})` : sunday ? "Sunday (Non-working)" : "Working day"}
              className={`aspect-square rounded-md border p-2 text-left font-mono text-sm transition-colors ${
                holiday
                  ? typeStyles[holiday.type]
                  : sunday
                    ? "border-border bg-muted/70 text-muted-foreground"
                    : "border-border bg-card"
              } ${isAdmin ? "cursor-pointer hover:ring-2 hover:ring-primary/40" : ""}`}
            >
              {d}
              {holiday ? (
                <span className="mt-1 block truncate text-[9px] font-sans font-medium leading-tight">
                  {holiday.label}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        {HOLIDAY_TYPES.map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <span className={`size-3 rounded-sm border ${typeStyles[t]}`} />
            {t}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-border bg-muted/70" />
          Sunday
        </span>
      </div>
    </section>
  );

  const holidayListSection = (
    <section className="surface-panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold">Holidays</h2>
          <p className="text-xs text-muted-foreground">For {monthLabel(year, month)}</p>
        </div>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
          {monthHolidays.length} holidays
        </span>
      </div>
      <ul className="divide-y divide-border">
        {monthHolidays.map((h) => (
          <li key={h.date} className="flex items-start gap-3 px-5 py-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-foreground">{prettyDate(h.date)}</span>
                <span className={`rounded-sm border px-1.5 py-0.5 text-[10px] font-medium ${typeStyles[h.type]}`}>
                  {h.type}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium">{h.label}</p>
            </div>
            {isAdmin ? (
              <div className="flex shrink-0 gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Edit ${h.label}`}
                  onClick={() => {
                    setIsNew(false);
                    setDraft(h);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove ${h.label}`}
                  onClick={() => removeDate(h.date)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ) : null}
          </li>
        ))}
        {monthHolidays.length === 0 ? (
          <li className="px-5 py-12 text-center text-sm text-muted-foreground">
            <CalendarDays className="mx-auto mb-2 size-5" />
            No holidays mapped for {monthLabel(year, month)}.
          </li>
        ) : null}
      </ul>
    </section>
  );

  return (
    <AppShell
      roles={["admin", "faculty"]}
      title="Academic Calendar"
      subtitle={`${monthLabel(year, month)} · Working days and holidays synchronization`}
      actions={
        isAdmin ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsNew(true);
                setDraft({ date: iso(year, month, 1), label: "", type: "Public holiday" });
              }}
            >
              <Plus className="size-4" /> Add holiday
            </Button>
            <Button asChild>
              <Link to="/edit/calendar">
                <Pencil className="size-4" /> Edit Calendar
              </Link>
            </Button>
          </div>
        ) : null
      }
    >
      {/* ── Academic Year Coverage Notice ── */}
      {currentAcademicCoverage === 0 ? (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-600 dark:text-amber-400">
          <div className="flex items-center gap-2">
            <Layers className="size-4 shrink-0" />
            <span>
              Academic Year <strong className="font-semibold">{selectedAcademicYear}–{selectedAcademicYear + 1}</strong> currently has{" "}
              <strong>0 holidays mapped</strong>. Go to Edit Calendar to configure.
            </span>
          </div>
          {isAdmin ? (
            <Button size="sm" variant="outline" className="h-7 text-xs border-amber-500/40 hover:bg-amber-500/20" asChild>
              <Link to="/edit/calendar">Edit Calendar</Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Container 1: Calendar Grid */}
        {calendarSection}

        {/* Container 2: Top Stat Cards and Bottom Holidays List */}
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="surface-panel p-5">
              <div className="flex items-center justify-between">
                <p className="label-caps">Working Days</p>
                <Briefcase className="size-4 text-accent" />
              </div>
              <p className="mt-2 font-mono text-3xl font-bold text-accent">{workingDays}</p>
              <p className="mt-1 text-xs text-muted-foreground">Active attendance days</p>
            </div>

            <div className="surface-panel p-5">
              <div className="flex items-center justify-between">
                <p className="label-caps">Total Days</p>
                <CalendarDays className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-2 font-mono text-3xl font-bold">{totalDays}</p>
              <p className="mt-1 text-xs text-muted-foreground">{monthLabel(year, month)}</p>
            </div>
          </div>

          {holidayListSection}
        </div>
      </div>

      <Dialog open={draft !== null} onOpenChange={(o) => (o ? null : setDraft(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isNew ? "Map a holiday" : "Edit holiday"}</DialogTitle>
            <DialogDescription>
              Mapped dates automatically update working-day counts and attendance percentages.
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
                  placeholder="e.g. Independence Day / Semester Exam"
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
