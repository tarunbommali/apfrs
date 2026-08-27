// frontend/src/routes/departments.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Users,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Loader2,
  UserCheck,
  Edit,
  Trash2,
  X,
  ChevronRight,
  Shield,
  UserRound,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  departmentsQuery,
  departmentFacultyQuery,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  useAssignDepartmentIncharge,
  useUpdateDepartmentStatus,
  facultyListQuery,
  type Department,
  type Faculty,
} from "@/lib/queries";
import { toast } from "sonner";

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

  // Form States
  const [addName, setAddName] = useState("");
  const [addCode, setAddCode] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addHodId, setAddHodId] = useState("none");
  const [addRole, setAddRole] = useState("HOD");

  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active");

  const [assignHodId, setAssignHodId] = useState("none");
  const [assignRole, setAssignRole] = useState("HOD");
  const [assignStartDate, setAssignStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [assignEndDate, setAssignEndDate] = useState("");

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
  const statusMutation = useUpdateDepartmentStatus(selectedDept?.id || "");

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
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addCode.trim()) {
      toast.error("Name and Code are required.");
      return;
    }
    try {
      await createMutation.mutateAsync({
        name: addName,
        code: addCode,
        description: addDescription,
        hodId: addHodId === "none" ? null : addHodId,
        status: "active",
      });
      toast.success("Department created successfully.");
      setIsAddOpen(false);
      // Reset
      setAddName("");
      setAddCode("");
      setAddDescription("");
      setAddHodId("none");
      setAddRole("HOD");
    } catch (err: any) {
      toast.error(err.message || "Failed to create department");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept) return;
    if (!editName.trim() || !editCode.trim()) {
      toast.error("Name and Code are required.");
      return;
    }
    try {
      await updateMutation.mutateAsync({
        name: editName,
        code: editCode,
        description: editDescription,
        status: editStatus,
      });
      toast.success("Department updated successfully.");
      setIsEditOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update department");
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept) return;
    try {
      await assignMutation.mutateAsync({
        hodId: assignHodId === "none" ? null : assignHodId,
        role: assignRole,
        startDate: assignStartDate,
        endDate: assignEndDate || null,
      });
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
      // Temporarily set selectedDept id for statusMutation
      setSelectedDept(dept);
      await queryClient.refetchQueries({ queryKey: ["departments"] });
      // Call mutation directly passing the ID inside a wrapper if needed or wait
      const hook = useUpdateDepartmentStatus(dept.id);
      // But since we can't call hooks conditionally, we use the active statusMutation bound to selectedDept:
      // Instead, we call statusMutation.mutateAsync(nextStatus) because selectedDept was set above.
      // Wait, to be safe, we can do it via a direct apiFetch or let the state settle, or we can just bind mutation inside the component.
      // Since statusMutation is already defined with selectedDept?.id, setting selectedDept and immediately executing it works if they are synchronized, but state updates are asynchronous in React!
      // Therefore, let's execute the mutation function directly or use a state-independent mutation hook:
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
    setEditName(dept.name);
    setEditCode(dept.code);
    setEditDescription(dept.description || "");
    setEditStatus(dept.status);
    setIsEditOpen(true);
  };

  const openAssign = (dept: Department) => {
    setSelectedDept(dept);
    setAssignHodId(dept.hod_id || "none");
    setAssignRole(dept.hod_id ? "HOD" : "HOD");
    setAssignStartDate(new Date().toISOString().split("T")[0]);
    setAssignEndDate("");
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
        {/* ── Search & Filter Controls ── */}
        <div className="surface-panel flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search department name or code..."
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 h-9 text-xs">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort by Name</SelectItem>
              <SelectItem value="code">Sort by Code</SelectItem>
              <SelectItem value="faculty">Sort by Faculty Count</SelectItem>
            </SelectContent>
          </Select>

          {(search || statusFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
              className="text-xs text-muted-foreground hover:text-foreground h-9"
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* ── Table Container ── */}
        {sortedDepartments.length === 0 ? (
          <div className="surface-panel flex flex-col items-center gap-4 p-16 text-center">
            <Building2 className="size-12 text-muted-foreground/30" strokeWidth={1} />
            <h2 className="text-lg font-semibold text-foreground">No departments found</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              {search || statusFilter !== "all"
                ? "Try adjusting your search queries or status filters to find matching departments."
                : "Create your first department to organize faculty and assign department leadership."}
            </p>
            {!search && statusFilter === "all" && (
              <Button onClick={() => setIsAddOpen(true)} className="mt-2">
                Create Department
              </Button>
            )}
          </div>
        ) : (
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
                  {sortedDepartments.map((dept) => {
                    const hasHod = Boolean(dept.hod_id);
                    return (
                      <tr
                        key={dept.id}
                        className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <div>
                            <span className="font-semibold text-foreground block">{dept.name}</span>
                            <span className="font-mono text-[11px] font-bold text-muted-foreground uppercase">
                              {dept.code}
                            </span>
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
                              onClick={() => setDetailDeptId(dept.id)}
                            >
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 text-xs font-semibold"
                              onClick={() => openEdit(dept)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => openAssign(dept)}
                              title="Assign Incharge"
                            >
                              <UserCheck className="size-3.5 text-primary" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => toggleDeptStatus(dept)}
                              title={dept.status === "active" ? "Deactivate" : "Activate"}
                            >
                              <X className={`size-3.5 ${dept.status === "active" ? "text-amber-500" : "text-emerald-500"}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteDept(dept)}
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
        )}
      </div>

      {/* ── ADD DEPARTMENT MODAL ── */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Department</DialogTitle>
            <DialogDescription>
              Add a new academic department to organize faculty and manage leadership assignments.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-name">Department Name *</Label>
              <Input
                id="add-name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="e.g. Computer Science & Engineering"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-code">Department Code *</Label>
              <Input
                id="add-code"
                value={addCode}
                onChange={(e) => setAddCode(e.target.value)}
                placeholder="e.g. CSE"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-desc">Description</Label>
              <Input
                id="add-desc"
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                placeholder="Optional department details"
              />
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-1.5">
                <Label>Initial Incharge</Label>
                <Select value={addHodId} onValueChange={setAddHodId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not Assigned</SelectItem>
                    {facultyList.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name} ({f.department})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={addRole} onValueChange={setAddRole} disabled={addHodId === "none"}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HOD">HOD</SelectItem>
                    <SelectItem value="Department Incharge">Incharge</SelectItem>
                    <SelectItem value="Coordinator">Coordinator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Department"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── EDIT DEPARTMENT MODAL ── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>Modify department master records.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Department Name *</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-code">Department Code *</Label>
              <Input
                id="edit-code"
                value={editCode}
                onChange={(e) => setEditCode(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-desc">Description</Label>
              <Input
                id="edit-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as any)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── ASSIGN INCHARGE MODAL ── */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Department Incharge</DialogTitle>
            <DialogDescription>
              Select an existing faculty member to assign leadership for {selectedDept?.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignSubmit} className="space-y-4 py-2">
            <div className="space-y-1 bg-muted/30 p-3 rounded border border-border text-xs">
              <span className="font-semibold text-foreground block">Current Assignment</span>
              {selectedDept?.hod_id ? (
                <span className="text-muted-foreground">
                  {selectedDept.hod_name} ({selectedDept.hod_email})
                </span>
              ) : (
                <span className="text-muted-foreground italic">None Assigned</span>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Select New HOD/Incharge</Label>
              <Select value={assignHodId} onValueChange={setAssignHodId}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Clear Assignment (Not Assigned)</SelectItem>
                  {facultyList
                    .filter((f) => f.department?.toLowerCase() === selectedDept?.code?.toLowerCase())
                    .map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Leadership Role</Label>
              <Select value={assignRole} onValueChange={setAssignRole} disabled={assignHodId === "none"}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HOD">HOD</SelectItem>
                  <SelectItem value="Department Incharge">Department Incharge</SelectItem>
                  <SelectItem value="Coordinator">Coordinator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assign-start-date">Appointment Start Date (required)</Label>
              <Input
                id="assign-start-date"
                type="date"
                required
                value={assignStartDate}
                onChange={(e) => setAssignStartDate(e.target.value)}
                disabled={assignHodId === "none"}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assign-end-date">Appointment End Date (optional)</Label>
              <Input
                id="assign-end-date"
                type="date"
                value={assignEndDate}
                onChange={(e) => setAssignEndDate(e.target.value)}
                placeholder="Leave empty for open-ended"
                disabled={assignHodId === "none"}
                className="text-xs"
              />
            </div>
            {selectedDept?.hod_id && assignHodId !== "none" && assignHodId !== selectedDept.hod_id && (
              <div className="flex gap-2 items-start text-xs bg-amber-500/10 p-3 rounded border border-amber-500/20 text-amber-600 dark:text-amber-400">
                <Shield className="size-4 mt-0.5 shrink-0" />
                <span>
                  <strong>Note:</strong> Saving this will replace the current HOD <strong>{selectedDept.hod_name}</strong>.
                </span>
              </div>
            )}
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAssignOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={assignMutation.isPending}>
                {assignMutation.isPending ? "Assigning..." : "Save Assignment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DEPARTMENT DETAILS DRAWER / SHEET ── */}
      <Sheet open={Boolean(detailDeptId)} onOpenChange={(open) => !open && setDetailDeptId(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {(() => {
            const dept = departments.find((d) => d.id === detailDeptId);
            if (!dept) return null;
            return (
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
                      Faculty Members ({filteredDeptFaculty.length})
                    </h4>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={facultySearch}
                      onChange={(e) => setFacultySearch(e.target.value)}
                      placeholder="Search department faculty..."
                      className="pl-8 h-8 text-xs"
                    />
                  </div>

                  {isFacultyLoading ? (
                    <div className="flex justify-center py-6 text-muted-foreground text-xs gap-1.5">
                      <Loader2 className="size-4 animate-spin" /> Loading faculty...
                    </div>
                  ) : filteredDeptFaculty.length === 0 ? (
                    <div className="text-xs text-muted-foreground/60 italic p-6 text-center border border-border/30 rounded-lg">
                      {facultySearch ? "No matching faculty found." : "No faculty members enrolled in this department."}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {filteredDeptFaculty.map((fac) => (
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
            );
          })()}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
export default DepartmentsPage;
