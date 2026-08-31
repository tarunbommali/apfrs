import { Checkbox } from "@/components/ui/checkbox";
import { RecipientRow } from "./RecipientRow";

interface RecipientTableProps {
  records: any[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  workingDays: number;
  isLoading: boolean;
}

export function RecipientTable({
  records,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  workingDays,
  isLoading,
}: RecipientTableProps) {
  if (isLoading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Loading recipient list…
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        No matching faculty found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="border-b border-border bg-muted/30 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
          <tr>
            <th className="py-3 px-4 w-12 text-center">
              <Checkbox
                checked={
                  records.length > 0 && selectedIds.size === records.length
                }
                onCheckedChange={onToggleSelectAll}
              />
            </th>
            <th className="py-3 px-4">Faculty Recipient</th>
            <th className="py-3 px-4">Department & Cadre</th>
            <th className="py-3 px-3 text-center">Present / Working</th>
            <th className="py-3 px-3 text-center">Attendance %</th>
            <th className="py-3 px-4 text-center">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {records.map((r: any) => (
            <RecipientRow
              key={r.id || r.cfmsId || r.cfms_id}
              record={r}
              isChecked={selectedIds.has(r.id || r.cfmsId || r.cfms_id)}
              onToggle={onToggleSelect}
              workingDays={workingDays}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
