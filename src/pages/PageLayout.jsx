import React from 'react';

const PageLayout = ({ Sidebar = null, Body }) => {
  return (
    <div className="flex flex-col xl:flex-row gap-8 items-start">
      {/* Secondary Sidebar (e.g., Table of Contents, Settings Nav) */}
      {Sidebar && (
        <aside className="w-full xl:w-72 xl:shrink-0 space-y-6 xl:sticky xl:top-4 order-last xl:order-first">
          {Sidebar}
        </aside>
      )}

      {/* Main Page Content */}
      <div className="flex-1 min-w-0 w-full">
        {Body}
      </div>
    </div>
  );
};

export default PageLayout;
