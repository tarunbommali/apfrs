import db from '../backend/src/config/database.js';
import { calendarRepository } from '../backend/src/repositories/calendar.repository.js';
import { calendarService } from '../backend/src/services/calendar.service.js';

async function test() {
  await db.connect();
  const res = await calendarService.getCalendar(8, 2026);
  console.log('Calendar summary for August 2026:', JSON.stringify(res, null, 2));
  await db.close();
}

test();
