import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Loader2,
  AlertCircle,
  Trash2,
  Users,
  Building2,
  Briefcase,
  Award,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { facultyListQuery, useDeleteFaculty, departmentsQuery } from "@/lib/queries";
import { toast } from "sonner";

export const Route = createFileRoute("/admin-dashboard")({
  head: () => ({
    meta: [
      { title: "Faculty Registry — e-Office Jntugv" },
      {
        name: "description",
        content: "Search, filter and manage faculty records including CFMS ID, department, incharge roles and job status.",
      },
    ],
  }),
  component: AdminDashboard,
});

function RegistrySkeleton() {
  return (
    <AppShell title="Faculty Registry" subtitle="Loading…">
      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="surface-panel h-24 animate-pulse" />
        ))}
      </div>
      <div className="surface-panel h-16 animate-pulse" />
      <div className="surface-panel mt-6 h-64 animate-pulse" />
    </AppShell>
  );
}

const PAGE_SIZE = 50;

function AdminDashboard() {
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useQuery(
    facultyListQuery({ search: q || undefined, department: dept, limit: 200 }),
  );
  const deleteFaculty = useDeleteFaculty();

  const { data: deptsData } = useQuery(departmentsQuery());
  const dbDepartments = deptsData?.departments ?? [];
  const filterDepartments = useMemo(() => {
    const list = dbDepartments.map((d) => ({ id: d.id, code: d.code }));
    if (!list.some((d) => d.code.toLowerCase() === "uncategorized")) {
      list.push({ id: "uncategorized", code: "Uncategorized" });
    }
    return list;
  }, [dbDepartments]);

  const facultyList = data?.faculty ?? [];

  // Filtered dataset
  const filteredList = useMemo(() => {
    return facultyList.filter((f) => {
      const fDept = (f.department || "Uncategorized").toLowerCase();
      const matchDept = dept === "all" || fDept === dept.toLowerCase();
      const term = q.toLowerCase().trim();
      const matchSearch =
        !term ||
        f.name.toLowerCase().includes(term) ||
        f.email.toLowerCase().includes(term) ||
        (f.cfmsId && f.cfmsId.toLowerCase().includes(term)) ||
        (f.designation && f.designation.toLowerCase().includes(term));
      return matchDept && matchSearch;
    });
  }, [facultyList, dept, q]);

  // Derived metrics for Top Summary Cards
  const totalCount = facultyList.length;
  const departmentsList = useMemo(
    () => Array.from(new Set(facultyList.map((f) => f.department).filter(Boolean))).sort(),
    [facultyList],
  );
  const regularCount = facultyList.filter((f) => (f.jobStatus || "").toLowerCase() === "regular").length;
  const contractCount = facultyList.filter((f) => (f.jobStatus || "").toLowerCase().includes("contract") || (f.jobStatus || "").toLowerCase().includes("adjunct")).length || Math.max(0, facultyList.length - regularCount);
  const inchargeCount = facultyList.filter(
    (f) => Boolean(f.currentIncharge?.role || (f.incharge && f.incharge !== "None"))
  ).length;

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredList.slice(start, start + PAGE_SIZE);
  }, [filteredList, currentPage]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Remove ${name} from the registry?`)) return;
    try {
      await deleteFaculty.mutateAsync(id);
      toast.success(`${name} removed from registry`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  if (isLoading) {
    return <RegistrySkeleton />;
  }

  if (error) {
    return (
      <AppShell title="Faculty Registry">
        <div className="surface-panel flex flex-col items-center gap-3 p-10 text-center">
          <AlertCircle className="size-8 text-destructive" />
          <p className="font-semibold text-destructive">Failed to load faculty</p>
          <p className="text-sm text-muted-foreground">{String(error)}</p>
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Faculty Registry"
      subtitle="Master records used for attendance matching and report delivery"
      actions={
        <Button asChild>
          <Link to="/faculty/new">
            <Plus className="size-4" /> Add faculty
          </Link>
        </Button>
      }
    >
      {/* ── Top Summary Cards ── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface-panel p-5">
          <div className="flex items-center justify-between">
            <p className="label-caps">Total Faculty</p>
            <Users className="size-4 text-primary" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-foreground">{totalCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Active registered members</p>
        </div>

        <div className="surface-panel p-5">
          <div className="flex items-center justify-between">
            <p className="label-caps">Departments</p>
            <Building2 className="size-4 text-accent" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-accent">{dbDepartments.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Academic departments</p>
        </div>

        <div className="surface-panel p-5">
          <div className="flex items-center justify-between">
            <p className="label-caps">Cadre Ratio</p>
            <Briefcase className="size-4 text-secondary-foreground" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-foreground">
            {regularCount} <span className="text-xs font-normal text-muted-foreground">Reg</span> · {contractCount}{" "}
            <span className="text-xs font-normal text-muted-foreground">Cont</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Regular vs Contract faculty</p>
        </div>

        <div className="surface-panel p-5">
          <div className="flex items-center justify-between">
            <p className="label-caps">Incharge Roles</p>
            <Award className="size-4 text-amber-500" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-amber-500">{inchargeCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">HODs, Principals & Leadership</p>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="surface-panel flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, email, CFMS ID or designation"
            className="pl-9"
          />
        </div>
        <Select
          value={dept}
          onValueChange={(v) => {
            setDept(v);
            setPage(1);
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
          Showing {filteredList.length} of {totalCount} records
        </span>
      </div>

      {/* ── Faculty Data Table ── */}
      <div className="surface-panel mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["CFMS ID", "Name", "Email", "Department", "Designation", "Mobile", "Status", ""].map(
                  (h) => (
                    <th key={h} className="label-caps px-5 py-3">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedList.map((f) => {
                const inchargeRole = f.currentIncharge?.role || (f.incharge && f.incharge !== "None" ? f.incharge : null);
                const photoSrc = f.photoURL || f.photo_url;
                return (
                  <tr key={f.id} className="border-b border-border/60 last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-foreground">
                      {f.cfmsId || f.cfms_id || "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded-full overflow-hidden bg-muted border border-border flex items-center justify-center shrink-0">
                          {photoSrc ? (
                            <img
                              src={photoSrc}
                              alt={f.name}
                              className="size-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="text-[10px] font-bold text-muted-foreground">
                              {f.name ? f.name.slice(0, 1) : "F"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{f.name}</span>
                          {inchargeRole ? (
                            <span className="rounded border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                              {inchargeRole}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{f.email}</td>
                    <td className="px-5 py-3 font-medium">{f.department}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{f.designation}</td>
                    <td className="px-5 py-3 font-mono text-xs">{f.mobile || "—"}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {f.jobStatus || f.job_status || "Regular"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" asChild>
                          <Link to="/faculty/$id/edit" params={{ id: f.id }}>
                            Edit
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(f.id, f.name)}
                          disabled={deleteFaculty.isPending}
                          aria-label={`Delete ${f.name}`}
                        >
                          {deleteFaculty.isPending ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    No faculty match the selected search or department filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Bar (50 per page) ── */}
        {filteredList.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between border-t border-border px-5 py-3.5 text-xs text-muted-foreground">
            <div>
              Showing <span className="font-mono font-medium text-foreground">{(currentPage - 1) * PAGE_SIZE + 1}</span> to{" "}
              <span className="font-mono font-medium text-foreground">
                {Math.min(currentPage * PAGE_SIZE, filteredList.length)}
              </span>{" "}
              of <span className="font-mono font-medium text-foreground">{filteredList.length}</span> faculty records (
              {PAGE_SIZE} per page)
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                Next <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
