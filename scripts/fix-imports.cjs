const fs = require('fs');
const path = require('path');

const filesToFix = [
    'src/pages/WeeklyReport.jsx',
    'src/pages/DailyReport.jsx',
    'src/pages/DepartmentReport.jsx'
];

filesToFix.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace calculated imports - only modifying the import statement
    content = content.replace(
        /import\s*{\s*calculateWorkingDays,\s*getHolidays,\s*getDaysInMonth\s*}\s*from\s*'\.\.\/core\/attendance\/calculations';/g,
        "import { getWorkingDays as calculateWorkingDays, getHolidays, getDaysInMonth } from '../core/calendar/workingDays';"
    );

    content = content.replace(
        /import\s*{\s*calculateWorkingDays,\s*getDaysInMonth,\s*getHolidays\s*}\s*from\s*'\.\.\/core\/attendance\/calculations';/g,
        "import { getWorkingDays as calculateWorkingDays, getHolidays, getDaysInMonth } from '../core/calendar/workingDays';"
    );

    content = content.replace(
        /import\s*{\s*calculateSummary,\s*calculateWorkingDays\s*}\s*from\s*'\.\.\/core\/attendance\/calculations';/g,
        "import { calculateSummary } from '../core/attendance/calculations';\nimport { getWorkingDays as calculateWorkingDays } from '../core/calendar/workingDays';"
    );

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${file}`);
});

console.log('✅ All files fixed!');
