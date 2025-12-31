import React from 'react'

const Footer = () => {
    return (
        <footer className="text-center w-full p-4 text-sm text-slate-600 border-t border-slate-200">
            <p>
                © {new Date().getFullYear()} JNTU-GV College. All rights reserved.
            </p>
            <p className="text-xs text-slate-500 mt-1">
                Developed for the APFRS Report System by JNTU-GV.
            </p>
        </footer>
    )
}

export default Footer
