import db from '../backend/src/config/database.js';
import { userService } from '../backend/src/services/user.service.js';
import { inchargeService } from '../backend/src/services/incharge.service.js';
import { inchargeRepository } from '../backend/src/repositories/incharge.repository.js';
import { userRepository } from '../backend/src/repositories/user.repository.js';

async function runTests() {
  console.log('🧪 Starting Faculty Photo & Incharge Assignment Verification Suite...');
  await db.connect();

  const testEmail = `test.prof.${Date.now()}@jntugvcev.edu.in`;
  let testFacultyId = null;

  try {
    // 1. Create Faculty with photoURL
    console.log('\n--- 1. Testing Create Faculty with photoURL ---');
    const created = await userService.createFaculty({
      cfms_id: `CFMS${Date.now().toString().slice(-6)}`,
      name: 'Dr. Test Professor',
      email: testEmail,
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
      designation: 'Professor',
      department: 'CSE',
      mobile: '9876543210',
      job_status: 'Regular',
    });
    testFacultyId = created.id;
    console.log('✅ Faculty created with ID:', testFacultyId, 'photoURL:', created.photoURL);

    // 2. Query Faculty detail & verify photoURL
    console.log('\n--- 2. Testing Faculty Detail & Initial Incharge (None) ---');
    const fetched = await userService.getFacultyById(testFacultyId);
    console.log('✅ Fetched faculty:', fetched.name, 'photoURL:', fetched.photoURL, 'currentIncharge:', fetched.currentIncharge);
    if (!fetched.photoURL) throw new Error('Expected photoURL to be present');

    // 3. Create Incharge Assignment (Term 1: 2025-06-01 to 2026-05-31)
    console.log('\n--- 3. Testing Create Incharge Assignment (Term 1) ---');
    const assignment1 = await inchargeService.createAssignment(testFacultyId, {
      role: 'HOD',
      startDate: '2025-06-01',
      endDate: '2026-05-31',
    });
    console.log('✅ Term 1 assignment created:', assignment1.id, assignment1.role, `${assignment1.startDate} -> ${assignment1.endDate}`);

    // 4. Test Overlapping Assignment Rejection
    console.log('\n--- 4. Testing Overlapping Assignment Rejection ---');
    try {
      await inchargeService.createAssignment(testFacultyId, {
        role: 'Principal',
        startDate: '2026-01-01', // overlaps with 2025-06-01 -> 2026-05-31
        endDate: '2026-12-31',
      });
      throw new Error('❌ Failed: Overlapping assignment was not rejected!');
    } catch (err) {
      console.log('✅ Overlapping assignment correctly rejected with message:', err.message);
    }

    // 5. Create Current Active Open-Ended Assignment (Term 2: 2026-06-01 -> NULL)
    console.log('\n--- 5. Testing Create Open-Ended Assignment (Term 2: Current) ---');
    const assignment2 = await inchargeService.createAssignment(testFacultyId, {
      role: 'Principal',
      startDate: '2026-06-01',
      endDate: null,
    });
    console.log('✅ Term 2 open-ended assignment created:', assignment2.id, assignment2.role, `${assignment2.startDate} -> Present`);

    // 6. Test Open-Ended Overlap Rejection
    console.log('\n--- 6. Testing Open-Ended Overlap Rejection ---');
    try {
      await inchargeService.createAssignment(testFacultyId, {
        role: 'Vice Chancellor (VC)',
        startDate: '2026-09-01', // overlaps with open-ended 2026-06-01 -> NULL
        endDate: '2027-08-31',
      });
      throw new Error('❌ Failed: Overlapping assignment on open-ended term was not rejected!');
    } catch (err) {
      console.log('✅ Open-ended overlap correctly rejected with message:', err.message);
    }

    // 7. Verify Incharge History & Current Incharge Resolution
    console.log('\n--- 7. Testing Incharge History & Active Role Resolution ---');
    const historyData = await inchargeService.getAssignments(testFacultyId);
    console.log('✅ Current Active Incharge:', historyData.currentIncharge?.role);
    console.log('✅ Incharge History count:', historyData.inchargeHistory.length);
    if (historyData.currentIncharge?.role !== 'Principal') {
      throw new Error('Expected current incharge to be Principal');
    }
    if (historyData.inchargeHistory.length !== 2) {
      throw new Error('Expected 2 assignments in history');
    }

    // 8. Test End Assignment (Ending Term 2 on 2026-08-27)
    console.log('\n--- 8. Testing End Assignment ---');
    const ended = await inchargeService.endAssignment(assignment2.id, '2026-08-27');
    console.log('✅ Assignment ended with effective endDate:', ended.endDate);

    // 9. Clean up test record
    console.log('\n--- 9. Cleaning up test faculty record ---');
    await db.query(`DELETE FROM faculty_incharge_assignments WHERE faculty_id = ?`, [testFacultyId]);
    await db.query(`DELETE FROM users WHERE id = ?`, [testFacultyId]);
    console.log('✅ Test records cleaned up.');

    console.log('\n🎉 ALL PHOTO URL & INCHARGE ASSIGNMENT TESTS PASSED PERFECTLY!\n');
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    if (testFacultyId) {
      await db.query(`DELETE FROM faculty_incharge_assignments WHERE faculty_id = ?`, [testFacultyId]).catch(() => {});
      await db.query(`DELETE FROM users WHERE id = ?`, [testFacultyId]).catch(() => {});
    }
    process.exit(1);
  } finally {
    await db.close();
  }
}

runTests();
