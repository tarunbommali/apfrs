import React from 'react'

const PageLayout = ({ Sidebar, Body }) => {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <div className="flex">
        {/* Fixed Sidebar with header offset */}
        <aside className="fixed top-16 left-0 h-[calc(100vh-4rem)] w-80 bg-slate-100/70 backdrop-blur-lg border-r border-slate-200 hidden lg:block overflow-y-auto">
          <div className="p-6 space-y-6">
            {Sidebar}
          </div>
        </aside>

        {/* Main Content Area - explicitly calculated width */}
        <div className="w-full lg:w-[calc(100%-20rem)] lg:ml-80 min-h-screen">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
            {Body}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageLayout