import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search, Loader2, AlertCircle, Trash2 } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { facultyListQuery, useDeleteFaculty } from "@/lib/queries";
import { attendancePct } from "@/lib/apfrs-data";
import { toast } from "sonner";

export const Route = createFileRoute("/admin-dashboard")({
  head: () => ({
    meta: [
      { title: "Faculty Registry — APFRS Admin" },
      {
        name: "description",
        content: "Search, filter and manage faculty records including CFMS ID, department and job status.",
      },
    ],
  }),
  component: () => (
    <Suspense fallback={<RegistrySkeleton />}>
      <AdminDashboard />
    </Suspense>
  ),
});

function RegistrySkeleton() {
  return (
    <AppShell title="Faculty Registry" subtitle="Loading…">
      <div className="surface-panel h-16 animate-pulse" />
      <div className="surface-panel mt-6 h-64 animate-pulse" />
    </AppShell>
  );
}

function AdminDashboard() {
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");

  const { data, error, refetch } = useSuspenseQuery(
    facultyListQuery({ search: q || undefined, department: dept, limit: 100 }),
  );
  const deleteFaculty = useDeleteFaculty();

  const facultyList = data?.faculty ?? [];

  // Build department list from what's returned
  const departments = Array.from(new Set(facultyList.map((f) => f.department))).sort();

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Remove ${name} from the registry?`)) return;
    try {
      await deleteFaculty.mutateAsync(id);
      toast.success(`${name} removed from registry`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  if (error) {
    return (
      <AppShell title="Faculty Registry">
        <div className="surface-panel flex flex-col items-center gap-3 p-10 text-center">
          <AlertCircle className="size-8 text-destructive" />
          <p className="font-semibold text-destructive">Failed to load faculty</p>
          <p className="text-sm text-muted-foreground">{String(error)}</p>
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Faculty Registry"
      subtitle="Master records used for attendance matching and report delivery"
      actions={
        <Button asChild>
          <Link to="/faculty/new">
            <Plus className="size-4" /> Add faculty
          </Link>
        </Button>
      }
    >
      <div className="surface-panel flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email or CFMS ID"
            className="pl-9"
          />
        </div>
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{facultyList.length} records</span>
      </div>

      <div className="surface-panel mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["CFMS ID", "Name", "Email", "Department", "Designation", "Mobile", "Status", "Attend %", ""].map(
                  (h) => (
                    <th key={h} className="label-caps px-5 py-3">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {facultyList.map((f) => (
                <tr key={f.id} className="border-b border-border/60 last:border-0 hover:bg-muted/50">
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{f.cfmsId}</td>
                  <td className="px-5 py-3 font-medium">{f.name}</td>
                  <td className="px-5 py-3 font-mono text-xs">{f.email}</td>
                  <td className="px-5 py-3">{f.department}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{f.designation}</td>
                  <td className="px-5 py-3 font-mono text-xs">{f.mobile}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {f.jobStatus}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs">
                    {f.workingDays > 0 ? `${attendancePct(f)}%` : "—"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" asChild>
                        <Link to="/faculty/$id/edit" params={{ id: f.id }}>
                          Edit
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(f.id, f.name)}
                        disabled={deleteFaculty.isPending}
                        aria-label={`Delete ${f.name}`}
                      >
                        {deleteFaculty.isPending ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5 text-destructive" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {facultyList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    No faculty match that filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
