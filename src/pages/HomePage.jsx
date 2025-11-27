import React from 'react';
import Instructions from '../components/Instructions';
import Footer from '../components/Footer';


const HomePage = ({ attendanceData, loading, error }) => {
  return (
    <div className="flex flex-col   justify-center items-center pt-22 bg-slate-50">
         <div className="max-w-4xl h-[80vh] w-full">
          {/* HERO SECTION */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-extrabold text-slate-800 drop-shadow-lg mb-4">
              APFRS Attendance Management
            </h1>

            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Upload your Excel attendance sheet to generate insights, analytics, and monthly attendance reports automatically.
            </p>
          </div>

          {/* CONTENT CARD */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">

            {attendanceData.length === 0 && !loading && !error && (
              <Instructions />
            )}

            {loading && (
              <div className="text-center text-sky-600 font-medium text-lg">
                Processing your file… please wait ✨
              </div>
            )}

            {error && (
              <div className="text-center text-rose-600 font-medium text-lg">
                ❌ {error}
              </div>
            )}

            {attendanceData.length > 0 && (
              <div className="text-center text-emerald-600 text-lg font-semibold">
                Attendance data loaded successfully!
              </div>
            )}
          </div>
        </div>

       <Footer />
    </div>
  );
};

export default HomePage;
