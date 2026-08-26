// backend/src/middleware/validation.js
import { sendError } from '../utils/response.js';

export const validate = (schema) => {
  return (req, res, next) => {
    try {
      if (req.body && Object.keys(req.body).length > 0) {
        const result = schema.safeParse(req.body);
        if (!result.success) {
          const errors = result.error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          }));
          return sendError(res, 400, 'Validation failed', errors);
        }
        req.body = result.data;
      }
      next();
    } catch (error) {
      return sendError(res, 500, `Validation processing error: ${error.message}`);
    }
  };
};

export default validate;
