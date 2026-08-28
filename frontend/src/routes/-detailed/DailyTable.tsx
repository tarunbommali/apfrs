import { DailyRow } from "./DailyRow";

interface DailyTableProps {
  records: any[];
  dayNumbers: number[];
}

export function DailyTable({ records, dayNumbers }: DailyTableProps) {
  if (records.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        No matching records found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="border-b border-border bg-muted/30 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider sticky top-0">
          <tr>
            <th className="py-3 px-3 w-10 text-center sticky left-0 bg-card z-10">#</th>
            <th className="py-3 px-4 min-w-[200px] sticky left-10 bg-card z-10 border-r border-border">
              Faculty / Cadre
            </th>
            {dayNumbers.map((d) => (
              <th key={d} className="py-2.5 px-1.5 text-center min-w-[28px] font-mono">
                {d}
              </th>
            ))}
            <th className="py-3 px-3 text-center border-l border-border bg-card sticky right-16">P</th>
            <th className="py-3 px-3 text-center bg-card sticky right-8">A</th>
            <th className="py-3 px-3 text-right bg-card sticky right-0 font-bold">%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {records.map((r: any, idx: number) => (
            <DailyRow
              key={r.id || r.cfmsId || r.cfms_id || idx}
              record={r}
              index={idx}
              dayNumbers={dayNumbers}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
