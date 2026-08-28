# Design Doc: Faculty Registry Source of Truth & Biometric Attendance Seeding

**Date:** 2026-08-28  
**Topic:** Faculty Source of Truth and Attendance Timing Seeding

---

## 1. Problem & Context

Currently, the system auto-provisions missing faculty profiles in the database when an attendance Excel sheet is uploaded. However, the database registry should be the absolute source of truth. Additionally, the biometric in/out timings parsed from Excel are not fully integrated into the calculation of present days or synchronized with calendar working days properly, nor are the warning messages reported back when unregistered faculty profiles are encountered.

---

## 2. Requirements & Approved Decisions

1. **Database Registry is the Source of Truth:**
   * Attendance records are mapped to database users **strictly** using `cfms_id`.
   * Unregistered CFMS IDs are skipped during seeding. A list of warnings/unregistered CFMS IDs is returned to the client.
   * Registered users' details (name, email, department, designation, gender, job status) are retrieved strictly from their database profiles (the database registry is the source of truth).
2. **Present Days & Calendar Sync:**
   * On calendar working days (non-Sunday, non-academic holiday): a punch (in/out timing present) marks the day as Present (`P`).
   * On Sundays/holidays: the day is marked Holiday (`H`) and does **not** count towards working or present days, regardless of punches.
3. **Frontend Sync:**
   * The client updates its local context store using the successfully imported records returned by the backend (instead of raw client-side parsed values).
   * Visual warning toast informs the admin if any records were skipped.

---

## 3. Technical Specifications

### Backend Changes

#### [`monthly-attendance.repository.js`](file:///c:/Users/Tarun/.vscode/workspace/Projects/apfrs/backend/src/repositories/monthly-attendance.repository.js)
* Change `existingFacultyMap` to load users strictly by `cfmsIds`.
* Skip any Excel row where `cfms_id` is missing or not present in the registry.
* Track skipped rows in a `skippedCfmsIds` warnings array.
* Map daily record status:
  ```javascript
  const isSun = new Date(dateStr).getDay() === 0;
  const isHol = holidayDateSet.has(dateStr);
  const hasTiming = Boolean((d.inTime && String(d.inTime).trim()) || (d.outTime && String(d.outTime).trim()));

  let finalStatus = d.status || 'A';
  if (isSun || isHol) {
    finalStatus = 'H';
    holidayDays += 1;
  } else if (hasTiming || d.status === 'P' || d.status === 'Late') {
    finalStatus = 'P';
    presentDays += 1;
  } else if (d.status === 'HD' || d.status === 'HALF') {
    finalStatus = 'HD';
    halfDays += 1;
  } else if (d.status === 'L' || d.status === 'CL' || d.status === 'OD' || d.status === 'LEAVE') {
    finalStatus = 'L';
    leaveDays += 1;
  } else {
    finalStatus = 'A';
    absentDays += 1;
  }
  ```
* Save the filtered records count as `total_faculty` in `monthly_attendance_sheets`.
* Return `{ ...getMonthlyAttendance(numMonth, numYear), warnings: skippedCfmsIds }`.

#### [`attendance.service.js`](file:///c:/Users/Tarun/.vscode/workspace/Projects/apfrs/backend/src/services/attendance.service.js)
* Update `importAttendanceData` to propagate skipped CFMS ID warnings to the returned REST payload structure.

---

### Frontend Changes

#### [`import.tsx`](file:///c:/Users/Tarun/.vscode/workspace/Projects/apfrs/frontend/src/routes/import.tsx)
* Store the response from `importAttendance.mutateAsync`.
* Set context store data using `res.data.records` (map `cfms_id` to `cfmsId` and `job_status` to `jobStatus`).
* If `res.warnings` contains skipped items, toast a descriptive warning message.

---

## 4. Verification Plan

* **Automated Tests:**
  * Build: `npm run build` to verify frontend compilation.
  * Lint: `npm run lint` to verify eslint correctness.
* **Manual Verification:**
  * Seed attendance sheet containing registered and unregistered CFMS IDs. Verify unregistered rows are skipped and displayed as warnings.
  * Verify matching rows have their department/designation populated from the database profile.
  * Verify punches on holidays/Sundays are marked `H` and not counted in present days.
