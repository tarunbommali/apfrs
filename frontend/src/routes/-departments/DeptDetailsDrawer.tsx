import { Building2, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { Department, Faculty } from "@/lib/queries";

interface DeptDetailsDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  dept: Department | null;
  deptFaculty: Faculty[];
  isFacultyLoading: boolean;
  facultySearch: string;
  onFacultySearchChange: (val: string) => void;
}

export function DeptDetailsDrawer({
  isOpen,
  onOpenChange,
  dept,
  deptFaculty,
  isFacultyLoading,
  facultySearch,
  onFacultySearchChange,
}: DeptDetailsDrawerProps) {
  if (!dept) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <div className="space-y-6">
          <SheetHeader className="border-b border-border pb-4">
            <div className="flex items-center gap-2 text-primary">
              <Building2 className="size-5" />
              <span className="font-mono text-xs font-bold uppercase border border-border px-1.5 py-0.5 rounded bg-muted/30">
                {dept.code}
              </span>
            </div>
            <SheetTitle className="text-lg font-bold text-foreground mt-2">{dept.name}</SheetTitle>
            <SheetDescription className="text-xs">
              {dept.description || "No description provided."}
            </SheetDescription>
          </SheetHeader>

          {/* ── Stats Summary Strip ── */}
          <div className="grid gap-3 grid-cols-3">
            <div className="rounded-lg border border-border bg-muted/10 p-3 text-center">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Faculty</span>
              <span className="font-mono text-xl font-bold text-foreground block mt-1">
                {dept.faculty_count || 0}
              </span>
            </div>
            <div className="rounded-lg border border-border bg-muted/10 p-3 text-center">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Status</span>
              <span className="block mt-1">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    dept.status === "active"
                      ? "bg-emerald-500/10 text-[var(--status-present-fg)]"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {dept.status === "active" ? "Active" : "Inactive"}
                </span>
              </span>
            </div>
            <div className="rounded-lg border border-border bg-muted/10 p-3 text-center flex flex-col justify-center">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase block">HOD</span>
              <span className="text-xs font-medium text-foreground truncate mt-1">
                {dept.hod_name || "—"}
              </span>
            </div>
          </div>

          {/* ── Leadership Assignment ── */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Leadership</h4>
            {dept.hod_id ? (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                <div className="size-10 rounded-full overflow-hidden bg-muted border border-border flex items-center justify-center shrink-0">
                  {dept.hod_photo_url ? (
                    <img src={dept.hod_photo_url} alt={dept.hod_name || "HOD"} className="size-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-muted-foreground">
                      {dept.hod_name ? dept.hod_name.slice(0, 1) : "H"}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-foreground text-sm block truncate">{dept.hod_name}</span>
                  <span className="text-[11px] text-muted-foreground block truncate">{dept.hod_email}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground/60 italic p-3 rounded-lg border border-border/40 text-center">
                No leadership/HOD assigned.
              </div>
            )}
          </div>

          {/* ── Faculty Directory ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Faculty Members ({deptFaculty.length})
              </h4>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={facultySearch}
                onChange={(e) => onFacultySearchChange(e.target.value)}
                placeholder="Search department faculty..."
                className="pl-8 h-8 text-xs"
              />
            </div>

            {isFacultyLoading ? (
              <div className="flex justify-center py-6 text-muted-foreground text-xs gap-1.5">
                <Loader2 className="size-4 animate-spin" /> Loading faculty...
              </div>
            ) : deptFaculty.length === 0 ? (
              <div className="text-xs text-muted-foreground/60 italic p-6 text-center border border-border/30 rounded-lg">
                {facultySearch ? "No matching faculty found." : "No faculty members enrolled in this department."}
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {deptFaculty.map((fac) => (
                  <div key={fac.id} className="flex items-center justify-between p-2.5 rounded border border-border/40 bg-muted/10 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="size-6 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 border border-border/50">
                        {fac.photoURL || fac.photo_url ? (
                          <img src={fac.photoURL || fac.photo_url || ""} alt={fac.name} className="size-full object-cover" />
                        ) : (
                          <span className="text-[9px] font-bold text-muted-foreground">{fac.name.slice(0, 1)}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-medium text-foreground block truncate">{fac.name}</span>
                        <span className="text-[10px] text-muted-foreground block truncate">{fac.designation}</span>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0 pl-2">
                      {fac.cfmsId || fac.cfms_id || "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
