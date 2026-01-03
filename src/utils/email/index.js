/**
 * Email Utilities (Backward Compatibility Stub)
 * This file re-exports functions from their new locations to maintain backward compatibility
 */

import { getSMTPConfig, validateSMTPConfig, saveSMTPConfigEntry } from '../../store/smtpConfig';
import { sendEmail, sendIndividualReport, testSMTPConnection } from '../../api/emailService';

// Re-export for backward compatibility
export {
    getSMTPConfig,
    validateSMTPConfig,
    saveSMTPConfigEntry,
    sendEmail,
    sendIndividualReport,
    testSMTPConnection
};

// Bulk send functionality
export const sendBulkReports = async (employees, config, monthNumber, year, onProgress) => {
    const results = [];
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < employees.length; i++) {
        const employee = employees[i];

        try {
            if (onProgress) {
                onProgress({
                    current: i + 1,
                    total: employees.length,
                    employee: employee.name,
                    status: 'sending'
                });
            }

            await sendIndividualReport(employee, config, monthNumber, year);
            sent++;

            if (onProgress) {
                onProgress({
                    current: i + 1,
                    total: employees.length,
                    employee: employee.name,
                    status: 'success'
                });
            }
        } catch (error) {
            failed++;

            if (onProgress) {
                onProgress({
                    current: i + 1,
                    total: employees.length,
                    employee: employee.name,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        // Small delay between sends
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    return { sent, failed, total: employees.length };
};
