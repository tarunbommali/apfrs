/* eslint-disable no-unused-vars */
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { handleExcelUpload } from '../core/attendance/processor';

const AttendanceContext = createContext();

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
};

export const AttendanceProvider = ({ children }) => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(11); // Default to Nov (11) if not set
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);

  const [customHolidays, setCustomHolidays] = useState({}); // { "month-day": "holiday" }

  // Load data from localStorage on mount
  useEffect(() => {
    const loadSavedData = () => {
      try {
        const saved = localStorage.getItem('apfrsAttendanceReport');
        const savedMonth = localStorage.getItem('apfrsSelectedMonth');
        const savedYear = localStorage.getItem('apfrsSelectedYear');
        const savedHolidays = localStorage.getItem('apfrsCustomHolidays');

        if (saved) {
          const parsedData = JSON.parse(saved);
          console.log('📊 Loaded saved attendance data:', parsedData);
          setAttendanceData(Array.isArray(parsedData) ? parsedData : []);
        }

        if (savedMonth) {
          setSelectedMonth(parseInt(savedMonth, 10));
        }

        if (savedYear) {
          setSelectedYear(parseInt(savedYear, 10));
        }

        if (savedHolidays) {
          setCustomHolidays(JSON.parse(savedHolidays));
        }
      } catch (err) {
        console.error('Error loading saved attendance data:', err);
        setAttendanceData([]);
      } finally {
        setReady(true);
      }
    };

    loadSavedData();
  }, []);

  const handleFileUpload = async (file, rawData, month, year) => {
    if (!file || !rawData) {
      setError('No file or data provided');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('📤 Processing uploaded file:', file.name, 'Month:', month);
      // Resolve month and year: Use selection if provided, otherwise fallback to detection from filename
      let monthNum = month || 11;
      let yearNum = year || new Date().getFullYear();

      // Process the Excel data
      const processedData = handleExcelUpload(rawData, file.name, monthNum, yearNum);

      if (!processedData || !Array.isArray(processedData) || processedData.length === 0) {
        throw new Error('No valid attendance data found in the file');
      }

      // Update state
      setAttendanceData(processedData);
      setFileName(file.name);
      setSelectedMonth(monthNum);
      setSelectedYear(yearNum);

      // Store in localStorage for persistence
      localStorage.setItem('apfrsAttendanceReport', JSON.stringify(processedData));
      localStorage.setItem('apfrsSelectedMonth', monthNum.toString());
      localStorage.setItem('apfrsSelectedYear', yearNum.toString());

      console.log(`💾 Data saved. Month resolved to: ${monthNum}`);
      return true;

    } catch (err) {
      console.error('❌ Error processing file:', err);
      setError(err.message || 'Failed to process the uploaded file');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const toggleHoliday = (monthIndex, day) => {
    setCustomHolidays(prev => {
      const key = `${monthIndex + 1}-${day}`; // storing as 1-based month for consistency with backend map
      const newHolidays = { ...prev };

      if (newHolidays[key]) {
        delete newHolidays[key];
      } else {
        newHolidays[key] = 'holiday';
      }

      localStorage.setItem('apfrsCustomHolidays', JSON.stringify(newHolidays));
      return newHolidays;
    });
  };

  const resetData = () => {
    setAttendanceData([]);
    setFileName('');
    setSelectedMonth(11); // Reset to default
    setSelectedYear(new Date().getFullYear());
    setError(null);
    setCustomHolidays({});
    localStorage.removeItem('apfrsAttendanceReport');
    localStorage.removeItem('apfrsSelectedMonth');
    localStorage.removeItem('apfrsSelectedYear');
    localStorage.removeItem('apfrsCustomHolidays');
    console.log('🗑️ Attendance data reset');
  };

  const value = {
    attendanceData,
    fileName,
    selectedMonth,
    selectedYear,
    customHolidays,
    loading,
    error,
    ready,
    hasData: attendanceData.length > 0,
    handleFileUpload,
    resetData,
    toggleHoliday
  };

  return (
    <AttendanceContext.Provider value={value}>
      {children}
    </AttendanceContext.Provider>
  );
};

// export default AttendanceContext;
// Removed default export to fix Vite HMR incompatibility with non-component default exports.