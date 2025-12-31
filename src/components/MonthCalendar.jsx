import React, { useMemo } from 'react';
import { useAttendance } from '../contexts/AttendanceContext';
import { calculateSummary, getHolidays, getWorkingDays } from '../utils/attendanceUtils';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Helper to determine status color
const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('present') || s === 'p') return 'bg-emerald-500 text-white';
    if (s.includes('absent') || s === 'a') return 'bg-rose-500 text-white';
    if (s.includes('leave') || s === 'cl' || s === 'od') return 'bg-blue-500 text-white';
    if (s.includes('holiday')) return 'bg-slate-200 text-slate-500';
    return 'bg-slate-100 text-slate-400';
};

const MonthCalendar = ({ employee, monthNumber = 11, year = 2025 }) => {
    // Get days in month
    const daysInMonth = new Date(year, monthNumber, 0).getDate(); // monthNumber is 1-based here?
    // JS Date uses 0-based month. If monthNumber is 11 (Nov), we want new Date(2025, 11, 0) which gives last day of Nov ?? No.
    // new Date(2025, 11, 0) is Nov 30? Wait.
    // new Date(year, monthIndex + 1, 0)
    // If monthNumber is 11 (Nov), JS index is 10.
    // Let's assume monthNumber is passed as 1-based (standard for our app config).
    const monthIndex = monthNumber - 1;
    const numDays = new Date(year, monthNumber, 0).getDate();
    const firstDayOfWeek = new Date(year, monthIndex, 1).getDay();

    // Create map of attendance by day
    const attendanceMap = useMemo(() => {
        const map = {};
        if (employee && employee.attendance) {
            employee.attendance.forEach((record, idx) => {
                // Assuming array index + 1 maps to day of month if sequential
                // Or record has specific date?
                // Our Excel parser currently maps index 0 -> Day 1
                const day = idx + 1;
                map[day] = record;
            });
        }
        return map;
    }, [employee]);

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
                Monthly Attendance View
            </h3>

            <div className="grid grid-cols-7 mb-2">
                {DAYS_OF_WEEK.map(d => (
                    <div key={d} className="text-center text-xs font-semibold text-slate-400 uppercase py-2">
                        {d}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
                {/* Empty slots */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square"></div>
                ))}

                {/* Days */}
                {Array.from({ length: numDays }).map((_, i) => {
                    const day = i + 1;
                    const record = attendanceMap[day];
                    const status = record?.status || '-';
                    const colorClass = getStatusColor(status);
                    const isSunday = new Date(year, monthIndex, day).getDay() === 0;

                    // Override for Sunday if no status
                    const displayClass = (isSunday && status === '-')
                        ? 'bg-amber-50 text-amber-600 border border-amber-100'
                        : colorClass;

                    return (
                        <div
                            key={day}
                            className={`aspect-square rounded-lg flex flex-col items-center justify-center p-1 relative group cursor-default ${displayClass}`}
                        >
                            <span className="text-xs font-semibold">{day}</span>
                            {status !== '-' && (
                                <span className="text-[10px] uppercase font-bold mt-1 truncate w-full text-center">
                                    {status.substring(0, 2)}
                                </span>
                            )}

                            {/* Tooltip */}
                            {record && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 w-max min-w-[120px] p-2 bg-slate-800 text-white text-xs rounded shadow-xl">
                                    <p className="font-semibold text-slate-200 border-b border-slate-600 pb-1 mb-1">Day {day}</p>
                                    <p>In: {record.inTime || '--'}</p>
                                    <p>Out: {record.outTime || '--'}</p>
                                    <p>Status: {record.status}</p>
                                    <div className="w-2 h-2 bg-slate-800 rotate-45 mx-auto -mb-1 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-500"></div> Present</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-rose-500"></div> Absent</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-blue-500"></div> Leave/OD</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-amber-50"></div> Sunday</div>
            </div>
        </div>
    );
};

export default MonthCalendar;
