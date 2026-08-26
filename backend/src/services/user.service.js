// backend/src/services/user.service.js
import { User } from '../models/User.js';
import { userRepository } from '../repositories/user.repository.js';
import { AppError, ConflictError, NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import bcrypt from 'bcryptjs';

class UserService {
  async getFacultyList(filters = {}) {
    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || config.pagination.defaultLimit;

    const allFiltered = await userRepository.findAllFaculty(filters);
    const total = allFiltered.length;

    const start = (page - 1) * limit;
    const paginated = allFiltered.slice(start, start + limit);

    const departmentSummary = allFiltered.reduce((acc, f) => {
      acc[f.department] = (acc[f.department] || 0) + 1;
      return acc;
    }, {});

    return {
      faculty: paginated.map((f) => f.toProfile()),
      total,
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
    return faculty.toProfile();
  }

  async createFaculty(data) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new ConflictError('A faculty member with this email already exists.');
    }

    const user = new User({
      ...data,
      role: 'faculty',
    });

    // Default password = cfms_id
    await user.setPassword(data.cfms_id);
    const created = await userRepository.create(user);

    logger.info('Faculty created', { facultyId: created.id, email: created.email });
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

    const updated = await userRepository.update(id, data);
    logger.info('Faculty updated', { facultyId: id, updates: Object.keys(data) });
    return updated.toProfile();
  }

  async deleteFaculty(id) {
    const user = await userRepository.findById(id);
    if (!user || user.role !== 'faculty') {
      throw new NotFoundError('Faculty member');
    }

    await userRepository.delete(id);
    logger.info('Faculty removed', { facultyId: id, email: user.email });
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

  async initializeUsers() {
    await userRepository.initializeMemoryStore();
  }
}

export const userService = new UserService();
export default userService;
