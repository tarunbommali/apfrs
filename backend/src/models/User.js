// backend/src/models/User.js
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export class User {
  constructor(data = {}) {
    this.id = data.id || `f-${uuidv4().split('-')[0]}`;
    this.cfms_id = data.cfms_id || null;
    this.email = data.email?.toLowerCase().trim() || '';
    this.name = data.name?.trim() || '';
    this.designation = data.designation || 'Assistant Professor';
    this.department = data.department?.trim() || '';
    this.mobile = data.mobile || '';
    this.job_status = data.job_status || 'Regular';
    this.role = data.role || 'faculty';
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.passwordHash = data.passwordHash || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
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
    const { passwordHash, ...safe } = this;
    return {
      ...safe,
      fullName: this.name,
      displayName: `${this.designation} ${this.name}`,
    };
  }

  toJSON() {
    return this.toProfile();
  }
}

export default User;
