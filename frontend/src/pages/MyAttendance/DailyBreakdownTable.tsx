interface DailyRecord {
  date: string;
  inTime?: string;
  outTime?: string;
  status: string;
}

interface DailyBreakdownTableProps {
  dailyRecords: DailyRecord[];
}

export function DailyBreakdownTable({ dailyRecords }: DailyBreakdownTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-border bg-muted/30 font-medium text-muted-foreground">
          <tr>
            <th className="px-5 py-3">Day</th>
            <th className="px-5 py-3">In Time</th>
            <th className="px-5 py-3">Out Time</th>
            <th className="px-5 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {dailyRecords.map((d, idx) => {
            const dateObj = new Date(d.date);
            const isWeekend = d.status === "Weekend" || d.status === "SS" || dateObj.getDay() === 0;
            const isHoliday = d.status === "Holiday" || d.status === "H";
            
            const inTimeDisp = d.inTime || (isWeekend ? "Weekend" : isHoliday ? "Holiday" : "—");
            const outTimeDisp = d.outTime || (isWeekend ? "Weekend" : isHoliday ? "Holiday" : "—");

            let statusStyle = "text-muted-foreground";
            if (d.status === "P" || d.status === "Present") statusStyle = "text-[var(--status-present-fg)] font-semibold";
            else if (d.status === "A" || d.status === "Absent") statusStyle = "text-[var(--status-absent-fg)] font-semibold";
            else if (d.status === "L" || d.status === "Leave") statusStyle = "text-[var(--status-leave-fg)] font-semibold";

            return (
              <tr key={idx} className="hover:bg-muted/30 transition-colors">
                <td className="px-5 py-2.5 font-mono text-muted-foreground">Day {idx + 1}</td>
                <td className="px-5 py-2.5 font-mono">{inTimeDisp}</td>
                <td className="px-5 py-2.5 font-mono">{outTimeDisp}</td>
                <td className={`px-5 py-2.5 ${statusStyle}`}>{d.status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
