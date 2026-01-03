import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AttendanceProvider, useAttendance } from './contexts/AttendanceContext';
import LoadingIndicator from './components/LoadingIndicator';
import ErrorDisplay from './components/ErrorDisplay';
import DashboardLayout from './components/layout/DashboardLayout';
import MoveToTop from './components/MoveToTop';

import Administration from './pages/Administration';
import AcademicCalendar from './pages/AcademicCalendar';
import ImportData from './pages/ImportData';
import HomePage from './pages/HomePage';
import FacultySummary from './pages/FacultySummary';
import DetailedView from './pages/DetailedView';
import WeeklyReport from './pages/WeeklyReport';
import DepartmentReport from './pages/DepartmentReport';
import DailyReport from './pages/DailyReport';
import EmailPreview from './pages/EmailPreview';
import StatusDashboard from './pages/StatusDashboard';

const ProtectedRoute = ({ children }) => {
  const { ready, hasData } = useAttendance();

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-slate-600 text-sm font-medium">Loading saved attendance data...</p>
      </div>
    );
  }

  return hasData ? children : <Navigate to="/" replace />;
};

const AppContent = () => {
  const {
    attendanceData,
    fileName,
    loading,
    error,
    handleFileUpload,
    resetData,
  } = useAttendance();

  return (
    <DashboardLayout>
      {loading && <LoadingIndicator />}
      {error && <ErrorDisplay error={error} />}

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/summary"
          element={
            <ProtectedRoute>
              <FacultySummary />
            </ProtectedRoute>
          }
        />
        <Route
          path="/detailed"
          element={
            <ProtectedRoute>
              <DetailedView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/weekly"
          element={
            <ProtectedRoute>
              <WeeklyReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/department"
          element={
            <ProtectedRoute>
              <DepartmentReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/daily"
          element={
            <ProtectedRoute>
              <DailyReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/email-preview"
          element={
            <ProtectedRoute>
              <EmailPreview />
            </ProtectedRoute>
          }
        />
        <Route path="/import" element={<ImportData />} />
        <Route path="/calendar" element={<AcademicCalendar />} />
        <Route path="/admin" element={<Administration />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <MoveToTop />
    </DashboardLayout>
  );
};

const App = () => {
  return (
    <AttendanceProvider>
      <Router>
        <AppContent />
      </Router>
    </AttendanceProvider>
  );
};

export default App;
