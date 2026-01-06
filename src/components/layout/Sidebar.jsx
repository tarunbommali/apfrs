import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAttendance } from '../../contexts/AttendanceContext';
import {
    LayoutDashboard,
    FileText,
    Users,
    Settings,
    Upload,
    Calendar,
    Home,
    Mail,
    X,
    BarChart3,
    Layers
} from 'lucide-react';

const SidebarItem = ({ to, icon: Icon, label, disabled }) => (
    <NavLink
        to={to}
        className={({ isActive }) => `
      flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
      ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
      ${isActive
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : 'text-slate-600 hover:bg-slate-100 hover:text-indigo-600'}
    `}
    >
        <Icon className="w-5 h-5" />
        <span className="font-medium">{label}</span>
    </NavLink>
);

const Sidebar = ({ isOpen, onClose, hasData }) => {
    const { selectedMonth, selectedYear } = useAttendance();
    const today = new Date().getDate();

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <aside className={`
        fixed top-0 left-0 z-50 h-full w-72 bg-white/80 backdrop-blur-xl border-r border-slate-200
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen
      `}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <LayoutDashboard className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-slate-800 tracking-tight">APFRS</h1>
                                <p className="text-xs text-slate-500 font-medium">Admin Portal</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-600">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto p-4 space-y-2">


                        <SidebarItem to="/" icon={Home} label="Home" />
                        <SidebarItem to="/import" icon={Upload} label="Import Data" />

                        <div className="pt-4 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Reports
                        </div>
                        <SidebarItem to={`/daily/${selectedYear}/${selectedMonth}/${today}`} icon={Calendar} label="Daily Report" disabled={!hasData} />
                        <SidebarItem to={`/weekly/${selectedYear}/${selectedMonth}/1`} icon={Calendar} label="Weekly Report" disabled={!hasData} />
                        <SidebarItem to={`/summary/${selectedYear}/${selectedMonth}`} icon={FileText} label="Monthly Report" disabled={!hasData} />
                        <SidebarItem to="/department" icon={Users} label="Department Report" disabled={!hasData} />
                        <SidebarItem to="/detailed" icon={Users} label="Detailed View" disabled={!hasData} />

                        <div className="pt-4 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Communication
                        </div>
                        <SidebarItem to="/status-dashboard" icon={BarChart3} label="Status Dashboard" disabled={!hasData} />
                        <SidebarItem to="/consolidated" icon={Layers} label="Consolidated Report" disabled={!hasData} />
                        <SidebarItem to="/email-preview" icon={Mail} label="Email Template" disabled={!hasData} />

                        <div className="pt-4 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Configuration
                        </div>
                        <SidebarItem to="/calendar" icon={Calendar} label="Academic Calendar" />
                        <SidebarItem to="/admin" icon={Settings} label="Email Configuration" />
                    </nav>


                </div>
            </aside>
        </>
    );
};

export default Sidebar;
