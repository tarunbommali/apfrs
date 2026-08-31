import { Mail, Save, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface FormState {
  resendApiKey?: string;
  resendDomain: string;
  resendTag: string;
}

interface ResendSettingsProps {
  form: FormState;
  hasSavedApiKey: boolean;
  onFieldChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function ResendSettings({
  form,
  hasSavedApiKey,
  onFieldChange,
  onSave,
  isSaving,
}: ResendSettingsProps) {
  return (
    <section className="surface-panel p-6">
      <div className="border-b border-border pb-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Mail className="size-4 text-primary" /> Resend Settings
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Direct HTTPS transactional email delivery via Resend API.
        </p>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="resend-key">Resend API key</Label>
            {hasSavedApiKey && !form.resendApiKey && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                ● API Key saved (leave empty to keep)
              </span>
            )}
          </div>
          <Input
            id="resend-key"
            type="password"
            placeholder={hasSavedApiKey ? "re_••••••••••••••••" : "re_123456789..."}
            value={form.resendApiKey || ""}
            onChange={(e) => onFieldChange("resendApiKey", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="resend-domain">Verified sending domain</Label>
          <Input
            id="resend-domain"
            placeholder="notify.jntugvcev.edu.in"
            value={form.resendDomain}
            onChange={(e) => onFieldChange("resendDomain", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="resend-tag">Email tag</Label>
          <Input
            id="resend-tag"
            placeholder="apfrs-monthly"
            value={form.resendTag}
            onChange={(e) => onFieldChange("resendTag", e.target.value)}
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end border-t border-border/60 pt-4">
        <Button onClick={onSave} disabled={isSaving} size="sm" className="gap-1.5">
          {isSaving ? (
            <>
              <Loader2 className="size-3.5 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Save className="size-3.5" /> Save Resend Settings
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
