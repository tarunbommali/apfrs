// backend/src/middleware/rbac.js
import { sendError } from '../utils/response.js';

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Unauthorized. No user context found.');
    }

    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        403,
        `Forbidden. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}`
      );
    }

    next();
  };
};

export const requireDepartmentAccess = (req, res, next) => {
  if (!req.user) {
    return sendError(res, 401, 'Unauthorized.');
  }

  if (req.user.role === 'admin') return next();

  const targetDepartment = req.params.department || req.query.department || req.body.department;
  if (targetDepartment && targetDepartment.toLowerCase() !== req.user.department?.toLowerCase()) {
    return sendError(res, 403, 'Forbidden. You can only access records from your own department.');
  }

  next();
};

export default {
  requireRole,
  requireDepartmentAccess,
};
