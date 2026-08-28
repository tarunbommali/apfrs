// backend/src/models/MonthlyAttendance.js
import { v4 as uuidv4 } from 'uuid';

export class MonthlyAttendanceSheet {
  constructor(data = {}) {
    this.id = data.id || `sheet-${uuidv4()}`;
    this.month = parseInt(data.month, 10);
    this.year = parseInt(data.year, 10);
    this.fileName = data.fileName || data.file_name || '';
    this.totalFaculty = parseInt(data.totalFaculty || data.total_faculty || 0, 10);
    this.workingDays = parseInt(data.workingDays || data.working_days || 24, 10);
    this.uploadedBy = data.uploadedBy || data.uploaded_by || 'Admin';
    this.createdAt = data.createdAt || data.created_at || new Date().toISOString();
    this.updatedAt = data.updatedAt || data.updated_at || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      month: this.month,
      year: this.year,
      fileName: this.fileName,
      totalFaculty: this.totalFaculty,
      workingDays: this.workingDays,
      uploadedBy: this.uploadedBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export class FacultyMonthlyAttendance {
  constructor(data = {}) {
    this.id = data.id || `fma-${uuidv4()}`;
    this.sheetId = data.sheetId || data.sheet_id;
    this.facultyId = data.facultyId || data.faculty_id || null;
    this.cfmsId = String(data.cfmsId || data.cfms_id || '').trim();
    this.name = String(data.name || data.faculty_name || '').trim();
    this.email = String(data.email || '').toLowerCase().trim();
    this.department = String(data.department || 'General').trim();
    this.designation = String(data.designation || 'Assistant Professor').trim();
    this.gender = (data.gender || 'male').toLowerCase().trim();
    this.incharge = String(data.incharge || 'None').trim() || 'None';

    const rawJob = String(data.jobStatus || data.job_status || '').toLowerCase().trim();
    this.jobStatus = rawJob === 'regular' ? 'Regular' : 'contract';

    this.month = parseInt(data.month, 10);
    this.year = parseInt(data.year, 10);

    const daily = Array.isArray(data.attendance)
      ? data.attendance
      : (typeof data.daily_records === 'string'
          ? JSON.parse(data.daily_records || '[]')
          : (data.daily_records || []));

    this.dailyRecords = daily;
    this.attendance = daily;

    // Compute or read metric counters
    this.presentDays = data.presentDays !== undefined
      ? parseInt(data.presentDays, 10)
      : (data.present_days !== undefined ? parseInt(data.present_days, 10) : daily.filter((d) => d.status === 'P').length);

    this.absentDays = data.absentDays !== undefined
      ? parseInt(data.absentDays, 10)
      : (data.absent_days !== undefined ? parseInt(data.absent_days, 10) : daily.filter((d) => d.status === 'A').length);

    this.leaveDays = data.leaveDays !== undefined
      ? parseInt(data.leaveDays, 10)
      : (data.leave_days !== undefined ? parseInt(data.leave_days, 10) : daily.filter((d) => d.status === 'L').length);

    this.halfDays = data.halfDays !== undefined
      ? parseInt(data.halfDays, 10)
      : (data.half_days !== undefined ? parseInt(data.half_days, 10) : daily.filter((d) => d.status === 'HD').length);

    this.lateDays = data.lateDays !== undefined
      ? parseInt(data.lateDays, 10)
      : (data.late_days !== undefined ? parseInt(data.late_days, 10) : daily.filter((d) => d.status === 'Late').length);

    this.holidayDays = data.holidayDays !== undefined
      ? parseInt(data.holidayDays, 10)
      : (data.holiday_days !== undefined ? parseInt(data.holiday_days, 10) : daily.filter((d) => d.status === 'H').length);

    this.totalWorkingDays = data.totalWorkingDays !== undefined
      ? parseInt(data.totalWorkingDays, 10)
      : (data.total_working_days !== undefined
          ? parseInt(data.total_working_days, 10)
          : (data.workingDays !== undefined ? parseInt(data.workingDays, 10) : daily.filter((d) => d.status !== 'H').length));

    if (data.attendancePercentage !== undefined || data.attendance_percentage !== undefined) {
      this.attendancePercentage = parseFloat(data.attendancePercentage || data.attendance_percentage || 0);
    } else {
      const effective = this.presentDays + this.lateDays + this.halfDays * 0.5;
      this.attendancePercentage = this.totalWorkingDays > 0
        ? Math.round((effective / this.totalWorkingDays) * 10000) / 100
        : 0;
    }

    this.createdAt = data.createdAt || data.created_at || new Date().toISOString();
    this.updatedAt = data.updatedAt || data.updated_at || new Date().toISOString();
    this.dispatchStatus = data.dispatchStatus || data.dispatch_status || null;
  }

  toRecord() {
    return {
      name: this.name,
      email: this.email,
      cfmsId: this.cfmsId,
      department: this.department,
      designation: this.designation,
      jobStatus: this.jobStatus,
      gender: this.gender,
      attendance: this.dailyRecords,
      metrics: {
        workingDays: this.totalWorkingDays,
        present: this.presentDays,
        absent: this.absentDays,
        leave: this.leaveDays,
        halfDay: this.halfDays,
        late: this.lateDays,
        holiday: this.holidayDays,
        percentage: this.attendancePercentage,
      },
    };
  }

  toJSON() {
    return {
      id: this.id,
      sheetId: this.sheetId,
      facultyId: this.facultyId,
      cfmsId: this.cfmsId,
      name: this.name,
      email: this.email,
      department: this.department,
      designation: this.designation,
      jobStatus: this.jobStatus,
      gender: this.gender,
      month: this.month,
      year: this.year,
      presentDays: this.presentDays,
      absentDays: this.absentDays,
      leaveDays: this.leaveDays,
      halfDays: this.halfDays,
      lateDays: this.lateDays,
      holidayDays: this.holidayDays,
      totalWorkingDays: this.totalWorkingDays,
      attendancePercentage: this.attendancePercentage,
      dailyRecords: this.dailyRecords,
      attendance: this.dailyRecords,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      dispatchStatus: this.dispatchStatus,
      dispatch_status: this.dispatchStatus,
    };
  }
}

export default {
  MonthlyAttendanceSheet,
  FacultyMonthlyAttendance,
};
