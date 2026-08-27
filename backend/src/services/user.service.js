// backend/src/services/user.service.js
import { User } from '../models/User.js';
import { userRepository } from '../repositories/user.repository.js';
import { inchargeRepository } from '../repositories/incharge.repository.js';
import { emailService } from './email.service.js';
import { AppError, ConflictError, NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import bcrypt from 'bcryptjs';
import { generateActivationToken, hashActivationToken } from '../utils/activation.js';

class UserService {
  async getFacultyList(filters = {}) {
    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || config.pagination.defaultLimit;
    const offset = (page - 1) * limit;

    const [rows, total, departmentRows] = await Promise.all([
      userRepository.findAllFaculty({ ...filters, limit, offset }),
      userRepository.countFaculty(filters),
      userRepository.getDepartmentStats(),
    ]);

    const departmentSummary = Object.fromEntries(
      departmentRows.map((r) => [r.department, Number(r.total_faculty)])
    );

    return {
      faculty: rows.map((f) => f.toProfile()),
      total: Number(total),
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      departmentSummary,
    };
  }

  async getFacultyById(id) {
    const faculty = await userRepository.findById(id);
    if (!faculty || faculty.role !== 'faculty') {
      throw new NotFoundError('Faculty member');
    }
    const inchargeHistory = await inchargeRepository.findByFacultyId(id);
    return {
      ...faculty.toProfile(),
      inchargeHistory: inchargeHistory.map((h) => h.toJSON()),
    };
  }

  async createFaculty(data) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new ConflictError('A faculty member with this email already exists.');
    }

    const photoUrl = data.photo_url || data.photoURL || null;

    const user = new User({
      ...data,
      photo_url: photoUrl,
      role: 'faculty',
    });

    const rawToken = generateActivationToken();
    const tokenHash = hashActivationToken(rawToken);
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72-hour window

    await user.setPassword(generateActivationToken());

    user.activationTokenHash = tokenHash;
    user.activationExpiresAt = expiresAt;
    user.mustChangePassword = true;

    const created = await userRepository.create(user);

    try {
      const activationUrl = `${config.frontendUrl}/activate?token=${rawToken}`;
      await emailService.sendEmail({
        to: created.email,
        subject: 'Activate your APFRS faculty account',
        html: `
          <p>Dear ${created.name},</p>
          <p>Your faculty account has been created. Please click the link below to set your password and activate your account:</p>
          <p><a href="${activationUrl}">${activationUrl}</a></p>
          <p>This link expires in 72 hours.</p>
          <p>If you did not expect this email, please contact your administrator.</p>
        `,
      });
      logger.info('Activation email sent', { facultyId: created.id, email: created.email });
    } catch (emailErr) {
      logger.error('Activation email failed (faculty created, activation pending)', {
        facultyId: created.id,
        email: created.email,
        error: emailErr.message,
      });
    }

    logger.info('Faculty created with activation pending', { facultyId: created.id, email: created.email });
    return created.toProfile();
  }

  async updateFaculty(id, data) {
    const user = await userRepository.findById(id);
    if (!user || user.role !== 'faculty') {
      throw new NotFoundError('Faculty member');
    }

    if (data.email && data.email.toLowerCase() !== user.email.toLowerCase()) {
      const existing = await userRepository.findByEmail(data.email);
      if (existing && existing.id !== id) {
        throw new ConflictError('Email address is already in use by another faculty member.');
      }
    }

    const updates = { ...data };
    if (data.photoURL !== undefined) updates.photo_url = data.photoURL;

    const updated = await userRepository.update(id, updates);
    logger.info('Faculty updated', { facultyId: id, updates: Object.keys(updates) });
    return updated.toProfile();
  }

  async deleteFaculty(id) {
    const user = await userRepository.findById(id);
    if (!user || user.role !== 'faculty') {
      throw new NotFoundError('Faculty member');
    }

    await userRepository.delete(id);
    logger.info('Faculty removed (soft deleted)', { facultyId: id, email: user.email });
    return { success: true, message: 'Faculty member removed successfully.' };
  }

  async getColleagues(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    const colleagues = await userRepository.getColleagues(userId);
    return {
      department: user.department,
      colleagues: colleagues.map((c) => ({
        id: c.id,
        name: c.name,
        photoURL: c.photo_url || null,
        designation: c.designation,
        department: c.department,
        mobile: c.mobile,
        job_status: c.job_status,
      })),
      total: colleagues.length,
    };
  }

  async getStats() {
    return userRepository.getStats();
  }

  async updateMyProfile(userId, { mobile, email, photoURL }) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    const updates = {};
    if (mobile !== undefined) updates.mobile = mobile;
    if (photoURL !== undefined) updates.photo_url = photoURL;
    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      const existing = await userRepository.findByEmail(email);
      if (existing && existing.id !== userId) {
        throw new ConflictError('Email address is already in use.');
      }
      updates.email = email.toLowerCase().trim();
    }

    const updated = await userRepository.update(userId, updates);
    return updated.toProfile();
  }
}

export const userService = new UserService();
export default userService;
