// frontend/src/routes/calendar.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Pencil } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  calendarQuery,
  useAddHoliday,
  useUpdateHoliday,
  useDeleteHoliday,
  type CalendarHoliday,
} from "@/lib/queries";
import { toast } from "sonner";
import { MONTH_NAMES } from "@/lib/constants";
import { useMonthYearSelector } from "@/hooks/useMonthYearSelector";

// Import split components
import { CalendarNavigation } from "./-calendar/CalendarNavigation";
import { CalendarGrid } from "./-calendar/CalendarGrid";
import { MetricsCards } from "./-calendar/MetricsCards";
import { HolidayList } from "./-calendar/HolidayList";
import { HolidayFormDialog } from "./-calendar/HolidayFormDialog";
import { DeleteConfirmationDialog } from "./-calendar/DeleteConfirmationDialog";

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

/** Builds the 7-column calendar day grid (Monday-Sunday aligned) */
function buildCalendarGrid(year: number, month: number) {
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

  const { month: selectedMonth, year: selectedYear, setMonth: setSelectedMonth, setYear: setSelectedYear } =
    useMonthYearSelector();

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

  const handleDayClick = (dayNum: number, holiday: CalendarHoliday | undefined) => {
    if (!isAdmin) return;
    if (holiday) {
      handleOpenEditHoliday(holiday);
    } else {
      handleOpenAddHoliday(dayNum);
    }
  };

  return (
    <AppShell
      roles={["admin", "faculty"]}
      title="Academic Calendar"
      subtitle={`${monthName} ${selectedYear} · Working days and holidays synchronization`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <Button size="sm" onClick={() => handleOpenAddHoliday()} className="gap-1.5">
              <Plus className="size-4" /> Add holiday
            </Button>
          )}

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
            <CalendarNavigation
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onMonthChange={setSelectedMonth}
              onYearChange={setSelectedYear}
              holidayCount={holidays.length}
            />

            <CalendarGrid
              year={selectedYear}
              month={selectedMonth}
              cells={cells}
              holidayByDate={holidayByDate}
              isAdmin={isAdmin}
              onDayClick={handleDayClick}
            />
          </section>
        </div>

        {/* ── Right Column: Metrics & Holiday List ── */}
        <div className="space-y-6">
          <MetricsCards
            workingDays={workingDays}
            totalDays={totalDays}
            monthName={monthName}
            year={selectedYear}
          />

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

            <HolidayList
              holidays={holidays}
              isLoading={isCalendarLoading}
              monthName={monthName}
              year={selectedYear}
              isAdmin={isAdmin}
              onEdit={handleOpenEditHoliday}
              onDelete={handleOpenDelete}
              onAdd={() => handleOpenAddHoliday()}
            />
          </section>
        </div>
      </div>

      {/* ── Dialog: Add / Edit Holiday ── */}
      <HolidayFormDialog
        open={holidayModalOpen}
        onOpenChange={setHolidayModalOpen}
        editingHoliday={editingHoliday}
        formData={{ date: formDate, name: formName, type: formType }}
        onFormChange={(data) => {
          if (data.date !== undefined) setFormDate(data.date);
          if (data.name !== undefined) setFormName(data.name);
          if (data.type !== undefined) setFormType(data.type);
        }}
        onSubmit={handleSaveHoliday}
        isPending={addHolidayMutation.isPending || updateHolidayMutation.isPending}
      />

      {/* ── Dialog: Delete Confirmation ── */}
      <DeleteConfirmationDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        holiday={deletingHoliday}
        onConfirm={handleConfirmDelete}
        isPending={deleteHolidayMutation.isPending}
      />
    </AppShell>
  );
}

export default AcademicCalendarPage;
