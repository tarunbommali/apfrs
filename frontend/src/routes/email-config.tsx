// frontend/src/routes/email-config.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Save, RotateCcw, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  emailConfigQuery,
  useUpdateEmailConfig,
  useSendTestEmail,
  type EmailConfigLog,
} from "@/lib/queries";
import { toast } from "sonner";

// Import split components
import { TestEmailSection } from "./-email-config/TestEmailSection";
import { ProviderSection } from "./-email-config/ProviderSection";
import { SmtpSettings } from "./-email-config/SmtpSettings";
import { ResendSettings } from "./-email-config/ResendSettings";
import { SenderSettings } from "./-email-config/SenderSettings";
import { SendingSettings } from "./-email-config/SendingSettings";
import { ConfigHistory } from "./-email-config/ConfigHistory";

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

interface TestResult {
  success: boolean;
  provider?: string;
  messageId?: string;
  durationMs?: number;
  error?: string;
  timestamp?: string;
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

  // ── Test Email State ──
  const [testEmail, setTestEmail] = useState("admin@apfrs.in");
  const [testProvider, setTestProvider] = useState<string>("all");
  const [testResult, setTestResult] = useState<TestResult | null>(null);

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

  // ── Send Test Email Handler ──
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

  // ── Save Configuration Handler ──
  const handleSave = async () => {
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
        <TestEmailSection
          testEmail={testEmail}
          onTestEmailChange={setTestEmail}
          testProvider={testProvider}
          onTestProviderChange={setTestProvider}
          testResult={testResult}
          onSendTest={handleSendTestEmail}
          isPending={sendTest.isPending}
        />

        <ProviderSection
          activeProvider={form.activeProvider}
          onActiveProviderChange={(v) => updateField("activeProvider", v)}
          fallbackEnabled={form.fallbackEnabled}
          onFallbackEnabledChange={(v) => updateField("fallbackEnabled", v)}
          isSmtpConfigured={isSmtpConfigured}
          isResendConfigured={isResendConfigured}
        />

        <SmtpSettings
          form={form}
          hasSavedPassword={Boolean(settings?.hasSmtpPassword)}
          onFieldChange={updateField}
        />

        <ResendSettings
          form={form}
          hasSavedApiKey={Boolean(settings?.hasResendApiKey)}
          onFieldChange={updateField}
        />

        <SenderSettings form={form} onFieldChange={updateField} />

        <SendingSettings form={form} onFieldChange={updateField} />

        <ConfigHistory logs={logs} />
      </div>
    </AppShell>
  );
}

export default EmailConfigPage;
