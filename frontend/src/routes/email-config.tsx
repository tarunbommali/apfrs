import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Mailbox,
  Send,
  Server,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertTriangle,
  History,
  Sparkles,
  ArrowRight,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  Check,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
} from "@/lib/queries";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/email-config")({
  head: () => ({
    meta: [
      { title: "Email Configuration — e-Office Jntugv" },
      {
        name: "description",
        content: "Configure database-backed SMTP and Resend delivery settings with automated fallback, credential masking, and test dispatches.",
      },
    ],
  }),
  component: EmailConfigPage,
});

function EmailConfigPage() {
  const { user } = useAuth();
  const { data, isLoading, refetch } = useQuery(emailConfigQuery());
  const updateMutation = useUpdateEmailConfig();
  const testMutation = useSendTestEmail();

  const settings = data?.settings;
  const logs = data?.logs || [];

  // Form State
  const [activeProvider, setActiveProvider] = useState<"smtp" | "resend">("smtp");
  const [fallbackEnabled, setFallbackEnabled] = useState(true);
  const [fallbackOrder, setFallbackOrder] = useState<"smtp_first" | "resend_first">("smtp_first");

  // SMTP State
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpEncryption, setSmtpEncryption] = useState<"none" | "tls" | "ssl">("tls");
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [smtpPoolSize, setSmtpPoolSize] = useState("5");
  const [smtpTimeout, setSmtpTimeout] = useState("30");

  // Resend State
  const [resendApiKey, setResendApiKey] = useState("");
  const [showResendApiKey, setShowResendApiKey] = useState(false);
  const [resendDomain, setResendDomain] = useState("");
  const [resendWebhookUrl, setResendWebhookUrl] = useState("");
  const [resendTag, setResendTag] = useState("apfrs-monthly");

  // Sender State
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [subjectTemplate, setSubjectTemplate] = useState("");
  const [signature, setSignature] = useState("");
  const [retries, setRetries] = useState("3");
  const [batchDelay, setBatchDelay] = useState("200");
  const [sandboxMode, setSandboxMode] = useState(false);

  // Test Email State
  const [testEmailRecipient, setTestEmailRecipient] = useState(user?.email || "admin@apfrs.in");
  const [testResult, setTestResult] = useState<{
    success: boolean;
    messageId?: string;
    providerUsed?: string;
    durationMs?: number;
    error?: string;
    timestamp?: string;
  } | null>(null);

  // Sync state from query when loaded
  useEffect(() => {
    if (settings) {
      setActiveProvider(settings.active_provider || "smtp");
      setFallbackEnabled(Boolean(settings.fallback_enabled));
      setFallbackOrder(settings.fallback_order || "smtp_first");

      setSmtpHost(settings.smtp_host || "");
      setSmtpPort(String(settings.smtp_port || 587));
      setSmtpEncryption((settings.smtp_encryption as any) || "tls");
      setSmtpUsername(settings.smtp_username || "");
      setSmtpPoolSize(String(settings.smtp_pool_size || 5));
      setSmtpTimeout(String(settings.smtp_timeout || 30));

      setResendDomain(settings.resend_domain || "");
      setResendWebhookUrl(settings.resend_webhook_url || "");
      setResendTag(settings.resend_tag || "apfrs-monthly");

      setFromName(settings.from_name || "");
      setFromEmail(settings.from_email || "");
      setReplyTo(settings.reply_to || "");
      setSubjectTemplate(settings.subject_template || "");
      setSignature(settings.signature || "");
      setRetries(String(settings.retries || 3));
      setBatchDelay(String(settings.batch_delay || 200));
      setSandboxMode(Boolean(settings.sandbox_mode));
    }
  }, [settings]);

  // Validation checks
  const isSmtpPortValid = !isNaN(Number(smtpPort)) && Number(smtpPort) > 0 && Number(smtpPort) <= 65535;
  const isFromEmailValid = fromEmail === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail);
  const isReplyToValid = replyTo === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo);
  const isResendKeyValid = resendApiKey === "" || resendApiKey.startsWith("re_");

  const handleSave = async () => {
    if (!isSmtpPortValid) {
      toast.error("Invalid SMTP Port number.");
      return;
    }
    if (!isFromEmailValid) {
      toast.error("Invalid Sender From Email address.");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        activeProvider,
        fallbackEnabled,
        fallbackOrder,
        smtp: {
          host: smtpHost,
          port: smtpPort,
          encryption: smtpEncryption,
          username: smtpUsername,
          password: smtpPassword, // Will only update in DB if non-empty
          poolSize: smtpPoolSize,
          timeout: smtpTimeout,
        },
        resend: {
          apiKey: resendApiKey, // Will only update in DB if non-empty
          domain: resendDomain,
          webhookUrl: resendWebhookUrl,
          tag: resendTag,
        },
        sender: {
          fromName,
          fromEmail,
          replyTo,
          subject: subjectTemplate,
          signature,
          retries,
          batchDelay,
          sandbox: sandboxMode,
        },
      });

      setSmtpPassword(""); // Clear local password state after save
      setResendApiKey(""); // Clear local key state after save
      toast.success("Email delivery configuration saved and synchronized to database.");
      void refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to save configuration.");
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailRecipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmailRecipient)) {
      toast.error("Please provide a valid recipient email address.");
      return;
    }

    setTestResult(null);
    try {
      const res = await testMutation.mutateAsync({
        recipientEmail: testEmailRecipient,
        tempConfig: {
          smtpHost,
          smtpPort,
          smtpEncryption,
          smtpUsername,
          smtpPassword: smtpPassword || undefined,
          resendApiKey: resendApiKey || undefined,
          fromName,
          fromEmail,
        },
      });

      if (res && res.result && res.result.success) {
        setTestResult({
          success: true,
          messageId: res.result.messageId,
          providerUsed: res.result.providerUsed,
          durationMs: res.result.durationMs,
          timestamp: new Date().toLocaleTimeString(),
        });
        toast.success(`Test email delivered successfully! Message ID: ${res.result.messageId}`);
      } else {
        setTestResult({
          success: false,
          error: res?.error || res?.message || "Test dispatch failed. Please verify credentials.",
          timestamp: new Date().toLocaleTimeString(),
        });
        toast.error(res?.error || res?.message || "Test dispatch failed.");
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || "Test dispatch failed.",
        timestamp: new Date().toLocaleTimeString(),
      });
      toast.error(`Test email failed: ${err.message}`);
    }
  };

  if (isLoading) {
    return (
      <AppShell roles={["admin"]} title="Email Configuration" subtitle="Loading database configuration…">
        <div className="space-y-6">
          <div className="surface-panel h-64 animate-pulse" />
          <div className="surface-panel h-96 animate-pulse" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      roles={["admin"]}
      title="Email Configuration"
      subtitle="Database-backed multi-provider delivery settings, automated fallback, and dispatch testing"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            <RefreshCw className="mr-1.5 size-3.5" /> Reload
          </Button>
          <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Check className="mr-1.5 size-3.5" />
            )}
            Save Configuration
          </Button>
        </div>
      }
    >
      <div className="space-y-8">
        {/* ── Section 1: Send Test Email Verification ── */}
        <section className="surface-panel p-5 border-l-4 border-primary bg-primary/5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <div className="flex items-center gap-2">
                <Send className="size-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Send Test Email</h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Trigger a live verification handshake to confirm SMTP credentials or Resend API pipeline before dispatching monthly attendance sheets.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
              <Input
                value={testEmailRecipient}
                onChange={(e) => setTestEmailRecipient(e.target.value)}
                placeholder="Enter recipient email (e.g. you@domain.com)"
                className="h-9 text-xs bg-card min-w-[260px]"
              />
              <Button
                size="sm"
                onClick={handleSendTestEmail}
                disabled={testMutation.isPending}
                className="shrink-0"
              >
                {testMutation.isPending ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Send className="mr-1.5 size-3.5" />
                )}
                {testMutation.isPending ? "Sending Test…" : "Send Test Email"}
              </Button>
            </div>
          </div>

          {/* Test Result Display */}
          {testResult && (
            <div
              className={`mt-4 rounded-lg p-3 text-xs border ${
                testResult.success
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 font-medium">
                  {testResult.success ? (
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <XCircle className="size-4 text-rose-600 dark:text-rose-400" />
                  )}
                  <span>{testResult.success ? "Test Dispatch Successful" : "Test Dispatch Failed"}</span>
                </div>
                <span className="font-mono text-[10px] opacity-75">{testResult.timestamp}</span>
              </div>

              {testResult.success ? (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] pt-2 border-t border-emerald-500/20">
                  <div>
                    <span className="opacity-70">Message ID:</span> {testResult.messageId || "N/A"}
                  </div>
                  <div>
                    <span className="opacity-70">Provider:</span> {testResult.providerUsed?.toUpperCase()}
                  </div>
                  <div>
                    <span className="opacity-70">Latency:</span> {testResult.durationMs}ms
                  </div>
                </div>
              ) : (
                <p className="mt-1 font-mono text-[11px] pt-1 text-rose-600 dark:text-rose-300">
                  {testResult.error}
                </p>
              )}
            </div>
          )}
        </section>

        {/* ── Section 2: Multi-Provider & Automatic Fallback Pipeline ── */}
        <section className="surface-panel p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Delivery Provider & Automatic Fallback</h3>
              <p className="text-xs text-muted-foreground">
                Configure primary dispatch engine and automated failover strategy
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="fallback-toggle" className="text-xs font-medium cursor-pointer">
                Automatic Failover
              </Label>
              <Switch
                id="fallback-toggle"
                checked={fallbackEnabled}
                onCheckedChange={setFallbackEnabled}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Primary Provider Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Primary Active Provider</Label>
              <Select
                value={activeProvider}
                onValueChange={(val: "smtp" | "resend") => {
                  setActiveProvider(val);
                  setFallbackOrder(val === "smtp" ? "smtp_first" : "resend_first");
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="smtp">SMTP (Institutional Mail / Gmail)</SelectItem>
                  <SelectItem value="resend">Resend API (Cloud Delivery)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fallback Order Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Failover Routing Order</Label>
              <Select
                disabled={!fallbackEnabled}
                value={fallbackOrder}
                onValueChange={(val: any) => setFallbackOrder(val)}
              >
                <SelectTrigger className="h-9 text-xs bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="smtp_first">SMTP First → Fallback to Resend</SelectItem>
                  <SelectItem value="resend_first">Resend First → Fallback to SMTP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Visual Fallback Pipeline Badge */}
          <div className="rounded-md bg-muted/60 p-3 text-xs flex items-center gap-3">
            <span className="font-semibold text-foreground">Active Dispatch Flow:</span>
            {fallbackEnabled ? (
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="rounded bg-primary/10 px-2 py-0.5 font-bold text-primary">
                  {fallbackOrder === "smtp_first" ? "1. SMTP Server" : "1. Resend API"}
                </span>
                <ArrowRight className="size-3.5 text-muted-foreground" />
                <span className="rounded bg-accent/20 px-2 py-0.5 font-bold text-accent-foreground">
                  {fallbackOrder === "smtp_first" ? "2. Resend API (Fallback)" : "2. SMTP Server (Fallback)"}
                </span>
              </div>
            ) : (
              <span className="font-mono text-[11px] text-muted-foreground">
                Single provider ({activeProvider.toUpperCase()}) with failover disabled
              </span>
            )}
          </div>
        </section>

        {/* ── Section 3: SMTP Credentials & Masking ── */}
        <section className="surface-panel p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Server className="size-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">SMTP Server Credentials</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">SMTP Host</Label>
              <Input
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com"
                className="h-8 text-xs bg-card"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">SMTP Port</Label>
              <Input
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder="587"
                className={`h-8 text-xs bg-card ${!isSmtpPortValid ? "border-rose-500" : ""}`}
              />
              {!isSmtpPortValid && (
                <p className="text-[10px] text-rose-500">Must be a valid port (e.g. 587, 465)</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Encryption Mode</Label>
              <Select value={smtpEncryption} onValueChange={(val: any) => setSmtpEncryption(val)}>
                <SelectTrigger className="h-8 text-xs bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tls">STARTTLS (Port 587)</SelectItem>
                  <SelectItem value="ssl">SSL / TLS (Port 465)</SelectItem>
                  <SelectItem value="none">None (Insecure / Port 25)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label className="text-xs font-medium">SMTP Username / Email</Label>
              <Input
                value={smtpUsername}
                onChange={(e) => setSmtpUsername(e.target.value)}
                placeholder="reports@jntugvcev.edu.in"
                className="h-8 text-xs bg-card"
              />
            </div>

            {/* Masked Password Field with Eye Toggle */}
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">SMTP App Password</Label>
                {settings?.hasSmtpPassword && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Password saved in database
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showSmtpPassword ? "text" : "password"}
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  placeholder={settings?.hasSmtpPassword ? "•••••••••••••••• (leave blank to keep current)" : "Enter 16-character Google App Password"}
                  className="h-8 pr-9 text-xs bg-card font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSmtpPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                For Gmail, generate a 16-character App Password under Google Account &gt; Security &gt; 2-Step Verification.
              </p>
            </div>
          </div>
        </section>

        {/* ── Section 4: Resend API Configuration & Masking ── */}
        <section className="surface-panel p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Mailbox className="size-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Resend Cloud API Settings</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Masked Resend API Key */}
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Resend API Key</Label>
                {settings?.hasResendApiKey && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ API Key configured ({settings.resend_api_key})
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showResendApiKey ? "text" : "password"}
                  value={resendApiKey}
                  onChange={(e) => setResendApiKey(e.target.value)}
                  placeholder={settings?.hasResendApiKey ? "•••••••••••••••• (leave blank to keep current)" : "re_123456789..."}
                  className={`h-8 pr-9 text-xs bg-card font-mono ${!isResendKeyValid ? "border-rose-500" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowResendApiKey(!showResendApiKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showResendApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {!isResendKeyValid && (
                <p className="text-[10px] text-rose-500">Resend API keys typically start with 're_'</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Verified Sending Domain</Label>
              <Input
                value={resendDomain}
                onChange={(e) => setResendDomain(e.target.value)}
                placeholder="notify.jntugvcev.edu.in"
                className="h-8 text-xs bg-card"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Dispatch Tag</Label>
              <Input
                value={resendTag}
                onChange={(e) => setResendTag(e.target.value)}
                placeholder="apfrs-monthly"
                className="h-8 text-xs bg-card"
              />
            </div>
          </div>
        </section>

        {/* ── Section 5: Sender Identity & Template ── */}
        <section className="surface-panel p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <ShieldCheck className="size-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Sender Identity & Subject Template</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">From Name</Label>
              <Input
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="APFRS Reporting Cell"
                className="h-8 text-xs bg-card"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">From Email</Label>
              <Input
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="reports@jntugvcev.edu.in"
                className={`h-8 text-xs bg-card ${!isFromEmailValid ? "border-rose-500" : ""}`}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Reply-To Email</Label>
              <Input
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                placeholder="admin@apfrs.in"
                className={`h-8 text-xs bg-card ${!isReplyToValid ? "border-rose-500" : ""}`}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Subject Template</Label>
              <Input
                value={subjectTemplate}
                onChange={(e) => setSubjectTemplate(e.target.value)}
                placeholder="Monthly Attendance Statement — {{month}} {{year}}"
                className="h-8 text-xs bg-card font-mono"
              />
            </div>
          </div>
        </section>

        {/* ── Section 6: Configuration Change Log Audit Trail ── */}
        <section className="surface-panel overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border p-4">
            <History className="size-4 text-primary" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Configuration Change Log</h3>
              <p className="text-xs text-muted-foreground">
                Audit history of SMTP and Resend configuration modifications
              </p>
            </div>
          </div>

          {logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No configuration changes recorded in audit log yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5">Timestamp</th>
                    <th className="px-4 py-2.5">Author</th>
                    <th className="px-4 py-2.5">Summary</th>
                    <th className="px-4 py-2.5">Changed Fields</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log: any) => {
                    const fields = Array.isArray(log.changed_fields)
                      ? log.changed_fields
                      : typeof log.changed_fields === "string"
                      ? JSON.parse(log.changed_fields || "[]")
                      : [];

                    return (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-muted-foreground">
                          {new Date(log.created_at).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-foreground">
                          {log.updated_by}
                        </td>
                        <td className="px-4 py-2.5 text-foreground">{log.summary}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {fields.map((f: any, idx: number) => (
                              <span
                                key={idx}
                                className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-foreground"
                              >
                                {f.field}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
