// backend/src/services/auth.service.js
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { AppError, AuthenticationError } from '../utils/errors.js';
import { userRepository } from '../repositories/user.repository.js';
import { tokenRepository } from '../repositories/token.repository.js';

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
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      designation: user.designation,
    };

    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    });

    const refreshToken = jwt.sign(
      { id: user.id },
      config.jwt.secret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    return {
      token,
      refreshToken,
      expiresIn: config.jwt.expiresIn,
    };
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret, {
        issuer: config.jwt.issuer,
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

  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.secret);
      const user = await userRepository.findById(decoded.id);
      if (!user) {
        throw new AppError(401, 'User associated with refresh token no longer exists.');
      }
      return this.generateTokens(user);
    } catch (error) {
      throw new AppError(401, error.message || 'Invalid refresh token');
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
    await userRepository.update(userId, { passwordHash: user.passwordHash });

    logger.info('Password changed', { userId, email: user.email });
    return { success: true, message: 'Password changed successfully.' };
  }
}

export const authService = new AuthService();
export default authService;
