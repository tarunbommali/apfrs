import { SummaryRow } from "./SummaryRow";

interface SummaryTableProps {
  records: any[];
  workingDays: number;
}

export function SummaryTable({ records, workingDays }: SummaryTableProps) {
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
        <thead className="border-b border-border bg-muted/30 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
          <tr>
            <th className="py-3 px-4 w-12 text-center">#</th>
            <th className="py-3 px-4">CFMS ID</th>
            <th className="py-3 px-4">Faculty Name</th>
            <th className="py-3 px-4">Department</th>
            <th className="py-3 px-4">Designation</th>
            <th className="py-3 px-4 text-center">Cadre</th>
            <th className="py-3 px-3 text-center">Present</th>
            <th className="py-3 px-3 text-center">Absent</th>
            <th className="py-3 px-3 text-center">Leaves</th>
            <th className="py-3 px-3 text-center">Working</th>
            <th className="py-3 px-4 text-right">Attendance %</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {records.map((r: any, idx: number) => (
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
