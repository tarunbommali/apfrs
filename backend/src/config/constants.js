// backend/src/config/constants.js
export const ROLES = {
  ADMIN: 'admin',
  FACULTY: 'faculty',
};

export const JOB_STATUS = {
  REGULAR: 'Regular',
  CONTRACT: 'contract',
  AEE: 'AEE',
  NA: 'N/A',
};

export const ATTENDANCE_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SENT: 'sent',
  FAILED: 'failed',
  COMPLETED: 'completed',
};

export const EMAIL_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
};

export const CACHE_KEYS = {
  COLLEAGUES: 'colleagues',
  DEPARTMENT: 'department',
  FACULTY_LIST: 'faculty_list',
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
};

export const MESSAGES = {
  LOGIN_SUCCESS: 'Login successful',
  LOGIN_FAILED: 'Invalid email or password',
  LOGOUT_SUCCESS: 'Logged out successfully',
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_INVALID: 'Invalid token',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Forbidden access',
  USER_NOT_FOUND: 'User not found',
  USER_ALREADY_EXISTS: 'User already exists',
  FACULTY_NOT_FOUND: 'Faculty member not found',
  FACULTY_ALREADY_EXISTS: 'Faculty member already exists with this email',
  FACULTY_CREATED: 'Faculty member added successfully',
  FACULTY_UPDATED: 'Faculty member updated successfully',
  FACULTY_DELETED: 'Faculty member removed successfully',
  EMAIL_SENT: 'Email sent successfully',
  EMAIL_FAILED: 'Failed to send email',
  BULK_EMAIL_INITIATED: 'Bulk email send initiated',
  ATTENDANCE_SENT: 'Attendance records sent successfully',
  ATTENDANCE_FAILED: 'Failed to send attendance records',
  VALIDATION_ERROR: 'Validation failed',
};

export default {
  ROLES,
  JOB_STATUS,
  ATTENDANCE_STATUS,
  EMAIL_STATUS,
  CACHE_KEYS,
  HTTP_STATUS,
  MESSAGES,
};
