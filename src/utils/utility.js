const cleanValue = (value = '', { stripAllSpaces = false } = {}) => {
  if (value == null) return '';
  const str = typeof value === 'string' ? value : String(value);
  const trimmed = str.trim();
  return stripAllSpaces ? trimmed.replace(/\s+/g, '') : trimmed;
};

const mask = (value = '') => {
  if (!value) return '';
  if (value.includes('@')) {
    const parts = value.split('@');
    const u = parts[0];
    return u.length <= 2 ? `**@${parts[1]}` : `${u.slice(0, 2)}***@${parts[1]}`;
  }
  return value.length <= 4 ? '****' : `${value.slice(0, 2)}***${value.slice(-1)}`;
};

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const formatDate = (date = new Date()) => {
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatTime = (date = new Date()) => {
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export { cleanValue, mask, delay, formatDate, formatTime };