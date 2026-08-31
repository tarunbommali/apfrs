import { Server, Save, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FormState {
  activeProvider: "smtp" | "resend";
  fallbackEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpEncryption: "none" | "tls" | "ssl";
  smtpUsername: string;
  smtpPassword?: string;
  smtpTimeout: number;
  smtpPoolSize: number;
}

interface SmtpSettingsProps {
  form: FormState;
  hasSavedPassword: boolean;
  onFieldChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function SmtpSettings({
  form,
  hasSavedPassword,
  onFieldChange,
  onSave,
  isSaving,
}: SmtpSettingsProps) {
  return (
    <section className="surface-panel p-6">
      <div className="border-b border-border pb-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Server className="size-4 text-primary" /> SMTP Settings
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Standard SMTP server credentials for outbound delivery.
        </p>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="smtp-host">SMTP host</Label>
          <Input
            id="smtp-host"
            placeholder="smtp.gmail.com"
            value={form.smtpHost}
            onChange={(e) => onFieldChange("smtpHost", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="smtp-port">SMTP port</Label>
          <Input
            id="smtp-port"
            type="number"
            placeholder="587"
            value={form.smtpPort}
            onChange={(e) => onFieldChange("smtpPort", parseInt(e.target.value, 10) || 587)}
          />
        </div>

        <div className="space-y-2">
          <Label>Encryption</Label>
          <Select
            value={form.smtpEncryption}
            onValueChange={(v: "none" | "tls" | "ssl") => onFieldChange("smtpEncryption", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tls">STARTTLS (Port 587)</SelectItem>
              <SelectItem value="ssl">SSL (Port 465)</SelectItem>
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="smtp-user">SMTP username / email</Label>
          <Input
            id="smtp-user"
            placeholder="reports@jntugvcev.edu.in"
            value={form.smtpUsername}
            onChange={(e) => onFieldChange("smtpUsername", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="smtp-pass">SMTP app password</Label>
            {hasSavedPassword && !form.smtpPassword && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                ● Password saved (leave empty to keep)
              </span>
            )}
          </div>
          <Input
            id="smtp-pass"
            type="password"
            placeholder={hasSavedPassword ? "••••••••••••" : "Enter SMTP app password"}
            value={form.smtpPassword || ""}
            onChange={(e) => onFieldChange("smtpPassword", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="smtp-timeout">Connection timeout (seconds)</Label>
          <Input
            id="smtp-timeout"
            type="number"
            placeholder="30"
            value={form.smtpTimeout}
            onChange={(e) => onFieldChange("smtpTimeout", parseInt(e.target.value, 10) || 30)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="smtp-pool">Connections (pool size)</Label>
          <Input
            id="smtp-pool"
            type="number"
            placeholder="5"
            value={form.smtpPoolSize}
            onChange={(e) => onFieldChange("smtpPoolSize", parseInt(e.target.value, 10) || 5)}
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
              <Save className="size-3.5" /> Save SMTP Settings
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
