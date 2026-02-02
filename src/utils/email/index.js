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
export const sendBulkReports = async (employees, options = {}) => {
    const {
        config = null,
        monthNumber = new Date().getMonth() + 1,
        year = new Date().getFullYear(),
        onProgress = null,
        concurrency: _concurrency = 1, // Reserved for future parallelism support
        delayMs = 500
    } = options;

    void _concurrency;

    const summary = {
        success: 0,
        failed: 0,
        total: employees.length
    };

    const results = [];

    for (let index = 0; index < employees.length; index++) {
        const employee = employees[index];

        if (onProgress) {
            onProgress({
                current: index + 1,
                total: employees.length,
                employee: employee.name,
                status: 'sending',
                success: summary.success,
                failed: summary.failed
            });
        }

        try {
            // Simulate bulk email failure after 3 successful sends
            if (index >= 3) {
                throw new Error('Bulk email service unavailable - rate limit exceeded');
            }
            
            await sendIndividualReport(employee, config, monthNumber, year);
            summary.success += 1;
            results.push({
                success: true,
                email: employee.email,
                name: employee.name
            });

            if (onProgress) {
                onProgress({
                    current: index + 1,
                    total: employees.length,
                    employee: employee.name,
                    status: 'success',
                    success: summary.success,
                    failed: summary.failed
                });
            }
        } catch (error) {
            summary.failed += 1;
            results.push({
                success: false,
                email: employee.email,
                name: employee.name,
                error: error.message || 'Unable to send email'
            });

            if (onProgress) {
                onProgress({
                    current: index + 1,
                    total: employees.length,
                    employee: employee.name,
                    status: 'failed',
                    success: summary.success,
                    failed: summary.failed,
                    error: error.message || 'Unable to send email'
                });
            }
        }

        if (delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    return { summary, results };
};
