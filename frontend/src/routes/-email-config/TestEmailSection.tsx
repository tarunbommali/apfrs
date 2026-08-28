import { Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TestResult {
  success: boolean;
  provider?: string;
  messageId?: string;
  durationMs?: number;
  error?: string;
  timestamp?: string;
}

interface TestEmailSectionProps {
  testEmail: string;
  onTestEmailChange: (value: string) => void;
  testProvider: string;
  onTestProviderChange: (value: string) => void;
  testResult: TestResult | null;
  onSendTest: (e: React.FormEvent) => void;
  isPending: boolean;
}

export function TestEmailSection({
  testEmail,
  onTestEmailChange,
  testProvider,
  onTestProviderChange,
  testResult,
  onSendTest,
  isPending,
}: TestEmailSectionProps) {
  return (
    <section className="surface-panel p-6">
      <div className="border-b border-border pb-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Send className="size-4 text-primary" /> Send Test Email
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Send a test email to check the current email settings.
        </p>
      </div>

      <form onSubmit={onSendTest} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1.5fr_1fr_auto] items-end">
          <div className="space-y-1.5">
            <Label htmlFor="test-email">Recipient email</Label>
            <Input
              id="test-email"
              type="email"
              required
              placeholder="admin@apfrs.in"
              value={testEmail}
              onChange={(e) => onTestEmailChange(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="test-provider">Test using</Label>
            <Select value={testProvider} onValueChange={onTestProviderChange}>
              <SelectTrigger id="test-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Current delivery settings</SelectItem>
                <SelectItem value="smtp">SMTP only</SelectItem>
                <SelectItem value="resend">Resend only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={isPending} className="gap-1.5">
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Sending…
              </>
            ) : (
              <>
                <Send className="size-3.5" /> Send Test Email
              </>
            )}
          </Button>
        </div>

        {/* Test Result */}
        {testResult && (
          <div
            className={`rounded-lg border p-4 text-xs ${
              testResult.success
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                : "border-destructive/30 bg-destructive/10 text-destructive dark:text-destructive"
            }`}
          >
            {testResult.success ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Test email sent successfully</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 text-[11px] font-mono">
                  <div>
                    <span className="text-muted-foreground block font-sans">Provider:</span>
                    <span className="font-semibold">{testResult.provider}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-sans">Message ID:</span>
                    <span className="truncate block">{testResult.messageId}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-sans">Time:</span>
                    <span>{testResult.timestamp}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="size-4 text-destructive" />
                  <span>Test email failed</span>
                </div>
                <p className="pt-1 text-[11px] font-mono leading-relaxed">
                  Reason: {testResult.error}
                </p>
              </div>
            )}
          </div>
        )}
      </form>
    </section>
  );
}
