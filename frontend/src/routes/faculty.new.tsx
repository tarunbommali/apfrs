import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { FacultyForm, emptyFaculty } from "@/components/faculty-form";
import { useCreateFaculty } from "@/lib/queries";
import type { FacultyInput } from "@/lib/faculty-registry";

export const Route = createFileRoute("/faculty/new")({
  head: () => ({
    meta: [
      { title: "Add Faculty — e-Office Jntugv" },
      {
        name: "description",
        content:
          "Create a new faculty record with CFMS ID, institutional email, department and posting details.",
      },
    ],
  }),
  component: NewFacultyPage,
});

function NewFacultyPage() {
  const navigate = useNavigate();
  const createFaculty = useCreateFaculty();

  const handleSubmit = async (value: FacultyInput) => {
    try {
      await createFaculty.mutateAsync(value);
      toast.success(`${value.name} added to the registry`);
      void navigate({ to: "/admin-dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create faculty record");
    }
  };

  return (
    <AppShell
      title="Add Faculty"
      subtitle="Create a master record used for attendance matching and report delivery"
    >
      <div className="max-w-4xl">
        <FacultyForm
          initial={emptyFaculty}
          submitLabel={createFaculty.isPending ? "Creating…" : "Create faculty"}
          onSubmit={handleSubmit}
        />
      </div>
    </AppShell>
  );
}
