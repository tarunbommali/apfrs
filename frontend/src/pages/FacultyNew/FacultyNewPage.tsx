import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { FacultyForm, emptyFaculty } from "@/components/faculty-form";
import { useCreateFaculty } from "@/lib/queries";
import type { FacultyInput } from "@/lib/faculty-registry";

function useFacultyCreateHandler() {
  const navigate = useNavigate();
  const createFaculty = useCreateFaculty();

  const handleSubmit = async (value: FacultyInput) => {
    try {
      await createFaculty.mutateAsync(value);
      toast.success(`${value.name} added to the registry`);
      navigate("/admin-dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create faculty record");
    }
  };

  return {
    handleSubmit,
    isPending: createFaculty.isPending,
  };
}

export function NewFacultyPage() {
  const { handleSubmit, isPending } = useFacultyCreateHandler();

  return (
    <AppShell
      title="Add Faculty"
      subtitle="Create a master record used for attendance matching and report delivery"
    >
      <div className="max-w-4xl">
        <FacultyForm
          initial={emptyFaculty}
          submitLabel={isPending ? "Creating…" : "Create faculty"}
          onSubmit={handleSubmit}
        />
      </div>
    </AppShell>
  );
}

export default NewFacultyPage;
