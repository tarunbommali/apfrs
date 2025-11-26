import React from 'react'

const Footer = () => {
    return (
        <footer className="text-center p-4 text-sm text-gray-600 border-t border-gray-200">
            <p>
                © {new Date().getFullYear()} JNTU-GV College. All rights reserved.
            </p>
            <p className="text-xs text-gray-500 mt-1">
                Developed for the APFRS Report System by JNTU-GV.
            </p>
        </footer>
    )
}

export default Footer
