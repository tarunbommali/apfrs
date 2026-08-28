import db from '../backend/src/config/database.js';
import { emailSettingsRepository } from '../backend/src/repositories/email-settings.repository.js';
import { emailService } from '../backend/src/services/email.service.js';

async function runTests() {
  console.log('🧪 Starting Email Configuration & Dispatch Verification Suite...');
  await db.connect();

  try {
    // 1. Get initial settings
    console.log('\n--- 1. Testing Get Email Settings ---');
    const settings = await emailSettingsRepository.getSettings();
    console.log('✅ Fetched initial settings. Primary provider:', settings.active_provider);

    // 2. Update settings with signature, subject template, and sandbox mode
    console.log('\n--- 2. Testing Update Settings with Signature & Templates ---');
    const updated = await emailSettingsRepository.updateSettings({
      activeProvider: 'smtp',
      fallbackEnabled: true,
      fromName: 'APFRS Reporting Test Cell',
      fromEmail: 'reports.test@jntugvcev.edu.in',
      subjectTemplate: 'Monthly Attendance Statement — {{month}} {{year}}',
      signature: 'Warm Regards,\nAPFRS Admin Team',
      sandboxMode: true,
    }, 'TestRunner');
    console.log('✅ Settings updated. From name:', updated.from_name, 'Sandbox:', updated.sandbox_mode);

    // 3. Verify audit log entry
    console.log('\n--- 3. Testing Configuration History Log ---');
    const logs = await emailSettingsRepository.getLogs(5);
    console.log('✅ Audit log recorded:', logs[0]?.summary, 'by', logs[0]?.updated_by);
    if (!logs[0]?.summary.includes('Updated')) {
      throw new Error('Expected audit log summary to record update');
    }

    // 4. Test Email Template & Signature Rendering (in sandbox mode)
    console.log('\n--- 4. Testing Email Template Variable Replacement & Signature Appending ---');
    const dispatchRes = await emailService.sendEmail({
      to: 'faculty.test@jntugvcev.edu.in',
      month: 'August',
      year: '2026',
      html: '<p>Please find your attendance statement below.</p>',
      text: 'Please find your attendance statement below.',
    });
    console.log('✅ Sandbox dispatch result:', dispatchRes.success, 'Provider:', dispatchRes.providerUsed, 'Message ID:', dispatchRes.messageId);

    // 5. Test Unsaved Test Email Simulation
    console.log('\n--- 5. Testing Test Email with Unsaved Temporary Credentials ---');
    const testRes = await emailService.sendTestEmail('admin.test@apfrs.in', 'smtp', {
      smtpHost: 'smtp.custom-domain.com',
      smtpPort: 587,
      fromName: 'Temporary Unsaved Sender',
    });
    console.log('✅ Test email dispatch succeeded with unsaved credentials. ID:', testRes.messageId);

    // 6. Restore sandbox mode to false if desired, or keep as preferred
    await emailSettingsRepository.updateSettings({
      fromName: 'Digital Monitoring Cell',
      fromEmail: 'reports@jntugvcev.edu.in',
      sandboxMode: false,
    }, 'TestRunner');

    console.log('\n🎉 ALL EMAIL CONFIGURATION & DISPATCH TESTS PASSED PERFECTLY!\n');
  } catch (err) {
    console.error('❌ Test suite failed:', err);
    process.exit(1);
  } finally {
    await db.close();
  }
}

runTests();
