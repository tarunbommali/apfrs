import { Loader2, XCircle } from "lucide-react";

interface StatusFeedbackProps {
  status: string;
  errorMsg: string | null;
}

export function StatusFeedback({ status, errorMsg }: StatusFeedbackProps) {
  if (status === "parsing") {
    return (
      <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-primary" />
        Parsing biometric attendance sheet & syncing academic calendar…
      </div>
    );
  }

  if (status === "error" && errorMsg) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
        <XCircle className="size-4 shrink-0" />
        <span>{errorMsg}</span>
      </div>
    );
  }

  return null;
}
