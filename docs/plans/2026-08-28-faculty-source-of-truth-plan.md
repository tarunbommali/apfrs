# Faculty Registry Source of Truth Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Ensure the database `users` table is the source of truth for faculty registry during attendance Excel seeding, matches strictly by `cfms_id`, ignores punches on holidays/Sundays, and returns skipped records warnings back to the frontend local store.

**Architecture:** Update `monthly-attendance.repository.js` to strictly query and map registry user attributes, skip unregistered records, and modify daily record status calculations based on the calendar working days. Frontend (`import.tsx`) will be updated to consume backend returned records and toast warnings.

**Tech Stack:** Node.js, Express, React, TanStack Query, TanStack Router, MySQL

---

### Task 1: Update Repository Seeding Logic

**Files:**
* Modify: `backend/src/repositories/monthly-attendance.repository.js` (lines 45-251)

**Step 1: Replace matching & auto-provisioning logic**
Modify `monthly-attendance.repository.js` to look up faculty strictly by CFMS ID, skip unregistered faculty, and record warnings:
```javascript
    // 2. Load registered faculty by CFMS ID
    const cfmsIds = records.map((r) => String(r.cfmsId || r.cfms_id || '').trim()).filter(Boolean);
    const existingFacultyMap = await userRepository.findByEmailsOrCfmsIds([], cfmsIds);

    const skippedCfmsIds = [];
    const insertedRecords = [];

    // Filter and resolve records against source of truth database registry
    for (const record of records) {
      const cfmsId = String(record.cfmsId || record.cfms_id || '').trim();
      const existingFaculty = cfmsId ? existingFacultyMap.get(cfmsId) : null;

      if (!existingFaculty) {
        skippedCfmsIds.push(cfmsId || 'Row without CFMS ID');
        continue;
      }

      insertedRecords.push({
        raw: record,
        existingFaculty
      });
    }
```

**Step 2: Update sheet metadata and records bulk insertion**
* Use `insertedRecords.length` for the `total_faculty` count in `monthly_attendance_sheets`.
* Inside bulk insert loop, populate user fields strictly from `existingFaculty` database attributes.
* Update calendar sync status logic to prevent Sunday/Holiday punches from counting as working or present days:
  ```javascript
  const daily = Array.isArray(raw.attendance) ? raw.attendance : [];
  let presentDays = 0;
  let absentDays = 0;
  let leaveDays = 0;
  let halfDays = 0;
  let lateDays = 0;
  let holidayDays = 0;

  const syncedDaily = daily.map((d) => {
    if (!d.date) return d;
    const dateStr = d.date.length === 10 ? d.date : `${numYear}-${String(numMonth).padStart(2, '0')}-${String(d.date).padStart(2, '0')}`;
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

    return { ...d, date: dateStr, status: finalStatus };
  });
  ```

**Step 3: Propagate skipped CFMS IDs in return**
Update `saveMonthlySheetAndRecords` return statement:
```javascript
    const savedSheet = await this.getMonthlyAttendance(numMonth, numYear);
    return {
      ...savedSheet,
      warnings: skippedCfmsIds,
    };
```

**Step 4: Commit**
```bash
git add backend/src/repositories/monthly-attendance.repository.js
git commit -m "feat(backend): query database registry strictly by cfms_id and ignore Sunday/Holiday punches"
```

---

### Task 2: Propagate Warnings in Attendance Service

**Files:**
* Modify: `backend/src/services/attendance.service.js` (lines 207-230)

**Step 1: Rewrite importAttendanceData**
Modify the response structure to include `warnings` and dynamic count messaging:
```javascript
  async importAttendanceData(data, uploadedBy = 'Admin') {
    const { records, month, year, fileName } = data;

    if (!records || !Array.isArray(records) || records.length === 0) {
      throw new AppError(400, 'No attendance records provided in upload.');
    }
    if (!month || !year) {
      throw new AppError(400, 'Reporting month and year are required.');
    }

    const savedResult = await monthlyAttendanceRepository.saveMonthlySheetAndRecords(
      month,
      year,
      fileName || `attendance-${year}-${month}.xlsx`,
      records,
      uploadedBy
    );

    const importedCount = savedResult.records?.length || 0;
    const skippedCount = savedResult.warnings?.length || 0;

    return {
      success: true,
      message: `Successfully seeded ${importedCount} faculty attendance records. Skipped ${skippedCount} unregistered records.`,
      data: savedResult,
      warnings: savedResult.warnings || [],
    };
  }
```

**Step 2: Commit**
```bash
git add backend/src/services/attendance.service.js
git commit -m "feat(backend): return skipped CFMS ID warnings in import REST response"
```

---

### Task 3: Align Frontend to Update Store and Toast Warnings

**Files:**
* Modify: `frontend/src/routes/import.tsx` (lines 320-351)

**Step 1: Update handleSubmit**
Modify frontend submission handling to retrieve database-seeded records and display warnings:
```typescript
      // 1. Seed & persist into MySQL database
      const res = await importAttendance.mutateAsync({
        records: parsedRecords,
        month: monthNum,
        year: yearNum,
        fileName: fileName || `attendance-${yearNum}-${monthNum}.xlsx`,
      });

      // 2. Update client context store using the database-seeded records returned by backend
      const savedRecords = res.data?.records || [];
      setAttendanceData(
        savedRecords.map((r: any) => ({
          ...r,
          cfmsId: r.cfmsId || r.cfms_id || "",
          jobStatus: r.jobStatus || r.job_status || "Regular",
        })),
        monthNum,
        yearNum,
        fileName
      );

      if (res.warnings && res.warnings.length > 0) {
        toast.warning(
          `Synced ${savedRecords.length} records. Skipped ${res.warnings.length} unregistered CFMS IDs: ${res.warnings.join(", ")}`,
          { duration: 8000 }
        );
      } else {
        toast.success(
          `Successfully synced ${savedRecords.length} records into database for ${MONTHS[monthNum - 1]} ${yearNum}`
        );
      }
      void navigate({ to: "/reports" });
```

**Step 2: Commit**
```bash
git add frontend/src/routes/import.tsx
git commit -m "feat(frontend): consume returned database records and display unregistered warnings toast"
```

---

### Task 4: Compilation & Build Validation

**Step 1: Run Linting**
Run: `npm run lint --prefix frontend`
Expected: Exit code 0, no errors.

**Step 2: Run Production Build**
Run: `npm run build --prefix frontend`
Expected: Build finishes successfully with zero TS or bundler errors.

**Step 3: Commit**
```bash
git commit -m "test(validation): verify build and lint passing on source of truth changes"
```
