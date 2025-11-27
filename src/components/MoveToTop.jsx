import React, { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

const MoveToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      // Calculate scroll progress (0 to 100)
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollTop / docHeight) * 100;
      
      setScrollProgress(progress);
      setIsVisible(scrollTop > 300); // Show button after scrolling 300px
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 group border border-slate-200"
      aria-label="Scroll to top"
    >
      {/* Circular progress border - SVG approach */}
      <div className="absolute inset-0 rounded-full">
        <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="4"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#0ea5e9" // sky-500
            strokeWidth="4"
            strokeDasharray={283} // 2 * π * 45 ≈ 283
            strokeDashoffset={283 - (scrollProgress / 100) * 283}
            strokeLinecap="round"
          />
        </svg>
      </div>
      
      {/* Chevron icon */}
      <ChevronUp 
        size={20} 
        className="text-slate-700 group-hover:text-slate-900 transition-colors relative z-10" 
      />
    </button>
  );
};

export default MoveToTop;