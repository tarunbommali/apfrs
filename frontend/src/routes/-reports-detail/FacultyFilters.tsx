import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FacultyFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedDept: string;
  onDeptChange: (value: string) => void;
  selectedCadre: string;
  onCadreChange: (value: string) => void;
  departments: { department: string; total: number }[];
}

export function FacultyFilters({
  search,
  onSearchChange,
  selectedDept,
  onDeptChange,
  selectedCadre,
  onCadreChange,
  departments,
}: FacultyFiltersProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative max-w-sm flex-1">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, CFMS ID, department…"
          className="h-8 pl-8 text-xs"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={selectedDept} onValueChange={onDeptChange}>
          <SelectTrigger className="h-8 w-36 text-xs bg-card">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.department} value={d.department}>
                {d.department} ({d.total})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedCadre} onValueChange={onCadreChange}>
          <SelectTrigger className="h-8 w-28 text-xs bg-card">
            <SelectValue placeholder="Cadre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cadres</SelectItem>
            <SelectItem value="regular">Regular</SelectItem>
            <SelectItem value="contract">Contract</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
