/**
 * Date & Time Formatting Helpers
 */

/**
 * Formats a date object to readable string
 */
export const formatDate = (date, format = 'DD/MM/YYYY') => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return format
        .replace('DD', day)
        .replace('MM', month)
        .replace('YYYY', year);
};

/**
 * Formats time string (HH:MM)
 */
export const formatTime = (timeValue) => {
    if (!timeValue) return '';
    const timeStr = timeValue.toString().trim();
    if (!timeStr) return '';
    if (timeStr.includes(':')) return timeStr;

    // Handle Excel decimal time format
    if (!isNaN(Number(timeStr))) {
        const timeNum = parseFloat(timeStr);
        if (timeNum < 1) {
            const totalMinutes = Math.round(timeNum * 24 * 60);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }

        const hours = Math.floor(timeNum);
        const minutes = Math.round((timeNum - hours) * 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    return timeStr;
};

/**
 * Parses duration string to hours
 */
export const parseDurationToHours = (durationStr) => {
    if (!durationStr) return 0;

    const trimmed = durationStr.toString().trim();
    if (!trimmed) return 0;

    // Handle "HH:MM:SS" or "HH:MM" format
    if (trimmed.includes(':')) {
        const parts = trimmed.split(':');
        const hours = parseInt(parts[0], 10) || 0;
        const minutes = parseInt(parts[1], 10) || 0;
        const seconds = parseInt(parts[2], 10) || 0;
        return hours + minutes / 60 + seconds / 3600;
    }

    // Handle decimal hours
    const num = parseFloat(trimmed);
    return isNaN(num) ? 0 : num;
};

/**
 * Estimates hours from in/out times
 */
export const estimateHoursFromTimes = (inTime, outTime) => {
    if (!inTime || !outTime) return 0;

    const parseTime = (timeStr) => {
        const formatted = formatTime(timeStr);
        if (!formatted.includes(':')) return null;
        const [hours, minutes] = formatted.split(':').map(Number);
        return hours + minutes / 60;
    };

    const inHours = parseTime(inTime);
    const outHours = parseTime(outTime);

    if (inHours === null || outHours === null) return 0;

    let diff = outHours - inHours;
    if (diff < 0) diff += 24; // Handle overnight shifts
    if (diff > 12) diff = 8; // Cap at reasonable work hours

    return Math.max(0, diff);
};

/**
 * Gets month name from number
 */
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export const getMonthName = (monthNumber) => {
    if (monthNumber < 1 || monthNumber > 12) return '';
    return MONTH_NAMES[monthNumber - 1];
};

export const getShortMonthName = (monthNumber) => {
    const name = getMonthName(monthNumber);
    return name ? name.substring(0, 3) : '';
};
