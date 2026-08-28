import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  filteredCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  filteredCount,
  pageSize,
  onPageChange,
}: PaginationProps) {
  return (
    <div className="flex flex-wrap items-center justify-between border-t border-border px-5 py-3.5 text-xs text-muted-foreground">
      <div>
        Showing <span className="font-mono font-medium text-foreground">{(currentPage - 1) * pageSize + 1}</span> to{" "}
        <span className="font-mono font-medium text-foreground">
          {Math.min(currentPage * pageSize, filteredCount)}
        </span>{" "}
        of <span className="font-mono font-medium text-foreground">{filteredCount}</span> faculty records (
        {pageSize} per page)
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="size-4" /> Previous
        </Button>
        <span className="px-2 font-mono text-xs font-semibold text-foreground">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
        >
          Next <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
