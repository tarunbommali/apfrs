import { Zap } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProviderSectionProps {
  activeProvider: "smtp" | "resend";
  onActiveProviderChange: (value: "smtp" | "resend") => void;
  fallbackEnabled: boolean;
  onFallbackEnabledChange: (value: boolean) => void;
  isSmtpConfigured: boolean;
  isResendConfigured: boolean;
}

export function ProviderSection({
  activeProvider,
  onActiveProviderChange,
  fallbackEnabled,
  onFallbackEnabledChange,
  isSmtpConfigured,
  isResendConfigured,
}: ProviderSectionProps) {
  return (
    <section className="surface-panel p-6">
      <div className="border-b border-border pb-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Zap className="size-4 text-amber-500" /> Email Provider
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Select primary dispatch provider and automated fallback policy.
        </p>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Primary provider</Label>
          <Select
            value={activeProvider}
            onValueChange={(v: "smtp" | "resend") => onActiveProviderChange(v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="smtp">SMTP</SelectItem>
              <SelectItem value="resend">Resend</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Automatic fallback</Label>
          <Select
            value={fallbackEnabled ? "on" : "off"}
            onValueChange={(v) => onFallbackEnabledChange(v === "on")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="on">ON</SelectItem>
              <SelectItem value="off">OFF</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Provider Status */}
      <div className="mt-5 rounded-lg border border-border bg-card p-4">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="flex items-center justify-between border-r border-border pr-4">
            <span className="font-semibold text-foreground">SMTP</span>
            <span
              className={`inline-flex items-center gap-1 font-medium ${
                isSmtpConfigured
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground"
              }`}
            >
              <span className={`size-2 rounded-full ${isSmtpConfigured ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
              {isSmtpConfigured ? "Configured ✓" : "Not configured"}
            </span>
          </div>

          <div className="flex items-center justify-between pl-2">
            <span className="font-semibold text-foreground">Resend</span>
            <span
              className={`inline-flex items-center gap-1 font-medium ${
                isResendConfigured
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground"
              }`}
            >
              <span className={`size-2 rounded-full ${isResendConfigured ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
              {isResendConfigured ? "Configured ✓" : "Not configured"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
