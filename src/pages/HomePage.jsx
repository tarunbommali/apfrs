import React from 'react';
import Instructions from '../components/Instructions';

const HomePage = ({ attendanceData, loading, error }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center px-4 py-10">

      <div className="max-w-4xl w-full">
        {/* HERO SECTION */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-gray-900 drop-shadow-sm mb-4">
            APFRS For Attendance Management 
          </h1>

          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Upload your Excel attendance sheet to generate insights, analytics, and monthly attendance reports automatically.
          </p>
        </div>

        {/* GLASS CARD */}
        <div className="backdrop-blur-xl bg-white/60 rounded-3xl shadow-xl border border-white/30 p-10 transition hover:shadow-2xl">

          {attendanceData.length === 0 && !loading && !error && (
            <Instructions />
          )}

          {loading && (
            <div className="text-center text-blue-700 font-medium text-lg">
              Processing your file… please wait ✨
            </div>
          )}

          {error && (
            <div className="text-center text-red-600 font-medium text-lg">
              ❌ {error}
            </div>
          )}

          {attendanceData.length > 0 && (
            <div className="text-center text-green-700 text-lg font-semibold">
              Attendance data loaded successfully!
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default HomePage;
