import { Clock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FormState {
  retries: number;
  batchDelay: number;
  sandboxMode: boolean;
}

interface SendingSettingsProps {
  form: FormState;
  onFieldChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}

export function SendingSettings({ form, onFieldChange }: SendingSettingsProps) {
  return (
    <section className="surface-panel p-6">
      <div className="border-b border-border pb-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Clock className="size-4 text-primary" /> Sending Settings
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Rate limits, automatic retry policies, and sandbox simulation mode.
        </p>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="retries">Retry attempts</Label>
          <Input
            id="retries"
            type="number"
            min={0}
            max={10}
            placeholder="3"
            value={form.retries}
            onChange={(e) => onFieldChange("retries", parseInt(e.target.value, 10) || 0)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="batch-delay">Delay between emails (ms)</Label>
          <Input
            id="batch-delay"
            type="number"
            min={0}
            max={10000}
            placeholder="200"
            value={form.batchDelay}
            onChange={(e) => onFieldChange("batchDelay", parseInt(e.target.value, 10) || 0)}
          />
        </div>

        <div className="space-y-2">
          <Label>Test mode (Sandbox)</Label>
          <Select
            value={form.sandboxMode ? "on" : "off"}
            onValueChange={(v) => onFieldChange("sandboxMode", v === "on")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">OFF (Live delivery)</SelectItem>
              <SelectItem value="on">ON (Simulate delivery)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
}
