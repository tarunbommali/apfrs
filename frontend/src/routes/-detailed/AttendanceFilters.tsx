import { Search, Building2, Briefcase } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AttendanceFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedDept: string;
  onDeptChange: (value: string) => void;
  selectedCadre: string;
  onCadreChange: (value: string) => void;
  departmentsList: string[];
}

export function AttendanceFilters({
  search,
  onSearchChange,
  selectedDept,
  onDeptChange,
  selectedCadre,
  onCadreChange,
  departmentsList,
}: AttendanceFiltersProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1.5fr_1fr_1fr]">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Search faculty name, CFMS ID, designation..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9 text-xs"
        />
      </div>

      <Select value={selectedDept} onValueChange={onDeptChange}>
        <SelectTrigger className="h-9 text-xs">
          <Building2 className="mr-1.5 size-3.5 text-muted-foreground" />
          <SelectValue placeholder="Department" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Departments ({departmentsList.length})</SelectItem>
          {departmentsList.map((d) => (
            <SelectItem key={d} value={d}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedCadre} onValueChange={onCadreChange}>
        <SelectTrigger className="h-9 text-xs">
          <Briefcase className="mr-1.5 size-3.5 text-muted-foreground" />
          <SelectValue placeholder="Cadre" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Cadres</SelectItem>
          <SelectItem value="regular">Regular Faculty</SelectItem>
          <SelectItem value="contract">Contract / Adjunct</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
