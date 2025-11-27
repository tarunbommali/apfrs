import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import LoadingIndicator from './components/LoadingIndicator';
import ErrorDisplay from './components/ErrorDisplay';

import { processAttendanceData } from './utils/attendanceUtils';
import Header from './components/Header';
import MoveToTop from './components/MoveToTop';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';


import ConfigureSMTP from './pages/ConfigureSMTP';
import HomePage from './pages/HomePage';
import FacultySummary from './pages/FacultySummary';
import DetailedView from './pages/DetailedView';
import Docs from './pages/Docs';


const STORAGE_KEYS = {
  data: 'faculty-attendance-data',
  fileName: 'faculty-attendance-file-name'
};

const App = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  const processExcelFile = (file) => {
    setLoading(true);
    setError('');
    setFileName(file.name);

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const processedData = processAttendanceData(jsonData);
        setAttendanceData(processedData);

        try {
          localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(processedData));
          localStorage.setItem(STORAGE_KEYS.fileName, file.name);
        } catch (storageError) {
          console.warn('Unable to persist attendance data:', storageError);
        }
      } catch (err) {
        setError('Error processing file: ' + err.message);
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError('Error reading file');
      setLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFileUpload = (file) => {
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      setError('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    processExcelFile(file);
  };

  const resetData = () => {
    setAttendanceData([]);
    setFileName('');
    setError('');

    try {
      localStorage.removeItem(STORAGE_KEYS.data);
      localStorage.removeItem(STORAGE_KEYS.fileName);
    } catch (storageError) {
      console.warn('Unable to clear persisted attendance data:', storageError);
    }
  };

  useEffect(() => {
    try {
      const storedData = localStorage.getItem(STORAGE_KEYS.data);
      const storedFileName = localStorage.getItem(STORAGE_KEYS.fileName);

      if (storedData) {
        const parsedData = JSON.parse(storedData);
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          setAttendanceData(parsedData);
        }
      }

      if (storedFileName) {
        setFileName(storedFileName);
      }
    } catch (storageError) {
      console.warn('Unable to load persisted attendance data:', storageError);
    }
  }, []);

  return (
    <Router>
      <Header
        fileName={fileName}
        attendanceData={attendanceData}
        onReset={resetData}
        onFileUpload={handleFileUpload}
        loading={loading}
      />

      {/* Global Loading and Error Display */}
      {loading && <LoadingIndicator />}
      {error && <ErrorDisplay error={error} />}

      <Routes>
        {/* Home Route */}
        <Route
          path="/"
          element={
            <HomePage
              attendanceData={attendanceData}
              loading={loading}
              error={error}
            />
          }
        />

        {/* Summary Page */}
        <Route
          path="/summary"
          element={
            attendanceData.length > 0 ? (
              <FacultySummary
                attendanceData={attendanceData}
                fileName={fileName}
                onReset={resetData}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />


        <Route path="/docs" element={<Docs />} />

        {/* Detailed View Page */}
        <Route
          path="/detailed"
          element={
            attendanceData.length > 0 ? (
              <DetailedView
                attendanceData={attendanceData}
                fileName={fileName}
                onReset={resetData}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* SMTP Configuration Page */}
        <Route
          path="/configure-smtp"
          element={<ConfigureSMTP />}
        />

        {/* Catch all route - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>

      <MoveToTop />


    </Router>
  );
};

export default App;