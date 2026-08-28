import { Users, Calendar, BarChart3, CheckCircle2 } from "lucide-react";
import { StatCard } from "@/components/stat-card";

interface MetricCardsProps {
  totalFaculty: number;
  workingDays: number;
  avgAttendance: number;
  departmentsCount: number;
  totalPresent: number;
  totalAbsent: number;
  totalLeaves: number;
}

export function MetricCards({
  totalFaculty,
  workingDays,
  avgAttendance,
  departmentsCount,
  totalPresent,
  totalAbsent,
  totalLeaves,
}: MetricCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total Faculty"
        value={totalFaculty}
        hint="Enrolled in sheet"
        icon={Users}
      />
      <StatCard
        label="Official Working Days"
        value={`${workingDays} Days`}
        hint="Calendar synced"
        icon={Calendar}
      />
      <StatCard
        label="Average Attendance"
        value={`${avgAttendance}%`}
        hint={`${departmentsCount} departments`}
        icon={BarChart3}
      />
      <StatCard
        label="Cumulative Attendance"
        value={`${totalPresent} P / ${totalAbsent} A`}
        hint={`${totalLeaves} leaves recorded`}
        icon={CheckCircle2}
      />
    </div>
  );
}
