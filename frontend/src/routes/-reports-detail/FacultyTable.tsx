import { Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getAttendancePct,
  tierTextClassFromPct,
  getPresentDays,
  getAbsentDays,
  getLeaveDays,
  getWorkingDays,
  getJobStatus,
  getCfmsId,
} from "@/lib/attendance-utils";

interface FacultyTableProps {
  records: any[];
  workingDays: number;
  month: number;
  year: number;
  onPreview: (cfmsId: string) => void;
  onDownload: (cfmsId: string) => void;
}

export function FacultyTable({
  records,
  workingDays,
  month,
  year,
  onPreview,
  onDownload,
}: FacultyTableProps) {
  if (records.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        No matching records found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-border bg-muted/50 font-medium text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5">CFMS ID</th>
            <th className="px-4 py-2.5">Faculty Name</th>
            <th className="px-4 py-2.5">Department</th>
            <th className="px-4 py-2.5">Designation</th>
            <th className="px-3 py-2.5 text-center">Cadre</th>
            <th className="px-4 py-2.5 text-center">Present / Working</th>
            <th className="px-3 py-2.5 text-right">P</th>
            <th className="px-3 py-2.5 text-right">A</th>
            <th className="px-3 py-2.5 text-right">L</th>
            <th className="px-3 py-2.5 text-right">HD</th>
            <th className="px-4 py-2.5 text-right">Attendance %</th>
            <th className="px-4 py-2.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {records.map((r: any, idx: number) => {
            const pct = getAttendancePct(r);
            const pDays = getPresentDays(r);
            const wDays = getWorkingDays(r, workingDays);
            const cfmsId = getCfmsId(r);
            const isRegular = getJobStatus(r).toLowerCase() === "regular";

            return (
              <tr key={idx} className="hover:bg-muted/40 transition-colors">
                <td className="px-4 py-2 font-mono text-muted-foreground">{cfmsId || "—"}</td>
                <td className="px-4 py-2">
                  <p className="font-medium text-foreground">{r.name}</p>
                  {r.email ? <p className="text-[10px] text-muted-foreground">{r.email}</p> : null}
                </td>
                <td className="px-4 py-2 font-medium text-foreground">{r.department || "General"}</td>
                <td className="px-4 py-2 text-muted-foreground">{r.designation || "Assistant Professor"}</td>
                <td className="px-3 py-2 text-center">
                  <span
                    className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold border ${
                      isRegular
                        ? "bg-[var(--badge-accent-bg)] text-[var(--badge-accent-fg)] border-[rgba(94,106,210,0.2)]"
                        : "bg-[var(--badge-muted-bg)] text-[var(--badge-muted-fg)] border-[rgba(255,255,255,0.08)]"
                    }`}
                  >
                    {getJobStatus(r).toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-2 text-center font-mono font-semibold text-foreground">
                  <span className="text-[var(--status-present-fg)]">{pDays}</span>
                  <span className="text-muted-foreground"> / {wDays}</span>
                </td>
                <td className="px-3 py-2 text-right font-mono font-semibold text-[var(--status-present-fg)]">
                  {pDays}
                </td>
                <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                  {getAbsentDays(r)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                  {getLeaveDays(r)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                  {r.halfDays || r.half_days || 0}
                </td>
                <td className="px-4 py-2 text-right">
                  <span
                    className={`font-mono text-xs font-bold ${tierTextClassFromPct(pct)}`}
                  >
                    {pct}%
                  </span>
                </td>
                <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end items-center gap-1">
                    {cfmsId && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onPreview(cfmsId)}
                          title="Preview Report"
                          className="size-6 text-muted-foreground hover:text-indigo-400"
                        >
                          <Eye className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onDownload(cfmsId)}
                          title="Download PDF"
                          className="size-6 text-muted-foreground hover:text-indigo-400"
                        >
                          <Download className="size-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
