import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Trash2,
  Plus,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Loader2,
  Briefcase,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { FacultyForm } from "@/components/faculty-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  facultyByIdQuery,
  facultyInchargeQuery,
  useUpdateFaculty,
  useDeleteFaculty,
  useCreateInchargeAssignment,
  useEndInchargeAssignment,
  useDeleteInchargeAssignment,
} from "@/lib/queries";
import { inchargeRoles, type InchargeAssignment } from "@/lib/apfrs-data";
import type { FacultyInput } from "@/lib/faculty-registry";

export const Route = createFileRoute("/faculty/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit Faculty — e-Office Jntugv" },
      {
        name: "description",
        content: "Update faculty master data, photo URL, and manage separate incharge assignment appointments and history.",
      },
    ],
  }),
  component: EditFacultyPage,
});

function EditFacultyPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  // Queries
  const { data, isLoading, error } = useQuery(facultyByIdQuery(id));
  const { data: inchargeData, isLoading: isInchargeLoading } = useQuery(facultyInchargeQuery(id));

  // Mutations
  const updateFaculty = useUpdateFaculty(id);
  const deleteFaculty = useDeleteFaculty();
  const createInchargeMutation = useCreateInchargeAssignment(id);
  const endInchargeMutation = useEndInchargeAssignment(id);
  const deleteInchargeMutation = useDeleteInchargeAssignment(id);

  // Incharge Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [inchargeRole, setInchargeRole] = useState<string>("HOD");
  const [inchargeStartDate, setInchargeStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [inchargeEndDate, setInchargeEndDate] = useState("");

  const [endModalOpen, setEndModalOpen] = useState(false);
  const [assignmentToEnd, setAssignmentToEnd] = useState<InchargeAssignment | null>(null);
  if (isLoading) {
    return (
      <AppShell title="Edit Faculty" subtitle="Loading record details…">
        <div className="surface-panel p-10 text-center text-muted-foreground flex items-center justify-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin text-primary" /> Loading faculty record…
        </div>
      </AppShell>
    );
  }

  if (error || !data?.faculty) {
    return (
      <AppShell title="Faculty not found" subtitle="This record may have been removed">
        <div className="surface-panel p-10 text-center">
          <p className="text-sm text-muted-foreground">No faculty record matches this link.</p>
          <Button className="mt-4" asChild>
            <Link to="/admin-dashboard">Back to registry</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const record = data.faculty;
  const currentAssignment = inchargeData?.currentIncharge || record.currentIncharge || null;
  const inchargeHistory = inchargeData?.inchargeHistory || record.inchargeHistory || [];

  const initial: FacultyInput = {
    cfmsId: record.cfmsId || record.cfms_id || "",
    name: record.name,
    email: record.email,
    photoURL: record.photoURL || record.photo_url || null,
    designation: record.designation,
    department: record.department,
    mobile: record.mobile,
    gender: (record.gender as FacultyInput["gender"]) || "male",
    jobStatus: record.jobStatus,
    present: record.present ?? 0,
    absent: record.absent ?? 0,
    leave: record.leave ?? 0,
    workingDays: record.workingDays ?? 24,
  };

  const handleFacultySubmit = async (value: FacultyInput) => {
    try {
      await updateFaculty.mutateAsync(value);
      toast.success(`${value.name} profile updated successfully.`);
      void navigate({ to: "/admin-dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handleFacultyDelete = async () => {
    if (!window.confirm(`Remove ${record.name} from the active registry? Historical records will remain intact.`)) return;
    try {
      await deleteFaculty.mutateAsync(record.id);
      toast.success(`${record.name} removed from active registry`);
      void navigate({ to: "/admin-dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleOpenAddIncharge = () => {
    setInchargeRole("HOD");
    setInchargeStartDate(new Date().toISOString().split("T")[0]);
    setInchargeEndDate("");
    setAddModalOpen(true);
  };

  const handleCreateIncharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inchargeStartDate) {
      toast.error("Please enter a valid start date.");
      return;
    }
    try {
      await createInchargeMutation.mutateAsync({
        role: inchargeRole,
        startDate: inchargeStartDate,
        endDate: inchargeEndDate ? inchargeEndDate : null,
      });
      toast.success(`Incharge role (${inchargeRole}) assigned to ${record.name}.`);
      setAddModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create incharge assignment.");
    }
  };

  const handleOpenEndIncharge = (assignment: InchargeAssignment) => {
    setAssignmentToEnd(assignment);
    setEndEffectiveDate(new Date().toISOString().split("T")[0]);
    setEndModalOpen(true);
  };

  const handleConfirmEndIncharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentToEnd?.id) return;
    try {
      await endInchargeMutation.mutateAsync({
        assignmentId: assignmentToEnd.id,
        endDate: endEffectiveDate,
      });
      toast.success(`Incharge role (${assignmentToEnd.role}) ended as of ${endEffectiveDate}.`);
      setEndModalOpen(false);
      setAssignmentToEnd(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to end incharge assignment.");
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!window.confirm("Delete this incharge appointment record?")) return;
    try {
      await deleteInchargeMutation.mutateAsync(assignmentId);
      toast.success("Incharge record deleted.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete assignment.");
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <AppShell
      title={`Edit — ${record.name}`}
      subtitle={`CFMS ID ${record.cfmsId || record.cfms_id || "N/A"} · Department of ${record.department}`}
    >
      <div className="max-w-4xl space-y-8">
        {/* ── Main Faculty Profile Form ── */}
        <FacultyForm
          key={record.id}
          initial={initial}
          submitLabel={updateFaculty.isPending ? "Saving…" : "Save changes"}
          onSubmit={handleFacultySubmit}
          footer={
            <Button
              type="button"
              variant="ghost"
              onClick={handleFacultyDelete}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" /> Delete record
            </Button>
          }
        />

        {/* ── Separate Incharge Assignment Section ── */}
        <section className="surface-panel p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Briefcase className="size-5 text-amber-500" />
                <h2 className="text-base font-semibold">Incharge Assignment</h2>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Official leadership appointment (e.g. HOD, Principal) with designated appointment terms.
              </p>
            </div>

            <Button size="sm" onClick={handleOpenAddIncharge} className="gap-1.5 shrink-0">
              <Plus className="size-4" /> Assign New Role
            </Button>
          </div>

          {/* Current Active Assignment Status */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Current Active Assignment
            </div>
            {currentAssignment ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm">
                    {currentAssignment.role.slice(0, 3)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">
                        {currentAssignment.role}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-3" /> Active
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {currentAssignment.startDate || currentAssignment.start_date} →{" "}
                      {currentAssignment.endDate || currentAssignment.end_date || "Present (Open-ended)"}
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs text-destructive hover:bg-destructive/10"
                  onClick={() => handleOpenEndIncharge(currentAssignment)}
                >
                  <XCircle className="mr-1.5 size-3.5" /> End Assignment
                </Button>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground py-2 flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground/60" />
                <span>No active incharge appointment for this faculty member.</span>
              </div>
            )}
          </div>

          {/* ── Incharge History Table ── */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Incharge Appointment History</h3>
              <span className="text-xs text-muted-foreground">
                {inchargeHistory.length} {inchargeHistory.length === 1 ? "record" : "records"}
              </span>
            </div>

            {isInchargeLoading ? (
              <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin text-primary" /> Loading assignment history…
              </div>
            ) : inchargeHistory.length > 0 ? (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Start Date</th>
                      <th className="py-2.5 px-3">End Date</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {inchargeHistory.map((item) => {
                      const start = item.startDate || item.start_date;
                      const end = item.endDate || item.end_date;
                      const isCurrent = start <= todayStr && (!end || end >= todayStr);

                      return (
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-foreground">
                            {item.role}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-muted-foreground">
                            {start}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-muted-foreground">
                            {end || "— Present"}
                          </td>
                          <td className="py-2.5 px-3">
                            {isCurrent ? (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                Current
                              </span>
                            ) : (
                              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                Completed
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {isCurrent && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[10px] text-amber-600 hover:text-amber-700 px-2"
                                  onClick={() => handleOpenEndIncharge(item)}
                                >
                                  End
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-6 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteAssignment(item.id)}
                                title="Delete record"
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-3 italic">
                No incharge history found for this faculty member.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* ── Dialog: Assign Incharge Role ── */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateIncharge}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Briefcase className="size-5 text-amber-500" /> Assign Incharge Role
              </DialogTitle>
              <DialogDescription>
                Assign an official leadership role to {record.name}. Overlapping terms will be prevented.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="role-select">Incharge Role</Label>
                <Select value={inchargeRole} onValueChange={setInchargeRole}>
                  <SelectTrigger id="role-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {inchargeRoles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start-date">Appointment Start Date (required)</Label>
                <Input
                  id="start-date"
                  type="date"
                  required
                  value={inchargeStartDate}
                  onChange={(e) => setInchargeStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date">Appointment End Date (optional)</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={inchargeEndDate}
                  onChange={(e) => setInchargeEndDate(e.target.value)}
                  placeholder="Leave empty for open-ended"
                />
                <p className="text-[11px] text-muted-foreground">
                  Leave empty if appointment is open-ended until relieved.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createInchargeMutation.isPending}>
                {createInchargeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 size-4 animate-spin" /> Assigning…
                  </>
                ) : (
                  "Save Assignment"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: End Assignment ── */}
      <Dialog open={endModalOpen} onOpenChange={setEndModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleConfirmEndIncharge}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="size-5" /> End Incharge Assignment
              </DialogTitle>
              <DialogDescription>
                End the <strong>{assignmentToEnd?.role}</strong> role for {record.name}. This preserves appointment history in the database.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="end-effective-date">Effective End Date</Label>
                <Input
                  id="end-effective-date"
                  type="date"
                  required
                  value={endEffectiveDate}
                  onChange={(e) => setEndEffectiveDate(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEndModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={endInchargeMutation.isPending}
              >
                {endInchargeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 size-4 animate-spin" /> Ending…
                  </>
                ) : (
                  "Confirm End Role"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
