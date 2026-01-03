/**
 * String Formatting Helpers
 */

/**
 * Capitalizes the first letter of a string
 */
export const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Converts a string to title case
 */
export const toTitleCase = (str) => {
    if (!str) return '';
    return str
        .toLowerCase()
        .split(' ')
        .map(word => capitalize(word))
        .join(' ');
};

/**
 * Truncates a string to a specified length
 */
export const truncate = (str, maxLength = 50, suffix = '...') => {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength - suffix.length) + suffix;
};

/**
 * Sanitizes a string for use as a key/ID
 */
export const sanitizeKey = (str) => {
    if (!str) return '';
    return str
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
};

/**
 * Formats a number as a percentage
 */
export const formatPercentage = (value, decimals = 1) => {
    if (value == null || isNaN(value)) return '0.0%';
    return `${parseFloat(value).toFixed(decimals)}%`;
};

/**
 * Formats a number with commas
 */
export const formatNumber = (num) => {
    if (num == null || isNaN(num)) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
