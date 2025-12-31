import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { calculateSummary } from '../../utils/attendanceUtils';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6'];

const DepartmentChart = ({ attendanceData, workingDays }) => {
    const chartData = useMemo(() => {
        if (!attendanceData || !attendanceData.length) return [];

        // Group by department
        const deptStats = attendanceData.reduce((acc, emp) => {
            const dept = emp.department || 'Unknown';
            if (!acc[dept]) {
                acc[dept] = { totalPercentage: 0, count: 0 };
            }

            const summary = calculateSummary(emp, workingDays);
            // Use parseFloat to handle string percentages
            const pct = parseFloat(summary.attendancePercentage) || 0;

            acc[dept].totalPercentage += pct;
            acc[dept].count += 1;
            return acc;
        }, {});

        // Format for Recharts
        return Object.entries(deptStats)
            .map(([name, stats]) => ({
                name: name,
                attendance: parseFloat((stats.totalPercentage / stats.count).toFixed(1)),
                count: stats.count
            }))
            .sort((a, b) => b.attendance - a.attendance); // Sort by highest attendance
    }, [attendanceData, workingDays]);

    if (!chartData.length) return null;

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-6 text-lg font-bold text-slate-800">Department-wise Attendance</h3>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            interval={0}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            domain={[0, 100]}
                            unit="%"
                        />
                        <Tooltip
                            cursor={{ fill: '#f1f5f9' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="attendance" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default DepartmentChart;
