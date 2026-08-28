import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { SummaryRow } from "./SummaryRow";
import { getAttendancePct, getPresentDays, getWorkingDays } from "@/lib/attendance-utils";

type SortKey = "present" | "attendance";
type SortDir = "asc" | "desc";

interface SummaryTableProps {
  records: any[];
  workingDays: number;
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="inline ml-1 size-3 opacity-40" />;
  return sortDir === "asc"
    ? <ChevronUp className="inline ml-1 size-3 text-[var(--linear-accent)]" />
    : <ChevronDown className="inline ml-1 size-3 text-[var(--linear-accent)]" />;
}

export function SummaryTable({ records, workingDays }: SummaryTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("attendance");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    return [...records].sort((a, b) => {
      let aVal: number;
      let bVal: number;
      if (sortKey === "present") {
        aVal = getPresentDays(a);
        bVal = getPresentDays(b);
      } else {
        aVal = getAttendancePct(a);
        bVal = getAttendancePct(b);
      }
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [records, sortKey, sortDir]);

  if (records.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        No matching records found.
      </div>
    );
  }

  const thBase =
    "py-3 px-3 text-center select-none cursor-pointer hover:text-foreground transition-colors";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="border-b border-border bg-muted/30 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
          <tr>
            <th className="py-3 px-4 w-12 text-center">#</th>
            <th className="py-3 px-4">CFMS ID</th>
            <th className="py-3 px-4">Faculty Name</th>
            <th className="py-3 px-4">Department</th>
            <th className="py-3 px-4">Designation</th>
            <th className="py-3 px-4 text-center">Cadre</th>
            <th
              className={thBase}
              onClick={() => toggleSort("present")}
              title="Sort by present days"
            >
              Present / Working
              <SortIcon col="present" sortKey={sortKey} sortDir={sortDir} />
            </th>
            <th
              className={`${thBase} text-right pr-4`}
              onClick={() => toggleSort("attendance")}
              title="Sort by attendance %"
            >
              Attendance %
              <SortIcon col="attendance" sortKey={sortKey} sortDir={sortDir} />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((r: any, idx: number) => (
            <SummaryRow
              key={r.id || r.cfmsId || r.cfms_id || idx}
              record={r}
              index={idx}
              workingDays={workingDays}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
