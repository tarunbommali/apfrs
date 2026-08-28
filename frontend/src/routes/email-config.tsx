import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Mail,
  Send,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  Loader2,
  Server,
  Zap,
  Info,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  emailConfigQuery,
  useUpdateEmailConfig,
  useSendTestEmail,
  type EmailConfigSettings,
  type EmailConfigLog,
} from "@/lib/queries";
import { toast } from "sonner";

export const Route = createFileRoute("/email-config")({
  head: () => ({
    meta: [
      { title: "Email Configuration — e-Office Jntugv" },
      {
        name: "description",
        content: "Configure how APFRS sends attendance emails.",
      },
    ],
  }),
  component: EmailConfigPage,
});

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
  resendApiKey?: string;
  resendDomain: string;
  resendTag: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  subjectTemplate: string;
  signature: string;
  retries: number;
  batchDelay: number;
  sandboxMode: boolean;
}

function EmailConfigPage() {
  const { data, isLoading, refetch, isFetching } = useQuery(emailConfigQuery());
  const updateConfig = useUpdateEmailConfig();
  const sendTest = useSendTestEmail();

  const settings = data?.settings;
  const logs = (data?.logs || []) as EmailConfigLog[];

  // ── Form State ──
  const [form, setForm] = useState<FormState>({
    activeProvider: "smtp",
    fallbackEnabled: true,
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpEncryption: "tls",
    smtpUsername: "reports@jntugvcev.edu.in",
    smtpPassword: "",
    smtpTimeout: 30,
    smtpPoolSize: 5,
    resendApiKey: "",
    resendDomain: "notify.jntugvcev.edu.in",
    resendTag: "apfrs-monthly",
    fromName: "APFRS Reporting Cell",
    fromEmail: "reports@jntugvcev.edu.in",
    replyTo: "admin@apfrs.in",
    subjectTemplate: "Monthly Attendance Statement — {{month}} {{year}}",
    signature: "",
    retries: 3,
    batchDelay: 200,
    sandboxMode: false,
  });

  // Populate form state when server settings are loaded / reloaded
  useEffect(() => {
    if (settings) {
      setForm({
        activeProvider: settings.active_provider === "resend" ? "resend" : "smtp",
        fallbackEnabled: settings.fallback_enabled !== false && settings.fallback_enabled !== 0,
        smtpHost: settings.smtp_host || "",
        smtpPort: settings.smtp_port || 587,
        smtpEncryption: (settings.smtp_encryption as any) || "tls",
        smtpUsername: settings.smtp_username || "",
        smtpPassword: "",
        smtpTimeout: settings.smtp_timeout || 30,
        smtpPoolSize: settings.smtp_pool_size || 5,
        resendApiKey: "",
        resendDomain: settings.resend_domain || "",
        resendTag: settings.resend_tag || "apfrs-monthly",
        fromName: settings.from_name || "",
        fromEmail: settings.from_email || "",
        replyTo: settings.reply_to || "",
        subjectTemplate: settings.subject_template || "Monthly Attendance Statement — {{month}} {{year}}",
        signature: settings.signature || "",
        retries: settings.retries ?? 3,
        batchDelay: settings.batch_delay ?? 200,
        sandboxMode: Boolean(settings.sandbox_mode),
      });
    }
  }, [settings]);

  // ── Unsaved Changes Tracker ──
  const isDirty = useMemo(() => {
    if (!settings) return false;
    if (form.smtpPassword && form.smtpPassword.trim() !== "") return true;
    if (form.resendApiKey && form.resendApiKey.trim() !== "") return true;

    const serverActive = settings.active_provider === "resend" ? "resend" : "smtp";
    const serverFallback = settings.fallback_enabled !== false && settings.fallback_enabled !== 0;

    return (
      form.activeProvider !== serverActive ||
      form.fallbackEnabled !== serverFallback ||
      form.smtpHost !== (settings.smtp_host || "") ||
      form.smtpPort !== (settings.smtp_port || 587) ||
      form.smtpEncryption !== (settings.smtp_encryption || "tls") ||
      form.smtpUsername !== (settings.smtp_username || "") ||
      form.smtpTimeout !== (settings.smtp_timeout || 30) ||
      form.smtpPoolSize !== (settings.smtp_pool_size || 5) ||
      form.resendDomain !== (settings.resend_domain || "") ||
      form.resendTag !== (settings.resend_tag || "apfrs-monthly") ||
      form.fromName !== (settings.from_name || "") ||
      form.fromEmail !== (settings.from_email || "") ||
      form.replyTo !== (settings.reply_to || "") ||
      form.subjectTemplate !== (settings.subject_template || "") ||
      form.signature !== (settings.signature || "") ||
      form.retries !== (settings.retries ?? 3) ||
      form.batchDelay !== (settings.batch_delay ?? 200) ||
      form.sandboxMode !== Boolean(settings.sandbox_mode)
    );
  }, [form, settings]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // ── Provider Configured Status ──
  const isSmtpConfigured = Boolean(
    form.smtpHost &&
      form.smtpUsername &&
      (form.smtpPassword?.trim() || settings?.hasSmtpPassword)
  );

  const isResendConfigured = Boolean(
    form.resendApiKey?.trim() || settings?.hasResendApiKey
  );

  // ── Test Email State ──
  const [testEmail, setTestEmail] = useState("admin@apfrs.in");
  const [testProvider, setTestProvider] = useState<string>("all");
  const [testResult, setTestResult] = useState<{
    success: boolean;
    provider?: string;
    messageId?: string;
    durationMs?: number;
    error?: string;
    timestamp?: string;
  } | null>(null);

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail || !testEmail.includes("@")) {
      toast.error("Please enter a valid recipient email address.");
      return;
    }

    setTestResult(null);

    // Build temporary unsaved configuration so test immediately uses visible form inputs
    const tempConfig: Record<string, any> = {
      activeProvider: form.activeProvider,
      fallbackEnabled: form.fallbackEnabled,
      smtpHost: form.smtpHost,
      smtpPort: form.smtpPort,
      smtpEncryption: form.smtpEncryption,
      smtpUsername: form.smtpUsername,
      smtpTimeout: form.smtpTimeout,
      smtpPoolSize: form.smtpPoolSize,
      resendDomain: form.resendDomain,
      resendTag: form.resendTag,
      fromName: form.fromName,
      fromEmail: form.fromEmail,
      replyTo: form.replyTo,
      signature: form.signature,
    };

    if (form.smtpPassword && form.smtpPassword.trim() !== "") {
      tempConfig.smtpPassword = form.smtpPassword.trim();
    }
    if (form.resendApiKey && form.resendApiKey.trim() !== "") {
      tempConfig.resendApiKey = form.resendApiKey.trim();
    }

    try {
      const res = await sendTest.mutateAsync({
        recipientEmail: testEmail.trim(),
        providerOverride: testProvider === "all" ? undefined : testProvider,
        tempConfig,
      });

      if (res.result?.success) {
        setTestResult({
          success: true,
          provider: res.result.providerUsed?.toUpperCase() || form.activeProvider.toUpperCase(),
          messageId: res.result.messageId,
          durationMs: res.result.durationMs,
          timestamp: new Date().toLocaleTimeString("en-IN"),
        });
        toast.success(`Test email sent successfully to ${testEmail}.`);
      } else {
        setTestResult({
          success: false,
          error: res.error || res.message || "Test email delivery failed.",
          timestamp: new Date().toLocaleTimeString("en-IN"),
        });
        toast.error(res.error || res.message || "Test email delivery failed.");
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err?.message || "Test email delivery failed.",
        timestamp: new Date().toLocaleTimeString("en-IN"),
      });
      toast.error(err?.message || "Test email delivery failed.");
    }
  };

  // ── Save Configuration ──
  const handleSave = async () => {
    // Basic validation
    if (!form.fromEmail || !form.fromEmail.includes("@")) {
      toast.error("Valid sender From Email is required.");
      return;
    }
    if (!form.fromName.trim()) {
      toast.error("Sender From Name is required.");
      return;
    }

    if (form.activeProvider === "smtp" || form.fallbackEnabled) {
      if (!form.smtpHost.trim()) {
        toast.error("SMTP host is required.");
        return;
      }
      if (!form.smtpUsername.trim()) {
        toast.error("SMTP username is required.");
        return;
      }
      if (!settings?.hasSmtpPassword && !form.smtpPassword?.trim()) {
        toast.error("SMTP app password is required.");
        return;
      }
    }

    if (form.activeProvider === "resend" || form.fallbackEnabled) {
      if (!settings?.hasResendApiKey && !form.resendApiKey?.trim()) {
        toast.error("Resend API key is required.");
        return;
      }
    }

    const payload: Record<string, any> = {
      activeProvider: form.activeProvider,
      fallbackEnabled: form.fallbackEnabled,
      smtpHost: form.smtpHost.trim(),
      smtpPort: form.smtpPort,
      smtpEncryption: form.smtpEncryption,
      smtpUsername: form.smtpUsername.trim(),
      smtpTimeout: form.smtpTimeout,
      smtpPoolSize: form.smtpPoolSize,
      resendDomain: form.resendDomain.trim(),
      resendTag: form.resendTag.trim(),
      fromName: form.fromName.trim(),
      fromEmail: form.fromEmail.trim(),
      replyTo: form.replyTo.trim(),
      subjectTemplate: form.subjectTemplate.trim(),
      signature: form.signature,
      retries: form.retries,
      batchDelay: form.batchDelay,
      sandboxMode: form.sandboxMode,
    };

    if (form.smtpPassword && form.smtpPassword.trim() !== "") {
      payload.smtpPassword = form.smtpPassword.trim();
    }
    if (form.resendApiKey && form.resendApiKey.trim() !== "") {
      payload.resendApiKey = form.resendApiKey.trim();
    }

    try {
      await updateConfig.mutateAsync(payload);
      toast.success("Email configuration saved and applied.");
      // Clear password and api key input fields after successful save
      setForm((prev) => ({
        ...prev,
        smtpPassword: "",
        resendApiKey: "",
      }));
    } catch (err: any) {
      toast.error(err?.message || "Failed to save email configuration.");
    }
  };

  const handleReload = async () => {
    await refetch();
    toast.info("Configuration restored from database.");
  };

  if (isLoading) {
    return (
      <AppShell roles={["admin"]} title="Email Configuration" subtitle="Configure how APFRS sends attendance emails.">
        <div className="surface-panel p-12 text-center text-muted-foreground flex items-center justify-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin text-primary" /> Loading configuration…
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      roles={["admin"]}
      title="Email Configuration"
      subtitle="Configure how APFRS sends attendance emails."
      actions={
        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400 animate-pulse">
              Unsaved changes
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleReload}
            disabled={isFetching}
            className="gap-1.5"
          >
            <RotateCcw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} /> Reload
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateConfig.isPending}
            className="gap-1.5"
          >
            {updateConfig.isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Save className="size-3.5" /> Save Configuration
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="max-w-4xl space-y-6">
        {/* ── 1. Send Test Email ── */}
        <section className="surface-panel p-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Send className="size-4 text-primary" /> Send Test Email
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Send a test email to check the current email settings.
            </p>
          </div>

          <form onSubmit={handleSendTestEmail} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1.5fr_1fr_auto] items-end">
              <div className="space-y-1.5">
                <Label htmlFor="test-email">Recipient email</Label>
                <Input
                  id="test-email"
                  type="email"
                  required
                  placeholder="admin@apfrs.in"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="test-provider">Test using</Label>
                <Select value={testProvider} onValueChange={setTestProvider}>
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

              <Button type="submit" disabled={sendTest.isPending} className="gap-1.5">
                {sendTest.isPending ? (
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

            {/* Test Email Result Output */}
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

        {/* ── 2. Email Provider ── */}
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
                value={form.activeProvider}
                onValueChange={(v: "smtp" | "resend") => updateField("activeProvider", v)}
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
                value={form.fallbackEnabled ? "on" : "off"}
                onValueChange={(v) => updateField("fallbackEnabled", v === "on")}
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

          {/* Provider Status Display */}
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

        {/* ── 3. SMTP Settings ── */}
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
                onChange={(e) => updateField("smtpHost", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp-port">SMTP port</Label>
              <Input
                id="smtp-port"
                type="number"
                placeholder="587"
                value={form.smtpPort}
                onChange={(e) => updateField("smtpPort", parseInt(e.target.value, 10) || 587)}
              />
            </div>

            <div className="space-y-2">
              <Label>Encryption</Label>
              <Select
                value={form.smtpEncryption}
                onValueChange={(v: "none" | "tls" | "ssl") => updateField("smtpEncryption", v)}
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
                onChange={(e) => updateField("smtpUsername", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="smtp-pass">SMTP app password</Label>
                {settings?.hasSmtpPassword && !form.smtpPassword && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    ● Password saved (leave empty to keep)
                  </span>
                )}
              </div>
              <Input
                id="smtp-pass"
                type="password"
                placeholder={settings?.hasSmtpPassword ? "••••••••••••" : "Enter SMTP app password"}
                value={form.smtpPassword || ""}
                onChange={(e) => updateField("smtpPassword", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp-timeout">Connection timeout (seconds)</Label>
              <Input
                id="smtp-timeout"
                type="number"
                placeholder="30"
                value={form.smtpTimeout}
                onChange={(e) => updateField("smtpTimeout", parseInt(e.target.value, 10) || 30)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp-pool">Connections (pool size)</Label>
              <Input
                id="smtp-pool"
                type="number"
                placeholder="5"
                value={form.smtpPoolSize}
                onChange={(e) => updateField("smtpPoolSize", parseInt(e.target.value, 10) || 5)}
              />
            </div>
          </div>
        </section>

        {/* ── 4. Resend Settings ── */}
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
                {settings?.hasResendApiKey && !form.resendApiKey && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    ● API Key saved (leave empty to keep)
                  </span>
                )}
              </div>
              <Input
                id="resend-key"
                type="password"
                placeholder={settings?.hasResendApiKey ? "re_••••••••••••••••" : "re_123456789..."}
                value={form.resendApiKey || ""}
                onChange={(e) => updateField("resendApiKey", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resend-domain">Verified sending domain</Label>
              <Input
                id="resend-domain"
                placeholder="notify.jntugvcev.edu.in"
                value={form.resendDomain}
                onChange={(e) => updateField("resendDomain", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resend-tag">Email tag</Label>
              <Input
                id="resend-tag"
                placeholder="apfrs-monthly"
                value={form.resendTag}
                onChange={(e) => updateField("resendTag", e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* ── 5. Sender Settings ── */}
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
                onChange={(e) => updateField("fromName", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="from-email">From email</Label>
              <Input
                id="from-email"
                type="email"
                placeholder="reports@jntugvcev.edu.in"
                value={form.fromEmail}
                onChange={(e) => updateField("fromEmail", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reply-to">Reply-to email</Label>
              <Input
                id="reply-to"
                type="email"
                placeholder="admin@apfrs.in"
                value={form.replyTo}
                onChange={(e) => updateField("replyTo", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject-template">Subject template</Label>
              <Input
                id="subject-template"
                placeholder="Monthly Attendance Statement — {{month}} {{year}}"
                value={form.subjectTemplate}
                onChange={(e) => updateField("subjectTemplate", e.target.value)}
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
                onChange={(e) => updateField("signature", e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Plain text appended to the bottom of all dispatched attendance statements.
              </p>
            </div>
          </div>
        </section>

        {/* ── 6. Sending Settings ── */}
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
                onChange={(e) => updateField("retries", parseInt(e.target.value, 10) || 0)}
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
                onChange={(e) => updateField("batchDelay", parseInt(e.target.value, 10) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label>Test mode (Sandbox)</Label>
              <Select
                value={form.sandboxMode ? "on" : "off"}
                onValueChange={(v) => updateField("sandboxMode", v === "on")}
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

        {/* ── 7. Configuration History ── */}
        <section className="surface-panel p-6 space-y-4">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Info className="size-4 text-primary" /> Configuration History
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Audit trail of email delivery configuration updates.
            </p>
          </div>

          {logs.length > 0 ? (
            <div className="divide-y divide-border">
              {logs.map((log) => (
                <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{log.updated_by}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="font-mono text-muted-foreground">
                        {new Date(log.created_at).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="mt-0.5 text-muted-foreground font-medium">
                      {log.summary}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-2 italic">
              No configuration changes recorded yet.
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
