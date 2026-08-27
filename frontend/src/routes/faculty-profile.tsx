import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  Calendar,
  ShieldCheck,
  Briefcase,
  KeyRound,
  Lock,
  CheckCircle2,
  Eye,
  EyeOff,
  UserRound,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { facultyProfileQuery } from "@/lib/queries";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/faculty-profile")({
  head: () => ({
    meta: [
      { title: "My Profile — e-Office Jntugv" },
      {
        name: "description",
        content: "View your faculty identity details, designation, posting, and account security settings.",
      },
    ],
  }),
  component: FacultyProfile,
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

function formatDateOfJoin(dateVal?: string | null) {
  if (!dateVal) return "01 Aug 2024";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "01 Aug 2024";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "01 Aug 2024";
  }
}

function FacultyProfile() {
  const { data: profileData, isLoading, error: profileError } = useQuery(facultyProfileQuery());

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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

  const me = profileData?.profile as {
    name?: string;
    email?: string;
    cfmsId?: string;
    cfms_id?: string;
    designation?: string;
    department?: string;
    mobile?: string;
    gender?: string;
    incharge?: string;
    jobStatus?: string;
    job_status?: string;
    createdAt?: string;
    created_at?: string;
    dateOfJoining?: string;
    date_of_joining?: string;
  } | undefined;

  if (!me) {
    return (
      <AppShell roles={["faculty", "admin"]} title="My Profile">
        <p className="text-muted-foreground">Profile not found.</p>
      </AppShell>
    );
  }

  const genderLabel = me.gender
    ? me.gender.charAt(0).toUpperCase() + me.gender.slice(1).toLowerCase()
    : "Male";

  const rawIncharge = (me.incharge || "").trim();
  const hasIncharge = rawIncharge !== "" && rawIncharge !== "None" && rawIncharge.toLowerCase() !== "none";
  const inchargeRole = hasIncharge ? rawIncharge : null;

  const dateOfJoinStr = formatDateOfJoin(me.dateOfJoining || me.date_of_joining || me.createdAt || me.created_at);
  const jobStatusStr = me.jobStatus || me.job_status || "Regular";

  // Left card: Identity Details (Personal & Identity specifics only)
  const identityDetailsList: [string, string][] = [
    ["CFMS ID", me.cfmsId || me.cfms_id || "N/A"],
    ["Email", me.email || "N/A"],
    ["Mobile", me.mobile || "N/A"],
    ["Gender", genderLabel],
    ["Date of Joining", dateOfJoinStr],
  ];

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error("Please enter your current password.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      await apiFetch("/api/faculty/change-password", {
        method: "POST",
        body: { currentPassword, newPassword },
      });
      toast.success("Password changed successfully.");
      setPasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <AppShell
      roles={["faculty", "admin"]}
      title="My Profile"
      subtitle={`${me.department || "General"} Department`}
      actions={
        <Button variant="outline" size="sm" onClick={() => setPasswordOpen(true)}>
          <KeyRound className="size-3.5 mr-1" /> Change Password
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* ── Left Card: Identity Details ── */}
        <section className="surface-panel p-6">
          <div className="flex items-center gap-4 border-b border-border/60 pb-5">
            <div className="size-14 shrink-0 overflow-hidden rounded-full border-2 border-primary/20 bg-muted flex items-center justify-center font-mono text-lg font-semibold text-foreground shadow-sm">
              {(me as any).photoURL || (me as any).photo_url ? (
                <img
                  src={(me as any).photoURL || (me as any).photo_url}
                  alt={me.name || "Faculty avatar"}
                  className="size-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <span>{me.name ? me.name.slice(0, 1) : "F"}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">{me.name}</h2>
                {hasIncharge && inchargeRole ? (
                  <span className="rounded-sm bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                    {inchargeRole}
                  </span>
                ) : null}
              </div>
              <p className="text-xs font-medium text-muted-foreground">{me.designation}</p>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Identity Details</h3>
            <dl className="mt-3 space-y-3 text-sm">
              {identityDetailsList.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-border/40 pb-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-mono text-xs font-semibold text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── Right Section: Stat Cards & Overview ── */}
        <div className="space-y-6">
          {/* Top Stat Boxes: Post / Cadre, Designation, Department, Incharge (if assigned) */}
          <div className={`grid gap-4 sm:grid-cols-2 ${hasIncharge ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
            <StatCard
              label="Post / Cadre"
              value={jobStatusStr === "Regular" ? "Regular" : "Contract"}
              icon={Briefcase}
            />
            <StatCard
              label="Designation"
              value={me.designation || "Assistant Professor"}
              icon={UserRound}
            />
            <StatCard
              label="Department"
              value={me.department || "General"}
              icon={Building2}
            />
            {hasIncharge && inchargeRole ? (
              <StatCard
                label="Incharge"
                value={inchargeRole}
                icon={ShieldCheck}
              />
            ) : null}
          </div>

          {/* ── Overview Section ── */}
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
                  {me.designation} · {me.department} Department
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
                  onClick={() => setPasswordOpen(true)}
                >
                  <KeyRound className="size-3 mr-1" /> Change Password
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ── Change Password Modal ── */}
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Account Password</DialogTitle>
            <DialogDescription>
              Enter your current password and set a new password of at least 6 characters.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="current-pw">Current Password</Label>
              <div className="relative">
                <Input
                  id="current-pw"
                  type={showCurrentPw ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  aria-label={showCurrentPw ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                >
                  {showCurrentPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-pw">New Password</Label>
              <div className="relative">
                <Input
                  id="new-pw"
                  type={showNewPw ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  aria-label={showNewPw ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                >
                  {showNewPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-pw">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirm-pw"
                  type={showConfirmPw ? "text" : "password"}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  aria-label={showConfirmPw ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                >
                  {showConfirmPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setPasswordOpen(false)} disabled={isChangingPassword}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={isChangingPassword}>
              {isChangingPassword ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
