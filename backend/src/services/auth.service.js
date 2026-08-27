// backend/src/services/auth.service.js
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { AppError, AuthenticationError } from '../utils/errors.js';
import { User } from '../models/User.js';
import { userRepository } from '../repositories/user.repository.js';
import { tokenRepository } from '../repositories/token.repository.js';
import { hashActivationToken } from '../utils/activation.js';

class AuthService {
  async login(email, password, requestId) {
    const attempts = await tokenRepository.getLoginAttempts(email);
    if (attempts?.lockedUntil && attempts.lockedUntil > Date.now()) {
      const waitMinutes = Math.ceil((attempts.lockedUntil - Date.now()) / 60000);
      throw new AppError(429, `Account temporarily locked due to failed attempts. Please try again in ${waitMinutes} minute(s).`);
    }

    const user = await userRepository.findByEmail(email);
    if (!user) {
      await tokenRepository.incrementLoginAttempts(email);
      logger.warn('Login failed: user not found', { email, requestId });
      throw new AuthenticationError('Invalid email or password.');
    }

    const isValid = await user.verifyPassword(password);
    if (!isValid) {
      await tokenRepository.incrementLoginAttempts(email);
      logger.warn('Login failed: invalid password', { email, userId: user.id, requestId });
      throw new AuthenticationError('Invalid email or password.');
    }

    // Reset login attempts on success
    await tokenRepository.resetLoginAttempts(email);

    // Generate tokens
    const tokens = this.generateTokens(user);

    logger.info('Login successful', {
      userId: user.id,
      email: user.email,
      role: user.role,
      requestId,
    });

    return {
      user: user.toProfile(),
      ...tokens,
    };
  }

  generateTokens(user) {
    const payload = {
      id:          user.id,
      name:        user.name,
      email:       user.email,
      role:        user.role,
      department:  user.department,
      designation: user.designation,
    };

    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
      issuer:    config.jwt.issuer,
      audience:  config.jwt.audience,
    });

    // Phase 10: refresh token removed — the frontend never integrated token
    // refresh (apiFetch redirected on every 401 instead of attempting refresh).
    // Access tokens are 24 h which is acceptable for this system.
    return {
      token,
      expiresIn: config.jwt.expiresIn,
    };
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret, {
        issuer:   config.jwt.issuer,
        audience: config.jwt.audience,
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError(401, 'Token has expired. Please log in again.');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new AppError(401, 'Invalid authentication token.');
      }
      throw new AppError(401, 'Token verification failed.');
    }
  }

  async logout(token, userId) {
    if (token) {
      await tokenRepository.addToBlacklist(token, userId);
    }
  }

  async isTokenBlacklisted(token) {
    return tokenRepository.isBlacklisted(token);
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError(404, 'User not found.');
    }

    const isValid = await user.verifyPassword(currentPassword);
    if (!isValid) {
      throw new AuthenticationError('Current password is incorrect.');
    }

    if (newPassword.length < 8) {
      throw new AppError(400, 'New password must be at least 8 characters long.');
    }

    await user.setPassword(newPassword);
    await userRepository.update(userId, { password_hash: user.passwordHash });

    logger.info('Password changed', { userId, email: user.email });
    return { success: true, message: 'Password changed successfully.' };
  }

  /**
   * Phase 8: Activate a faculty account using the one-time token emailed on creation.
   * Validates the token hash, checks expiry, sets the new password, and clears activation fields.
   */
  async activateAccount(rawToken, newPassword) {
    if (!rawToken) throw new AppError(400, 'Activation token is required.');
    if (!newPassword || newPassword.length < 8) {
      throw new AppError(400, 'Password must be at least 8 characters long.');
    }

    const tokenHash = hashActivationToken(rawToken);
    const user = await userRepository.findByActivationTokenHash(tokenHash);

    if (!user) {
      throw new AppError(400, 'Invalid or already-used activation token.');
    }

    const expiresAt = user.activationExpiresAt
      ? new Date(user.activationExpiresAt)
      : null;

    if (expiresAt && expiresAt < new Date()) {
      throw new AppError(400, 'Activation token has expired. Please contact your administrator.');
    }

    await user.setPassword(newPassword);

    // Clear activation fields atomically with the password update
    await userRepository.update(user.id, {
      password_hash:          user.passwordHash,
      activation_token_hash:  null,
      activation_expires_at:  null,
      must_change_password:   0,
    });

    logger.info('Faculty account activated', { userId: user.id, email: user.email });
    return { success: true, message: 'Account activated successfully. You can now log in.' };
  }

  /**
   * Ensures the configured administrator exists in the database on startup.
   * Throws if initialization fails so the server does not run in an undefined state.
   */
  async ensureDefaultAdmin() {
    const adminEmail = (config.admin.email || 'admin@apfrs.in').toLowerCase().trim();
    const existing = await userRepository.findByEmail(adminEmail);
    if (!existing) {
      logger.info('Default admin user not found, initializing...', { email: adminEmail });
      const adminUser = new User({
        id: 'admin-001',
        email: adminEmail,
        name: config.admin.name || 'APFRS Administrator',
        designation: 'Administrator',
        department: 'Administration',
        role: 'admin',
        isActive: true,
      });
      await adminUser.setPassword(config.admin.password || 'admin@123');
      const created = await userRepository.create(adminUser);
      if (!created) {
        throw new Error(`Failed to insert initial admin account (${adminEmail}) into database.`);
      }
      logger.info('✅ Default admin user initialized successfully');
    }
  }
}

export const authService = new AuthService();
export default authService;
