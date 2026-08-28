import { EmployeeRecord, AttendanceDay, AttendanceStatus } from '../attendance-context';

const MONTH_ALIASES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const STATUS_MAP: Record<string, AttendanceStatus> = {
  P: "P", p: "P", PRESENT: "P",
  A: "A", a: "A", ABSENT: "A",
  L: "L", l: "L", LEAVE: "L", CL: "L", OD: "L",
  H: "H", h: "H", HOLIDAY: "H",
  HD: "HD", hd: "HD", HALF: "HD",
  LATE: "Late", Late: "Late", late: "Late",
};

export function detectMonthYearFromFileName(name: string): { month: number | null; year: number | null } {
  const match = name.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-_]?(\d{4})/i);
  if (match && match[1] && match[2]) {
    const mIdx = MONTH_ALIASES.indexOf(match[1].toLowerCase().slice(0, 3));
    if (mIdx !== -1) {
      return { month: mIdx + 1, year: parseInt(match[2], 10) };
    }
  }
  return { month: null, year: null };
}

export function parseBiometricSheet(
  rawMatrix: unknown[][],
  month: number,
  year: number,
  holidayDateSet: Set<string>
): { records: EmployeeRecord[]; workingDaysCount: number; holidaysCount: number } {
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
  if (officialWorkingDays === 0) officialWorkingDays = 27;

  const records: EmployeeRecord[] = [];

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

    const attendance: AttendanceDay[] = [];
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

      let status: AttendanceStatus = "A";
      if (rawStatus === "P" || rawStatus === "PRESENT" || inVal !== "" || outVal !== "") {
        status = "P";
      } else if (rawStatus === "HD" || rawStatus === "HALF") {
        status = "HD";
      } else if (rawStatus === "L" || rawStatus === "CL" || rawStatus === "OD" || rawStatus === "LEAVE") {
        status = "L";
      } else if (rawStatus === "H" || rawStatus === "HOLIDAY" || isOfficialNonWorking) {
        status = "H";
      } else if (STATUS_MAP[rawStatus]) {
        status = STATUS_MAP[rawStatus]!;
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
