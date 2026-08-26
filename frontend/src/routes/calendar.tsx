import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
  X,
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

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Academic Calendar — APFRS" },
      {
        name: "description",
        content:
          "View and edit the academic calendar: map college holidays to dates, manage working days and examination periods.",
      },
      { property: "og:title", content: "Academic Calendar — APFRS" },
      {
        property: "og:description",
        content: "Working days and holiday configuration for attendance cycles.",
      },
    ],
  }),
  component: AcademicCalendar,
});

type HolidayType = "Public holiday" | "Institutional" | "Academic" | "Vacation";

type Holiday = {
  date: string; // yyyy-mm-dd
  label: string;
  type: HolidayType;
};

const HOLIDAY_TYPES: HolidayType[] = ["Public holiday", "Institutional", "Academic", "Vacation"];

const typeStyles: Record<HolidayType, string> = {
  "Public holiday": "border-destructive/40 bg-destructive/10 text-destructive",
  Institutional: "border-accent/50 bg-accent/15 text-accent-foreground",
  Academic: "border-primary/40 bg-primary/10 text-primary",
  Vacation: "border-border bg-muted text-muted-foreground",
};

const STORAGE_KEY = "apfrs.academic-calendar.v1";

const defaultHolidays: Holiday[] = [
  { date: "2026-08-15", label: "Independence Day", type: "Public holiday" },
  { date: "2026-08-22", label: "Vinayaka Chavithi", type: "Public holiday" },
  { date: "2026-09-02", label: "Mid-term examinations begin", type: "Academic" },
  { date: "2026-09-05", label: "Teachers' Day", type: "Institutional" },
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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse the bulk JSON editor text into holidays.
 * Returns normalized holidays on success, or a human-readable error.
 */
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

function AcademicCalendar() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(7); // August
  const [holidays, setHolidays] = useState<Holiday[]>(defaultHolidays);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Holiday | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Bulk JSON editor state
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHolidays(JSON.parse(raw) as Holiday[]);
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  const persist = (next: Holiday[]) => {
    const sorted = [...next].sort((a, b) => a.date.localeCompare(b.date));
    setHolidays(sorted);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
    } catch {
      /* storage unavailable */
    }
  };

  const byDate = useMemo(() => {
    const map = new Map<string, Holiday>();
    holidays.forEach((h) => map.set(h.date, h));
    return map;
  }, [holidays]);

  const cells = useMemo(() => buildGrid(year, month), [year, month]);

  const monthHolidays = useMemo(
    () => holidays.filter((h) => h.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)),
    [holidays, year, month],
  );

  const totalDays = new Date(year, month + 1, 0).getDate();
  const weekendCount = cells.filter((d) => {
    if (d === null) return false;
    const wd = new Date(year, month, d).getDay();
    return wd === 0;
  }).length;
  const holidayOnWorkday = monthHolidays.filter((h) => {
    const d = Number(h.date.slice(8, 10));
    return new Date(year, month, d).getDay() !== 0;
  }).length;
  const workingDays = totalDays - weekendCount - holidayOnWorkday;

  const shiftMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };

  const openDay = (day: number) => {
    if (!isAdmin || !editing || jsonMode) return;
    const date = iso(year, month, day);
    const existing = byDate.get(date);
    setIsNew(!existing);
    setDraft(existing ?? { date, label: "", type: "Public holiday" });
  };

  const saveDraft = () => {
    if (!draft || draft.label.trim() === "") return;
    persist([...holidays.filter((h) => h.date !== draft.date), { ...draft, label: draft.label.trim() }]);
    setDraft(null);
  };

  const removeDate = (date: string) => {
    persist(holidays.filter((h) => h.date !== date));
    setDraft(null);
  };

  // ----- Bulk JSON mode -----

  const enterJsonMode = () => {
    setEditing(false);
    setDraft(null);
    setJsonText(JSON.stringify(holidays, null, 2));
    setJsonError(null);
    setJsonMode(true);
  };

  const exitJsonMode = () => {
    setJsonMode(false);
    setJsonError(null);
  };

  const onJsonChange = (value: string) => {
    setJsonText(value);
    const result = parseHolidaysJson(value);
    if (result.error !== null) {
      setJsonError(result.error);
    } else {
      setJsonError(null);
      persist(result.holidays); // calendar updates live
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
    persist(defaultHolidays);
    setJsonText(JSON.stringify(defaultHolidays, null, 2));
    setJsonError(null);
  };

  const calendarSection = (
    <section className="surface-panel p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button variant="ghost" size="icon" onClick={() => shiftMonth(-1)} aria-label="Previous month">
          <ChevronLeft className="size-4" />
        </Button>
        <p className="font-mono text-sm font-semibold">{monthLabel(year, month)}</p>
        <Button variant="ghost" size="icon" onClick={() => shiftMonth(1)} aria-label="Next month">
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {editing && !jsonMode ? (
        <p className="mb-3 rounded-md border border-dashed border-accent/50 bg-accent/10 px-3 py-2 text-xs text-muted-foreground">
          Editing mode — click any date to map or clear a college holiday.
        </p>
      ) : null}
      {jsonMode ? (
        <p className="mb-3 rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          Live preview — this calendar updates as you edit the JSON on the left.
        </p>
      ) : null}

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
              disabled={!isAdmin || !editing || jsonMode}
              title={holiday ? `${holiday.label} (${holiday.type})` : undefined}
              className={`aspect-square rounded-md border p-2 text-left font-mono text-sm transition-colors ${
                holiday
                  ? typeStyles[holiday.type]
                  : sunday
                    ? "border-border bg-muted text-muted-foreground"
                    : "border-border bg-card"
              } ${editing && isAdmin && !jsonMode ? "cursor-pointer hover:ring-2 hover:ring-primary/40" : ""}`}
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
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Sundays and mapped holidays are non-working.{" "}
        <span className="font-mono font-semibold text-foreground">{workingDays}</span> working
        days counted for this cycle.
      </p>

      {monthHolidays.length > 0 ? (
        <ul className="mt-4 space-y-1.5 border-t border-border pt-4">
          {monthHolidays.map((h) => (
            <li key={h.date} className="flex items-baseline gap-2 text-xs">
              <span className="shrink-0 font-mono text-muted-foreground">{prettyDate(h.date)}</span>
              <span className="truncate font-medium">{h.label}</span>
              <span className="ml-auto shrink-0 text-muted-foreground">{h.type}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );

  const jsonEditorSection = (
    <section className="surface-panel flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold">Holidays JSON</h2>
          <p className="text-xs text-muted-foreground">
            Edit the array — valid changes apply to the calendar instantly.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={formatJson}>
            <Wand2 className="size-4" /> Format
          </Button>
          <Button size="sm" variant="outline" onClick={resetJson}>
            <RotateCcw className="size-4" /> Reset
          </Button>
        </div>
      </div>

      <Textarea
        value={jsonText}
        onChange={(e) => onJsonChange(e.target.value)}
        spellCheck={false}
        aria-label="Holidays JSON editor"
        className="min-h-[420px] flex-1 resize-y rounded-none border-0 font-mono text-xs leading-relaxed focus-visible:ring-0"
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
              Valid — <span className="font-mono font-semibold text-foreground">{holidays.length}</span>{" "}
              holidays applied. Each entry needs{" "}
              <code className="font-mono">date</code> (yyyy-mm-dd), <code className="font-mono">label</code> and{" "}
              <code className="font-mono">type</code> ({HOLIDAY_TYPES.join(" / ")}).
            </span>
          </>
        )}
      </div>
    </section>
  );

  const holidayListSection = (
    <section className="surface-panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold">Mapped holidays</h2>
        <span className="text-xs text-muted-foreground">{monthHolidays.length} this month</span>
      </div>
      <ul className="divide-y divide-border">
        {monthHolidays.map((h) => (
          <li key={h.date} className="flex items-start gap-3 px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs text-muted-foreground">{prettyDate(h.date)}</p>
              <p className="mt-1 text-sm font-medium">{h.label}</p>
              <p className="text-xs text-muted-foreground">{h.type}</p>
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
      subtitle={`${monthLabel(year, month)} · working days drive attendance percentage calculations`}
      actions={
        isAdmin ? (
          jsonMode ? (
            <Button onClick={exitJsonMode}>
              <ListChecks className="size-4" /> Back to list view
            </Button>
          ) : editing ? (
            <>
              <Button
                variant="outline"
                onClick={() => setDraft({ date: iso(year, month, 1), label: "", type: "Public holiday" })}
              >
                <Plus className="size-4" /> Add holiday
              </Button>
              <Button onClick={() => setEditing(false)}>
                <X className="size-4" /> Done editing
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={enterJsonMode}>
                <Braces className="size-4" /> Bulk edit JSON
              </Button>
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="size-4" /> Edit calendar
              </Button>
            </>
          )
        ) : null
      }
    >
      {jsonMode && isAdmin ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {jsonEditorSection}
          {calendarSection}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          {calendarSection}
          {holidayListSection}
        </div>
      )}

      <Dialog open={draft !== null} onOpenChange={(o) => (o ? null : setDraft(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isNew ? "Map a holiday" : "Edit holiday"}</DialogTitle>
            <DialogDescription>
              Mapped dates are excluded from working-day counts used in attendance percentages.
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
                <Label htmlFor="holiday-label">Occasion</Label>
                <Input
                  id="holiday-label"
                  value={draft.label}
                  placeholder="e.g. Independence Day"
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
