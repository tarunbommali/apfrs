# Excel Import Month/Year Validation Feature

## ✅ Feature Implemented

### Overview
Added comprehensive month and year selection with validation to prevent importing attendance data for future months. The system now enforces that only **previous or current months** can be imported.

## 🎯 Key Features

### 1. **Year Selection**
- Dropdown to select year
- Shows current year and past 5 years
- Auto-detects year from filename (e.g., "attendance_2024.xlsx")

### 2. **Month Selection**
- Dropdown to select month
- Future months are **disabled** and marked as "(Future)"
- Auto-detects month from filename (e.g., "november_2024.xlsx")

### 3. **Validation Logic**
- Prevents selection of future months
- Shows clear error message when attempting to import future data
- Validates both month and year combination

### 4. **Auto-Detection**
The system automatically detects from filename:
- **Month**: Looks for month names (jan, feb, mar, etc.)
- **Year**: Looks for 4-digit years (2020-2099)

**Example Filenames:**
- `attendance_november_2024.xlsx` → November 2024
- `nov_2024_data.xlsx` → November 2024
- `2024_dec_attendance.xlsx` → December 2024

### 5. **Enhanced UI**
- ✅ Error messages displayed in red alert box
- ✅ Info message explaining the restriction
- ✅ File preview shows selected month and year
- ✅ Disabled future months are grayed out

## 📋 User Interface

### Upload Modal Components:

1. **Year Selector**
   ```
   Select Year
   [Dropdown: 2025, 2024, 2023, 2022, 2021, 2020]
   ```

2. **Month Selector**
   ```
   Select Month
   [Dropdown with future months disabled]
   - January
   - February
   ...
   - November
   - December (Future) [disabled if future]
   ```

3. **File Upload**
   ```
   Upload Excel File
   [File input]
   
   Selected: attendance_nov_2024.xlsx
   📅 November 2024
   ```

4. **Info Message**
   ```
   ℹ️ Note: You can only import data for previous or current months, not future months.
   ```

5. **Error Display** (when validation fails)
   ```
   ⚠️ Cannot import data for future months. Please select a previous or current month.
   ```

## 🔧 Technical Implementation

### Validation Function
```javascript
const isFutureMonth = (month, year) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  if (year > currentYear) return true;
  if (year === currentYear && month > currentMonth) return true;
  return false;
};
```

### Auto-Detection Functions
```javascript
// Detect month from filename
const detectMonthFromFilename = (filename) => {
  const lower = filename.toLowerCase();
  const index = MONTHS.findIndex(m => lower.includes(m.value));
  return index !== -1 ? index + 1 : '';
};

// Detect year from filename
const detectYearFromFilename = (filename) => {
  const yearMatch = filename.match(/20\d{2}/);
  return yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
};
```

### Available Years
```javascript
const getAvailableYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = 0; i < 6; i++) {
    years.push(currentYear - i);
  }
  return years;
};
```

## 📊 Example Scenarios

### Scenario 1: Current Month (December 2025)
- **Year**: 2025
- **Month**: December ✅ Allowed
- **Result**: Upload successful

### Scenario 2: Previous Month (November 2025)
- **Year**: 2025
- **Month**: November ✅ Allowed
- **Result**: Upload successful

### Scenario 3: Future Month (January 2026)
- **Year**: 2026
- **Month**: January ❌ Blocked
- **Result**: Error - "Cannot import data for future months"

### Scenario 4: Previous Year (Any month 2024)
- **Year**: 2024
- **Month**: Any ✅ Allowed
- **Result**: Upload successful

## 🎨 UI/UX Improvements

### Before:
- Only month selection
- No year selection
- Could potentially import future data
- No validation feedback

### After:
- ✨ Year and month selection
- ✨ Future months disabled in dropdown
- ✨ Clear validation with error messages
- ✨ Auto-detection from filename
- ✨ Visual feedback (disabled options, error alerts)
- ✨ Info message explaining restrictions

## 🔄 Data Flow

1. **User clicks "Upload Excel File"**
2. **Modal opens with:**
   - Year selector (current year selected by default)
   - Month selector
   - File input

3. **User selects file:**
   - System auto-detects month and year from filename
   - Dropdowns update automatically

4. **User selects month/year:**
   - Future months are disabled
   - If future month selected, error shown

5. **User clicks "Upload":**
   - Validation runs
   - If future month: Error displayed
   - If valid: File processed and uploaded

6. **Data passed to backend:**
   ```javascript
   onFileUpload(file, rawData, month, year)
   ```

## 📝 Files Modified

- ✅ `src/components/FileUpload.jsx`
  - Added year state
  - Added error state
  - Added validation functions
  - Updated UI with year selector
  - Added error display
  - Enhanced file preview

## ✅ Benefits

1. **Data Integrity**: Prevents importing future data
2. **User Guidance**: Clear messages about restrictions
3. **Smart Detection**: Auto-fills from filename
4. **Better UX**: Disabled options prevent errors
5. **Validation**: Multiple layers of validation
6. **Calendar Mapping**: Month/year mapped to calendar system

## 🧪 Testing Checklist

- [x] Year selector displays correctly
- [x] Month selector displays correctly
- [x] Future months are disabled
- [x] Auto-detection works from filename
- [x] Validation prevents future month selection
- [x] Error messages display correctly
- [x] Info message shows
- [x] File preview shows month/year
- [x] Upload works for valid months
- [x] Upload blocked for future months

---

**Status**: ✅ **COMPLETE**

The Excel import now has full month/year validation, preventing future month imports and providing clear user guidance throughout the process.
