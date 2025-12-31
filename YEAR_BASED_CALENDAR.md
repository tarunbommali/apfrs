# Year-Based Calendar System

## ✅ Feature Implemented

### Overview
Implemented a year-based calendar configuration system that allows defining holidays separately for each year. The calendar now displays only the holidays configured for the selected year.

## 🗓️ Year-Based Structure

### New Configuration Format (calendar.js)

```javascript
const CALENDAR_CONFIG = {
  2025: {
    total_public_holidays: 7,
    total_optional_holidays: 1,
    total_sundays: 52,
    holidays: {
      1: [
        { day: 1, label: "New Year's Day", type: "optional" },
        { day: 26, label: "Republic Day", type: "public" }
      ],
      // ... other months
    }
  },
  2026: {
    total_public_holidays: 11,
    total_optional_holidays: 11,
    total_sundays: 52,
    holidays: {
      // ... holidays for 2026
    }
  }
};
```

## 📊 Year Configuration

### Each Year Contains:
1. **total_public_holidays** - Count of public holidays
2. **total_optional_holidays** - Count of optional holidays
3. **total_sundays** - Count of Sundays in the year
4. **holidays** - Month-by-month holiday definitions

### Holiday Definition:
```javascript
{
  day: 26,
  label: "Republic Day",
  type: "public"
}
```

## 🎯 New Features

### 1. **Year Selector**
```
┌────────────────────────────────────┐
│ Select Year: [2025 ▼]             │
│                                    │
│ 📅 Public: 7                       │
│ 🟠 Optional: 1                     │
│ ☀️ Sundays: 52                     │
└────────────────────────────────────┘
```

### 2. **Year Statistics Display**
Shows quick stats for the selected year:
- Public holidays count
- Optional holidays count
- Sundays count

### 3. **Dynamic Holiday Loading**
- Holidays change when year is selected
- Only shows holidays for selected year
- Sidebar updates automatically

## 🔧 New Functions

### calendar.js Functions:

1. **`getCalendarConfig(year)`**
   - Returns configuration for specific year
   - Returns null if year not configured

2. **`getHolidaysByMonth(year, month)`**
   - Gets holidays for specific year and month
   - Returns empty array if not found

3. **`getAvailableYears()`**
   - Returns list of configured years
   - Sorted in descending order

4. **`getYearStats(year)`**
   - Returns statistics for a year
   - Includes public, optional, sundays counts

5. **Updated existing functions:**
   - `getHolidayDays(month, year)`
   - `getHolidayLabel(month, day, year)`
   - `getHolidayType(month, day, year)`

## 📋 How to Add a New Year

### Step 1: Add Year Configuration
Edit `src/utils/calendar.js`:

```javascript
const CALENDAR_CONFIG = {
  // ... existing years
  2027: {
    total_public_holidays: 10,
    total_optional_holidays: 5,
    total_sundays: 52,
    holidays: {
      1: [
        { day: 1, label: "New Year's Day", type: "optional" },
        { day: 26, label: "Republic Day", type: "public" }
      ],
      // ... add all months
    }
  }
};
```

### Step 2: Save File
- Year automatically appears in dropdown
- Calendar can now display 2027 holidays

## 🎨 User Interface

### Calendar Page with Year Selector:
```
┌──────────────────────────────────────────────┐
│ Calendar Management                          │
├──────────────────────────────────────────────┤
│ ┌────────────────────────────────────────┐  │
│ │ Select Year: [2025 ▼]  📅7 🟠1 ☀️52   │  │
│ │                                        │  │
│ │ [Full Year Calendar for 2025]          │  │
│ │                                        │  │
│ │ Sidebar:                               │  │
│ │ 🎉 December 2025 Holidays (1)          │  │
│ │ - Dec 25: Christmas [public]           │  │
│ │                                        │  │
│ │ 📋 Legend                              │  │
│ └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

### Year Selector Dropdown:
```
Select Year: [2026 ▼]
             ├─ 2026
             └─ 2025
```

### Statistics Display:
```
📅 Public: 11    🟠 Optional: 11    ☀️ Sundays: 52
```

## 🔄 Data Flow

```
User selects year
      ↓
setSelectedYear(2026)
      ↓
getHolidaysByMonth(2026, month)
      ↓
CALENDAR_CONFIG[2026].holidays[month]
      ↓
Display holidays for 2026
```

## ✨ Benefits

### 1. **Year-Specific Holidays**
- Different holidays for different years
- Accurate historical data
- Future planning capability

### 2. **Easy Management**
- Add new years easily
- Update specific year without affecting others
- Clear organization

### 3. **Statistics Tracking**
- Track holiday counts per year
- Compare years
- Planning and reporting

### 4. **Flexibility**
- Each year can have different holidays
- Accommodate calendar changes
- Support multiple years

## 📊 Example Use Cases

### Use Case 1: View 2025 Holidays
1. Select "2025" from dropdown
2. Calendar shows 2025 holidays
3. Stats show: 7 public, 1 optional
4. Sidebar shows December 2025 holidays

### Use Case 2: Plan for 2026
1. Select "2026" from dropdown
2. Calendar shows 2026 holidays
3. Stats show: 11 public, 11 optional
4. Can see future holidays

### Use Case 3: Compare Years
1. Switch between 2025 and 2026
2. See different holiday configurations
3. Compare statistics
4. Plan accordingly

## 🔧 Technical Implementation

### ManageCalendar Component Updates:

**New State:**
```javascript
const [selectedYear, setSelectedYear] = useState(currentYear);
```

**Year Change Handler:**
```javascript
const handleActiveStartDateChange = ({ activeStartDate }) => {
  if (activeStartDate) {
    setActiveMonth(activeStartDate.getMonth());
    setSelectedYear(activeStartDate.getFullYear());
  }
};
```

**Holiday Retrieval:**
```javascript
const publicHolidays = getPublicHolidaysForMonth(activeMonth, selectedYear);
```

## 📝 Files Modified

### Updated:
1. ✅ `src/utils/calendar.js`
   - Restructured to year-based config
   - Added new helper functions
   - Added statistics support

2. ✅ `src/components/ManageCalendar.jsx`
   - Added year selector
   - Added year statistics display
   - Updated all functions to use year
   - Updated sidebar to show year

## 🎯 Configuration Example

### Complete Year Configuration:
```javascript
2025: {
  total_public_holidays: 7,
  total_optional_holidays: 1,
  total_sundays: 52,
  holidays: {
    1: [
      { day: 1, label: "New Year's Day", type: "optional" },
      { day: 26, label: "Republic Day", type: "public" }
    ],
    5: [{ day: 1, label: "Labor Day", type: "public" }],
    8: [{ day: 15, label: "Independence Day", type: "public" }],
    10: [{ day: 2, label: "Gandhi Jayanti", type: "public" }],
    11: [{ day: 2, label: "Diwali", type: "public" }],
    12: [{ day: 25, label: "Christmas", type: "public" }]
  }
}
```

## 🧪 Testing Checklist

- [x] Year selector displays
- [x] Available years show in dropdown
- [x] Year statistics display correctly
- [x] Holidays change when year changes
- [x] Sidebar updates with year
- [x] Calendar shows correct year
- [x] Month navigation works
- [x] Type colors work
- [x] No console errors

## 🔮 Future Enhancements

### Possible Additions:
1. **Year Comparison**: Side-by-side year comparison
2. **Holiday Import**: Import holidays from file
3. **Holiday Export**: Export year configuration
4. **Multi-Year View**: See multiple years at once
5. **Holiday Templates**: Copy holidays from one year to another

---

**Status**: ✅ **COMPLETE**

The calendar now supports year-based configuration, allowing different holiday setups for each year with statistics tracking and easy year selection.
