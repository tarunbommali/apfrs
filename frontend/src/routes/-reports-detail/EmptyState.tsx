import { Link } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  monthName: string;
  year: number;
}

export function EmptyState({ monthName, year }: EmptyStateProps) {
  return (
    <AppShell
      roles={["admin"]}
      title={`Reports · ${monthName} ${year}`}
      subtitle="No attendance sheet found for this period"
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link to="/reports">
            <ArrowLeft className="mr-1.5 size-3.5" /> All Reports
          </Link>
        </Button>
      }
    >
      <div className="surface-panel p-12 text-center">
        <AlertCircle className="mx-auto size-10 text-muted-foreground/50" />
        <h2 className="mt-3 text-base font-semibold">
          No attendance sheet for {monthName} {year}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          No biometric attendance sheet has been imported for this period yet.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="outline" asChild>
            <Link to="/reports">View Available Reports</Link>
          </Button>
          <Button asChild>
            <Link to="/import">Import Biometric Sheet</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
