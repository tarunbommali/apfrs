// frontend/src/routes/departments.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  departmentsQuery,
  departmentFacultyQuery,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  useAssignDepartmentIncharge,
  facultyListQuery,
  type Department,
} from "@/lib/queries";
import { toast } from "sonner";

// Import subcomponents from the ignored folder to prevent TanStack Router route scanning warnings
import { DepartmentFilters } from "./-departments/DepartmentFilters";
import { DepartmentTable } from "./-departments/DepartmentTable";
import { AddDeptModal } from "./-departments/AddDeptModal";
import { EditDeptModal } from "./-departments/EditDeptModal";
import { AssignInchargeModal } from "./-departments/AssignInchargeModal";
import { DeptDetailsDrawer } from "./-departments/DeptDetailsDrawer";

export const Route = createFileRoute("/departments")({
  head: () => ({
    meta: [
      { title: "Departments — e-Office Jntugv" },
      {
        name: "description",
        content: "Manage departments, leadership assignments, and faculty organization.",
      },
    ],
  }),
  component: DepartmentsPage,
});

function DepartmentsPage() {
  const queryClient = useQueryClient();

  // Filters State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");

  // Dialogs State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [detailDeptId, setDetailDeptId] = useState<string | null>(null);

  // Department Faculty List Search
  const [facultySearch, setFacultySearch] = useState("");

  // Queries
  const { data: deptsData, isLoading, error, refetch } = useQuery(
    departmentsQuery({
      status: statusFilter === "all" ? undefined : statusFilter,
      search: search.trim() ? search : undefined,
    })
  );

  const { data: allFacultyData } = useQuery(facultyListQuery({ limit: 1000 }));
  const facultyList = allFacultyData?.faculty || [];

  const { data: deptFacultyData, isLoading: isFacultyLoading } = useQuery(
    departmentFacultyQuery(detailDeptId || "")
  );
  const deptFaculty = deptFacultyData?.faculty || [];

  // Mutations
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment(selectedDept?.id || "");
  const deleteMutation = useDeleteDepartment();
  const assignMutation = useAssignDepartmentIncharge(selectedDept?.id || "");

  const departments = deptsData?.departments || [];

  // Filter & Sort dynamic logic
  const sortedDepartments = useMemo(() => {
    return [...departments].sort((a, b) => {
      if (sortBy === "code") {
        return a.code.localeCompare(b.code);
      }
      if (sortBy === "faculty") {
        return (b.faculty_count || 0) - (a.faculty_count || 0);
      }
      return a.name.localeCompare(b.name);
    });
  }, [departments, sortBy]);

  // Handlers
  const handleAddSubmit = async (data: {
    name: string;
    code: string;
    description: string;
    hodId: string | null;
    eapcet_code?: string;
    branch_code?: string;
  }) => {
    try {
      await createMutation.mutateAsync({
        ...data,
        status: "active",
      });
      toast.success("Department created successfully.");
      setIsAddOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create department");
    }
  };

  const handleEditSubmit = async (data: {
    name: string;
    code: string;
    description: string;
    status: "active" | "inactive";
    eapcet_code?: string;
    branch_code?: string;
  }) => {
    if (!selectedDept) return;
    try {
      await updateMutation.mutateAsync(data);
      toast.success("Department updated successfully.");
      setIsEditOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update department");
    }
  };

  const handleAssignSubmit = async (data: {
    hodId: string | null;
    role: string;
    startDate: string;
    endDate: string | null;
  }) => {
    if (!selectedDept) return;
    try {
      await assignMutation.mutateAsync(data);
      toast.success("Leadership role assigned successfully.");
      setIsAssignOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to assign incharge");
    }
  };

  const toggleDeptStatus = async (dept: Department) => {
    const nextStatus = dept.status === "active" ? "inactive" : "active";
    if (
      dept.status === "active" &&
      !window.confirm(`Deactivate ${dept.name}? All active assignments will be frozen.`)
    ) {
      return;
    }
    try {
      await queryClient.fetchQuery({
        queryKey: ["temp-status", dept.id],
        queryFn: () =>
          fetch(`/api/admin/departments/${dept.id}/status`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("apfrs.auth.token")}`,
            },
            body: JSON.stringify({ status: nextStatus }),
          }).then((r) => r.json()),
      });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success(`Department ${dept.name} is now ${nextStatus}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status");
    }
  };

  const handleDeleteDept = async (dept: Department) => {
    if (!window.confirm(`Are you absolutely sure you want to delete ${dept.name}? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(dept.id);
      toast.success("Department deleted successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete department");
    }
  };

  const openEdit = (dept: Department) => {
    setSelectedDept(dept);
    setIsEditOpen(true);
  };

  const openAssign = (dept: Department) => {
    setSelectedDept(dept);
    setIsAssignOpen(true);
  };

  const filteredDeptFaculty = useMemo(() => {
    if (!facultySearch.trim()) return deptFaculty;
    const term = facultySearch.toLowerCase();
    return deptFaculty.filter(
      (f) =>
        f.name.toLowerCase().includes(term) ||
        (f.cfmsId || f.cfms_id || "").toLowerCase().includes(term) ||
        f.designation.toLowerCase().includes(term)
    );
  }, [deptFaculty, facultySearch]);

  const detailDept = useMemo(() => {
    return departments.find((d) => d.id === detailDeptId) || null;
  }, [departments, detailDeptId]);

  if (isLoading && departments.length === 0) {
    return (
      <AppShell title="Departments" subtitle="Manage departments, leadership assignments, and faculty organization.">
        <div className="space-y-6">
          <div className="surface-panel h-16 animate-pulse bg-muted/40 rounded-lg" />
          <div className="surface-panel h-96 animate-pulse bg-muted/30 rounded-lg" />
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Departments" subtitle="Manage departments, leadership assignments, and faculty organization.">
        <div className="surface-panel flex flex-col items-center gap-3 p-10 text-center">
          <AlertCircle className="size-8 text-destructive" />
          <p className="font-semibold text-destructive">Failed to load departments</p>
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
      title="Departments"
      subtitle="Manage departments, leadership assignments, and faculty organization."
      actions={
        <Button onClick={() => setIsAddOpen(true)} className="gap-1.5 shadow-sm">
          <Plus className="size-4" /> Add Department
        </Button>
      }
    >
      <div className="space-y-6 max-w-5xl">
        <DepartmentFilters
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          sortBy={sortBy}
          onSortByChange={setSortBy}
        />

        <DepartmentTable
          departments={sortedDepartments}
          search={search}
          statusFilter={statusFilter}
          onViewDetails={setDetailDeptId}
          onEdit={openEdit}
          onAssign={openAssign}
          onToggleStatus={toggleDeptStatus}
          onDelete={handleDeleteDept}
          onCreateClick={() => setIsAddOpen(true)}
        />
      </div>

      <AddDeptModal
        isOpen={isAddOpen}
        onOpenChange={setIsAddOpen}
        facultyList={facultyList}
        isPending={createMutation.isPending}
        onSubmit={handleAddSubmit}
      />

      <EditDeptModal
        isOpen={isEditOpen}
        onOpenChange={setIsEditOpen}
        selectedDept={selectedDept}
        isPending={updateMutation.isPending}
        onSubmit={handleEditSubmit}
      />

      <AssignInchargeModal
        isOpen={isAssignOpen}
        onOpenChange={setIsAssignOpen}
        selectedDept={selectedDept}
        facultyList={facultyList}
        isPending={assignMutation.isPending}
        onSubmit={handleAssignSubmit}
      />

      <DeptDetailsDrawer
        isOpen={Boolean(detailDeptId)}
        onOpenChange={(open) => !open && setDetailDeptId(null)}
        dept={detailDept}
        deptFaculty={filteredDeptFaculty}
        isFacultyLoading={isFacultyLoading}
        facultySearch={facultySearch}
        onFacultySearchChange={setFacultySearch}
      />
    </AppShell>
  );
}

export default DepartmentsPage;
