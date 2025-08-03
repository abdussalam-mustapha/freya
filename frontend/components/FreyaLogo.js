import React from 'react';

const FreyaLogo = ({ size = 'md', showText = true, className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Freya Logo - Based on provided design */}
      <div className={`${sizeClasses[size]} relative`}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Gradient Definitions */}
          <defs>
            <linearGradient id="freyaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="50%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#60A5FA" />
            </linearGradient>
            <linearGradient id="freyaAccent" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1D4ED8" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
          </defs>
          
          {/* Main F Shape - Modern, Clean Design */}
          <g fill="url(#freyaGradient)">
            {/* Main vertical stroke of F */}
            <rect x="20" y="15" width="8" height="70" rx="4" />
            
            {/* Top horizontal stroke of F */}
            <rect x="20" y="15" width="50" height="8" rx="4" />
            
            {/* Middle horizontal stroke of F */}
            <rect x="20" y="42" width="35" height="8" rx="4" />
            
            {/* Modern accent dots */}
            <circle cx="75" cy="25" r="4" fill="url(#freyaAccent)" />
            <circle cx="65" cy="52" r="3" fill="url(#freyaAccent)" />
          </g>
          
          {/* Subtle glow effect */}
          <g fill="none" stroke="url(#freyaGradient)" strokeWidth="1" opacity="0.3">
            <rect x="18" y="13" width="12" height="74" rx="6" />
            <rect x="18" y="13" width="54" height="12" rx="6" />
            <rect x="18" y="40" width="39" height="12" rx="6" />
          </g>
        </svg>
      </div>
      
      {/* Freya Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent ${textSizeClasses[size]}`}>
            FREYA
          </span>
          {size === 'lg' || size === 'xl' ? (
            <span className="text-sm text-gray-500 -mt-1 font-medium tracking-wide">Invoice Portal</span>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default FreyaLogo;
