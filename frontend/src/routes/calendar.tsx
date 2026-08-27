import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  Briefcase,
  Calendar,
  CheckCircle2,
  Loader2,
  Search,
  Users,
  AlertCircle,
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
import {
  calendarQuery,
  useAddHoliday,
  useUpdateHoliday,
  useDeleteHoliday,
  facultyListQuery,
  type CalendarHoliday,
} from "@/lib/queries";
import { toast } from "sonner";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Academic Calendar — e-Office Jntugv" },
      {
        name: "description",
        content:
          "Manage academic calendar, official college holidays, and synchronized working days for faculty attendance.",
      },
    ],
  }),
  component: AcademicCalendarPage,
});

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const YEARS = ["2024", "2025", "2026", "2027", "2028"];

const HOLIDAY_TYPES = [
  "Public holiday",
  "Institutional",
  "Academic",
  "Vacation",
] as const;

type HolidayType = (typeof HOLIDAY_TYPES)[number];

const typeBadgeStyles: Record<string, string> = {
  "Public holiday": "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20",
  Institutional: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20",
  Academic: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20",
  Vacation: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
};

/** Builds the 7-column calendar day grid (Monday-Sunday aligned) */
function buildCalendarGrid(year: number, month: number) {
  // Day of week for 1st of month: 0=Sun, 1=Mon, ..., 6=Sat
  // Offset to start on Monday: Mon=0, Tue=1, ..., Sun=6
  const firstDay = new Date(year, month - 1, 1);
  const startDayOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: (number | null)[] = Array.from({ length: startDayOffset }, () => null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return { cells, daysInMonth };
}

function AcademicCalendarPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  // ── Database Query for Calendar Data ──
  const {
    data: calendarData,
    isLoading: isCalendarLoading,
  } = useQuery(calendarQuery(selectedMonth, selectedYear));

  const holidays = calendarData?.holidays || [];
  const monthName = MONTH_NAMES[selectedMonth - 1];

  // ── Compute Calendar Metrics & Grid ──
  const { cells, daysInMonth } = useMemo(
    () => buildCalendarGrid(selectedYear, selectedMonth),
    [selectedYear, selectedMonth]
  );

  const holidayByDate = useMemo(() => {
    const map = new Map<string, CalendarHoliday>();
    holidays.forEach((h) => {
      if (h.date) map.set(h.date, h);
    });
    return map;
  }, [holidays]);

  // Working days count calculation
  const calculatedWorkingDays = useMemo(() => {
    let sundays = 0;
    let holidaysCount = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dPad = String(d).padStart(2, "0");
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${dPad}`;
      const dayOfWeek = new Date(selectedYear, selectedMonth - 1, d).getDay();
      const isSunday = dayOfWeek === 0;
      const isHoliday = holidayByDate.has(dateStr);

      if (isSunday) {
        sundays++;
      } else if (isHoliday) {
        holidaysCount++;
      }
    }
    return Math.max(0, daysInMonth - sundays - holidaysCount);
  }, [selectedYear, selectedMonth, daysInMonth, holidayByDate]);

  const workingDays = calendarData?.workingDays ?? calculatedWorkingDays;
  const totalDays = calendarData?.totalDays ?? daysInMonth;

  // ── Month & Year Navigation ──
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  // ── Top Faculty Search (Debounced) ──
  const [facultySearch, setFacultySearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(facultySearch.trim()), 300);
    return () => clearTimeout(t);
  }, [facultySearch]);

  const { data: searchResultsData, isLoading: isSearching } = useQuery({
    ...facultyListQuery({ search: debouncedSearch, limit: 5 }),
    enabled: debouncedSearch.length > 1,
  });
  const searchResults = searchResultsData?.faculty || [];

  // ── Modal State: Add / Edit Holiday ──
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<CalendarHoliday | null>(null);

  const [formDate, setFormDate] = useState("");
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<string>("Public holiday");

  const addHolidayMutation = useAddHoliday();
  const updateHolidayMutation = useUpdateHoliday();
  const deleteHolidayMutation = useDeleteHoliday();

  const handleOpenAddHoliday = (defaultDay?: number) => {
    const dayPad = defaultDay ? String(defaultDay).padStart(2, "0") : "01";
    const mPad = String(selectedMonth).padStart(2, "0");
    setEditingHoliday(null);
    setFormDate(`${selectedYear}-${mPad}-${dayPad}`);
    setFormName("");
    setFormType("Public holiday");
    setHolidayModalOpen(true);
  };

  const handleOpenEditHoliday = (holiday: CalendarHoliday) => {
    setEditingHoliday(holiday);
    setFormDate(holiday.date);
    setFormName(holiday.name || holiday.label || "");
    setFormType(holiday.type || "Public holiday");
    setHolidayModalOpen(true);
  };

  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDate || !formName.trim()) {
      toast.error("Please enter a valid date and holiday name.");
      return;
    }

    try {
      if (editingHoliday?.id) {
        await updateHolidayMutation.mutateAsync({
          id: editingHoliday.id,
          date: formDate,
          name: formName.trim(),
          type: formType,
        });
        toast.success(`Holiday "${formName.trim()}" updated successfully.`);
      } else {
        await addHolidayMutation.mutateAsync({
          date: formDate,
          name: formName.trim(),
          type: formType,
        });
        toast.success(`Holiday "${formName.trim()}" added to academic calendar.`);
      }
      setHolidayModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save holiday.");
    }
  };

  // ── Modal State: Delete Confirmation ──
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingHoliday, setDeletingHoliday] = useState<CalendarHoliday | null>(null);

  const handleOpenDelete = (holiday: CalendarHoliday) => {
    setDeletingHoliday(holiday);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingHoliday?.id) return;
    try {
      await deleteHolidayMutation.mutateAsync(deletingHoliday.id);
      toast.success(`Holiday "${deletingHoliday.name || deletingHoliday.label}" removed.`);
      setDeleteModalOpen(false);
      setDeletingHoliday(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete holiday.");
    }
  };

  return (
    <AppShell
      title="Academic Calendar"
      subtitle={`${monthName} ${selectedYear} · Working days and holidays synchronization`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/* Top Search Bar */}
          <div className="relative">
            <div className="flex items-center rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs shadow-sm">
              <Search className="size-3.5 text-muted-foreground mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Search faculty, email, CFMS..."
                value={facultySearch}
                onChange={(e) => setFacultySearch(e.target.value)}
                className="w-44 bg-transparent outline-none placeholder:text-muted-foreground text-xs"
              />
              {facultySearch && (
                <button
                  type="button"
                  onClick={() => setFacultySearch("")}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Search Dropdown Preview */}
            {debouncedSearch.length > 1 && (
              <div className="absolute right-0 top-full mt-1.5 w-72 rounded-lg border border-border bg-popover p-2 shadow-xl z-50 text-xs">
                {isSearching ? (
                  <div className="flex items-center gap-2 py-2 px-3 text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" /> Searching faculty registry…
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-1">
                    <p className="px-2 py-1 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">
                      Matching Faculty
                    </p>
                    {searchResults.map((f: any) => (
                      <Link
                        key={f.id}
                        to="/faculty"
                        className="flex flex-col rounded p-1.5 hover:bg-muted transition-colors"
                      >
                        <span className="font-semibold text-foreground">{f.name}</span>
                        <span className="text-muted-foreground text-[10px]">
                          {f.department} · {f.cfms_id || f.email}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="py-2 px-3 text-muted-foreground text-center">No faculty records found.</p>
                )}
              </div>
            )}
          </div>

          {/* Add Holiday Button */}
          {isAdmin && (
            <Button size="sm" onClick={() => handleOpenAddHoliday()} className="gap-1.5">
              <Plus className="size-4" /> Add holiday
            </Button>
          )}

          {/* Edit Calendar (Link to Bulk Edit) */}
          {isAdmin && (
            <Button asChild size="sm" variant="outline">
              <Link to="/edit/calendar">
                <Pencil className="mr-1.5 size-3.5" /> Edit Calendar
              </Link>
            </Button>
          )}
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* ── Left Column: Calendar Navigation & Month Grid ── */}
        <div className="space-y-4">
          <section className="surface-panel p-5">
            {/* Top Month / Year Selector Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={handlePrevMonth}
                  title="Previous month"
                >
                  <ChevronLeft className="size-4" />
                </Button>

                {/* Month Dropdown */}
                <Select
                  value={String(selectedMonth)}
                  onValueChange={(val) => setSelectedMonth(parseInt(val, 10))}
                >
                  <SelectTrigger className="h-8 w-36 font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((m, idx) => (
                      <SelectItem key={m} value={String(idx + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Year Dropdown */}
                <Select
                  value={String(selectedYear)}
                  onValueChange={(val) => setSelectedYear(parseInt(val, 10))}
                >
                  <SelectTrigger className="h-8 w-24 font-mono font-semibold">
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

                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={handleNextMonth}
                  title="Next month"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>

              {/* Sync / Verification Status Badge */}
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" />
                <span>Verified ✓</span>
              </div>
            </div>

            {/* Calendar Day Grid (MON - SUN) */}
            <div className="mt-4">
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground mb-2">
                {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d, i) => (
                  <div
                    key={d}
                    className={`py-1.5 ${i === 6 ? "text-rose-500/80 font-bold" : ""}`}
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {cells.map((dayNum, idx) => {
                  if (dayNum === null) {
                    return (
                      <div
                        key={`empty-${idx}`}
                        className="h-20 rounded-lg border border-transparent bg-muted/10 opacity-40"
                      />
                    );
                  }

                  const dayPad = String(dayNum).padStart(2, "0");
                  const mPad = String(selectedMonth).padStart(2, "0");
                  const dateStr = `${selectedYear}-${mPad}-${dayPad}`;

                  const dayOfWeek = (idx % 7); // 0=Mon, 5=Sat, 6=Sun
                  const isSunday = dayOfWeek === 6;
                  const isSaturday = dayOfWeek === 5;
                  const holiday = holidayByDate.get(dateStr);

                  return (
                    <div
                      key={dateStr}
                      onClick={() => {
                        if (isAdmin) {
                          if (holiday) handleOpenEditHoliday(holiday);
                          else handleOpenAddHoliday(dayNum);
                        }
                      }}
                      className={`group relative flex flex-col justify-between rounded-lg border p-2 h-20 text-xs transition-all ${
                        holiday
                          ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold cursor-pointer hover:border-rose-500"
                          : isSunday
                          ? "border-border/60 bg-muted/40 text-muted-foreground/70"
                          : isSaturday
                          ? "border-border bg-card/60 hover:border-primary/40 cursor-pointer"
                          : "border-border bg-card hover:border-primary/50 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-mono text-xs ${holiday ? "font-bold text-rose-600 dark:text-rose-400" : isSunday ? "text-muted-foreground" : "font-medium text-foreground"}`}>
                          {dayNum}
                        </span>

                        {isSunday && (
                          <span className="text-[9px] font-mono text-muted-foreground/60">Sun</span>
                        )}

                        {isAdmin && (
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-primary">
                            {holiday ? "Edit" : "+"}
                          </span>
                        )}
                      </div>

                      {holiday && (
                        <div className="mt-1 truncate rounded bg-rose-500/20 px-1 py-0.5 text-[10px] font-semibold leading-tight text-rose-700 dark:text-rose-300">
                          {holiday.name || holiday.label}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        {/* ── Right Column: Metrics & Holiday List ── */}
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="surface-panel p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Working Days</span>
                <Briefcase className="size-4 text-amber-500" />
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold font-mono text-foreground">{workingDays}</span>
                <p className="text-[11px] text-muted-foreground mt-0.5">Active attendance days</p>
              </div>
            </div>

            <div className="surface-panel p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Days</span>
                <Calendar className="size-4 text-primary" />
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold font-mono text-foreground">{totalDays}</span>
                <p className="text-[11px] text-muted-foreground mt-0.5">{monthName} {selectedYear}</p>
              </div>
            </div>
          </div>

          {/* Holiday List for Selected Month */}
          <section className="surface-panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">Holidays</h2>
                <p className="text-xs text-muted-foreground">
                  For {monthName} {selectedYear}
                </p>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-mono font-medium text-foreground">
                {holidays.length} {holidays.length === 1 ? "holiday" : "holidays"}
              </span>
            </div>

            {isCalendarLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-xs gap-2">
                <Loader2 className="size-4 animate-spin text-primary" /> Loading holidays…
              </div>
            ) : holidays.length > 0 ? (
              <ul className="divide-y divide-border">
                {holidays.map((h) => {
                  const parts = h.date.split("-");
                  const day = parts[2] ? parseInt(parts[2], 10) : "";
                  const mIdx = parts[1] ? parseInt(parts[1], 10) - 1 : 0;
                  const dateFormatted = `${day} ${MONTH_SHORT[mIdx] || ""} ${parts[0] || ""}`;

                  return (
                    <li key={h.id || h.date} className="py-3 flex items-center justify-between gap-3 group">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-foreground">
                            {dateFormatted}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.2 text-[10px] font-medium ${
                              typeBadgeStyles[h.type || "Public holiday"] || "bg-muted text-muted-foreground"
                            }`}
                          >
                            {h.type || "Public holiday"}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">
                          {h.name || h.label}
                        </p>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenEditHoliday(h)}
                            title="Edit holiday"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleOpenDelete(h)}
                            title="Delete holiday"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="py-8 text-center space-y-2">
                <CalendarDays className="mx-auto size-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">No holidays scheduled for {monthName} {selectedYear}.</p>
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenAddHoliday()}
                    className="mt-2 text-xs"
                  >
                    <Plus className="mr-1 size-3" /> Add a holiday
                  </Button>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ── Dialog: Add / Edit Holiday ── */}
      <Dialog open={holidayModalOpen} onOpenChange={setHolidayModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveHoliday}>
            <DialogHeader>
              <DialogTitle>
                {editingHoliday ? "Edit Holiday" : "Add Holiday"}
              </DialogTitle>
              <DialogDescription>
                Configure official academic calendar holidays for attendance calculations.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="holiday-date">Holiday Date</Label>
                <Input
                  id="holiday-date"
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="holiday-name">Holiday Name / Description</Label>
                <Input
                  id="holiday-name"
                  type="text"
                  placeholder="e.g. Independence Day, Pongal, Mid-term exam"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="holiday-type">Holiday Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger id="holiday-type">
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setHolidayModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addHolidayMutation.isPending || updateHolidayMutation.isPending}
              >
                {addHolidayMutation.isPending || updateHolidayMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 size-4 animate-spin" /> Saving…
                  </>
                ) : editingHoliday ? (
                  "Update Holiday"
                ) : (
                  "Add Holiday"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Delete Confirmation ── */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-5" /> Delete Holiday
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <strong className="text-foreground">
                "{deletingHoliday?.name || deletingHoliday?.label}"
              </strong>{" "}
              ({deletingHoliday?.date}) from the academic calendar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteHolidayMutation.isPending}
              onClick={handleConfirmDelete}
            >
              {deleteHolidayMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" /> Deleting…
                </>
              ) : (
                "Delete Holiday"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
