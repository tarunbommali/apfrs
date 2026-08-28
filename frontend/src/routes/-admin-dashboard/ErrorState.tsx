import { AlertCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  error: any;
  onRetry: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <AppShell title="Faculty Registry">
      <div className="surface-panel flex flex-col items-center gap-3 p-10 text-center">
        <AlertCircle className="size-8 text-destructive" />
        <p className="font-semibold text-destructive">Failed to load faculty</p>
        <p className="text-sm text-muted-foreground">{String(error)}</p>
        <Button variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </AppShell>
  );
}
