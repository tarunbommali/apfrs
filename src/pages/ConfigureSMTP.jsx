import React, { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import PageLayout from './PageLayout';
import { getSMTPConfig, validateSMTPConfig, sendEmail } from '../utils/emailUtils';

dayjs.extend(relativeTime);

const PRECONFIGURED_PROVIDERS = {
  gmail: {
    host: 'smtp.gmail.com',
    port: '587',
    secure: true,
    label: 'Google / Gmail',
  },
  outlook: {
    host: 'smtp.office365.com',
    port: '587',
    secure: true,
    label: 'Microsoft / Outlook',
  },
  zoho: {
    host: 'smtp.zoho.com',
    port: '587',
    secure: true,
    label: 'Zoho Mail',
  },
  custom: {
    host: '',
    port: '587',
    secure: true,
    label: 'Custom',
  },
};

const defaultFormState = {
  host: '',
  port: '587',
  secure: true,
  user: '',
  pass: '',
  subject: 'APFRS Attendance Report',
  testRecipient: '',
};

const Field = ({ label, name, value, onChange, type = 'text', placeholder, required = false }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1">
      {label}
    </label>
    <input
      type={type}
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm"
    />
  </div>
);

const Toggle = ({ label, name, checked, onChange }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm font-medium text-slate-700">{label}</span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange({ target: { name, value: !checked } })}
      className={`${
        checked ? 'bg-indigo-600' : 'bg-slate-300'
      } relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
    >
      <span
        className={`${
          checked ? 'translate-x-5' : 'translate-x-0'
        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
      />
    </button>
  </div>
);

const LoadingSpinner = () => (
  <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const ConfigureSMTP = () => {
  const [form, setForm] = useState(defaultFormState);
  const [selectedPreset, setSelectedPreset] = useState('custom');
  const [currentConfig, setCurrentConfig] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [lastError, setLastError] = useState(null);
  const [lastTested, setLastTested] = useState(null);
  const [testingStatus, setTestingStatus] = useState('ready');
  const testCooldownMinutes = 1;

  const loadConfig = useCallback(() => {
    const saved = getSMTPConfig();
    if (saved && saved.host) {
      setCurrentConfig(saved);
      setForm(saved);
      // Find matching preset
      const presetKey = Object.keys(PRECONFIGURED_PROVIDERS).find(
        key => PRECONFIGURED_PROVIDERS[key].host === saved.host && PRECONFIGURED_PROVIDERS[key].port === String(saved.port)
      );
      setSelectedPreset(presetKey || 'custom');
    }
    const storedLastTested = localStorage.getItem('smtpLastTested');
    if (storedLastTested) {
      setLastTested(new Date(storedLastTested));
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (lastTested) {
      const now = dayjs();
      const minutesSinceTest = now.diff(dayjs(lastTested), 'minute');
      
      if (minutesSinceTest < testCooldownMinutes) {
        setTestingStatus('cooling');
        const interval = setInterval(() => {
          const currentMinutesSinceTest = dayjs().diff(dayjs(lastTested), 'minute');
          if (currentMinutesSinceTest >= testCooldownMinutes) {
            setTestingStatus('ready');
            clearInterval(interval);
          }
        }, 1000);
        return () => clearInterval(interval);
      } else {
        setTestingStatus('ready');
      }
    }
  }, [lastTested]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear errors when user makes changes
    if (lastError) setLastError(null);
  };

  const handlePresetChange = (e) => {
    const presetKey = e.target.value;
    setSelectedPreset(presetKey);
    if (presetKey !== 'custom') {
      const preset = PRECONFIGURED_PROVIDERS[presetKey];
      setForm(prev => ({
        ...prev,
        host: preset.host,
        port: preset.port,
        secure: preset.secure,
      }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('smtpConfig', JSON.stringify(form));
      setCurrentConfig(form);
      // Show success state briefly
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Failed to save configuration:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (testingStatus === 'cooling' || isTesting) return;

    setIsTesting(true);
    setTestingStatus('testing');
    setLastError(null);

    try {
      // Use current form data for validation, but saved config for actual test
      const validation = validateSMTPConfig(form);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid SMTP configuration');
      }

      const configToTest = getSMTPConfig() || form;
      
      await sendEmail({
        recipients: [{ 
          email: configToTest.testRecipient || configToTest.user, 
          name: 'SMTP Test Recipient' 
        }],
        subject: 'SMTP Configuration Test - APFRS',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5; text-align: center;">SMTP Configuration Test</h2>
            <p>This is a test email from the APFRS Attendance System.</p>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #374151; margin-top: 0;">Configuration Details:</h3>
              <ul style="color: #6b7280;">
                <li><strong>Host:</strong> ${configToTest.host}</li>
                <li><strong>Port:</strong> ${configToTest.port}</li>
                <li><strong>Secure:</strong> ${configToTest.secure ? 'Yes' : 'No'}</li>
                <li><strong>From Email:</strong> ${configToTest.user}</li>
              </ul>
            </div>
            <p style="color: #6b7280; font-size: 14px; text-align: center;">
              If you received this email, your SMTP configuration is working correctly.
            </p>
          </div>
        `,
        isHtml: true,
      });

      setTestingStatus('success');
    } catch (error) {
      console.error('Test failed:', error);
      setLastError(error);
      setTestingStatus('error');
    } finally {
      const now = new Date();
      setLastTested(now);
      localStorage.setItem('smtpLastTested', now.toISOString());
      setIsTesting(false);
    }
  };

  const getEmailStatus = () => {
    switch (testingStatus) {
      case 'ready':
        return { className: 'bg-emerald-400', message: 'Ready to test' };
      case 'testing':
        return { className: 'bg-yellow-400 animate-pulse', message: 'Test in progress...' };
      case 'cooling':
        return { className: 'bg-slate-400', message: 'In cooldown' };
      case 'success':
        return { className: 'bg-emerald-500', message: 'Test successful' };
      case 'error':
        return { className: 'bg-rose-500', message: 'Test failed' };
      default:
        return { className: 'bg-slate-400', message: 'Unknown status' };
    }
  };

  const emailStatus = getEmailStatus();
  const nextTestIn = lastTested && testingStatus === 'cooling' 
    ? testCooldownMinutes - dayjs().diff(dayjs(lastTested), 'minute')
    : null;

  const sidebarContent = (
    <div className="space-y-6">
      {/* Status Card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span>Last Test</span>
          <span>{lastTested ? dayjs(lastTested).format('MMM D, HH:mm') : 'Not tested'}</span>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full ${emailStatus.className}`} aria-hidden="true" />
          <div>
            <p className="text-base font-semibold text-slate-900">{emailStatus.message}</p>
            <p className="text-xs text-slate-500">
              {testingStatus === 'cooling' && nextTestIn 
                ? `Available in ${nextTestIn} min` 
                : 'Click test button to verify'}
            </p>
          </div>
        </div>
      </section>

      {/* Test Status Card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Test Status</p>
        <p className="mt-3 text-2xl font-bold text-slate-900">
          {testingStatus === 'cooling' && nextTestIn
            ? `${nextTestIn}m`
            : testingStatus === 'testing'
            ? 'Testing...'
            : 'Ready'}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          {testingStatus === 'cooling' && nextTestIn
            ? `Cooldown period: ${testCooldownMinutes} min`
            : 'You can run a test now'}
        </p>
      </section>

      {/* Important Notes Card */}
      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <span>💡</span>
          Important Notes
        </h3>
        <ul className="space-y-2 text-sm text-blue-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span><strong>Gmail requires 2FA + App Passwords</strong> - Use app passwords instead of regular passwords</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span><strong>"From" email must match the account</strong> - The sender email should match your SMTP account</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span><strong>Port 587 with TLS recommended</strong> - Best compatibility for Gmail and most providers</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span><strong>Save before testing</strong> - Always save configuration changes first</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span><strong>Check spam folder</strong> - Test emails might land in spam initially</span>
          </li>
        </ul>
      </section>

      {/* Quick Tips Card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Quick Tips</h3>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2">
            <span className="text-indigo-500 mt-0.5">•</span>
            <span>Use Gmail App Passwords for better security</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-500 mt-0.5">•</span>
            <span>Test configuration after saving changes</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-500 mt-0.5">•</span>
            <span>Configuration is stored locally in your browser</span>
          </li>
        </ul>
      </section>
    </div>
  );

  const bodyContent = (
    <div className="space-y-6 pt-16">
      {/* Header Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700">
              <span>⚡</span>
              <span>Direct SMTP Control</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Configure SMTP Relay</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Update and test the SMTP credentials used for attendance email blasts. Configuration is stored locally in your browser.
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
              <span>🛡️</span>
              Local storage
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
              <span>📡</span>
              API proxy
            </span>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700">
            <span className={`h-2 w-2 rounded-full ${emailStatus.className}`} aria-hidden="true" />
            <span className="font-medium">{emailStatus.message}</span>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleTest}
              disabled={isTesting || testingStatus === 'cooling' || !currentConfig.user}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  <LoadingSpinner />
                  <span>Sending test...</span>
                </>
              ) : (
                <>
                  <span>📧</span>
                  <span>Send Test Email</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {lastError && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-start gap-3">
              <span className="text-rose-500">⚠️</span>
              <div>
                <p className="font-medium text-rose-800">Test Failed</p>
                <p className="mt-1 text-sm text-rose-700">{lastError.message || 'Unknown error occurred'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Display */}
        {testingStatus === 'success' && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <span className="text-emerald-500">✅</span>
              <div>
                <p className="font-medium text-emerald-800">Test Successful</p>
                <p className="mt-1 text-sm text-emerald-700">
                  Test email sent successfully! Please check your inbox (and spam folder).
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Configuration Forms */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configuration Form */}
        <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">SMTP Settings</h2>
          
          <div className="grid gap-4">
            <div>
              <label htmlFor="preset" className="block text-sm font-medium text-slate-700 mb-1">
                Quick Setup
              </label>
              <select
                id="preset"
                name="preset"
                value={selectedPreset}
                onChange={handlePresetChange}
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm"
              >
                {Object.entries(PRECONFIGURED_PROVIDERS).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field 
                label="SMTP Host *" 
                name="host" 
                value={form.host} 
                onChange={handleInputChange} 
                placeholder="smtp.gmail.com" 
                required 
              />
              <Field 
                label="Port *" 
                name="port" 
                value={form.port} 
                onChange={handleInputChange} 
                type="number" 
                placeholder="587" 
                required 
              />
            </div>
            
            <Toggle 
              label="Use secure connection (TLS/SSL)" 
              name="secure" 
              checked={form.secure} 
              onChange={handleInputChange} 
            />
            
            <div className="grid gap-4 md:grid-cols-2">
              <Field 
                label="Email Address *" 
                name="user" 
                value={form.user} 
                onChange={handleInputChange} 
                placeholder="your-email@gmail.com" 
                required 
              />
              <Field 
                label="App Password *" 
                name="pass" 
                value={form.pass} 
                onChange={handleInputChange} 
                type="password" 
                placeholder="16-character app password" 
                required 
              />
            </div>
            
            <Field 
              label="Default Email Subject" 
              name="subject" 
              value={form.subject} 
              onChange={handleInputChange} 
              placeholder="APFRS Attendance Report" 
            />
            
            <Field 
              label="Test Recipient (optional)" 
              name="testRecipient" 
              value={form.testRecipient} 
              onChange={handleInputChange} 
              placeholder="test@example.com" 
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? <LoadingSpinner /> : '💾'}
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
            
            <button
              onClick={() => {
                setForm(defaultFormState);
                setSelectedPreset('custom');
                localStorage.removeItem('smtpConfig');
                setCurrentConfig({});
                setLastError(null);
                setTestingStatus('ready');
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              🗑️ Clear All
            </button>
          </div>
        </section>

        {/* Current Configuration & Help */}
        <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Current Configuration</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <dt className="text-slate-600">Host</dt>
                <dd className="font-mono text-slate-800">{currentConfig.host || 'Not set'}</dd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <dt className="text-slate-600">Port</dt>
                <dd className="font-mono text-slate-800">{currentConfig.port || '—'}</dd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <dt className="text-slate-600">Secure</dt>
                <dd className="font-mono text-slate-800">{currentConfig.secure ? 'Yes' : currentConfig.secure === false ? 'No' : '—'}</dd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <dt className="text-slate-600">From Email</dt>
                <dd className="font-mono text-slate-800 truncate max-w-40">{currentConfig.user || '—'}</dd>
              </div>
            </dl>
          </div>

          {/* Gmail Help Section */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-semibold text-slate-900 mb-3">Gmail Setup Guide</h3>
            <ol className="space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-3">
                <span className="bg-indigo-100 text-indigo-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">1</span>
                <p>Enable 2-Step Verification in your Google Account</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-indigo-100 text-indigo-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">2</span>
                <p>
                  Generate an{' '}
                  <a
                    href="https://support.google.com/accounts/answer/185833"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-500 underline"
                  >
                    App Password
                  </a>
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-indigo-100 text-indigo-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">3</span>
                <p>Use the app password instead of your regular password</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-indigo-100 text-indigo-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">4</span>
                <p>Port 587 with TLS recommended for Gmail</p>
              </li>
            </ol>
          </div>
        </section>
      </div>
    </div>
  );

  return <PageLayout Sidebar={sidebarContent} Body={bodyContent} />;
};

export default ConfigureSMTP;