import React, { useState, useEffect } from 'react';

const EMAIL_API_BASE_URL = import.meta.env.VITE_EMAIL_API_URL || '/email-send';

const normalizeFormConfig = (cfg = {}) => ({
  host: (cfg.host || '').trim(),
  port: (cfg.port || '587').toString().trim() || '587',
  email: (cfg.email || '').trim(),
  password: typeof cfg.password === 'string' ? cfg.password.replace(/\s+/g, '') : '',
  security: cfg.security || 'tls'
});

const ENV_DEFAULT_SMTP_CONFIG = normalizeFormConfig({
  host: import.meta.env.VITE_SMTP_HOST || 'smtp.gmail.com',
  port: import.meta.env.VITE_SMTP_PORT || '587',
  email: import.meta.env.VITE_SMTP_EMAIL || '',
  password: import.meta.env.VITE_SMTP_PASSWORD || import.meta.env.VITE_SMTP_PASS || '',
  security: import.meta.env.VITE_SMTP_SECURITY || 'tls'
});

const ConfigureSMTP = () => {
  const [config, setConfig] = useState({
    host: '',
    port: '587',
    email: '',
    password: '',
    security: 'tls'
  });
  const [testStatus, setTestStatus] = useState('idle');
  const [testMessage, setTestMessage] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveMessage, setSaveMessage] = useState('');

  const defaultGmailConfig = ENV_DEFAULT_SMTP_CONFIG;

  useEffect(() => {
    // Load saved configuration from localStorage
    const savedConfig = localStorage.getItem('smtpConfig');
    if (savedConfig) {
      setConfig(normalizeFormConfig(JSON.parse(savedConfig)));
    } else {
      // Pre-fill with Gmail configuration
      setConfig({ ...defaultGmailConfig });
    }
  }, [defaultGmailConfig]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: value
    }));
    if (testStatus !== 'idle') {
      setTestStatus('idle');
      setTestMessage('');
    }
    if (saveStatus !== 'idle') {
      setSaveStatus('idle');
      setSaveMessage('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaveStatus('saving');
    
    try {
      const normalizedConfig = normalizeFormConfig(config);
      // Save to localStorage
      localStorage.setItem('smtpConfig', JSON.stringify(normalizedConfig));
      setConfig(normalizedConfig);
      setSaveStatus('success');
      setSaveMessage('SMTP configuration saved successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
        setSaveMessage('');
      }, 3000);
    } catch (error) {
      setSaveStatus('error');
      setSaveMessage('Failed to save configuration: ' + error.message);
    }
  };

  const handleReset = () => {
    setConfig({ ...defaultGmailConfig });
    localStorage.removeItem('smtpConfig');
    setSaveStatus('idle');
    setSaveMessage('');
    setTestStatus('idle');
    setTestMessage('');
  };

  const useGmailConfig = () => {
    setConfig({ ...defaultGmailConfig });
  };

  const isConfigComplete = (cfg) => {
    const normalized = normalizeFormConfig(cfg);
    return normalized.host && normalized.port && normalized.email && normalized.password;
  };

  const testSMTPConfiguration = async () => {
    if (!isConfigComplete(config)) {
      setTestStatus('error');
      setTestMessage('Please fill in all required fields before testing.');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Sending test email...');

    try {
      const normalizedConfig = normalizeFormConfig(config);
      const response = await fetch(`${EMAIL_API_BASE_URL}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          config: normalizedConfig,
          emailData: {
            from: `"SMTP Test" <${normalizedConfig.email}>`,
            to: normalizedConfig.email,
            subject: 'SMTP Test Email - Faculty Attendance System',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4f46e5; text-align: center;">SMTP Configuration Test</h2>
                <p>This is a test email from the Faculty Attendance System.</p>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #374151; margin-top: 0;">Configuration Details:</h3>
                  <ul style="color: #6b7280;">
                    <li><strong>Host:</strong> ${normalizedConfig.host}</li>
                    <li><strong>Port:</strong> ${normalizedConfig.port}</li>
                    <li><strong>Security:</strong> ${normalizedConfig.security}</li>
                    <li><strong>Email:</strong> ${normalizedConfig.email}</li>
                  </ul>
                </div>
                <p style="color: #6b7280; font-size: 14px; text-align: center;">
                  If you received this email, your SMTP configuration is working correctly.
                </p>
              </div>
            `,
            replyTo: config.email
          }
        })
      });

      const result = await response.json().catch(() => ({ success: false, message: 'Invalid server response' }));

      if (!response.ok || !result.success) {
        const composedMessage = [result?.message, result?.hint, result?.error]
          .filter(Boolean)
          .join(' — ');
        const err = new Error(composedMessage || 'Failed to send test email');
        if (result?.hint) err.hint = result.hint;
        throw err;
      }

      setTestStatus('success');
      setTestMessage('Test email sent successfully! Please check your inbox (and spam folder).');
    } catch (error) {
      const hint = error?.hint;
      const detailedMessage = [error?.message, hint].filter(Boolean).join(' — ');
      setTestStatus('error');
      setTestMessage(detailedMessage || 'Failed to send test email. Please check your configuration and try again.');
    }
  };

  return (
    <div className="min-h-screen  from-blue-50 to-indigo-100 pt-10 my-14">
      <div className="container mx-auto px-4 ">
        {/* Header */}
        <div className="mb-8">
           
          {/* Status Banner */}
          {saveStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-800 font-medium">{saveMessage}</span>
              </div>
            </div>
          )}

          {saveStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-800 font-medium">{saveMessage}</span>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Configuration Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {/* Form Header */}
              <div className="bg-linear-to-r from-indigo-500 to-purple-600 px-6 py-4">
                <h2 className="text-xl font-bold text-white">SMTP Server Configuration</h2>
                <p className="text-indigo-100 text-sm mt-1">
                  Enter your email provider's SMTP settings
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Quick Setup Button */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-green-800">Quick Gmail Setup</h4>
                      <p className="text-xs text-green-700">Use pre-configured Gmail settings</p>
                    </div>
                    <button
                      type="button"
                      onClick={useGmailConfig}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Apply Gmail Settings
                    </button>
                  </div>
                </div>

                {/* SMTP Host */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Host *
                  </label>
                  <input
                    type="text"
                    name="host"
                    value={config.host}
                    onChange={handleChange}
                    placeholder="smtp.gmail.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Port */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Port *
                    </label>
                    <select
                      name="port"
                      value={config.port}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                      required
                    >
                      <option value="587">587 (TLS - Recommended)</option>
                      <option value="465">465 (SSL)</option>
                      <option value="25">25 (Non-secure)</option>
                      <option value="2525">2525 (Alternative)</option>
                    </select>
                  </div>

                  {/* Security */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Security *
                    </label>
                    <select
                      name="security"
                      value={config.security}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                      required
                    >
                      <option value="tls">TLS (Recommended)</option>
                      <option value="ssl">SSL</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={config.email}
                    onChange={handleChange}
                    placeholder="your-email@gmail.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                    required
                  />
                </div>

                {/* App Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    App Password *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={config.password}
                    onChange={handleChange}
                    placeholder="Your app password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    For Gmail, use an app password instead of your regular password. For other providers, use your SMTP password.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset to Default
                  </button>
                  <button
                    type="submit"
                    disabled={saveStatus === 'saving'}
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 flex items-center justify-center disabled:opacity-60"
                  >
                    {saveStatus === 'saving' ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save Configuration
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar - Instructions and Test */}
          <div className="space-y-6">
            {/* Current Configuration Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Current Configuration</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Host:</span>
                  <span className="text-sm font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded">
                    {config.host || 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Port:</span>
                  <span className="text-sm font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded">
                    {config.port}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Security:</span>
                  <span className="text-sm font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded">
                    {config.security.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Email:</span>
                  <span className="text-sm font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded truncate max-w-[120px]">
                    {config.email || 'Not set'}
                  </span>
                </div>
              </div>
            </div>

            {/* Test Configuration Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Test Configuration</h3>
              <p className="text-sm text-gray-600 mb-4">
                Send a test email to verify your SMTP settings are working correctly.
              </p>
              
              <button
                type="button"
                onClick={testSMTPConfiguration}
                disabled={testStatus === 'testing' || !isConfigComplete(config)}
                className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 disabled:opacity-60 flex items-center justify-center"
              >
                {testStatus === 'testing' ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending Test Email...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Send Test Email
                  </>
                )}
              </button>

              {testMessage && (
                <div
                  className={`mt-4 p-3 rounded-lg text-sm font-medium ${
                    testStatus === 'success'
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : testStatus === 'error'
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : 'bg-blue-50 text-blue-800 border border-blue-200'
                  }`}
                >
                  {testMessage}
                </div>
              )}
            </div>

            {/* Instructions Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Gmail Setup Guide</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start">
                  <div className="bg-blue-100 text-blue-600 rounded-full p-1 mr-3 mt-0.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span>Enable 2-factor authentication in your Google Account</span>
                </div>
                <div className="flex items-start">
                  <div className="bg-blue-100 text-blue-600 rounded-full p-1 mr-3 mt-0.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span>Generate an app password from Google Account settings</span>
                </div>
                <div className="flex items-start">
                  <div className="bg-blue-100 text-blue-600 rounded-full p-1 mr-3 mt-0.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span>Use the app password instead of your regular Gmail password</span>
                </div>
                <div className="flex items-start">
                  <div className="bg-blue-100 text-blue-600 rounded-full p-1 mr-3 mt-0.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span>Port 587 with TLS is recommended for Gmail</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigureSMTP;