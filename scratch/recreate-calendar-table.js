import db from '../backend/src/config/database.js';
import crypto from 'crypto';

const defaultHolidayTemplates = [
  { monthDay: "01-14", label: "Makara Sankranti / Pongal", type: "Public holiday" },
  { monthDay: "01-26", label: "Republic Day", type: "Public holiday" },
  { monthDay: "03-22", label: "Ugadi (Telugu New Year)", type: "Public holiday" },
  { monthDay: "04-05", label: "Babu Jagjivan Ram Birthday", type: "Public holiday" },
  { monthDay: "04-14", label: "Dr. B.R. Ambedkar Jayanthi", type: "Public holiday" },
  { monthDay: "08-15", label: "Independence Day", type: "Public holiday" },
  { monthDay: "08-22", label: "Vinayaka Chavithi", type: "Public holiday" },
  { monthDay: "09-02", label: "Mid-term examinations begin", type: "Academic" },
  { monthDay: "09-05", label: "Teachers' Day", type: "Institutional" },
  { monthDay: "10-02", label: "Mahatma Gandhi Jayanti", type: "Public holiday" },
  { monthDay: "10-20", label: "Vijaya Dasami / Dussehra", type: "Public holiday" },
  { monthDay: "11-08", label: "Diwali", type: "Public holiday" },
  { monthDay: "12-25", label: "Christmas", type: "Public holiday" },
];

async function seedAcademicCalendar() {
  console.log('🔄 Recreating academic_calendar table with proper schema...');
  await db.connect();

  await db.query(`DROP TABLE IF EXISTS academic_calendar`);

  await db.query(`
    CREATE TABLE academic_calendar (
      id VARCHAR(50) NOT NULL PRIMARY KEY,
      date DATE NOT NULL UNIQUE,
      label VARCHAR(255) NOT NULL,
      type ENUM('Public holiday', 'Institutional', 'Academic', 'Vacation') NOT NULL DEFAULT 'Public holiday',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_date (date),
      INDEX idx_type (type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log('✅ academic_calendar table created.');

  const years = [2024, 2025, 2026, 2027, 2028];
  let insertCount = 0;

  for (const year of years) {
    for (const t of defaultHolidayTemplates) {
      const date = `${year}-${t.monthDay}`;
      const id = `cal-${crypto.randomUUID()}`;
      await db.query(
        `INSERT INTO academic_calendar (id, date, label, type) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE label = VALUES(label), type = VALUES(type)`,
        [id, date, t.label, t.type]
      );
      insertCount++;
    }
  }

  console.log(`✅ Seeded ${insertCount} default holidays across 2024-2028 into MySQL academic_calendar!`);
  const check = await db.query(`SELECT * FROM academic_calendar WHERE date LIKE '2026-08%' ORDER BY date ASC`);
  console.log('August 2026 holidays in DB:', check);

  await db.close();
}

seedAcademicCalendar().catch(console.error);
