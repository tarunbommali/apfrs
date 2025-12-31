import React from 'react';

const Toggle = ({ checked = false, onChange, label, description }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange?.(!checked)}
    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
      checked
        ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
        : 'border-slate-200 bg-white text-slate-700'
    }`}
  >
    <div>
      <p className="text-sm font-semibold">{label}</p>
      {description && <p className="text-xs text-slate-500">{description}</p>}
    </div>
    <span
      className={`inline-flex h-6 w-11 items-center rounded-full transition ${
        checked ? 'bg-emerald-500' : 'bg-slate-300'
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow transition ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </span>
  </button>
);

export default Toggle;
