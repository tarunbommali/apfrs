import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { FacultyForm } from "@/components/faculty-form";
import { Button } from "@/components/ui/button";
import { facultyByIdQuery, useUpdateFaculty, useDeleteFaculty } from "@/lib/queries";
import type { FacultyInput } from "@/lib/faculty-registry";

export const Route = createFileRoute("/faculty/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit Faculty — e-Office Jntugv" },
      {
        name: "description",
        content: "Update faculty master data: CFMS ID, email, department, designation, incharge role and job status.",
      },
    ],
  }),
  component: () => (
    <Suspense fallback={<div className="p-8 text-muted-foreground">Loading…</div>}>
      <EditFacultyPage />
    </Suspense>
  ),
});

function EditFacultyPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data, error } = useSuspenseQuery(facultyByIdQuery(id));
  const updateFaculty = useUpdateFaculty(id);
  const deleteFaculty = useDeleteFaculty();

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

  const initial: FacultyInput = {
    cfmsId: record.cfmsId,
    name: record.name,
    email: record.email,
    designation: record.designation,
    department: record.department,
    mobile: record.mobile,
    gender: (record.gender as FacultyInput["gender"]) || "male",
    jobStatus: record.jobStatus,
    incharge: (record.incharge as FacultyInput["incharge"]) || "None",
    present: record.present ?? 0,
    absent: record.absent ?? 0,
    leave: record.leave ?? 0,
    workingDays: record.workingDays ?? 24,
  };

  const handleSubmit = async (value: FacultyInput) => {
    try {
      await updateFaculty.mutateAsync(value);
      toast.success(`${value.name} updated`);
      void navigate({ to: "/admin-dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Remove ${record.name} from the registry?`)) return;
    try {
      await deleteFaculty.mutateAsync(record.id);
      toast.success(`${record.name} removed from the registry`);
      void navigate({ to: "/admin-dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <AppShell title={`Edit — ${record.name}`} subtitle={`CFMS ID ${record.cfmsId}`}>
      <div className="max-w-4xl">
        <FacultyForm
          key={record.id}
          initial={initial}
          submitLabel={updateFaculty.isPending ? "Saving…" : "Save changes"}
          onSubmit={handleSubmit}
          footer={
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              disabled={deleteFaculty.isPending}
            >
              {deleteFaculty.isPending ? (
                <Loader2 className="size-4 animate-spin text-destructive" />
              ) : (
                <Trash2 className="size-4 text-destructive" />
              )}{" "}
              Delete record
            </Button>
          }
        />
      </div>
    </AppShell>
  );
}
