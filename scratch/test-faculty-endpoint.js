import db from '../backend/src/config/database.js';
import { userService } from '../backend/src/services/user.service.js';

async function check() {
  await db.connect();
  try {
    const list = await userService.getFacultyList({ limit: 200 });
    console.log('Successfully fetched faculty list. Count:', list.faculty.length);
    console.log('Sample row:', list.faculty[0]);
  } catch (err) {
    console.error('Error fetching faculty list:', err);
  } finally {
    await db.close();
  }
}

check();
