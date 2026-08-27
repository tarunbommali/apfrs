import db from '../backend/src/config/database.js';

async function check() {
  await db.connect();
  const rows = await db.query(`SELECT COUNT(*) as count FROM academic_calendar`);
  console.log('Row count in old academic_calendar:', rows[0].count);
  await db.close();
}

check();
