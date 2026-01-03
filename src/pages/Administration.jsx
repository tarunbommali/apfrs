/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useMemo } from 'react';
import PageLayout from './PageLayout';
import { validateSMTPConfig, sendEmail } from '../utils/email/index';
import { getActiveSMTPConfig, saveSMTPConfigEntry } from '../store/smtpConfig';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Label from '../components/ui/Label';
import Toggle from '../components/ui/Toggle';
import Badge from '../components/ui/Badge';
import { Settings, Shield, Server, Mail } from 'lucide-react';

const GMAIL_HOST = 'smtp.gmail.com';
const ENV_GMAIL_EMAIL = import.meta.env.VITE_SMTP_USER || import.meta.env.VITE_SMTP_EMAIL || '';
const ENV_GMAIL_APP_PASSWORD = import.meta.env.VITE_SMTP_PASS || import.meta.env.VITE_SMTP_PASSWORD || '';

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

const Administration = () => {
    const [activeConfig, setActiveConfig] = useState(null);
    const [form, setForm] = useState(defaultFormState);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [statusBanner, setStatusBanner] = useState(null);

    useEffect(() => {
        // Load active configuration
        const config = getActiveSMTPConfig();
        setActiveConfig(config);
        if (!config) {
            setForm(defaultFormState);
        } else {
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
    }, []);

    const setBanner = (type, text) => {
        setStatusBanner({ type, text });
        if (text) setTimeout(() => setStatusBanner(null), 6000);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const validation = validateSMTPConfig(form);
            if (!validation.isValid) {
                setBanner('error', validation.error);
                return;
            }
            const payload = { ...form, provider: 'gmail', isActive: true };
            await saveSMTPConfigEntry(payload);
            setActiveConfig(payload);
            setBanner('success', 'System settings saved successfully.');
        } catch (error) {
            setBanner('error', error?.message || 'Failed to save settings.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTest = async () => {
        const validation = validateSMTPConfig(form);
        if (!validation.isValid) {
            setBanner('error', validation.error);
            return;
        }
        const recipient = form.testRecipient || form.user;
        if (!recipient) {
            setBanner('error', 'Please provide a test recipient.');
            return;
        }

        setIsTesting(true);
        try {
            await sendEmail(
                {
                    recipients: [{ email: recipient, name: 'Admin Test' }],
                    subject: `System Test: ${form.name}`,
                    body: 'This email confirms that your APFRS system email settings are configured correctly.',
                    isHtml: false,
                },
                form
            );
            setBanner('success', `Test email sent to ${recipient}.`);
        } catch (error) {
            setBanner('error', `Test failed: ${error.message}`);
        } finally {
            setIsTesting(false);
        }
    };

    const bannerClass = useMemo(() => {
        if (!statusBanner) return '';
        return statusBanner.type === 'error'
            ? 'border-rose-200 bg-rose-50 text-rose-800'
            : 'border-emerald-200 bg-emerald-50 text-emerald-800';
    }, [statusBanner]);

    const bodyContent = (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Email Configuration</h1>
                <p className="text-slate-500 mt-2">Configure email settings for sending attendance reports.</p>
            </div>

            {statusBanner && (
                <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${bannerClass}`}>
                    {statusBanner.text}
                </div>
            )}

            {/* Settings Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Main Settings Form */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle>Email System Configuration</CardTitle>
                                    <CardDescription>Setup SMTP relay for sending reports.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>

                        <form className="space-y-6 pt-2" onSubmit={handleSave}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="host">SMTP Host</Label>
                                    <Input id="host" name="host" value={form.host} onChange={handleInputChange} placeholder="smtp.gmail.com" />
                                </div>
                                <div>
                                    <Label htmlFor="port">Port</Label>
                                    <Input id="port" name="port" value={form.port} onChange={handleInputChange} placeholder="587" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="user">Email / Username</Label>
                                    <Input id="user" name="user" value={form.user} onChange={handleInputChange} />
                                </div>
                                <div>
                                    <Label htmlFor="pass">App Password</Label>
                                    <Input id="pass" name="pass" type="password" value={form.pass} onChange={handleInputChange} placeholder="••••••••••••••••" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="fromName">Sender Name</Label>
                                    <Input id="fromName" name="fromName" value={form.fromName} onChange={handleInputChange} />
                                </div>
                                <div>
                                    <Label htmlFor="testRecipient">Test Recipient (Optional)</Label>
                                    <Input id="testRecipient" name="testRecipient" value={form.testRecipient} onChange={handleInputChange} placeholder="test@example.com" />
                                </div>
                            </div>

                            <Toggle
                                checked={form.secure}
                                onChange={() => setForm(p => ({ ...p, secure: !p.secure }))}
                                label="Enforce TLS/SSL Security"
                                description="Recommended for all modern SMTP providers."
                            />

                            <div className="flex gap-3 pt-4">
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving ? 'Saving...' : 'Save Settings'}
                                </Button>
                                <Button type="button" variant="secondary" onClick={handleTest} disabled={isTesting}>
                                    {isTesting ? 'Sending...' : 'Test Connection'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>

                {/* Sidebar / Info */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Current Status</CardTitle>
                        </CardHeader>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                <span className="text-sm font-medium text-slate-600">Active Account</span>
                                <Badge variant="info">{activeConfig?.name || 'Manual Setup'}</Badge>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                <span className="text-sm font-medium text-slate-600">Connection</span>
                                <Badge variant={activeConfig ? "success" : "warning"}>{activeConfig ? "Configured" : "Not Setup"}</Badge>
                            </div>
                        </div>
                    </Card>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600 space-y-3">
                        <div className="flex items-center gap-2 font-semibold text-slate-800">
                            <Shield className="w-4 h-4" />
                            <span>Security Note</span>
                        </div>
                        <p>
                            Credentials are stored locally in your browser's LocalStorage. Ensure you are using a secure device.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );

    return <PageLayout Body={bodyContent} />;
};

export default Administration;
