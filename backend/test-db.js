// backend/test-db.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

import db from './src/config/database.js';

async function testConnection() {
    console.log('\n🔍 Testing Database Connection...\n');
    console.log(`📊 Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '3306'}`);
    console.log(`📊 Database: ${process.env.DB_NAME || 'apfrs_db'}`);
    console.log(`👤 User: ${process.env.DB_USER || 'root'}`);
    console.log(`🔑 Password: ${process.env.DB_PASSWORD ? '***** (set)' : '❌ NOT SET'}`);
    console.log('');

    try {
        // Try to connect - throws error if fails
        await db.connect();
        console.log('✅ Database connected successfully');
        
        // Test query
        const result = await db.query('SELECT COUNT(*) as total FROM users');
        const totalUsers = result[0]?.total || 0;
        console.log(`📊 Total users in database: ${totalUsers}`);
        
        // Test faculty count
        const faculty = await db.query(
            "SELECT COUNT(*) as total FROM users WHERE role = 'faculty' AND is_active = TRUE"
        );
        console.log(`👨‍🏫 Total active faculty: ${faculty[0]?.total || 0}`);
        
        // Test admin
        const admin = await db.query(
            "SELECT id, name, email, role FROM users WHERE role = 'admin' LIMIT 1"
        );
        if (admin.length > 0) {
            console.log(`👤 Admin user found: ${admin[0].name} (${admin[0].email})`);
        } else {
            console.log('⚠️ No admin user found. Run the schema SQL first.');
        }
        
        // Get department stats
        const depts = await db.query(
            "SELECT department, COUNT(*) as count FROM users WHERE role = 'faculty' AND is_active = TRUE GROUP BY department ORDER BY count DESC"
        );
        console.log('\n📊 Department Distribution:');
        if (depts.length > 0) {
            depts.forEach(dept => {
                console.log(`  - ${dept.department}: ${dept.count} faculty`);
            });
        } else {
            console.log('  No faculty data found. Run the schema SQL first.');
        }
        
        console.log('\n✅ All tests passed! Database is working correctly.');
        
        // Close connection
        await db.close();
        console.log('✅ Database connection closed\n');
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ Database test FAILED:', error.message);
        console.log('\n📋 Troubleshooting Checklist:');
        console.log('  1. Is MySQL installed and running?');
        console.log('     - Windows: net start MySQL80');
        console.log('     - Linux: sudo systemctl status mysql');
        console.log('  2. Is your DB_PASSWORD correct in backend/.env?');
        console.log(`     Current value: ${process.env.DB_PASSWORD ? '***** (set)' : '❌ NOT SET'}`);
        console.log('  3. Does the database "apfrs_db" exist?');
        console.log('     - Run the schema SQL in MySQL Workbench first');
        console.log('  4. Can you connect manually?');
        console.log(`     - mysql -u ${process.env.DB_USER || 'root'} -p -e "SHOW DATABASES;"`);
        console.log('');
        console.log('📍 Current .env file location:', path.join(__dirname, '.env'), '\n');
        process.exit(1);
    }
}

testConnection();
