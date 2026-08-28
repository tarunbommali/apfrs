import { Shield } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface FormState {
  fromName: string;
  fromEmail: string;
  replyTo: string;
  subjectTemplate: string;
  signature: string;
}

interface SenderSettingsProps {
  form: FormState;
  onFieldChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}

export function SenderSettings({ form, onFieldChange }: SenderSettingsProps) {
  return (
    <section className="surface-panel p-6">
      <div className="border-b border-border pb-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Shield className="size-4 text-primary" /> Sender Settings
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Official branding, sender identity, and email subject formatting.
        </p>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="from-name">From name</Label>
          <Input
            id="from-name"
            placeholder="APFRS Reporting Cell"
            value={form.fromName}
            onChange={(e) => onFieldChange("fromName", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="from-email">From email</Label>
          <Input
            id="from-email"
            type="email"
            placeholder="reports@jntugvcev.edu.in"
            value={form.fromEmail}
            onChange={(e) => onFieldChange("fromEmail", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reply-to">Reply-to email</Label>
          <Input
            id="reply-to"
            type="email"
            placeholder="admin@apfrs.in"
            value={form.replyTo}
            onChange={(e) => onFieldChange("replyTo", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject-template">Subject template</Label>
          <Input
            id="subject-template"
            placeholder="Monthly Attendance Statement — {{month}} {{year}}"
            value={form.subjectTemplate}
            onChange={(e) => onFieldChange("subjectTemplate", e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            Supported variables: <code className="font-mono text-primary">{"{{month}}"}</code> and <code className="font-mono text-primary">{"{{year}}"}</code>.
          </p>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="signature">Email signature (optional)</Label>
          <Textarea
            id="signature"
            rows={3}
            placeholder="Regards,&#10;APFRS Reporting Cell&#10;JNTU-GV College of Engineering"
            value={form.signature}
            onChange={(e) => onFieldChange("signature", e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            Plain text appended to the bottom of all dispatched attendance statements.
          </p>
        </div>
      </div>
    </section>
  );
}
