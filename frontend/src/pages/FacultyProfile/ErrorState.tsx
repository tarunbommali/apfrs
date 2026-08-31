import { AlertCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";

interface ErrorStateProps {
  error: Error;
}

export function ErrorState({ error }: ErrorStateProps) {
  return (
    <AppShell roles={["faculty", "admin"]} title="My Profile">
      <div className="surface-panel flex flex-col items-center gap-3 p-10 text-center">
        <AlertCircle className="size-8 text-destructive" />
        <p className="font-semibold text-destructive">Failed to load profile</p>
        <p className="text-sm text-muted-foreground">{String(error)}</p>
      </div>
    </AppShell>
  );
}
