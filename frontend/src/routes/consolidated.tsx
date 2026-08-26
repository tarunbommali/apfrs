import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Send, UploadCloud, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useAttendance } from "@/lib/attendance-context";
import { useSendAttendance } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/consolidated")({
  head: () => ({
    meta: [
      { title: "Bulk Report Dispatch — APFRS" },
      {
        name: "description",
        content: "Select recipients and dispatch individual monthly attendance statements to faculty by email.",
      },
    ],
  }),
  component: Consolidated,
});

function Consolidated() {
  const { records, hasData, month, year } = useAttendance();
  const { user } = useAuth();
  const sendAttendance = useSendAttendance();

  const [selected, setSelected] = useState<string[]>([]);
  const [sent, setSent] = useState(0);
  const [dispatching, setDispatching] = useState(false);

  // Initialize all as selected when data arrives
  const allEmails = records.map((r) => r.email);
  const isAllSelected = selected.length === records.length && records.length > 0;

  const toggle = (email: string) =>
    setSelected((s) => (s.includes(email) ? s.filter((x) => x !== email) : [...s, email]));

  const progress = records.length > 0 ? Math.round((sent / records.length) * 100) : 0;

  const monthLabel = new Date(year, month - 1, 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const handleDispatch = async () => {
    if (!selected.length || dispatching) return;

    const toSend = records.filter((r) => selected.includes(r.email));
    setDispatching(true);
    setSent(0);

    try {
      await sendAttendance.mutateAsync({
        attendanceData: toSend,
        sentBy: user?.email,
      });
      setSent(toSend.length);
      toast.success(`Batch dispatched: ${toSend.length} faculty notified`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Dispatch failed. Check SMTP settings.");
    } finally {
      setDispatching(false);
    }
  };

  if (!hasData) {
    return (
      <AppShell title="Bulk Report Dispatch" subtitle="No attendance data loaded">
        <div className="surface-panel flex flex-col items-center gap-4 p-16 text-center">
          <UploadCloud className="size-12 text-muted-foreground/40" strokeWidth={1} />
          <p className="text-lg font-semibold">No data imported yet</p>
          <p className="text-sm text-muted-foreground">
            Import this month's Excel file before dispatching reports.
          </p>
          <Button asChild>
            <Link to="/import">
              <UploadCloud className="size-4" /> Import data
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Bulk Report Dispatch"
      subtitle={`Send each faculty member their individual ${monthLabel} statement`}
      actions={
        <Button
          disabled={selected.length === 0 || dispatching}
          onClick={handleDispatch}
        >
          {dispatching ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          {dispatching ? "Sending…" : `Send to ${selected.length} recipients`}
        </Button>
      }
    >
      {sent > 0 && (
        <div className="surface-panel mb-6 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="label-caps">Last batch</p>
              <p className="mt-1 font-mono text-sm">{monthLabel}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono font-semibold text-foreground">{sent}</span> of{" "}
              {records.length} delivered
            </p>
          </div>
          <Progress value={progress} className="mt-4" />
        </div>
      )}

      <div className="surface-panel overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={() =>
              setSelected(isAllSelected ? [] : allEmails)
            }
            aria-label="Select all recipients"
          />
          <span className="text-sm font-medium">Select all recipients</span>
          <span className="ml-auto text-xs text-muted-foreground">
            {selected.length} / {records.length} selected
          </span>
        </div>
        <ul className="divide-y divide-border">
          {records.map((r) => {
            const p = r.attendance.filter((d) => d.status === "P").length;
            const total = r.attendance.filter((d) => d.status !== "H").length;
            const pct = total > 0 ? Math.round((p / total) * 100) : 0;
            return (
              <li
                key={r.email || r.cfmsId || r.name}
                className="flex flex-wrap items-center gap-4 px-5 py-3 hover:bg-muted/40"
              >
                <Checkbox
                  checked={selected.includes(r.email)}
                  onCheckedChange={() => toggle(r.email)}
                  aria-label={`Select ${r.name}`}
                  disabled={dispatching}
                />
                <div className="min-w-52 flex-1">
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{r.email || "no email"}</p>
                </div>
                <span className="text-xs text-muted-foreground">{r.department}</span>
                <span className="font-mono text-sm">{pct}%</span>
              </li>
            );
          })}
        </ul>
      </div>
    </AppShell>
  );
}
