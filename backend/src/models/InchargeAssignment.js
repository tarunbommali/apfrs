// backend/src/models/InchargeAssignment.js
import { v4 as uuidv4 } from 'uuid';

export const VALID_INCHARGE_ROLES = [
  'HOD',
  'Principal',
  'Vice Principal',
  'Vice Chancellor (VC)',
  'Registrar',
];

export class InchargeAssignment {
  constructor(data = {}) {
    this.id = data.id || `inc-${uuidv4().split('-')[0]}`;
    this.facultyId = data.facultyId || data.faculty_id;
    this.role = data.role;
    this.startDate = data.startDate || data.start_date;
    this.endDate = data.endDate || data.end_date || null;
    this.createdAt = data.createdAt || data.created_at || new Date().toISOString();
    this.updatedAt = data.updatedAt || data.updated_at || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      facultyId: this.facultyId,
      faculty_id: this.facultyId,
      role: this.role,
      startDate: this.startDate,
      start_date: this.startDate,
      endDate: this.endDate,
      end_date: this.endDate,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export default InchargeAssignment;
