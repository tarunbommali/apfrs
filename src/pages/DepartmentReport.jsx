import React, { useState, useMemo } from 'react';
import { useAttendance } from '../contexts/AttendanceContext';
import { calculateSummary } from '../core/attendance/calculations';
import { getWorkingDays as calculateWorkingDays } from '../core/calendar/workingDays';
import PageLayout from './PageLayout';
import { Building2, Users, TrendingUp, Award, AlertCircle } from 'lucide-react';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const DepartmentReport = () => {
    const { attendanceData, selectedMonth, selectedYear } = useAttendance();
    const [selectedDepartment, setSelectedDepartment] = useState('');

    // Get working days
    const workingDays = useMemo(() => {
        if (!attendanceData.length) return [];
        return calculateWorkingDays(attendanceData, selectedMonth, null, selectedYear);
    }, [attendanceData, selectedMonth, selectedYear]);

    const effectiveWorkingDays = workingDays.length ? workingDays : null;

    // Get unique departments
    const departments = useMemo(() => {
        const depts = [...new Set(attendanceData.map(emp => emp.department))];
        return depts.filter(Boolean).sort();
    }, [attendanceData]);

    // Calculate department-wise statistics
    const departmentStats = useMemo(() => {
        const stats = {};

        departments.forEach(dept => {
            const deptEmployees = attendanceData.filter(emp => emp.department === dept);

            let totalPresent = 0;
            let totalAbsent = 0;
            let totalLeave = 0;
            let totalHours = 0;

            deptEmployees.forEach(emp => {
                const summary = calculateSummary(emp, effectiveWorkingDays);
                totalPresent += summary.presentDays;
                totalAbsent += summary.absentDays;
                totalLeave += summary.leaveDays;
                totalHours += parseFloat(summary.totalHours || 0);
            });

            const totalPossible = deptEmployees.length * (workingDays.length || 1);
            const attendancePercentage = totalPossible > 0
                ? ((totalPresent / totalPossible) * 100).toFixed(1)
                : 0;

            const avgHoursPerEmployee = deptEmployees.length > 0
                ? (totalHours / deptEmployees.length).toFixed(1)
                : 0;

            stats[dept] = {
                department: dept,
                totalEmployees: deptEmployees.length,
                totalPresent,
                totalAbsent,
                totalLeave,
                totalHours: totalHours.toFixed(1),
                avgHoursPerEmployee,
                attendancePercentage: parseFloat(attendancePercentage),
                employees: deptEmployees.map(emp => ({
                    ...emp,
                    summary: calculateSummary(emp, effectiveWorkingDays)
                }))
            };
        });

        return stats;
    }, [departments, attendanceData, effectiveWorkingDays, workingDays.length]);

    // Get selected department data
    const selectedDeptData = selectedDepartment ? departmentStats[selectedDepartment] : null;

    // Calculate overall stats
    const overallStats = useMemo(() => {
        const allDepts = Object.values(departmentStats);

        const totalEmployees = allDepts.reduce((sum, dept) => sum + dept.totalEmployees, 0);
        const totalPresent = allDepts.reduce((sum, dept) => sum + dept.totalPresent, 0);
        const totalAbsent = allDepts.reduce((sum, dept) => sum + dept.totalAbsent, 0);

        const avgAttendance = allDepts.length > 0
            ? (allDepts.reduce((sum, dept) => sum + dept.attendancePercentage, 0) / allDepts.length).toFixed(1)
            : 0;

        return {
            totalDepartments: allDepts.length,
            totalEmployees,
            totalPresent,
            totalAbsent,
            avgAttendance: parseFloat(avgAttendance)
        };
    }, [departmentStats]);

    const bodyContent = (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Department Report</h1>
                    <p className="text-slate-500 mt-1">
                        Department-wise attendance analysis for {MONTHS[selectedMonth - 1] || 'Selected Month'} {selectedYear}
                    </p>
                </div>
            </header>

            {/* Overall Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{overallStats.totalDepartments}</p>
                            <p className="text-sm text-slate-500">Departments</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{overallStats.totalEmployees}</p>
                            <p className="text-sm text-slate-500">Total Faculty</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{overallStats.avgAttendance}%</p>
                            <p className="text-sm text-slate-500">Avg Attendance</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                            <Award className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{workingDays.length}</p>
                            <p className="text-sm text-slate-500">Working Days</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Department Selector */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <label className="text-sm font-semibold text-slate-700">
                        Select Department:
                    </label>
                    <select
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                        className="flex-1 max-w-md rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                    >
                        <option value="">-- Select Department --</option>
                        {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Department Comparison Table */}
            {!selectedDepartment && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-200">
                        <h2 className="text-xl font-bold text-slate-900">All Departments Comparison</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Department
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Faculty
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Present
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Absent
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Attendance %
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Avg Hours
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {Object.values(departmentStats)
                                    .sort((a, b) => b.attendancePercentage - a.attendancePercentage)
                                    .map((dept, index) => (
                                        <tr key={dept.department} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedDepartment(dept.department)}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-5 h-5 text-indigo-600" />
                                                    <span className="font-medium text-slate-900">{dept.department}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center text-slate-700">{dept.totalEmployees}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-green-700 font-semibold">{dept.totalPresent}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-red-700 font-semibold">{dept.totalAbsent}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${dept.attendancePercentage >= 75
                                                    ? 'bg-green-100 text-green-800'
                                                    : dept.attendancePercentage >= 50
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {dept.attendancePercentage}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center text-slate-700">{dept.avgHoursPerEmployee}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Selected Department Details */}
            {selectedDeptData && (
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Building2 className="w-6 h-6 text-indigo-600" />
                            {selectedDeptData.department}
                        </h2>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="p-4 bg-slate-50 rounded-xl">
                                <p className="text-sm text-slate-500">Total Faculty</p>
                                <p className="text-2xl font-bold text-slate-900">{selectedDeptData.totalEmployees}</p>
                            </div>

                            <div className="p-4 bg-green-50 rounded-xl">
                                <p className="text-sm text-green-700">Present</p>
                                <p className="text-2xl font-bold text-green-900">{selectedDeptData.totalPresent}</p>
                            </div>

                            <div className="p-4 bg-red-50 rounded-xl">
                                <p className="text-sm text-red-700">Absent</p>
                                <p className="text-2xl font-bold text-red-900">{selectedDeptData.totalAbsent}</p>
                            </div>

                            <div className="p-4 bg-indigo-50 rounded-xl">
                                <p className="text-sm text-indigo-700">Attendance</p>
                                <p className="text-2xl font-bold text-indigo-900">{selectedDeptData.attendancePercentage}%</p>
                            </div>

                            <div className="p-4 bg-purple-50 rounded-xl">
                                <p className="text-sm text-purple-700">Avg Hours</p>
                                <p className="text-2xl font-bold text-purple-900">{selectedDeptData.avgHoursPerEmployee}</p>
                            </div>
                        </div>
                    </div>

                    {/* Faculty List */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-200">
                            <h3 className="text-lg font-bold text-slate-900">Faculty Members</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Designation</th>
                                        <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Present</th>
                                        <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Absent</th>
                                        <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Attendance %</th>
                                        <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Hours</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {selectedDeptData.employees
                                        .sort((a, b) => parseFloat(b.summary.attendancePercentage) - parseFloat(a.summary.attendancePercentage))
                                        .map((emp) => (
                                            <tr key={emp.cfmsId} className="hover:bg-slate-50">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-900">{emp.name}</div>
                                                    <div className="text-sm text-slate-500">{emp.cfmsId}</div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-700">{emp.designation}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-green-700 font-semibold">{emp.summary.presentDays}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-red-700 font-semibold">{emp.summary.absentDays}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${parseFloat(emp.summary.attendancePercentage) >= 75
                                                        ? 'bg-green-100 text-green-800'
                                                        : parseFloat(emp.summary.attendancePercentage) >= 50
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {emp.summary.attendancePercentage}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center text-slate-700">{emp.summary.totalHours}</td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {departments.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No Data Available</h3>
                    <p className="text-slate-500">Please upload attendance data to view department reports.</p>
                </div>
            )}
        </div>
    );

    return <PageLayout Sidebar={null} Body={bodyContent} />;
};

export default DepartmentReport;
