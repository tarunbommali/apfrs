import React, { useState, useMemo } from 'react';
import { useAttendance } from '../contexts/AttendanceContext';
import { calculateWorkingDays, getDaysInMonth, getHolidays } from '../utils/attendanceUtils';
import PageLayout from './PageLayout';
import { Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const WeeklyReport = () => {
    const { attendanceData, selectedMonth, selectedYear } = useAttendance();
    const [selectedDepartment, setSelectedDepartment] = useState('');

    // Get working days and holidays
    const workingDays = useMemo(() => {
        if (!attendanceData.length) return [];
        return calculateWorkingDays(attendanceData, selectedMonth, null, selectedYear);
    }, [attendanceData, selectedMonth, selectedYear]);

    const totalDaysInMonth = useMemo(() => {
        if (attendanceData.length > 0) return getDaysInMonth(attendanceData);
        return new Date(selectedYear, selectedMonth, 0).getDate();
    }, [attendanceData, selectedMonth, selectedYear]);

    // Get holidays for the month (Configured + Sundays)
    const holidays = useMemo(() => {
        return getHolidays(selectedMonth, totalDaysInMonth, selectedYear);
    }, [selectedMonth, selectedYear, totalDaysInMonth]);

    // Group working days into weeks
    const weeks = useMemo(() => {
        if (workingDays.length === 0) return [];

        const weekGroups = [];
        let currentWeek = [];

        workingDays.forEach((day, index) => {
            currentWeek.push(day);

            // Create a new week every 7 days or at the end
            if (currentWeek.length === 7 || index === workingDays.length - 1) {
                weekGroups.push([...currentWeek]);
                currentWeek = [];
            }
        });

        return weekGroups;
    }, [workingDays]);

    // Get unique departments
    const departments = useMemo(() => {
        const depts = [...new Set(attendanceData.map(emp => emp.department))];
        return depts.filter(Boolean).sort();
    }, [attendanceData]);

    // Filter data by department
    const filteredData = useMemo(() => {
        if (!selectedDepartment) return attendanceData;
        return attendanceData.filter(emp => emp.department === selectedDepartment);
    }, [attendanceData, selectedDepartment]);

    // Calculate weekly statistics
    const weeklyStats = useMemo(() => {
        return weeks.map((week, weekIndex) => {
            const weekStart = week[0];
            const weekEnd = week[week.length - 1];

            let totalPresent = 0;
            let totalAbsent = 0;
            let totalEmployees = filteredData.length;

            filteredData.forEach(employee => {
                week.forEach(day => {
                    const dayKey = `day${day}`;
                    const status = employee[dayKey];

                    if (status === 'P' || status === 'p') {
                        totalPresent++;
                    } else if (status === 'A' || status === 'a') {
                        totalAbsent++;
                    }
                });
            });

            const totalPossible = totalEmployees * week.length;
            const attendancePercentage = totalPossible > 0
                ? ((totalPresent / totalPossible) * 100).toFixed(1)
                : 0;

            return {
                weekNumber: weekIndex + 1,
                weekStart,
                weekEnd,
                days: week,
                totalPresent,
                totalAbsent,
                totalEmployees,
                attendancePercentage: parseFloat(attendancePercentage),
                workingDays: week.length
            };
        });
    }, [weeks, filteredData]);

    // Calculate trend
    const getTrend = (currentWeek, previousWeek) => {
        if (!previousWeek) return 'neutral';
        const diff = currentWeek.attendancePercentage - previousWeek.attendancePercentage;
        if (diff > 2) return 'up';
        if (diff < -2) return 'down';
        return 'neutral';
    };

    const bodyContent = (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Weekly Report</h1>
                    <p className="text-slate-500 mt-1">
                        Week-by-week attendance analysis for {MONTHS[selectedMonth - 1] || 'Selected Month'} {selectedYear}
                    </p>
                </div>
            </header>

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

            {/* Calendar Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{totalDaysInMonth}</p>
                            <p className="text-sm text-slate-500">Total Days</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{workingDays.length}</p>
                            <p className="text-sm text-slate-500">Working Days</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{holidays.length}</p>
                            <p className="text-sm text-slate-500">Holidays</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Weekly Stats */}
            {weeklyStats.length > 0 ? (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-900">Week-by-Week Analysis</h2>

                    {weeklyStats.map((week, index) => {
                        const trend = getTrend(week, weeklyStats[index - 1]);
                        const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
                        const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-slate-400';

                        return (
                            <div key={week.weekNumber} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">
                                            Week {week.weekNumber}
                                        </h3>
                                        <p className="text-sm text-slate-500">
                                            Days {week.weekStart} - {week.weekEnd} ({week.workingDays} working days)
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <TrendIcon className={`w-5 h-5 ${trendColor}`} />
                                        <span className="text-2xl font-bold text-slate-900">
                                            {week.attendancePercentage}%
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-xl">
                                        <p className="text-sm text-slate-500">Total Faculty</p>
                                        <p className="text-xl font-bold text-slate-900">{week.totalEmployees}</p>
                                    </div>

                                    <div className="p-4 bg-green-50 rounded-xl">
                                        <p className="text-sm text-green-700">Present</p>
                                        <p className="text-xl font-bold text-green-900">{week.totalPresent}</p>
                                    </div>

                                    <div className="p-4 bg-red-50 rounded-xl">
                                        <p className="text-sm text-red-700">Absent</p>
                                        <p className="text-xl font-bold text-red-900">{week.totalAbsent}</p>
                                    </div>

                                    <div className="p-4 bg-indigo-50 rounded-xl">
                                        <p className="text-sm text-indigo-700">Working Days</p>
                                        <p className="text-xl font-bold text-indigo-900">{week.workingDays}</p>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mt-4">
                                    <div className="flex justify-between text-sm text-slate-600 mb-2">
                                        <span>Attendance Rate</span>
                                        <span>{week.attendancePercentage}%</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-3">
                                        <div
                                            className={`h-3 rounded-full transition-all ${week.attendancePercentage >= 75
                                                ? 'bg-green-500'
                                                : week.attendancePercentage >= 50
                                                    ? 'bg-yellow-500'
                                                    : 'bg-red-500'
                                                }`}
                                            style={{ width: `${week.attendancePercentage}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No Data Available</h3>
                    <p className="text-slate-500">Please upload attendance data to view weekly reports.</p>
                </div>
            )}
        </div>
    );

    return <PageLayout Sidebar={null} Body={bodyContent} />;
};

export default WeeklyReport;
