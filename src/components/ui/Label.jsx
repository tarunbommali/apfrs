import React from 'react';

const Label = ({ className = '', htmlFor, children }) => (
  <label
    htmlFor={htmlFor}
    className={`block text-xs font-semibold uppercase tracking-wide text-slate-500 ${className}`.trim()}
  >
    {children}
  </label>
);

export default Label;
