import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import PageLayout from './PageLayout';
import ManageCalendar from '../components/ManageCalendar';

const AcademicCalendar = () => {
    const bodyContent = (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Academic Calendar</h1>
                    <p className="text-slate-500 mt-1">Manage academic calendar, holidays, and custom events.</p>
                </div>
            </header>

            {/* Calendar Component */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <ManageCalendar />
            </div>
        </div>
    );

    return <PageLayout Sidebar={null} Body={bodyContent} />;
};

export default AcademicCalendar;
