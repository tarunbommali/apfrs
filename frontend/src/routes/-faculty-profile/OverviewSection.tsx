import { CheckCircle2, Briefcase, Lock, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OverviewSectionProps {
  designation?: string;
  department?: string;
  jobStatus?: string;
  job_status?: string;
  onPasswordClick: () => void;
}

export function OverviewSection({
  designation,
  department,
  jobStatus,
  job_status,
  onPasswordClick,
}: OverviewSectionProps) {
  const jobStatusStr = jobStatus || job_status || "Regular";

  return (
    <section className="surface-panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold text-foreground">Overview</h2>
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <CheckCircle2 className="size-3" /> Active Account
        </span>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2">
        {/* Cadre & Department Summary */}
        <div className="rounded-lg border border-border/70 bg-card p-4">
          <div className="flex items-center gap-2">
            <Briefcase className="size-4 text-accent" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cadre & Service</p>
          </div>
          <p className="mt-2 text-base font-bold text-foreground">
            {jobStatusStr === "Regular" ? "Regular Cadre" : "Contract Faculty"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {designation} · {department} Department
          </p>
        </div>

        {/* Account Security */}
        <div className="rounded-lg border border-border/70 bg-card p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Lock className="size-4 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account Security</p>
            </div>
            <p className="mt-2 text-sm font-bold text-foreground">Password & Access</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Manage your institutional credentials</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 h-7 text-xs self-start"
            onClick={onPasswordClick}
          >
            <KeyRound className="size-3 mr-1" /> Change Password
          </Button>
        </div>
      </div>
    </section>
  );
}
