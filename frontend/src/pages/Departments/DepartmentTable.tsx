import { Building2, UserCheck, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Department } from "@/lib/queries";

interface DepartmentTableProps {
  departments: Department[];
  search: string;
  statusFilter: string;
  onViewDetails: (deptId: string) => void;
  onEdit: (dept: Department) => void;
  onAssign: (dept: Department) => void;
  onToggleStatus: (dept: Department) => void;
  onDelete: (dept: Department) => void;
  onCreateClick: () => void;
}

export function DepartmentTable({
  departments,
  search,
  statusFilter,
  onViewDetails,
  onEdit,
  onAssign,
  onToggleStatus,
  onDelete,
  onCreateClick,
}: DepartmentTableProps) {
  if (departments.length === 0) {
    return (
      <div className="surface-panel flex flex-col items-center gap-4 p-16 text-center">
        <Building2 className="size-12 text-muted-foreground/30" strokeWidth={1} />
        <h2 className="text-lg font-semibold text-foreground">No departments found</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {search || statusFilter !== "all"
            ? "Try adjusting your search queries or status filters to find matching departments."
            : "Create your first department to organize faculty and assign department leadership."}
        </p>
        {!search && statusFilter === "all" && (
          <Button onClick={onCreateClick} className="mt-2">
            Create Department
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="surface-panel overflow-hidden border border-border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/10 text-left">
              <th className="label-caps px-5 py-3">Department</th>
              <th className="label-caps px-5 py-3">HOD / Incharge</th>
              <th className="label-caps px-5 py-3 text-center">Faculty</th>
              <th className="label-caps px-5 py-3 text-center">Status</th>
              <th className="label-caps px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((dept) => {
              const hasHod = Boolean(dept.hod_id);
              return (
                <tr
                  key={dept.id}
                  className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-5 py-4">
                    <div>
                      <span className="font-semibold text-foreground block">{dept.name}</span>
                      <div className="flex flex-wrap gap-2 items-center mt-1">
                        <span className="font-mono text-[9px] font-bold uppercase bg-muted px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                          {dept.code}
                        </span>
                        {(dept.eapcet_code || dept.eapcetCode) && (
                          <span title="AP EAPCET Code" className="font-mono text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            EAPCET: {dept.eapcet_code || dept.eapcetCode}
                          </span>
                        )}
                        {(dept.branch_code || dept.branchCode) && (
                          <span title="JNTU-GV Branch Code" className="font-mono text-[9px] font-bold uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                            Branch: {dept.branch_code || dept.branchCode}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {hasHod ? (
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-full overflow-hidden bg-muted border border-border flex items-center justify-center shrink-0">
                          {dept.hod_photo_url ? (
                            <img
                              src={dept.hod_photo_url}
                              alt={dept.hod_name || "HOD"}
                              className="size-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] font-bold text-muted-foreground">
                              {dept.hod_name ? dept.hod_name.slice(0, 1) : "H"}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="font-medium text-foreground block">{dept.hod_name}</span>
                          <span className="text-[10px] text-muted-foreground block">
                            {dept.hod_email}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/60 italic">Not assigned</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center font-mono font-medium text-foreground">
                    {dept.faculty_count || 0}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        dept.status === "active"
                          ? "bg-emerald-500/10 text-[var(--status-present-fg)]"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {dept.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs font-semibold"
                        onClick={() => onViewDetails(dept.id)}
                      >
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs font-semibold"
                        onClick={() => onEdit(dept)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => onAssign(dept)}
                        title="Assign Incharge"
                      >
                        <UserCheck className="size-3.5 text-primary" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => onToggleStatus(dept)}
                        title={dept.status === "active" ? "Deactivate" : "Activate"}
                      >
                        <X className={`size-3.5 ${dept.status === "active" ? "text-amber-500" : "text-emerald-500"}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        onClick={() => onDelete(dept)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
