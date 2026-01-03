/**
 * Validation Helper Functions
 */

/**
 * Validates email format
 */
export const isValidEmail = (email) => {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
};

/**
 * Validates phone number (basic)
 */
export const isValidPhone = (phone) => {
    if (!phone) return false;
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    return phoneRegex.test(phone.trim());
};

/**
 * Validates if value is a number
 */
export const isNumeric = (value) => {
    if (value == null || value === '') return false;
    return !isNaN(parseFloat(value)) && isFinite(value);
};

/**
 * Validates if value is within range
 */
export const isInRange = (value, min, max) => {
    const num = parseFloat(value);
    if (isNaN(num)) return false;
    return num >= min && num <= max;
};

/**
 * Validates if string is not empty
 */
export const isNotEmpty = (value) => {
    if (value == null) return false;
    return String(value).trim().length > 0;
};

/**
 * Validates SMTP configuration
 */
export const validateSMTPConfig = (config) => {
    if (!config) {
        return { isValid: false, error: 'No SMTP configuration provided' };
    }

    const requiredFields = ['host', 'port', 'user', 'pass'];
    const missingFields = requiredFields.filter(field => !config[field]);

    if (missingFields.length > 0) {
        return {
            isValid: false,
            error: `Missing required fields: ${missingFields.join(', ')}`
        };
    }

    // Validate port number
    const port = parseInt(config.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
        return { isValid: false, error: 'Invalid port number' };
    }

    // Validate email format for user
    if (!isValidEmail(config.user)) {
        return { isValid: false, error: 'Invalid email address format for user' };
    }

    return { isValid: true };
};

/**
 * Validates attendance status
 */
export const isValidAttendanceStatus = (status) => {
    const validStatuses = ['P', 'A', 'Weekend', 'Leave', 'Holiday'];
    if (!status) return false;
    return validStatuses.includes(status) || status.length > 0;
};
