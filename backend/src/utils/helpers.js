// backend/src/utils/helpers.js
import { v4 as uuidv4 } from 'uuid';

export const generateId = (prefix = '') => {
  const id = uuidv4().split('-')[0];
  return prefix ? `${prefix}-${id}` : id;
};

export const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const formatDate = (date) => {
  return new Date(date).toISOString();
};

export const maskEmail = (email) => {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 3) return `${local[0]}***@${domain}`;
  return `${local.substring(0, 3)}***@${domain}`;
};

export const sanitizeString = (str) => {
  if (!str) return '';
  return str.trim().replace(/[<>]/g, '');
};

export const getPagination = (page = 1, limit = 20, maxLimit = 100) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 20), maxLimit);
  const skip = (pageNum - 1) * limitNum;
  return { skip, take: limitNum, page: pageNum, limit: limitNum };
};

export default {
  generateId,
  sleep,
  formatDate,
  maskEmail,
  sanitizeString,
  getPagination,
};
