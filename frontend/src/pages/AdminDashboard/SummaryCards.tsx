import { Users, Building2, Briefcase, Award } from "lucide-react";

interface SummaryCardsProps {
  totalCount: number;
  departmentsCount: number;
  regularCount: number;
  contractCount: number;
  inchargeCount: number;
}

export function SummaryCards({
  totalCount,
  departmentsCount,
  regularCount,
  contractCount,
  inchargeCount,
}: SummaryCardsProps) {
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="surface-panel p-5">
        <div className="flex items-center justify-between">
          <p className="label-caps">Total Faculty</p>
          <Users className="size-4 text-primary" />
        </div>
        <p className="mt-2 font-mono text-3xl font-bold text-foreground">{totalCount}</p>
        <p className="mt-1 text-xs text-muted-foreground">Active registered members</p>
      </div>

      <div className="surface-panel p-5">
        <div className="flex items-center justify-between">
          <p className="label-caps">Departments</p>
          <Building2 className="size-4 text-accent" />
        </div>
        <p className="mt-2 font-mono text-3xl font-bold text-accent">{departmentsCount}</p>
        <p className="mt-1 text-xs text-muted-foreground">Academic departments</p>
      </div>

      <div className="surface-panel p-5">
        <div className="flex items-center justify-between">
          <p className="label-caps">Cadre Ratio</p>
          <Briefcase className="size-4 text-secondary-foreground" />
        </div>
        <p className="mt-2 font-mono text-2xl font-bold text-foreground">
          {regularCount} <span className="text-xs font-normal text-muted-foreground">Reg</span> · {contractCount}{" "}
          <span className="text-xs font-normal text-muted-foreground">Cont</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Regular vs Contract faculty</p>
      </div>

      <div className="surface-panel p-5">
        <div className="flex items-center justify-between">
          <p className="label-caps">Incharge Roles</p>
          <Award className="size-4 text-amber-500" />
        </div>
        <p className="mt-2 font-mono text-3xl font-bold text-amber-500">{inchargeCount}</p>
        <p className="mt-1 text-xs text-muted-foreground">HODs, Principals & Leadership</p>
      </div>
    </div>
  );
}
