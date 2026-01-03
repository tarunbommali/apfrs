/**
 * APFRS Project Refactoring Script
 * 
 * This script automates the migration of files to the new structure
 * Run with: node scripts/refactor.js
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');

// File migration map
const MIGRATIONS = [
    // Config files
    { from: 'utils/calendar.js', to: 'config/calendar.js' },
    { from: 'utils/configConstants.js', to: 'config/constants.js' },

    // Core - Attendance
    { from: 'utils/attendanceCalculations.js', to: 'core/attendance/calculations.js' },
    { from: 'utils/dataProcessor.js', to: 'core/attendance/processor.js' },
    { from: 'utils/validationUtils.js', to: 'core/attendance/validators.js' },

    // Core - Calendar
    { from: 'utils/dateTimeUtils.js', to: 'core/calendar/workingDays.js' },
    { from: 'utils/timeUtils.js', to: 'core/calendar/dateUtils.js' },

    // Core - Email
    { from: 'utils/emailTemplateGenerator.js', to: 'core/email/templates.js' },
    { from: 'utils/emailStyles.js', to: 'core/email/styles.js' },

    // API
    { from: 'utils/emailService.js', to: 'api/emailService.js' },

    // Store
    { from: 'utils/emailStatusStore.js', to: 'store/emailStatus.js' },
    { from: 'utils/smtpConfigStore.js', to: 'store/smtpConfig.js' },

    // Utils (keep these)
    { from: 'utils/fileUtils.js', to: 'utils/file.js' },
    { from: 'utils/exportUtils.js', to: 'utils/export.js' },
    { from: 'utils/reportGenerator.js', to: 'utils/report.js' },
];

// Import path replacements
const IMPORT_REPLACEMENTS = [
    // Config
    { old: '../utils/calendar', new: '../config/calendar' },
    { old: '../../utils/calendar', new: '../../config/calendar' },
    { old: '../utils/configConstants', new: '../config/constants' },

    // Core - Attendance
    { old: '../utils/attendanceCalculations', new: '../core/attendance/calculations' },
    { old: '../../utils/attendanceCalculations', new: '../../core/attendance/calculations' },
    { old: '../utils/dataProcessor', new: '../core/attendance/processor' },
    { old: '../../utils/dataProcessor', new: '../../core/attendance/processor' },
    { old: '../utils/validationUtils', new: '../core/attendance/validators' },
    { old: '../utils/attendanceUtils', new: '../core/attendance/calculations' },

    // Core - Calendar  
    { old: '../utils/dateTimeUtils', new: '../core/calendar/workingDays' },
    { old: '../../utils/dateTimeUtils', new: '../../core/calendar/workingDays' },
    { old: '../utils/timeUtils', new: '../core/calendar/dateUtils' },

    // Core - Email
    { old: '../utils/emailTemplateGenerator', new: '../core/email/templates' },
    { old: '../../utils/emailTemplateGenerator', new: '../../core/email/templates' },
    { old: '../utils/emailStyles', new: '../core/email/styles' },

    // API
    { old: '../utils/emailService', new: '../api/emailService' },
    { old: '../../utils/emailService', new: '../../api/emailService' },

    // Store
    { old: '../utils/emailStatusStore', new: '../store/emailStatus' },
    { old: '../utils/smtpConfigStore', new: '../store/smtpConfig' },

    // Utils
    { old: '../utils/fileUtils', new: '../utils/file' },
    { old: '../utils/exportUtils', new: '../utils/export' },
    { old: '../utils/reportGenerator', new: '../utils/report' },
];

function moveFile(from, to) {
    const fromPath = path.join(SRC_DIR, from);
    const toPath = path.join(SRC_DIR, to);

    if (!fs.existsSync(fromPath)) {
        console.warn(`⚠️  Source file not found: ${from}`);
        return false;
    }

    // Create directory if it doesn't exist
    const toDir = path.dirname(toPath);
    if (!fs.existsSync(toDir)) {
        fs.mkdirSync(toDir, { recursive: true });
    }

    // Copy file
    fs.copyFileSync(fromPath, toPath);
    console.log(`✅ Moved: ${from} → ${to}`);
    return true;
}

function updateImportsInFile(filePath) {
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    IMPORT_REPLACEMENTS.forEach(({ old, new: newPath }) => {
        const regex = new RegExp(old.replace(/\//g, '\\/'), 'g');
        if (content.includes(old)) {
            content = content.replace(regex, newPath);
            modified = true;
        }
    });

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  📝 Updated imports in: ${path.relative(SRC_DIR, filePath)}`);
    }
}

function getAllFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            if (!file.includes('node_modules')) {
                getAllFiles(filePath, fileList);
            }
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            fileList.push(filePath);
        }
    });

    return fileList;
}

function deleteOldFiles() {
    const filesToDelete = [
        'utils/helpers.js',
        'utils/utility.js',
        'utils/EmailTemplate.jsx',
        'utils/emailGenerator.js',
        'utils/emailUtils.js',
        'utils/smtpConfig.js',
        'utils/attendanceUtils.js',
    ];

    filesToDelete.forEach(file => {
        const filePath = path.join(SRC_DIR, file);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`🗑️  Deleted: ${file}`);
        }
    });
}

// Main execution
console.log('🚀 Starting APFRS Refactoring...\n');

console.log('📁 Step 1: Moving files to new structure...');
MIGRATIONS.forEach(({ from, to }) => {
    moveFile(from, to);
});

console.log('\n📝 Step 2: Updating imports in all files...');
const allFiles = getAllFiles(SRC_DIR);
allFiles.forEach(updateImportsInFile);

console.log('\n🗑️  Step 3: Deleting redundant files...');
deleteOldFiles();

console.log('\n✅ Refactoring complete!');
console.log('\n⚠️  IMPORTANT: Test the application thoroughly!');
console.log('   Run: npm run dev');
