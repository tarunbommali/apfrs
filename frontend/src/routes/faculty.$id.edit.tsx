// frontend/src/routes/faculty.$id.edit.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { FacultyForm } from "@/components/faculty-form";
import { Button } from "@/components/ui/button";
import {
  facultyByIdQuery,
  facultyInchargeQuery,
  useUpdateFaculty,
  useDeleteFaculty,
  useCreateInchargeAssignment,
  useEndInchargeAssignment,
  useDeleteInchargeAssignment,
} from "@/lib/queries";
import type { InchargeAssignment } from "@/lib/apfrs-data";
import type { FacultyInput } from "@/lib/faculty-registry";

// Import split components
import { InchargeManagementSection } from "./-faculty-edit/InchargeManagementSection";
import { AssignInchargeDialog } from "./-faculty-edit/AssignInchargeDialog";
import { EndAssignmentDialog } from "./-faculty-edit/EndAssignmentDialog";

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

interface InchargeFormData {
  role: string;
  startDate: string;
  endDate: string | null;
}

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
  const [inchargeForm, setInchargeForm] = useState<InchargeFormData>({
    role: "HOD",
    startDate: new Date().toISOString().split("T")[0],
    endDate: null,
  });

  const [endModalOpen, setEndModalOpen] = useState(false);
  const [assignmentToEnd, setAssignmentToEnd] = useState<InchargeAssignment | null>(null);
  const [endEffectiveDate, setEndEffectiveDate] = useState("");

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
    setInchargeForm({
      role: "HOD",
      startDate: new Date().toISOString().split("T")[0],
      endDate: null,
    });
    setAddModalOpen(true);
  };

  const handleCreateIncharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inchargeForm.startDate) {
      toast.error("Please enter a valid start date.");
      return;
    }
    try {
      await createInchargeMutation.mutateAsync({
        role: inchargeForm.role,
        startDate: inchargeForm.startDate,
        endDate: inchargeForm.endDate,
      });
      toast.success(`Incharge role (${inchargeForm.role}) assigned to ${record.name}.`);
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

  return (
    <AppShell
      title={`Edit — ${record.name}`}
      subtitle={`CFMS ID ${record.cfmsId || record.cfms_id || "N/A"} · Department of ${record.department}`}
    >
      <div className="max-w-4xl space-y-8">
        {/* Faculty Profile Form */}
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

        {/* Incharge Management Section */}
        <InchargeManagementSection
          facultyName={record.name}
          currentAssignment={currentAssignment}
          history={inchargeHistory}
          isHistoryLoading={isInchargeLoading}
          onAssign={handleOpenAddIncharge}
          onEnd={handleOpenEndIncharge}
          onDelete={handleDeleteAssignment}
        />
      </div>

      {/* Dialogs */}
      <AssignInchargeDialog
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        facultyName={record.name}
        formData={inchargeForm}
        onFormChange={(data) => setInchargeForm((prev) => ({ ...prev, ...data }))}
        onSubmit={handleCreateIncharge}
        isPending={createInchargeMutation.isPending}
      />

      <EndAssignmentDialog
        open={endModalOpen}
        onOpenChange={setEndModalOpen}
        assignment={assignmentToEnd}
        facultyName={record.name}
        endDate={endEffectiveDate}
        onEndDateChange={setEndEffectiveDate}
        onSubmit={handleConfirmEndIncharge}
        isPending={endInchargeMutation.isPending}
      />
    </AppShell>
  );
}

export default EditFacultyPage;
