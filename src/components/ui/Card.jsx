import React from 'react';

const Card = ({ className = '', children, padding = 'p-6' }) => (
  <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${padding} ${className}`.trim()}>
    {children}
  </div>
);

export const CardHeader = ({ className = '', children }) => (
  <div className={`mb-4 flex flex-col gap-1 ${className}`.trim()}>
    {children}
  </div>
);

export const CardTitle = ({ className = '', children }) => (
  <h3 className={`text-lg font-semibold text-slate-900 ${className}`.trim()}>
    {children}
  </h3>
);

export const CardDescription = ({ className = '', children }) => (
  <p className={`text-sm text-slate-500 ${className}`.trim()}>
    {children}
  </p>
);

export default Card;
