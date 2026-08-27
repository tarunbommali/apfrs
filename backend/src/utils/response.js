// backend/src/utils/response.js
import { HTTP_STATUS } from '../config/constants.js';

export const sendSuccess = (res, data, statusCode = HTTP_STATUS.OK) => {
  return res.status(statusCode).json({
    success: true,
    data: data,
    ...(typeof data === 'object' && data !== null ? data : {}),
    timestamp: new Date().toISOString(),
  });
};

export const sendCreated = (res, data) => {
  return sendSuccess(res, data, HTTP_STATUS.CREATED);
};

export const sendAccepted = (res, data) => {
  return sendSuccess(res, data, HTTP_STATUS.ACCEPTED);
};

export const sendError = (res, statusCode, message, details = null) => {
  const response = {
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
  };

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
};

export const sendPaginated = (res, data, page, limit, total) => {
  const totalPages = Math.ceil(total / limit);

  return sendSuccess(res, {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
};

export default {
  sendSuccess,
  sendCreated,
  sendAccepted,
  sendError,
  sendPaginated,
};
