import db from '../backend/src/config/database.js';

async function check() {
  await db.connect();
  const rows = await db.query(
    `SELECT COLUMN_NAME, COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME 
     FROM information_schema.COLUMNS 
     WHERE TABLE_SCHEMA = 'apfrs_db' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'id'`
  );
  console.log('users.id definition:', rows[0]);
  await db.close();
}

check();
