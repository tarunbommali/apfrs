import { Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { facultyListQuery, useDeleteFaculty, departmentsQuery } from "@/lib/queries";
import { toast } from "sonner";

// Subcomponents
import { RegistrySkeleton } from "./RegistrySkeleton";
import { SummaryCards } from "./SummaryCards";
import { SearchFilters } from "./SearchFilters";
import { FacultyRow } from "./FacultyRow";
import { Pagination } from "./Pagination";
import { ErrorState } from "./ErrorState";

const PAGE_SIZE = 50;

function AdminDashboard() {
  // ── State ──
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [page, setPage] = useState(1);

  // ── Queries ──
  const { data, isLoading, error, refetch } = useQuery(
    facultyListQuery({ limit: 1000 }),
  );
  const deleteFaculty = useDeleteFaculty();

  const { data: deptsData } = useQuery(departmentsQuery());
  const dbDepartments = deptsData?.departments ?? [];

  // ── Derived Data ──
  const filterDepartments = useMemo(() => {
    const list = dbDepartments.map((d) => ({ id: d.id, code: d.code }));
    if (!list.some((d) => d.code.toLowerCase() === "uncategorized")) {
      list.push({ id: "uncategorized", code: "Uncategorized" });
    }
    return list;
  }, [dbDepartments]);

  const facultyList = data?.faculty ?? [];

  const filteredList = useMemo(() => {
    return facultyList.filter((f) => {
      const fDept = (f.department || "Uncategorized").toLowerCase();
      const matchDept = department === "all" || fDept === department.toLowerCase();
      const term = search.toLowerCase().trim();
      const matchSearch =
        !term ||
        f.name.toLowerCase().includes(term) ||
        f.email.toLowerCase().includes(term) ||
        (f.cfmsId && f.cfmsId.toLowerCase().includes(term)) ||
        (f.designation && f.designation.toLowerCase().includes(term));
      return matchDept && matchSearch;
    });
  }, [facultyList, department, search]);

  // ── Metrics ──
  const totalCount = facultyList.length;
  const regularCount = facultyList.filter((f) => (f.jobStatus || "").toLowerCase() === "regular").length;
  const contractCount = facultyList.filter(
    (f) => (f.jobStatus || "").toLowerCase().includes("contract") || 
    (f.jobStatus || "").toLowerCase().includes("adjunct")
  ).length || Math.max(0, facultyList.length - regularCount);
  const inchargeCount = facultyList.filter(
    (f) => Boolean(f.currentIncharge?.role || (f.incharge && f.incharge !== "None"))
  ).length;

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredList.slice(start, start + PAGE_SIZE);
  }, [filteredList, currentPage]);

  // ── Handlers ──
  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Remove ${name} from the registry?`)) return;
    try {
      await deleteFaculty.mutateAsync(id);
      toast.success(`${name} removed from registry`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleDepartmentChange = (value: string) => {
    setDepartment(value);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // ── Loading State ──
  if (isLoading) {
    return <RegistrySkeleton />;
  }

  // ── Error State ──
  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  // ── Render ──
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
      {/* ── Summary Cards ── */}
      <SummaryCards
        totalCount={totalCount}
        departmentsCount={dbDepartments.length}
        regularCount={regularCount}
        contractCount={contractCount}
        inchargeCount={inchargeCount}
      />

      {/* ── Search & Filters ── */}
      <SearchFilters
        search={search}
        onSearchChange={handleSearchChange}
        department={department}
        onDepartmentChange={handleDepartmentChange}
        filterDepartments={filterDepartments}
        facultyList={facultyList}
        totalCount={totalCount}
        filteredCount={filteredList.length}
      />

      {/* ── Faculty Table ── */}
      <div className="surface-panel mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/10 text-left">
                <th className="label-caps px-5 py-3">CFMS ID</th>
                <th className="label-caps px-5 py-3">Faculty Member</th>
                <th className="label-caps px-5 py-3">Department</th>
                <th className="label-caps px-5 py-3">Designation</th>
                <th className="label-caps px-5 py-3">Mobile</th>
                <th className="label-caps px-5 py-3">Cadre</th>
                <th className="label-caps px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedList.map((f) => (
                <FacultyRow
                  key={f.id}
                  faculty={f}
                  onDelete={handleDelete}
                  isDeleting={deleteFaculty.isPending}
                />
              ))}
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    No faculty match the selected search or department filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {filteredList.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            filteredCount={filteredList.length}
            pageSize={PAGE_SIZE}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </AppShell>
  );
}

export default AdminDashboard;
