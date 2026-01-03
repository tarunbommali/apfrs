/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import PageLayout from './PageLayout';
import { validateSMTPConfig, sendEmail } from '../utils/email/index';
import {
  getActiveSMTPConfig,
  saveSMTPConfigEntry,
} from '../store/smtpConfig';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Label from '../components/ui/Label';
import Badge from '../components/ui/Badge';
import Toggle from '../components/ui/Toggle';

dayjs.extend(relativeTime);

const GMAIL_HOST = 'smtp.gmail.com';
const ENV_GMAIL_EMAIL = import.meta.env.VITE_SMTP_USER || import.meta.env.VITE_SMTP_EMAIL || '';
const ENV_GMAIL_APP_PASSWORD = import.meta.env.VITE_SMTP_PASS || import.meta.env.VITE_SMTP_PASSWORD || '';

const maskSecret = (value = '') => {
  if (!value) return '';
  if (value.includes('@')) {
    const [user, domain] = value.split('@');
    return `${user.slice(0, 2)}***@${domain}`;
  }
  return value.length <= 4 ? '••••' : `${value.slice(0, 2)}***${value.slice(-2)}`;
};

const defaultFormState = {
  name: 'Gmail SMTP',
  host: GMAIL_HOST,
  port: '587',
  secure: true,
  user: ENV_GMAIL_EMAIL,
  pass: ENV_GMAIL_APP_PASSWORD,
  fromName: 'APFRS Reports',
  subject: 'APFRS Attendance Report',
  testRecipient: '',
  notes: '',
};

const ConfigureSMTP = () => {
  const [activeConfig, setActiveConfig] = useState(null);
  const [form, setForm] = useState(defaultFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [statusBanner, setStatusBanner] = useState(null);
  const [lastTested, setLastTested] = useState(null);

  useEffect(() => {
    // Load active configuration
    const config = getActiveSMTPConfig();
    setActiveConfig(config);

    // If no active config exists, prefill form with env values
    if (!config) {
      setForm(defaultFormState);
    } else {
      // Populate form with existing config
      setForm({
        name: config.name || 'Gmail SMTP',
        host: config.host || GMAIL_HOST,
        port: config.port || '587',
        secure: typeof config.secure === 'boolean' ? config.secure : true,
        user: config.user || ENV_GMAIL_EMAIL,
        pass: config.pass || ENV_GMAIL_APP_PASSWORD,
        fromName: config.fromName || 'APFRS Reports',
        subject: config.subject || 'APFRS Attendance Report',
        testRecipient: config.testRecipient || '',
        notes: config.notes || '',
      });
    }

    // Load last test timestamp
    try {
      const stored = localStorage.getItem('smtpLastTested');
      if (stored) {
        setLastTested(new Date(stored));
      }
    } catch (error) {
      console.warn('Unable to read last SMTP test timestamp:', error);
    }
  }, []);

  const bannerClass = useMemo(() => {
    if (!statusBanner) return '';
    return statusBanner.type === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-800'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }, [statusBanner]);

  const setBanner = (type, text) => {
    setStatusBanner({ type, text });
    if (text) {
      setTimeout(() => setStatusBanner(null), 6000);
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleSecure = () => {
    setForm((prev) => ({ ...prev, secure: !prev.secure }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const validation = validateSMTPConfig(form);
      if (!validation.isValid) {
        setBanner('error', validation.error);
        return;
      }

      const payload = {
        ...form,
        provider: 'gmail',
        isActive: true,
      };

      await saveSMTPConfigEntry(payload);
      setActiveConfig(payload);
      setBanner('success', 'SMTP configuration saved successfully.');
    } catch (error) {
      console.error('Failed to save SMTP configuration:', error);
      setBanner('error', error?.message || 'Unable to save configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const buildTestMessage = () => `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f1f5f9; padding: 20px;">
      <div style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">SMTP Configuration Test</h1>
          <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9);">APFRS Attendance Report System</p>
        </div>
        
        <div style="padding: 32px;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; color: #475569; font-size: 14px;"><strong>Provider:</strong> Gmail SMTP</p>
            <p style="margin: 0 0 8px; color: #475569; font-size: 14px;"><strong>Host:</strong> ${form.host}:${form.port}</p>
            <p style="margin: 0; color: #475569; font-size: 14px;"><strong>Sender:</strong> ${form.user}</p>
          </div>

          <h3 style="color: #1e293b; font-size: 18px; margin-bottom: 16px;">Preview of Stats Layout</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; margin-bottom: 24px;">
            <tr>
              <td style="padding: 16px; border-bottom: 1px solid #e2e8f0;">
                <span style="color: #64748b; font-size: 13px;">Present Days</span>
                <span style="float: right; color: #1e293b; font-weight: 700;">20</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 16px; border-bottom: 1px solid #e2e8f0;">
                <span style="color: #64748b; font-size: 13px;">Absent Days</span>
                <span style="float: right; color: #1e293b; font-weight: 700;">2</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 16px; border-bottom: 1px solid #e2e8f0;">
                <span style="color: #64748b; font-size: 13px;">Working Days</span>
                <span style="float: right; color: #1e293b; font-weight: 700;">22</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 16px; border-bottom: 1px solid #e2e8f0;">
                <span style="color: #64748b; font-size: 13px;">Total Hours</span>
                <span style="float: right; color: #1e293b; font-weight: 700;">160 hrs</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 16px;">
                <span style="color: #64748b; font-size: 13px;">Holidays</span>
                <span style="float: right; color: #1e293b; font-weight: 700;">8</span>
              </td>
            </tr>
          </table>

          <h3 style="color: #1e293b; font-size: 18px; margin-bottom: 16px;">Daily Attendance</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; width: 100%; margin-bottom: 24px;">
            <thead>
              <tr style="background-color: #f1f5f9;">
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 12px; font-weight: 700; text-transform: uppercase;">Day</th>
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 12px; font-weight: 700; text-transform: uppercase;">In</th>
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 12px; font-weight: 700; text-transform: uppercase;">Out</th>
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 12px; font-weight: 700; text-transform: uppercase;">Status</th>
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 12px; font-weight: 700; text-transform: uppercase;">Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr style="background-color: #ffffff;">
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 12px;">1</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 12px;">10:21:49</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 12px;">18:07:34</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
                  <span style="background-color: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600;">P</span>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 12px;">07:45:45</td>
              </tr>
              <tr style="background-color: #f8fafc;">
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 12px;">2</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 12px;">-</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 12px;">-</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
                  <span style="background-color: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600;">A</span>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 12px;">0 hrs</td>
              </tr>
              <tr style="background-color: #ffffff;">
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 12px;">3</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 12px;">-</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 12px;">-</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
                  <span style="background-color: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600;">A</span>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 12px;">0 hrs</td>
              </tr>
              <tr style="background-color: #f8fafc;">
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 12px;">4</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 12px;">10:58:37</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 12px;">18:00:20</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
                  <span style="background-color: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600;">P</span>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 12px;">07:01:43</td>
              </tr>
              <tr style="background-color: #ffffff;">
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 12px;">5</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 12px;">-</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 12px;">-</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
                  <span style="background-color: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600;">A</span>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 12px;">0 hrs</td>
              </tr>
            </tbody>
          </table>

          <p style="color: #166534; background: #dcfce7; padding: 12px; border-radius: 8px; text-align: center; font-size: 14px; margin: 0;">
            ✅ If you received this email, the SMTP configuration is valid.
          </p>
        </div>
        
        <div style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="margin: 0; color: #94a3b8; font-size: 11px;">
            © ${new Date().getFullYear()} APFRS. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;

  const handleTest = async () => {
    const validation = validateSMTPConfig(form);
    if (!validation.isValid) {
      setBanner('error', validation.error);
      return;
    }

    const recipient = form.testRecipient || form.user;
    if (!recipient) {
      setBanner('error', 'Please provide a test recipient email address.');
      return;
    }

    setIsTesting(true);
    try {
      await sendEmail(
        {
          recipients: [{ email: recipient, name: 'SMTP Test Recipient' }],
          subject: `SMTP Configuration Test • ${form.name}`,
          body: buildTestMessage(),
          isHtml: true,
        },
        form
      );
      const now = new Date();
      setLastTested(now);
      localStorage.setItem('smtpLastTested', now.toISOString());
      setBanner('success', `Test email sent successfully to ${recipient}.`);
    } catch (error) {
      console.error('SMTP test failed:', error);
      setBanner('error', error?.message || 'Unable to send test email. Please check your credentials.');
    } finally {
      setIsTesting(false);
    }
  };

  const sidebarContent = (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gmail SMTP Settings</CardTitle>
          <CardDescription>Configure your Gmail account for sending attendance reports.</CardDescription>
        </CardHeader>
        <div className="space-y-3 text-sm text-slate-600">
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">SMTP Host</p>
            <p className="font-semibold text-slate-900">{GMAIL_HOST}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Default Port</p>
            <p className="font-semibold text-slate-900">587 (TLS)</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Environment Variables</p>
            <p className="font-semibold text-slate-900">
              {ENV_GMAIL_EMAIL || 'VITE_SMTP_USER not set'}
            </p>
            <p className="font-semibold text-slate-900 mt-1">
              {ENV_GMAIL_APP_PASSWORD ? 'App password configured' : 'VITE_SMTP_PASS not set'}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Configuration</CardTitle>
          <CardDescription>Active SMTP settings for email sending.</CardDescription>
        </CardHeader>
        {activeConfig ? (
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">{activeConfig.name}</span>
              <Badge variant="success">Active</Badge>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="font-semibold text-slate-700">Sender Email</p>
              <p className="text-slate-500">{activeConfig.user}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="font-semibold text-slate-700">SMTP Server</p>
              <p className="text-slate-500">{activeConfig.host}:{activeConfig.port}</p>
            </div>
            {activeConfig.updatedAt && (
              <p className="text-xs text-slate-500">
                Updated {dayjs(activeConfig.updatedAt).format('MMM D, YYYY HH:mm')}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No SMTP configuration saved yet. Configure settings to enable email sending.</p>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
          <CardDescription>Verify your SMTP settings before sending reports.</CardDescription>
        </CardHeader>
        <div className="space-y-2 text-sm text-slate-600">
          <p>Last test: {lastTested ? dayjs(lastTested).fromNow() : 'Not tested yet'}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleTest}
            disabled={isTesting || !form.user || !form.pass}
          >
            {isTesting ? 'Testing...' : 'Test Configuration'}
          </Button>
          <p className="text-xs text-slate-500">
            Send a test email to verify your SMTP credentials are working correctly.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gmail Setup Guide</CardTitle>
          <CardDescription>Steps to configure Gmail for sending emails.</CardDescription>
        </CardHeader>
        <ol className="space-y-2 text-sm text-slate-600 list-decimal list-inside">
          <li>Enable 2-factor authentication on your Gmail account</li>
          <li>Generate an App Password from Google Account settings</li>
          <li>Use the App Password in the password field (not your regular password)</li>
          <li>Test the configuration before sending bulk emails</li>
        </ol>
      </Card>
    </div>
  );

  const bodyContent = (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-500">Email Configuration</p>
            <h1 className="text-3xl font-bold text-slate-900">SMTP Settings</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Configure Gmail SMTP settings to send attendance reports to faculty members.
              Uses environment variables by default, or configure manually.
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="info">Gmail SMTP</Badge>
            <Badge variant="success">TLS Enabled</Badge>
          </div>
        </div>
        {statusBanner && (
          <div className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${bannerClass}`}>
            {statusBanner.text}
          </div>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>SMTP Configuration</CardTitle>
          <CardDescription>
            Configure your Gmail SMTP settings for sending attendance reports.
            Environment variables are prefilled if available.
          </CardDescription>
        </CardHeader>

        <form className="space-y-6" onSubmit={handleSave}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="name">Configuration Name</Label>
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={handleInputChange}
                placeholder="e.g., Gmail Reports"
              />
            </div>
            <div>
              <Label htmlFor="fromName">From Name</Label>
              <Input
                id="fromName"
                name="fromName"
                value={form.fromName}
                onChange={handleInputChange}
                placeholder="APFRS Reports"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <Label htmlFor="host">SMTP Host</Label>
              <Input
                id="host"
                name="host"
                value={form.host}
                onChange={handleInputChange}
                placeholder="smtp.gmail.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                name="port"
                value={form.port}
                onChange={handleInputChange}
                placeholder="587"
                required
              />
            </div>
          </div>

          <Toggle
            checked={form.secure}
            onChange={handleToggleSecure}
            label="Use TLS / SSL"
            description="Required for Gmail SMTP. Keep enabled for secure connection."
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="user">Gmail Address</Label>
              <Input
                id="user"
                name="user"
                value={form.user}
                onChange={handleInputChange}
                placeholder="your.email@gmail.com"
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                The Gmail address that will send the reports
              </p>
            </div>
            <div>
              <Label htmlFor="pass">Gmail App Password</Label>
              <Input
                id="pass"
                name="pass"
                type="password"
                value={form.pass}
                onChange={handleInputChange}
                placeholder="16-character app password"
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                Not your regular password. Generate from Google Account settings.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="subject">Email Subject</Label>
              <Input
                id="subject"
                name="subject"
                value={form.subject}
                onChange={handleInputChange}
                placeholder="APFRS Attendance Report"
              />
            </div>
            <div>
              <Label htmlFor="testRecipient">Test Recipient</Label>
              <Input
                id="testRecipient"
                name="testRecipient"
                value={form.testRecipient}
                onChange={handleInputChange}
                placeholder="test@example.com"
              />
              <p className="mt-1 text-xs text-slate-500">
                Optional: Email to send test messages to
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              name="notes"
              value={form.notes}
              onChange={handleInputChange}
              placeholder="Additional notes about this configuration"
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-4">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </Button>
            <Button type="button" variant="secondary" onClick={handleTest} disabled={isTesting}>
              {isTesting ? 'Testing...' : 'Test Configuration'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );

  return (
    <PageLayout Sidebar={sidebarContent} Body={bodyContent} />
  );
};

export default ConfigureSMTP;