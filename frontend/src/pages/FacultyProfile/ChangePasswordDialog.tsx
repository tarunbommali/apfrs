import { Eye, EyeOff } from "lucide-react";
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

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  isPending: boolean;
  currentPassword: string;
  onCurrentPasswordChange: (value: string) => void;
  newPassword: string;
  onNewPasswordChange: (value: string) => void;
  confirmPassword: string;
  onConfirmPasswordChange: (value: string) => void;
  showCurrentPw: boolean;
  onShowCurrentPwChange: (value: boolean) => void;
  showNewPw: boolean;
  onShowNewPwChange: (value: boolean) => void;
  showConfirmPw: boolean;
  onShowConfirmPwChange: (value: boolean) => void;
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  currentPassword,
  onCurrentPasswordChange,
  newPassword,
  onNewPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  showCurrentPw,
  onShowCurrentPwChange,
  showNewPw,
  onShowNewPwChange,
  showConfirmPw,
  onShowConfirmPwChange,
}: ChangePasswordDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Account Password</DialogTitle>
          <DialogDescription>
            Enter your current password and set a new password of at least 6 characters.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="current-pw">Current Password</Label>
            <div className="relative">
              <Input
                id="current-pw"
                type={showCurrentPw ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => onCurrentPasswordChange(e.target.value)}
                placeholder="Enter current password"
                className="pr-10 text-xs"
              />
              <button
                type="button"
                onClick={() => onShowCurrentPwChange(!showCurrentPw)}
                aria-label={showCurrentPw ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
              >
                {showCurrentPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="new-pw">New Password</Label>
            <div className="relative">
              <Input
                id="new-pw"
                type={showNewPw ? "text" : "password"}
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => onNewPasswordChange(e.target.value)}
                className="pr-10 text-xs"
              />
              <button
                type="button"
                onClick={() => onShowNewPwChange(!showNewPw)}
                aria-label={showNewPw ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
              >
                {showNewPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirm-pw">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirm-pw"
                type={showConfirmPw ? "text" : "password"}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => onConfirmPasswordChange(e.target.value)}
                className="pr-10 text-xs"
              />
              <button
                type="button"
                onClick={() => onShowConfirmPwChange(!showConfirmPw)}
                aria-label={showConfirmPw ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
              >
                {showConfirmPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending ? "Updating..." : "Update Password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
