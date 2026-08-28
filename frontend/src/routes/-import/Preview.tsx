import { CheckCircle2, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MONTH_NAMES } from "@/lib/constants";

interface ParsedRecord {
  cfmsId: string;
  name: string;
  jobStatus: string;
  attendance: any[];
}

interface PreviewProps {
  fileName: string;
  parsedCount: number;
  selectedMonth: string;
  selectedYear: string;
  monthWorkingDays: number;
  monthHolidaysCount: number;
  parsedRecords: ParsedRecord[];
  onClear: () => void;
  onProcess: () => void;
  isImporting: boolean;
}

export function Preview({
  fileName,
  parsedCount,
  selectedMonth,
  selectedYear,
  monthWorkingDays,
  monthHolidaysCount,
  parsedRecords,
  onClear,
  onProcess,
  isImporting,
}: PreviewProps) {
  const monthName = MONTH_NAMES[parseInt(selectedMonth, 10) - 1] || "Monthly";

  return (
    <div className="mt-4 rounded-lg border border-[var(--linear-border-strong)] bg-[var(--badge-accent-bg)] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="size-5 text-[var(--badge-accent-fg)]" />
          <div>
            <p className="text-sm font-semibold text-foreground">{fileName}</p>
            <p className="text-xs text-muted-foreground">
              Period: <strong className="text-foreground">{monthName} {selectedYear}</strong> · {parsedCount} Faculty records parsed
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      </div>

      {/* Sync Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--linear-border)] text-xs font-mono">
        <div className="rounded bg-card p-2 border border-border">
          <span className="text-muted-foreground block text-[10px]">Total Faculty:</span>
          <strong className="text-foreground text-sm">{parsedCount}</strong>
        </div>
        <div className="rounded bg-card p-2 border border-border">
          <span className="text-muted-foreground block text-[10px]">Working Days:</span>
          <strong className="text-[var(--status-present-fg)] text-sm">{monthWorkingDays} Days</strong>
        </div>
        <div className="rounded bg-card p-2 border border-border">
          <span className="text-muted-foreground block text-[10px]">Sundays / Holidays:</span>
          <strong className="text-[var(--status-leave-fg)] text-sm">{monthHolidaysCount} Days</strong>
        </div>
        <div className="rounded bg-card p-2 border border-border">
          <span className="text-muted-foreground block text-[10px]">Calendar Status:</span>
          <strong className="text-[var(--badge-accent-fg)] text-sm">Synced ✓</strong>
        </div>
      </div>

      {/* Parsed Preview Table */}
      <div className="max-h-56 overflow-y-auto rounded border border-border bg-card">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-muted/90 font-medium text-muted-foreground">
            <tr>
              <th className="px-3 py-2">CFMS ID</th>
              <th className="px-3 py-2">Faculty Name</th>
              <th className="px-3 py-2">Cadre</th>
              <th className="px-3 py-2 text-right">Days Parsed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {parsedRecords.slice(0, 15).map((r, i) => (
              <tr key={i} className="hover:bg-muted/40">
                <td className="px-3 py-1.5 font-mono text-muted-foreground">{r.cfmsId || "—"}</td>
                <td className="px-3 py-1.5 font-medium">{r.name}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{r.jobStatus || "Regular"}</td>
                <td className="px-3 py-1.5 text-right font-mono">{r.attendance.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button onClick={onProcess} disabled={isImporting} className="w-full sm:w-auto">
          {isImporting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Seeding & Syncing into Database…
            </>
          ) : (
            <>
              <Check className="mr-2 size-4" />
              Seed & Sync to Database
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
