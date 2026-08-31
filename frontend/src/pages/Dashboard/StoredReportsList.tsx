import { useState } from "react";
import { Link } from "react-router-dom";
import { Download, Table2, Send, Calendar, FileSpreadsheet, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MONTH_NAMES } from "@/lib/constants";
import { exportAttendanceExcel } from "@/lib/export/exportAttendanceExcel";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

export interface AvailableMonth {
  month: number;
  year: number;
  recordCount?: number;
  workingDays?: number;
}

interface StoredReportsListProps {
  availableMonths: AvailableMonth[];
  selectedMonth: number;
  selectedYear: number;
  onSelect: (month: number, year: number) => void;
  isLoading?: boolean;
}

export function StoredReportsList({
  availableMonths,
  selectedMonth,
  selectedYear,
  onSelect,
  isLoading,
}: StoredReportsListProps) {
  const [exportingKey, setExportingKey] = useState<string | null>(null);

  const handleExport = async (month: number, year: number, workingDays: number) => {
    const key = `${month}-${year}`;
    setExportingKey(key);
    try {
      // Fetch the specific monthly records from the backend
      const data = await apiFetch<{ records: any[]; workingDays?: number; sheet?: any }>(
        `/api/admin/attendance/monthly?month=${month}&year=${year}`
      );
      const records = data?.records || [];
      if (!records.length) {
        toast.error(`No records found for ${MONTH_NAMES[month - 1]} ${year}.`);
        return;
      }
      const count = await exportAttendanceExcel(records, month, year, {
        fallbackWorkingDays: data?.sheet?.workingDays || data?.workingDays || workingDays || 27,
        sheetLabel: "Official",
      });
      toast.success(`Exported ${count} records for ${MONTH_NAMES[month - 1]} ${year} to Excel.`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to export Excel report.");
    } finally {
      setExportingKey(null);
    }
  };

  if (isLoading) {
    return (
      <div className="surface-panel p-6">
        <div className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="size-4 animate-spin text-primary" />
          Loading stored reports archive…
        </div>
      </div>
    );
  }

  return (
    <section className="surface-panel p-6 space-y-4">
      <div className="border-b border-border pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="size-4 text-primary" />
          <div>
            <h2 className="text-base font-semibold text-foreground">Stored Monthly Reports</h2>
            <p className="text-xs text-muted-foreground">
              All processed attendance statements and monthly biometric cycles stored in database
            </p>
          </div>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-mono font-medium text-foreground">
          {availableMonths.length} {availableMonths.length === 1 ? "report" : "reports"} stored
        </span>
      </div>

      {availableMonths.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground font-semibold space-y-3">
          <p>No monthly attendance statements imported yet.</p>
          <Button asChild size="sm">
            <Link to="/import">Import First Attendance Sheet</Link>
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {availableMonths.map((m) => {
            const isSelected = m.month === selectedMonth && m.year === selectedYear;
            const mName = MONTH_NAMES[m.month - 1] || "Monthly";
            const itemKey = `${m.month}-${m.year}`;
            const isExporting = exportingKey === itemKey;

            return (
              <div
                key={itemKey}
                className={`py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors rounded-lg px-3 ${
                  isSelected ? "bg-muted/30 border border-primary/20" : "hover:bg-muted/15"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-muted-foreground" />
                    <span className="font-semibold text-foreground text-sm">
                      {mName} {m.year}
                    </span>
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 rounded bg-[var(--badge-accent-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--badge-accent-fg)] border border-[rgba(94,106,210,0.2)]">
                        <Check className="size-2.5" /> Active in Dashboard
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    {m.recordCount || 70} Faculty enrolled · {m.workingDays || 27} Working Days
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!isSelected ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelect(m.month, m.year)}
                      className="gap-1 text-xs h-8"
                    >
                      Select
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground font-medium px-2">
                      Selected
                    </span>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    className="gap-1 text-xs h-8"
                  >
                    <Link to="/detailed">
                      <Table2 className="size-3.5" /> View Grid
                    </Link>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    className="gap-1 text-xs h-8"
                  >
                    <Link to="/consolidated">
                      <Send className="size-3.5" /> Dispatch
                    </Link>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handleExport(m.month, m.year, m.workingDays || 27)}
                    disabled={isExporting}
                    className="gap-1 text-xs h-8"
                  >
                    {isExporting ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Download className="size-3.5" />
                    )}
                    Export Excel
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
