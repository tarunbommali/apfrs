import { Link } from "@tanstack/react-router";
import { UploadCloud } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

export function EmptyState() {
  return (
    <AppShell
      roles={["admin"]}
      title="Attendance"
      subtitle="No attendance data loaded"
    >
      <div className="surface-panel flex flex-col items-center gap-4 p-16 text-center">
        <UploadCloud className="size-12 text-muted-foreground/40" strokeWidth={1} />
        <h2 className="text-lg font-semibold">No attendance sheets imported yet</h2>
        <p className="text-sm text-muted-foreground">
          Upload a monthly biometric sheet to view attendance summary and daily records.
        </p>
        <Button asChild className="mt-4">
          <Link to="/import">
            <UploadCloud className="mr-2 size-4" /> Import Biometric Data
          </Link>
        </Button>
      </div>
    </AppShell>
  );
}
