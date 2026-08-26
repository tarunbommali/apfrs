import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CalendarCheck, Percent, UserRound, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { facultyProfileQuery, facultyDepartmentQuery } from "@/lib/queries";

export const Route = createFileRoute("/faculty-profile")({
  head: () => ({
    meta: [
      { title: "My Faculty Profile — APFRS" },
      {
        name: "description",
        content: "View your own attendance record, department colleagues and monthly report history.",
      },
    ],
  }),
  component: () => (
    <Suspense fallback={<ProfileSkeleton />}>
      <FacultyProfile />
    </Suspense>
  ),
});

function ProfileSkeleton() {
  return (
    <AppShell roles={["faculty", "admin"]} title="My Profile" subtitle="Loading…">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="surface-panel h-64 animate-pulse" />
        <div className="space-y-4">
          <div className="surface-panel h-28 animate-pulse" />
          <div className="surface-panel h-48 animate-pulse" />
        </div>
      </div>
    </AppShell>
  );
}

function FacultyProfile() {
  const { data: profileData, error: profileError } = useSuspenseQuery(facultyProfileQuery());
  const { data: deptData } = useSuspenseQuery(facultyDepartmentQuery());

  if (profileError) {
    return (
      <AppShell roles={["faculty", "admin"]} title="My Profile">
        <div className="surface-panel flex flex-col items-center gap-3 p-10 text-center">
          <AlertCircle className="size-8 text-destructive" />
          <p className="font-semibold text-destructive">Failed to load profile</p>
          <p className="text-sm text-muted-foreground">{String(profileError)}</p>
        </div>
      </AppShell>
    );
  }

  const me = profileData?.profile;
  const deptStats = (deptData as { stats?: { colleagues?: unknown[] } } | null)?.stats;
  const colleagues = (deptStats as { colleagues?: Array<{ id: string; name: string; designation: string; mobile: string }> })?.colleagues ?? [];

  if (!me) {
    return (
      <AppShell roles={["faculty", "admin"]} title="My Profile">
        <p className="text-muted-foreground">Profile not found.</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      roles={["faculty", "admin"]}
      title="My Profile"
      subtitle={`${me.department} department`}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="surface-panel p-6">
          <div className="flex items-center gap-4">
            <div className="ink-gradient flex size-14 items-center justify-center rounded-full font-mono text-lg font-semibold text-sidebar-accent-foreground">
              {me.name.slice(0, 1)}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{me.name}</h2>
              <p className="text-sm text-muted-foreground">{me.designation}</p>
            </div>
          </div>
          <dl className="mt-6 space-y-3 text-sm">
            {(
              [
                ["CFMS ID", me.cfmsId],
                ["Email", me.email],
                ["Mobile", me.mobile],
                ["Department", me.department],
                ["Job status", me.jobStatus],
              ] as [string, string][]
            ).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-border/60 pb-2">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-mono text-xs">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Department" value={me.department} hint="Your unit" icon={UserRound} />
            <StatCard label="Designation" value={me.designation} hint="Your role" icon={Percent} />
            <StatCard
              label="Colleagues"
              value={colleagues.length}
              hint={me.department}
              icon={CalendarCheck}
            />
          </div>

          <section className="surface-panel overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold">Department colleagues</h2>
            </div>
            {colleagues.length > 0 ? (
              <ul className="divide-y divide-border">
                {colleagues.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.designation}</p>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">{c.mobile}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                No colleagues found in the same department.
              </p>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
