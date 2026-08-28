import XLSX from 'xlsx';
import path from 'path';
import db from './src/config/database.js';
import { attendanceService } from './src/services/attendance.service.js';
import dotenv from 'dotenv';

dotenv.config();

// Define parseBiometricSheet locally in JS
const STATUS_MAP = {
  P: "P", p: "P", PRESENT: "P",
  A: "A", a: "A", ABSENT: "A",
  L: "L", l: "L", LEAVE: "L", CL: "L", OD: "L",
  H: "H", h: "H", HOLIDAY: "H",
  HD: "HD", hd: "HD", HALF: "HD",
  LATE: "Late", Late: "Late", late: "Late",
};

function parseBiometricSheet(rawMatrix, month, year, holidayDateSet) {
  if (!rawMatrix || rawMatrix.length < 2) return { records: [], workingDaysCount: 27, holidaysCount: 4 };

  const headerRow = (rawMatrix[0] || []).map((h) => String(h ?? "").trim());
  const headerLower = headerRow.map((h) => h.toLowerCase());

  const nameIdx = headerLower.findIndex((h) =>
    ["name", "employee name", "faculty name", "staff name", "person name"].some((a) => h.includes(a))
  );
  const cfmsIdx = headerLower.findIndex((h) =>
    ["cfms id", "cfmsid", "cfms", "cfms_id", "employee id", "emp id", "empid"].some((a) => h === a || h.includes(a))
  );
  const desigIdx = headerLower.findIndex((h) =>
    ["designation", "desig", "role"].some((a) => h.includes(a))
  );
  const typeIdx = headerLower.findIndex((h) =>
    ["emp type", "emptype", "job status", "job_status", "type", "cadre"].some((a) => h.includes(a))
  );
  const deptIdx = headerLower.findIndex((h) =>
    ["department", "dept", "dept.", "branch"].some((a) => h.includes(a))
  );
  const emailIdx = headerLower.findIndex((h) =>
    ["email", "mail", "e-mail", "email address"].some((a) => h.includes(a))
  );

  const daysInMonth = new Date(year, month, 0).getDate();
  let officialWorkingDays = 0;
  let holidaysCount = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dPad = String(d).padStart(2, "0");
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${dPad}`;
    const dayOfWeek = new Date(year, month - 1, d).getDay();
    const isSunday = dayOfWeek === 0;
    const isHoliday = holidayDateSet.has(dateStr);

    if (isSunday || isHoliday) {
      holidaysCount++;
    } else {
      officialWorkingDays++;
    }
  }

  const records = [];

  for (let r = 1; r < rawMatrix.length; r++) {
    const row = rawMatrix[r];
    if (!row || !row[nameIdx !== -1 ? nameIdx : 0]) continue;

    const name = String(row[nameIdx !== -1 ? nameIdx : 0] ?? "").trim();
    if (!name || name.toLowerCase() === "total" || name.toLowerCase() === "grand total") continue;

    const cfmsId = cfmsIdx !== -1 ? String(row[cfmsIdx] ?? "").trim() : "";
    const designation = desigIdx !== -1 ? String(row[desigIdx] ?? "").trim() : "";
    const empType = typeIdx !== -1 ? String(row[typeIdx] ?? "").trim() : "Regular";
    const department = deptIdx !== -1 ? String(row[deptIdx] ?? "").trim() : "";
    const email = emailIdx !== -1 ? String(row[emailIdx] ?? "").trim() : "";

    const attendance = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dPad = String(d).padStart(2, "0");
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${dPad}`;
      const dayOfWeek = new Date(year, month - 1, d).getDay();
      const isSunday = dayOfWeek === 0;
      const isCalendarHoliday = holidayDateSet.has(dateStr);
      const isOfficialNonWorking = isSunday || isCalendarHoliday;

      const statusColIdx = headerLower.findIndex(
        (h) => h === `${String(d).padStart(2, "0")} status` || h === `${d} status` || h === `day ${d}` || h === `day${d}`
      );
      const inColIdx = headerLower.findIndex(
        (h) => h === `${String(d).padStart(2, "0")} in` || h === `${d} in` || h === `in ${d}`
      );
      const outColIdx = headerLower.findIndex(
        (h) => h === `${String(d).padStart(2, "0")} out` || h === `${d} out` || h === `out ${d}`
      );

      const rawStatus = statusColIdx !== -1 ? String(row[statusColIdx] ?? "").trim().toUpperCase() : "";
      const inVal = inColIdx !== -1 ? String(row[inColIdx] ?? "").trim() : "";
      const outVal = outColIdx !== -1 ? String(row[outColIdx] ?? "").trim() : "";

      let status = "A";
      if (rawStatus === "P" || rawStatus === "PRESENT" || inVal !== "" || outVal !== "") {
        status = "P";
      } else if (rawStatus === "HD" || rawStatus === "HALF") {
        status = "HD";
      } else if (rawStatus === "L" || rawStatus === "CL" || rawStatus === "OD" || rawStatus === "LEAVE") {
        status = "L";
      } else if (rawStatus === "H" || rawStatus === "HOLIDAY" || isOfficialNonWorking) {
        status = "H";
      } else if (STATUS_MAP[rawStatus]) {
        status = STATUS_MAP[rawStatus];
      } else {
        status = "A";
      }

      attendance.push({
        date: dateStr,
        status,
        inTime: inVal || undefined,
        outTime: outVal || undefined,
      });
    }

    records.push({
      name,
      cfmsId,
      designation: designation || "Assistant Professor",
      department: department || "General",
      email,
      jobStatus: empType.toLowerCase() === "regular" ? "Regular" : "contract",
      attendance,
    });
  }

  return { records, workingDaysCount: officialWorkingDays, holidaysCount };
}

async function run() {
  await db.connect();
  const filePath = path.resolve('../test/22130304001_REGULAR_Jan2025.xlsx');
  const wb = XLSX.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rawMatrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  const holidayDateSet = new Set(['2025-01-12', '2025-01-19', '2025-01-26']); // sample holidays
  const { records } = parseBiometricSheet(rawMatrix, 1, 2025, holidayDateSet);

  console.log("RECORDS TO IMPORT: ", records.length);

  await attendanceService.importAttendanceData({
    records,
    month: 1,
    year: 2025,
    fileName: '22130304001_REGULAR_Jan2025.xlsx'
  }, 'Admin');

  console.log("Import done! Querying ANIL daily records now...");
  const dbRows = await db.query("SELECT daily_records FROM faculty_monthly_attendance WHERE name = 'ANIL' LIMIT 1");
  console.log("DB ROW FOR ANIL AFTER IMPORT:", dbRows[0].daily_records);

  await db.close();
}

run().catch(console.error);
