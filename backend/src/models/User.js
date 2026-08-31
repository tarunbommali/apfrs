// backend/src/models/User.js
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export class User {
  constructor(data = {}) {
    this.id = data.id || `f-${uuidv4().split('-')[0]}`;
    
    // Normalize cfms_id (empty strings -> null)
    const rawCfms = data.cfms_id !== undefined ? data.cfms_id : data.cfmsId;
    this.cfms_id = (rawCfms && String(rawCfms).trim().length > 0) ? String(rawCfms).trim() : null;

    this.email = data.email?.toLowerCase().trim() || '';
    this.photo_url = data.photo_url || data.photoURL || null;
    this.name = data.name?.trim() || '';
    this.designation = data.designation?.trim() || 'Assistant Professor';
    this.department = data.department?.trim() || 'General';
    this.mobile = data.mobile?.trim() || '';
    this.gender = (data.gender || 'male').toLowerCase().trim();

    // Normalize job_status: strictly 'Regular' or 'contract'
    const rawJob = String(data.job_status || data.jobStatus || 'Regular').trim().toLowerCase();
    this.job_status = rawJob === 'regular' ? 'Regular' : 'contract';

    this.higher_education = data.higher_education || data.higherEducation || null;

    // Legacy incharge fallback compatibility
    this.incharge = String(data.incharge || 'None').trim();
    this.currentIncharge = data.currentIncharge || null;

    this.role = data.role || 'faculty';
    this.isActive = data.isActive !== undefined
      ? Boolean(data.isActive)
      : (data.is_active !== undefined ? Boolean(data.is_active) : true);

    this.passwordHash = data.passwordHash || data.password_hash || null;
    this.activationTokenHash = data.activationTokenHash || data.activation_token_hash || null;
    this.activationExpiresAt = data.activationExpiresAt || data.activation_expires_at || null;
    this.mustChangePassword = data.mustChangePassword !== undefined
      ? Boolean(data.mustChangePassword)
      : (data.must_change_password !== undefined ? Boolean(data.must_change_password) : false);

    this.createdAt = data.createdAt || data.created_at || new Date().toISOString();
    this.updatedAt = data.updatedAt || data.updated_at || new Date().toISOString();
  }

  async setPassword(password) {
    this.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    this.updatedAt = new Date().toISOString();
  }

  async verifyPassword(password) {
    if (!this.passwordHash) return false;
    return await bcrypt.compare(password, this.passwordHash);
  }

  toProfile() {
    // Return safe user profile object without passwordHash
    const { passwordHash, activationTokenHash, ...safe } = this;
    return {
      ...safe,
      cfmsId: this.cfms_id || '',
      cfms_id: this.cfms_id || '',
      photoURL: this.photo_url || null,
      photo_url: this.photo_url || null,
      jobStatus: this.job_status,
      job_status: this.job_status,
      higherEducation: this.higher_education || null,
      higher_education: this.higher_education || null,
      gender: this.gender,
      incharge: this.currentIncharge?.role || (this.incharge !== 'None' ? this.incharge : 'None'),
      currentIncharge: this.currentIncharge || (this.incharge && this.incharge !== 'None' ? { role: this.incharge } : null),
      createdAt: this.createdAt,
      created_at: this.createdAt,
      dateOfJoining: this.createdAt,
      date_of_joining: this.createdAt,
      fullName: this.name,
      displayName: `${this.designation} ${this.name}`,
    };
  }

  toJSON() {
    return this.toProfile();
  }
}

export default User;
