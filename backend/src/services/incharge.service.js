import { inchargeRepository } from '../repositories/incharge.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { AppError, ConflictError, NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { VALID_INCHARGE_ROLES } from '../models/InchargeAssignment.js';

class InchargeService {
  async getAssignments(facultyId) {
    if (!facultyId) throw new AppError(400, 'Faculty ID is required.');
    const faculty = await userRepository.findById(facultyId);
    if (!faculty) throw new AppError(404, 'Faculty member not found.');

    const history = await inchargeRepository.findByFacultyId(facultyId);
    const current = await inchargeRepository.findCurrentByFacultyId(facultyId);

    return {
      facultyId,
      currentIncharge: current,
      inchargeHistory: history,
    };
  }

  async getCurrentAssignment(facultyId) {
    if (!facultyId) throw new AppError(400, 'Faculty ID is required.');
    return inchargeRepository.findCurrentByFacultyId(facultyId);
  }

  async createAssignment(facultyId, { role, startDate, endDate }) {
    if (!facultyId) throw new AppError(400, 'Faculty ID is required.');
    const faculty = await userRepository.findById(facultyId);
    if (!faculty) throw new AppError(404, 'Faculty member not found.');

    const cleanRole = (role || '').trim();
    if (!VALID_INCHARGE_ROLES.includes(cleanRole)) {
      throw new AppError(400, `Invalid incharge role. Allowed values: ${VALID_INCHARGE_ROLES.join(', ')}`);
    }

    if (!startDate || !startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      throw new AppError(400, 'Valid start date (YYYY-MM-DD) is required.');
    }

    if (endDate) {
      if (!endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        throw new AppError(400, 'End date must be in YYYY-MM-DD format.');
      }
      if (endDate < startDate) {
        throw new AppError(400, 'End date cannot be earlier than start date.');
      }
    }

    // Overlap validation
    const overlap = await inchargeRepository.hasOverlap(facultyId, startDate, endDate || null);
    if (overlap) {
      const overlapPeriod = `${overlap.start_date} to ${overlap.end_date || 'Present'}`;
      throw new AppError(409, `Incharge assignment overlaps with existing "${overlap.role}" role (${overlapPeriod}). Please end the existing assignment first.`);
    }

    const assignment = await inchargeRepository.create({
      facultyId,
      role: cleanRole,
      startDate,
      endDate: endDate || null,
    });

    logger.info('Incharge assignment created', { facultyId, role: cleanRole, startDate, endDate });
    return assignment;
  }

  async updateAssignment(id, { role, startDate, endDate }) {
    if (!id) throw new AppError(400, 'Assignment ID is required.');
    const existing = await inchargeRepository.findById(id);
    if (!existing) throw new AppError(404, 'Incharge assignment not found.');

    const cleanRole = (role || existing.role).trim();
    if (!VALID_INCHARGE_ROLES.includes(cleanRole)) {
      throw new AppError(400, `Invalid incharge role. Allowed values: ${VALID_INCHARGE_ROLES.join(', ')}`);
    }

    const cleanStartDate = startDate || existing.startDate;
    const cleanEndDate = endDate !== undefined ? (endDate || null) : existing.endDate;

    if (!cleanStartDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      throw new AppError(400, 'Valid start date (YYYY-MM-DD) is required.');
    }

    if (cleanEndDate) {
      if (!cleanEndDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        throw new AppError(400, 'End date must be in YYYY-MM-DD format.');
      }
      if (cleanEndDate < cleanStartDate) {
        throw new AppError(400, 'End date cannot be earlier than start date.');
      }
    }

    // Overlap validation (excluding this assignment ID)
    const overlap = await inchargeRepository.hasOverlap(existing.facultyId, cleanStartDate, cleanEndDate, id);
    if (overlap) {
      const overlapPeriod = `${overlap.start_date} to ${overlap.end_date || 'Present'}`;
      throw new AppError(409, `Incharge assignment overlaps with existing "${overlap.role}" role (${overlapPeriod}).`);
    }

    const updated = await inchargeRepository.update(id, {
      role: cleanRole,
      startDate: cleanStartDate,
      endDate: cleanEndDate,
    });

    logger.info('Incharge assignment updated', { id, facultyId: existing.facultyId, role: cleanRole });
    return updated;
  }

  async endAssignment(id, endDate) {
    if (!id) throw new AppError(400, 'Assignment ID is required.');
    const existing = await inchargeRepository.findById(id);
    if (!existing) throw new AppError(404, 'Incharge assignment not found.');

    const effectiveEndDate = endDate || new Date().toISOString().split('T')[0];
    if (effectiveEndDate < existing.startDate) {
      throw new AppError(400, 'End date cannot be earlier than start date.');
    }

    const updated = await inchargeRepository.endAssignment(id, effectiveEndDate);
    logger.info('Incharge assignment ended', { id, facultyId: existing.facultyId, endDate: effectiveEndDate });
    return updated;
  }

  async deleteAssignment(id) {
    if (!id) throw new AppError(400, 'Assignment ID is required.');
    const existing = await inchargeRepository.findById(id);
    if (!existing) throw new AppError(404, 'Incharge assignment not found.');

    await inchargeRepository.delete(id);
    logger.info('Incharge assignment deleted', { id, facultyId: existing.facultyId });
    return { success: true, message: 'Incharge assignment deleted successfully.' };
  }
}

export const inchargeService = new InchargeService();
export default inchargeService;
