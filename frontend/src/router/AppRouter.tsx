import React from "react";
import { createBrowserRouter } from "react-router-dom";
import RootLayout, { NotFoundPage, ErrorBoundary } from "../layouts/RootLayout";

// Page Imports
import DashboardPage from "../pages/Dashboard/DashboardPage";
import LoginPage from "../pages/Login/LoginPage";
import AdminDashboardPage from "../pages/AdminDashboard/AdminDashboardPage";
import CalendarPage from "../pages/Calendar/CalendarPage";
import EditCalendarPage from "../pages/EditCalendar/EditCalendarPage";
import ConsolidatedPage from "../pages/Consolidated/ConsolidatedPage";
import DepartmentsPage from "../pages/Departments/DepartmentsPage";
import DetailedPage from "../pages/Detailed/DetailedPage";
import EmailConfigPage from "../pages/EmailConfig/EmailConfigPage";
import FacultyProfilePage from "../pages/FacultyProfile/FacultyProfilePage";
import FacultyEditPage from "../pages/FacultyEdit/FacultyEditPage";
import FacultyNewPage from "../pages/FacultyNew/FacultyNewPage";
import ImportPage from "../pages/Import/ImportPage";
import MyAttendancePage from "../pages/MyAttendance/MyAttendancePage";
import StatusDashboardPage from "../pages/StatusDashboard/StatusDashboardPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "admin-dashboard", element: <AdminDashboardPage /> },
      { path: "calendar", element: <CalendarPage /> },
      { path: "edit-calendar", element: <EditCalendarPage /> },
      { path: "edit/calendar", element: <EditCalendarPage /> },
      { path: "consolidated", element: <ConsolidatedPage /> },
      { path: "departments", element: <DepartmentsPage /> },
      { path: "detailed", element: <DetailedPage /> },
      { path: "email-config", element: <EmailConfigPage /> },
      { path: "faculty-profile", element: <FacultyProfilePage /> },
      { path: "faculty/:id/edit", element: <FacultyEditPage /> },
      { path: "faculty/$id/edit", element: <FacultyEditPage /> },
      { path: "faculty/new", element: <FacultyNewPage /> },
      { path: "import", element: <ImportPage /> },
      { path: "my-attendance", element: <MyAttendancePage /> },
      { path: "status-dashboard", element: <StatusDashboardPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

export default router;
