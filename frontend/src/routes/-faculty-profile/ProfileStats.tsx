import { Briefcase, UserRound, Building2, ShieldCheck } from "lucide-react";
import { StatCard } from "@/components/stat-card";

interface ProfileStatsProps {
  designation?: string;
  department?: string;
  jobStatus?: string;
  job_status?: string;
  inchargeRole: string | null;
}

export function ProfileStats({
  designation,
  department,
  jobStatus,
  job_status,
  inchargeRole,
}: ProfileStatsProps) {
  const jobStatusStr = jobStatus || job_status || "Regular";
  const hasIncharge = inchargeRole !== null;

  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${hasIncharge ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
      <StatCard
        label="Post / Cadre"
        value={jobStatusStr === "Regular" ? "Regular" : "Contract"}
        icon={Briefcase}
      />
      <StatCard
        label="Designation"
        value={designation || "Assistant Professor"}
        icon={UserRound}
      />
      <StatCard
        label="Department"
        value={department || "General"}
        icon={Building2}
      />
      {hasIncharge && inchargeRole && (
        <StatCard
          label="Incharge"
          value={inchargeRole}
          icon={ShieldCheck}
        />
      )}
    </div>
  );
}
