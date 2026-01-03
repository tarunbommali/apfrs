import React, { useState, useMemo } from 'react';
import { useAttendance } from '../contexts/AttendanceContext';
import { getWorkingDays as calculateWorkingDays, getHolidays, getDaysInMonth } from '../core/calendar/workingDays';
import { getHolidayLabel } from '../config/calendar';
import PageLayout from './PageLayout';
import { Calendar, Users, CheckCircle, XCircle, Clock, Building2, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const DailyReport = () => {
    const { attendanceData, selectedMonth, selectedYear } = useAttendance();
    const today = new Date().getDate();

    const [selectedDay, setSelectedDay] = useState(today);
    const [selectedDepartment, setSelectedDepartment] = useState('');

    // Get total days
    const totalDays = useMemo(() => {
        return attendanceData.length ? getDaysInMonth(attendanceData) : new Date(selectedYear, selectedMonth, 0).getDate();
    }, [attendanceData, selectedMonth, selectedYear]);

    // Get working days
    const workingDays = useMemo(() => {
        if (!attendanceData.length) return [];
        return calculateWorkingDays(attendanceData, selectedMonth, null, selectedYear);
    }, [attendanceData, selectedMonth, selectedYear]);

    // Get holidays (Configured + Sundays)
    const holidays = useMemo(() => {
        return getHolidays(selectedMonth, totalDays, selectedYear);
    }, [selectedMonth, selectedYear, totalDays]);

    // Check if selected day is a holiday
    const isHoliday = holidays.includes(selectedDay);
    const holidayName = getHolidayLabel(selectedMonth, selectedDay, selectedYear);

    // Check if selected day is a working day
    const isWorkingDay = workingDays.includes(selectedDay);

    // Get unique departments
    const departments = useMemo(() => {
        const depts = [...new Set(attendanceData.map(emp => emp.department))];
        return depts.filter(Boolean).sort();
    }, [attendanceData]);

    // Get attendance for selected day
    const dailyAttendance = useMemo(() => {
        const dayKey = `day${selectedDay}`;

        return attendanceData
            .filter(emp => !selectedDepartment || emp.department === selectedDepartment)
            .map(emp => {
                const status = emp[dayKey];
                const hoursKey = `hours${selectedDay}`;
                const hours = emp[hoursKey] || '0';

                return {
                    ...emp,
                    status: status || 'N/A',
                    hours: hours,
                    isPresent: status === 'P' || status === 'p',
                    isAbsent: status === 'A' || status === 'a',
                    isLeave: status === 'L' || status === 'l'
                };
            })
            .sort((a, b) => {
                // Sort: Present first, then Absent, then Leave
                if (a.isPresent && !b.isPresent) return -1;
                if (!a.isPresent && b.isPresent) return 1;
                if (a.isAbsent && !b.isAbsent) return -1;
                if (!a.isAbsent && b.isAbsent) return 1;
                return a.name.localeCompare(b.name);
            });
    }, [attendanceData, selectedDay, selectedDepartment]);

    // Calculate statistics
    const stats = useMemo(() => {
        const total = dailyAttendance.length;
        const present = dailyAttendance.filter(emp => emp.isPresent).length;
        const absent = dailyAttendance.filter(emp => emp.isAbsent).length;
        const leave = dailyAttendance.filter(emp => emp.isLeave).length;
        const totalHours = dailyAttendance.reduce((sum, emp) => sum + parseFloat(emp.hours || 0), 0);

        return {
            total,
            present,
            absent,
            leave,
            totalHours: totalHours.toFixed(1),
            attendancePercentage: total > 0 ? ((present / total) * 100).toFixed(1) : 0
        };
    }, [dailyAttendance]);

    // Get department-wise stats
    const departmentStats = useMemo(() => {
        const deptMap = {};

        dailyAttendance.forEach(emp => {
            if (!deptMap[emp.department]) {
                deptMap[emp.department] = {
                    total: 0,
                    present: 0,
                    absent: 0,
                    leave: 0
                };
            }

            deptMap[emp.department].total++;
            if (emp.isPresent) deptMap[emp.department].present++;
            if (emp.isAbsent) deptMap[emp.department].absent++;
            if (emp.isLeave) deptMap[emp.department].leave++;
        });

        return Object.entries(deptMap).map(([dept, stats]) => ({
            department: dept,
            ...stats,
            percentage: stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(1) : 0
        })).sort((a, b) => b.percentage - a.percentage);
    }, [dailyAttendance]);

    // Navigate days
    const handlePreviousDay = () => {
        if (selectedDay > 1) {
            setSelectedDay(selectedDay - 1);
        }
    };

    const handleNextDay = () => {
        if (selectedDay < totalDays) {
            setSelectedDay(selectedDay + 1);
        }
    };

    const bodyContent = (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Daily Report</h1>
                    <p className="text-slate-500 mt-1">
                        View attendance for specific days in {MONTHS[selectedMonth - 1] || 'Selected Month'} {selectedYear}
                    </p>
                </div>
            </header>

            {/* Day Selector */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                    <button
                        onClick={handlePreviousDay}
                        disabled={selectedDay <= 1}
                        className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6 text-slate-600" />
                    </button>

                    <div className="flex-1 text-center">
                        <div className="flex items-center justify-center gap-4">
                            <Calendar className="w-6 h-6 text-indigo-600" />
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">
                                    {MONTHS[selectedMonth - 1]} {selectedDay}, {selectedYear}
                                </h2>
                                <div className="flex items-center justify-center gap-2 mt-1">
                                    {isHoliday && (
                                        <span className="text-sm text-red-600 font-semibold bg-red-50 px-3 py-0.5 rounded-full">
                                            🎉 {holidayName || 'Holiday'}
                                        </span>
                                    )}
                                    {!isHoliday && isWorkingDay && (
                                        <span className="text-sm text-green-600 font-semibold bg-green-50 px-3 py-0.5 rounded-full">
                                            ✓ Working Day
                                        </span>
                                    )}
                                    {!isHoliday && !isWorkingDay && (
                                        <span className="text-sm text-slate-500 font-semibold bg-slate-50 px-3 py-0.5 rounded-full">
                                            Non-Working Day
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleNextDay}
                        disabled={selectedDay >= totalDays}
                        className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight className="w-6 h-6 text-slate-600" />
                    </button>
                </div>

                {/* Quick Day Selector */}
                <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                    {[...Array(new Date(selectedYear, selectedMonth, 0).getDate())].map((_, index) => {
                        const day = index + 1;
                        const isSelected = day === selectedDay;
                        const isDayHoliday = holidays.includes(day);
                        const isDayWorking = workingDays.includes(day);

                        return (
                            <button
                                key={day}
                                onClick={() => setSelectedDay(day)}
                                className={`
                  flex-shrink-0 w-12 h-12 rounded-lg font-semibold transition-all
                  ${isSelected
                                        ? 'bg-indigo-600 text-white shadow-lg'
                                        : isDayHoliday
                                            ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                            : isDayWorking
                                                ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                    }
                `}
                            >
                                {day}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Department Filter */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <label className="text-sm font-semibold text-slate-700">
                        Filter by Department:
                    </label>
                    <select
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                        className="flex-1 max-w-md rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                    >
                        <option value="">All Departments</option>
                        {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Overall Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                            <Users className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                            <p className="text-sm text-slate-500">Total Faculty</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-900">{stats.present}</p>
                            <p className="text-sm text-green-700">Present</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                            <XCircle className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-red-900">{stats.absent}</p>
                            <p className="text-sm text-red-700">Absent</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                            <Clock className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-purple-900">{stats.totalHours}</p>
                            <p className="text-sm text-purple-700">Total Hours</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-blue-900">{stats.attendancePercentage}%</p>
                            <p className="text-sm text-blue-700">Attendance</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Department-wise Stats */}
            {!selectedDepartment && departmentStats.length > 1 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-200">
                        <h3 className="text-lg font-bold text-slate-900">Department-wise Attendance</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                        {departmentStats.map(dept => (
                            <div key={dept.department} className="p-4 bg-slate-50 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <Building2 className="w-5 h-5 text-indigo-600" />
                                    <h4 className="font-semibold text-slate-900">{dept.department}</h4>
                                </div>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Present:</span>
                                        <span className="font-semibold text-green-700">{dept.present}/{dept.total}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Attendance:</span>
                                        <span className={`font-semibold ${dept.percentage >= 75 ? 'text-green-700' :
                                            dept.percentage >= 50 ? 'text-yellow-700' : 'text-red-700'
                                            }`}>
                                            {dept.percentage}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Faculty List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900">Faculty Attendance Details</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Department</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Designation</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Status</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Hours</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {dailyAttendance.map((emp) => (
                                <tr key={emp.cfmsId} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">{emp.name}</div>
                                        <div className="text-sm text-slate-500">{emp.cfmsId}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-700">{emp.department}</td>
                                    <td className="px-6 py-4 text-slate-700">{emp.designation}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${emp.isPresent
                                            ? 'bg-green-100 text-green-800'
                                            : emp.isAbsent
                                                ? 'bg-red-100 text-red-800'
                                                : emp.isLeave
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-slate-100 text-slate-800'
                                            }`}>
                                            {emp.isPresent ? '✓ Present' : emp.isAbsent ? '✗ Absent' : emp.isLeave ? 'Leave' : 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-slate-700 font-semibold">{emp.hours}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    return <PageLayout Sidebar={null} Body={bodyContent} />;
};

export default DailyReport;
