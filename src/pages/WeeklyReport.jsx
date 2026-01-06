import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAttendance } from '../contexts/AttendanceContext';
import { getWorkingDays, getDaysInMonth, getHolidays } from '../core/calendar/workingDays';
import PageLayout from './PageLayout';
import { Calendar, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const WeeklyReport = () => {
    const { year, month, week: weekParam } = useParams();
    const navigate = useNavigate();
    const { attendanceData, selectedMonth: contextMonth, selectedYear: contextYear } = useAttendance();

    const selectedYear = parseInt(year) || contextYear;
    const selectedMonth = parseInt(month) || contextMonth;
    const [selectedWeek, setSelectedWeek] = useState(parseInt(weekParam) || 1);
    const [selectedDepartment, setSelectedDepartment] = useState('');

    // Sync state with params
    useEffect(() => {
        if (weekParam) {
            setSelectedWeek(parseInt(weekParam));
        }
    }, [weekParam]);

    // Update URL when week changes
    const handleWeekChange = (newWeek) => {
        setSelectedWeek(newWeek);
        navigate(`/weekly/${selectedYear}/${selectedMonth}/${newWeek}`);
    };

    // Get working days and holidays
    const workingDays = useMemo(() => {
        if (!attendanceData.length) return [];
        return getWorkingDays(attendanceData, selectedMonth, null, selectedYear);
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

    // Build case-insensitive department options
    const departmentOptions = useMemo(() => {
        const registry = new Map();

        attendanceData.forEach((emp) => {
            const raw = (emp.department || '').trim();
            if (!raw) return;
            const key = raw.toLowerCase();
            if (!registry.has(key)) {
                registry.set(key, {
                    label: raw.toUpperCase(),
                    value: key
                });
            }
        });

        return Array.from(registry.values()).sort((a, b) =>
            a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
        );
    }, [attendanceData]);

    // Filter data by department
    const filteredData = useMemo(() => {
        if (!selectedDepartment) return attendanceData;
        return attendanceData.filter(
            (emp) => (emp.department || '').trim().toLowerCase() === selectedDepartment
        );
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
                        {departmentOptions.map((dept) => (
                            <option key={dept.value} value={dept.value}>{dept.label}</option>
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

            {/* Week Selector */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                    <button
                        onClick={() => handleWeekChange(selectedWeek - 1)}
                        disabled={selectedWeek <= 1}
                        className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6 text-slate-600" />
                    </button>

                    <div className="flex-1 text-center">
                        <div className="flex items-center justify-center gap-4">
                            <Calendar className="w-6 h-6 text-indigo-600" />
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">
                                    Week {selectedWeek} Analysis
                                </h2>
                                <p className="text-sm text-slate-500 font-medium mt-1">
                                    {MONTHS[selectedMonth - 1]} {selectedYear}
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => handleWeekChange(selectedWeek + 1)}
                        disabled={selectedWeek >= weeklyStats.length}
                        className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight className="w-6 h-6 text-slate-600" />
                    </button>
                </div>

                {/* Quick Week Selector */}
                <div className="mt-6 flex justify-center gap-4">
                    {weeklyStats.map((week) => (
                        <button
                            key={week.weekNumber}
                            onClick={() => handleWeekChange(week.weekNumber)}
                            className={`
                                px-6 py-2 rounded-xl font-semibold transition-all
                                ${selectedWeek === week.weekNumber
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                }
                            `}
                        >
                            Week {week.weekNumber}
                        </button>
                    ))}
                </div>
            </div>

            {/* Weekly Stats */}
            {weeklyStats.length > 0 ? (
                <div className="space-y-6">
                    {weeklyStats.filter(w => w.weekNumber === selectedWeek).map((week, index) => {
                        const trend = getTrend(week, weeklyStats[selectedWeek - 2]);
                        const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
                        const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-slate-400';

                        return (
                            <div key={week.weekNumber} className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900">
                                            Weekly Performance Summary
                                        </h3>
                                        <p className="text-slate-500 mt-1">
                                            Days {week.weekStart} - {week.weekEnd} ({week.workingDays} working days)
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center justify-end gap-2 mb-1">
                                            <TrendIcon className={`w-5 h-5 ${trendColor}`} />
                                            <span className="text-3xl font-bold text-slate-900">
                                                {week.attendancePercentage}%
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium text-slate-500 text-uppercase tracking-wider">Attendance Rate</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                        <p className="text-sm font-medium text-slate-500 mb-1">Total Faculty</p>
                                        <p className="text-2xl font-bold text-slate-900">{week.totalEmployees}</p>
                                    </div>

                                    <div className="p-6 bg-green-50 rounded-2xl border border-green-100">
                                        <p className="text-sm font-medium text-green-600 mb-1">Present</p>
                                        <p className="text-2xl font-bold text-green-700">{week.totalPresent}</p>
                                    </div>

                                    <div className="p-6 bg-red-50 rounded-2xl border border-red-100">
                                        <p className="text-sm font-medium text-red-600 mb-1">Absent</p>
                                        <p className="text-2xl font-bold text-red-700">{week.totalAbsent}</p>
                                    </div>

                                    <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                                        <p className="text-sm font-medium text-indigo-600 mb-1">Working Days</p>
                                        <p className="text-2xl font-bold text-indigo-700">{week.workingDays}</p>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mt-8">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-sm font-bold text-slate-700">Monthly Target Progress</span>
                                        <span className={`text-sm font-bold ${week.attendancePercentage >= 75 ? 'text-green-600' : 'text-amber-600'}`}>
                                            {week.attendancePercentage}% / 100%
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden border border-slate-200">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ease-out ${week.attendancePercentage >= 75
                                                ? 'bg-linear-to-r from-green-500 to-emerald-400'
                                                : week.attendancePercentage >= 50
                                                    ? 'bg-linear-to-r from-amber-500 to-orange-400'
                                                    : 'bg-linear-to-r from-red-500 to-rose-400'
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
