/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import React, { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Professional Header component
 *
 * Props:
 *  - fileName (string)               : name of the currently loaded file
 *  - attendanceData (array)          : attendance data (used to show contextual links)
 *  - onReset (fn)                    : reset handler
 *  - onFileUpload (fn(file))         : file upload handler
 *  - loading (bool)                  : uploading/parsing in-progress
 *
 * Notes:
 *  - Uses uploadedFileUrl (local path) as download target for the current file.
 *  - Keeps upload button icon-only, with three visual states:
 *      - no file: grey icon
 *      - file present: green icon
 *      - loading: pulsing green
 */

const Header = ({ fileName, attendanceData = [], onReset, onFileUpload, loading }) => {
    const location = useLocation();
    const fileInputRef = useRef(null);
    const [mobileOpen, setMobileOpen] = useState(false);

    const isActiveRoute = (path) => location.pathname === path;

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) onFileUpload(file);
        event.target.value = ''; // allow re-select same file
    };

    const handleUploadClick = () => fileInputRef.current?.click();

    const fileSelected = Boolean(fileName || (attendanceData && attendanceData.length > 0));
    const uploadedFileUrl = '/mnt/data/22130304001_REGULAR_Oct2025.xlsx'; // developer-provided path

    return (
        <header className="fixed inset-x-0 top-0 z-50">
            <div className="backdrop-blur-md bg-white/70 border-b border-slate-200">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between gap-4 py-3">
                        {/* Brand */}
                        <div className="flex items-center gap-3">
                            <Link to="/" className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-linear-to-tr from-indigo-600 to-sky-500 shadow-lg shadow-indigo-500/20">
                                    {/* Subtle SVG logo */}
                                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" aria-hidden>
                                        <path d="M4 7a2 2 0 012-2h12" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M7 13h10" stroke="rgba(255,255,255,0.95)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M9 17h6" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>

                                <div className="flex flex-col leading-tight">
                                    <span className="text-lg font-semibold text-slate-900">APFRS </span>
                                    <span className="text-xs text-slate-500">Report Management System</span>
                                </div>
                            </Link>
                        </div>

                        {/* Desktop nav */}
                        <nav className="hidden md:flex items-center gap-2">
                            <NavLink to="/" active={isActiveRoute('/')} label="Home" />
                            <NavLink to="/summary" active={isActiveRoute('/summary')} label="Summary" primary disabled={!fileName} />
                            <NavLink to="/detailed" active={isActiveRoute('/detailed')} label="Detailed" primary disabled={!fileName} />
                            <Link
                                to="/configure-smtp"
                                className={`px-3 py-2 rounded-md text-sm font-medium transition ${isActiveRoute('/configure-smtp') ? 'text-sky-600' : 'text-slate-700 hover:bg-slate-100'}`}
                            >
                                Configure SMTP
                            </Link>
                            <NavLink to="/docs" active={isActiveRoute('/docs')} label="Docs" />
                        </nav>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                                {fileName && (
                                    <a
                                        href={uploadedFileUrl}
                                        download
                                        className="hidden md:inline-flex items-center gap-2 ml-3 px-3 py-1 rounded-full bg-sky-100 border border-sky-200 text-sky-700 text-sm shadow-sm hover:shadow-md transition"
                                        title={fileName}
                                    >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                                            <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <span className="truncate max-w-[180px]">{fileName}</span>
                                    </a>
                                )}
                                <button
                                    onClick={handleUploadClick}
                                    disabled={loading}
                                    aria-label="Upload file"
                                    title={loading ? 'Uploading...' : fileSelected ? 'File loaded — Upload new' : 'Upload file'}
                                    className={`p-2 rounded-lg focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition ${loading ? 'animate-pulse' : 'hover:bg-slate-100'}`}
                                >
                                    <svg
                                        className={`w-6 h-6 ${loading ? 'text-emerald-500' : fileSelected ? 'text-emerald-600' : 'text-slate-400'}`}
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="7 10 12 5 17 10" />
                                        <line x1="12" y1="5" x2="12" y2="19" />
                                    </svg>
                                </button>

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    accept=".xlsx,.xls,.csv"
                                    className="hidden"
                                />

                                <button
                                    onClick={onReset}
                                    disabled={!fileName}
                                    className={`ml-1 px-3 py-2 rounded-md text-sm font-medium transition-shadow shadow-sm flex items-center gap-2 ${fileName ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-rose-200 text-rose-500 cursor-not-allowed'}`}
                                    title={attendanceData && attendanceData.length > 0 ? 'Reset' : 'No data to reset'}
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                                        <path d="M3 6h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M8 6v12a2 2 0 002 2h4a2 2 0 002-2V6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M10 11v6" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
                                        <path d="M14 11v6" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
                                    </svg>
                                    Reset
                                </button>
                            </div>

                            <button
                                onClick={() => setMobileOpen(prev => !prev)}
                                className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition"
                                aria-expanded={mobileOpen}
                                aria-label="Toggle navigation"
                            >
                                <svg className="w-6 h-6 text-slate-700" viewBox="0 0 24 24" fill="none">
                                    {mobileOpen ? (
                                        <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    ) : (
                                        <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    )}
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div className={`md:hidden ${mobileOpen ? 'block' : 'hidden'} border-t border-slate-200 bg-white/80 backdrop-blur`}>
                    <div className="px-4 py-3 space-y-2">
                        <MobileNavLink to="/" active={isActiveRoute('/')} label="Home" onClick={() => setMobileOpen(false)} />
                        <MobileNavLink to="/summary" active={isActiveRoute('/summary')} label="Summary" disabled={!fileName} onClick={() => setMobileOpen(false)} />
                        <MobileNavLink to="/detailed" active={isActiveRoute('/detailed')} label="Detailed" disabled={!fileName} onClick={() => setMobileOpen(false)} />
                        <MobileNavLink to="/configure-smtp" active={isActiveRoute('/configure-smtp')} label="Configure SMTP" onClick={() => setMobileOpen(false)} />

                        <button
                            onClick={() => { if (fileName) onReset(); setMobileOpen(false); }}
                            className={`w-full text-left px-3 py-2 rounded-md font-medium transition ${attendanceData && attendanceData.length > 0 ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-rose-200 text-rose-500 cursor-not-allowed'}`}
                        >
                            Reset
                        </button>

                        {fileName && (
                            <a href={uploadedFileUrl} download className="block mt-1 px-3 py-2 rounded-md bg-slate-100 border border-slate-200 text-sky-700 text-sm">
                                <div className="truncate">{fileName}</div>
                                <div className="text-xs text-slate-500">Tap to download</div>
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

/* Small helper components for cleaner markup */
const NavLink = ({ to, label, active, primary, disabled }) => (
    <Link
        to={to}
        className={`px-3 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${disabled ? 'cursor-not-allowed text-slate-500 pointer-events-none' : active ? 'text-sky-600 font-semibold' : 'text-slate-700 hover:text-sky-600'}`}
    >
        <span>{label}</span>
    </Link>
);

const MobileNavLink = ({ to, label, active, onClick, disabled }) => (
    <Link
        to={to}
        onClick={onClick}
        className={`block px-3 py-2 rounded-md text-sm font-medium transition ${disabled ? 'cursor-not-allowed text-slate-500 pointer-events-none' : ''} ${active ? 'bg-indigo-100 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'
            }`}
    >
        {label}
    </Link>
);

export default Header;
