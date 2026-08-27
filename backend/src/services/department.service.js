// backend/src/services/department.service.js
import { departmentRepository } from '../repositories/department.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { inchargeRepository } from '../repositories/incharge.repository.js';
import { AppError, ConflictError, NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class DepartmentService {
  async getDepartmentsList(filters = {}) {
    return departmentRepository.getDepartmentsList(filters);
  }

  async getDepartmentById(id) {
    const dept = await departmentRepository.getDepartmentDetailsById(id);
    if (!dept) throw new NotFoundError('Department');
    return dept;
  }

  async createDepartment(data) {
    const { name, code, description, status, hodId } = data;

    if (!name || !name.trim()) throw new AppError(400, 'Department name is required.');
    if (!code || !code.trim()) throw new AppError(400, 'Department code is required.');

    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();

    // Check uniqueness of code and name
    const existingCode = await departmentRepository.findByCode(cleanCode);
    if (existingCode) throw new ConflictError('Department code is already in use.');

    const existingName = await departmentRepository.findByName(cleanName);
    if (existingName) throw new ConflictError('Department name is already in use.');

    if (hodId) {
      const faculty = await userRepository.findById(hodId);
      if (!faculty || faculty.role !== 'faculty') {
        throw new NotFoundError('Faculty member assigned as HOD');
      }
    }

    const deptId = `dept-${uuidv4().split('-')[0]}`;
    const newDept = {
      id: deptId,
      name: cleanName,
      code: cleanCode,
      description: description ? description.trim() : null,
      status: status || 'active',
      hod_id: hodId || null,
    };

    await departmentRepository.create(newDept);
    logger.info('Department created', { deptId, code: newDept.code });
    return this.getDepartmentById(deptId);
  }

  async updateDepartment(id, data) {
    const dept = await departmentRepository.findById(id);
    if (!dept) throw new NotFoundError('Department');

    const { name, code, description, status } = data;

    const updates = {};
    if (name !== undefined) {
      const cleanName = name.trim();
      if (!cleanName) throw new AppError(400, 'Department name cannot be empty.');
      const existingName = await departmentRepository.findByName(cleanName);
      if (existingName && existingName.id !== id) {
        throw new ConflictError('Department name is already in use.');
      }
      updates.name = cleanName;
    }

    if (code !== undefined) {
      const cleanCode = code.trim().toUpperCase();
      if (!cleanCode) throw new AppError(400, 'Department code cannot be empty.');
      const existingCode = await departmentRepository.findByCode(cleanCode);
      if (existingCode && existingCode.id !== id) {
        throw new ConflictError('Department code is already in use.');
      }
      updates.code = cleanCode;
    }

    if (description !== undefined) updates.description = description ? description.trim() : null;
    if (status !== undefined) {
      if (!['active', 'inactive'].includes(status)) {
        throw new AppError(400, 'Invalid status. Allowed values: active, inactive');
      }
      updates.status = status;
    }

    if (Object.keys(updates).length > 0) {
      await departmentRepository.update(id, updates);
      logger.info('Department updated', { id, updates: Object.keys(updates) });
    }

    return this.getDepartmentById(id);
  }

  async deleteDepartment(id) {
    const dept = await departmentRepository.findById(id);
    if (!dept) throw new NotFoundError('Department');

    await departmentRepository.delete(id);

    // Reset attached members to 'Uncategorized' fallback
    try {
      await db.query(
        `UPDATE users SET department = 'Uncategorized' WHERE department = ? AND role = 'faculty'`,
        [dept.code]
      );
      await db.query(
        `UPDATE faculty_monthly_attendance SET department = 'Uncategorized' WHERE department = ?`,
        [dept.code]
      );
      logger.info('Reset deleted department members to Uncategorized fallback', { code: dept.code });
    } catch (err) {
      logger.error('Failed to reset department members on delete:', { error: err.message });
    }

    logger.info('Department deleted', { id, code: dept.code });
    return { success: true, message: 'Department deleted successfully.' };
  }

  async assignIncharge(id, { hodId, role, startDate, endDate }) {
    const dept = await departmentRepository.findById(id);
    if (!dept) throw new NotFoundError('Department');

    const cleanRole = (role || 'HOD').trim();
    if (!['HOD', 'Department Incharge', 'Coordinator'].includes(cleanRole)) {
      throw new AppError(400, 'Invalid role. Allowed values: HOD, Department Incharge, Coordinator');
    }

    if (hodId) {
      const faculty = await userRepository.findById(hodId);
      if (!faculty || faculty.role !== 'faculty') {
        throw new NotFoundError('Faculty member');
      }

      // Check if this faculty is already an HOD of another active department
      const sqlCheck = `SELECT name FROM departments WHERE hod_id = ? AND id != ? AND status = 'active'`;
      const otherDepts = await db.query(sqlCheck, [hodId, id]);
      if (otherDepts.length > 0) {
        throw new ConflictError(`This faculty member is already the active HOD for the "${otherDepts[0].name}" department.`);
      }

      // Validate custom dates if provided
      const cleanStartDate = startDate || new Date().toISOString().split('T')[0];
      if (!cleanStartDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        throw new AppError(400, 'Valid start date (YYYY-MM-DD) is required.');
      }
      if (endDate && !endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        throw new AppError(400, 'End date must be in YYYY-MM-DD format.');
      }
      if (endDate && endDate < cleanStartDate) {
        throw new AppError(400, 'End date cannot be earlier than start date.');
      }

      // Assign incharge role in faculty_incharge_assignments
      // End any active assignments first to avoid conflicts
      const currentAssignment = await inchargeRepository.findCurrentByFacultyId(hodId);
      if (currentAssignment) {
        await inchargeRepository.endAssignment(currentAssignment.id, cleanStartDate);
      }
      
      await inchargeRepository.create({
        facultyId: hodId,
        role: cleanRole,
        startDate: cleanStartDate,
        endDate: endDate || null,
      });
      
      // Also update the incharge column on the user record itself
      await userRepository.update(hodId, { incharge: cleanRole });
    }

    // Update departments table hod_id
    await departmentRepository.update(id, { hod_id: hodId || null });
    logger.info('Department HOD assigned', { id, hodId, role: cleanRole, startDate, endDate });

    return this.getDepartmentById(id);
  }

  async updateStatus(id, status) {
    if (!['active', 'inactive'].includes(status)) {
      throw new AppError(400, 'Invalid status.');
    }
    await departmentRepository.update(id, { status });
    logger.info('Department status updated', { id, status });
    return this.getDepartmentById(id);
  }

  async getDepartmentFaculty(id) {
    const dept = await departmentRepository.findById(id);
    if (!dept) throw new NotFoundError('Department');
    return departmentRepository.getDepartmentFaculty(dept.code);
  }
}

export const departmentService = new DepartmentService();
export default departmentService;
