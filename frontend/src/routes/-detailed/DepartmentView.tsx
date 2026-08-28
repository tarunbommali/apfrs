import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { BarChart2, TableProperties } from "lucide-react";
import { getAttendancePct, getJobStatus, getPresentDays, getWorkingDays } from "@/lib/attendance-utils";

interface DeptStat {
  dept: string;
  avgPct: number;
  total: number;
  regular: number;
  contract: number;
  avgPresent: number;
  workingDays: number;
}

interface DepartmentViewProps {
  records: any[];
  workingDays: number;
  monthName: string;
  year: number;
}

type DisplayMode = "chart" | "table";

const ACCENT = "#5E6AD2";
const LOW_COLOR = "#E05252";
const WARNING_COLOR = "#F2C94C";

function getBarColor(pct: number) {
  if (pct < 75) return LOW_COLOR;
  if (pct < 85) return WARNING_COLOR;
  return ACCENT;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: DeptStat = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-4 py-3 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-foreground text-sm">{d.dept}</p>
      <p className="text-muted-foreground">Avg attendance: <span className="font-bold text-foreground">{d.avgPct.toFixed(1)}%</span></p>
      <p className="text-muted-foreground">Faculty: <span className="font-bold text-foreground">{d.total}</span> ({d.regular} regular · {d.contract} contract)</p>
      <p className="text-muted-foreground">Avg present: <span className="font-bold text-foreground">{d.avgPresent.toFixed(1)} / {d.workingDays} days</span></p>
    </div>
  );
}

export function DepartmentView({ records, workingDays, monthName, year }: DepartmentViewProps) {
  const [display, setDisplay] = useState<DisplayMode>("chart");

  const stats = useMemo<DeptStat[]>(() => {
    const map = new Map<string, { pcts: number[]; present: number[]; regular: number; contract: number }>();

    for (const r of records) {
      const dept = r.department || "Uncategorized";
      if (!map.has(dept)) map.set(dept, { pcts: [], present: [], regular: 0, contract: 0 });
      const entry = map.get(dept)!;
      entry.pcts.push(getAttendancePct(r));
      entry.present.push(getPresentDays(r));
      if (getJobStatus(r).toLowerCase() === "regular") entry.regular++;
      else entry.contract++;
    }

    return Array.from(map.entries())
      .map(([dept, { pcts, present, regular, contract }]) => ({
        dept,
        avgPct: pcts.reduce((a, b) => a + b, 0) / pcts.length,
        total: pcts.length,
        regular,
        contract,
        avgPresent: present.reduce((a, b) => a + b, 0) / present.length,
        workingDays: getWorkingDays(records[0], workingDays),
      }))
      .sort((a, b) => b.avgPct - a.avgPct);
  }, [records, workingDays]);

  const shortMonth = monthName.slice(0, 3);

  return (
    <div className="space-y-4 p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Department Attendance % — {shortMonth} {year}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Average attendance rate across {stats.length} departments · {records.length} faculty
          </p>
        </div>
        {/* Chart / Table toggle */}
        <div className="inline-flex rounded-md border border-border bg-muted/40 p-0.5">
          <button
            type="button"
            onClick={() => setDisplay("chart")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${
              display === "chart" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart2 className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDisplay("table")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${
              display === "table" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TableProperties className="size-3.5" />
          </button>
        </div>
      </div>

      {display === "chart" ? (
        <>
          {/* Bar chart */}
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={stats} margin={{ top: 8, right: 16, left: 0, bottom: 8 }} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="dept"
                tick={{ fill: "rgba(232,232,237,0.55)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "rgba(232,232,237,0.55)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
                width={42}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <ReferenceLine y={75} stroke={LOW_COLOR} strokeDasharray="4 4" strokeOpacity={0.6} label={{ value: "75%", fill: LOW_COLOR, fontSize: 10, position: "insideTopRight" }} />
              <Bar dataKey="avgPct" radius={[4, 4, 0, 0]}>
                {stats.map((entry) => (
                  <Cell key={entry.dept} fill={getBarColor(entry.avgPct)} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground justify-end">
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: ACCENT }} /> ≥ 85%</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: WARNING_COLOR }} /> 75–85%</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: LOW_COLOR }} /> &lt; 75%</span>
          </div>
        </>
      ) : (
        /* Table view */
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="border-b border-border bg-muted/30 text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-4 text-left">#</th>
                <th className="py-2.5 px-4 text-left">Department</th>
                <th className="py-2.5 px-4 text-center">Faculty</th>
                <th className="py-2.5 px-4 text-center">Regular</th>
                <th className="py-2.5 px-4 text-center">Contract</th>
                <th className="py-2.5 px-4 text-center">Avg Present / Working</th>
                <th className="py-2.5 px-4 text-right">Avg Attendance %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stats.map((s, i) => {
                const isLow = s.avgPct < 75;
                const isWarn = !isLow && s.avgPct < 85;
                return (
                  <tr key={s.dept} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground font-mono">{i + 1}</td>
                    <td className="py-3 px-4 font-semibold text-foreground">{s.dept}</td>
                    <td className="py-3 px-4 text-center font-mono text-foreground">{s.total}</td>
                    <td className="py-3 px-4 text-center font-mono text-[var(--badge-accent-fg)]">{s.regular}</td>
                    <td className="py-3 px-4 text-center font-mono text-muted-foreground">{s.contract}</td>
                    <td className="py-3 px-4 text-center font-mono text-muted-foreground">
                      <span className="text-[var(--status-present-fg)] font-bold">{s.avgPresent.toFixed(1)}</span>
                      <span className="text-muted-foreground mx-0.5">/</span>
                      {s.workingDays}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-xs ${
                          isLow
                            ? "bg-[var(--status-absent-bg)] text-[var(--status-absent-fg)]"
                            : isWarn
                            ? "bg-[rgba(242,201,76,0.12)] text-[#F2C94C]"
                            : "bg-[var(--status-present-bg)] text-[var(--status-present-fg)]"
                        }`}
                      >
                        {s.avgPct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
