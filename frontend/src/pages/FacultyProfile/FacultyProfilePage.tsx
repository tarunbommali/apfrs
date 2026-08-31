// frontend/src/routes/faculty-profile.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { facultyProfileQuery } from "@/lib/queries";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

// Import split components
import { ProfileSkeleton } from "./ProfileSkeleton";
import { IdentityDetails } from "./IdentityDetails";
import { ShareableProfileCard } from "./ShareableProfileCard";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { ErrorState } from "./ErrorState";

interface ProfileData {
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
  photoURL?: string;
  photo_url?: string;
}

function getInchargeRole(incharge?: string): string | null {
  const raw = (incharge || "").trim();
  if (raw !== "" && raw !== "None" && raw.toLowerCase() !== "none") {
    return raw;
  }
  return null;
}

function FacultyProfile() {
  const { data: profileData, isLoading, error } = useQuery(facultyProfileQuery());

  // ── Password Change State ──
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // ── Loading State ──
  if (isLoading) {
    return <ProfileSkeleton />;
  }

  // ── Error State ──
  if (error) {
    return <ErrorState error={error as Error} />;
  }

  const me = profileData?.profile as ProfileData | undefined;

  if (!me) {
    return (
      <AppShell roles={["faculty", "admin"]} title="My Profile">
        <p className="text-muted-foreground">Profile not found.</p>
      </AppShell>
    );
  }

  // ── Password Change Handler ──
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
    } catch (err: any) {
      toast.error(err?.message || "Failed to change password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ── Render ──
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
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] items-start">
        {/* ── Left: Identity & Service Details (with Cadre, Designation, Dept, Incharge under Date of Joining) ── */}
        <IdentityDetails profile={me} />

        {/* ── Right: Shareable LinkedIn Profile Card (4:5 Portrait / 1080x1350) ── */}
        <ShareableProfileCard profile={me} />
      </div>

      {/* ── Change Password Dialog ── */}
      <ChangePasswordDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        onSubmit={handleChangePassword}
        isPending={isChangingPassword}
        currentPassword={currentPassword}
        onCurrentPasswordChange={setCurrentPassword}
        newPassword={newPassword}
        onNewPasswordChange={setNewPassword}
        confirmPassword={confirmPassword}
        onConfirmPasswordChange={setConfirmPassword}
        showCurrentPw={showCurrentPw}
        onShowCurrentPwChange={setShowCurrentPw}
        showNewPw={showNewPw}
        onShowNewPwChange={setShowNewPw}
        showConfirmPw={showConfirmPw}
        onShowConfirmPwChange={setShowConfirmPw}
      />
    </AppShell>
  );
}

export default FacultyProfile;
