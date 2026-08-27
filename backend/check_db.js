import db from './src/config/database.js';
import userService from './src/services/user.service.js';

async function check() {
  try {
    await db.connect();
    console.log("Connected to DB.");

    console.log("Testing userService.getFacultyById('f-4')...");
    const faculty = await userService.getFacultyById('f-4');
    console.log("Faculty profile:", JSON.stringify(faculty, null, 2));

    await db.close();
  } catch (err) {
    console.error("Diagnostic failed:", err);
  }
}

check();
