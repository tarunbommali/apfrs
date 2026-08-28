import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SearchFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  department: string;
  onDepartmentChange: (value: string) => void;
  filterDepartments: { id: string; code: string }[];
  facultyList: any[];
  totalCount: number;
  filteredCount: number;
}

export function SearchFilters({
  search,
  onSearchChange,
  department,
  onDepartmentChange,
  filterDepartments,
  facultyList,
  totalCount,
  filteredCount,
}: SearchFiltersProps) {
  return (
    <div className="surface-panel flex flex-wrap items-center gap-3 p-4">
      <div className="relative min-w-56 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            onSearchChange(e.target.value);
          }}
          placeholder="Search name, email, CFMS ID or designation"
          className="pl-9"
        />
      </div>
      <Select
        value={department}
        onValueChange={(v) => {
          onDepartmentChange(v);
        }}
      >
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All departments ({totalCount})</SelectItem>
          {filterDepartments.map((d) => {
            const count = facultyList.filter((f) => {
              const fDept = (f.department || "Uncategorized").toLowerCase();
              return fDept === d.code.toLowerCase();
            }).length;
            return (
              <SelectItem key={d.id} value={d.code}>
                {d.code} ({count})
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <span className="text-xs font-medium text-muted-foreground">
        Showing {filteredCount} of {totalCount} records
      </span>
    </div>
  );
}
