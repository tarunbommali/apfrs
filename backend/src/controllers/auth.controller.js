// backend/src/controllers/auth.controller.js
import { authService } from '../services/auth.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { AppError } from '../utils/errors.js';

export class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password, req.requestId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async me(req, res, next) {
    try {
      return sendSuccess(res, { user: req.user });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      if (req.token) {
        await authService.logout(req.token, req.user?.id);
      }
      return sendSuccess(res, { message: 'Logged out successfully.' });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Phase 8: One-time account activation endpoint.
   * Accepts the raw token from the activation email and a new password.
   */
  async activate(req, res, next) {
    try {
      const { token, newPassword } = req.body;
      const result = await authService.activateAccount(token, newPassword);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
export default authController;
