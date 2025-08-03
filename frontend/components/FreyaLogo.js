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
      {/* Freya Logo SVG */}
      <div className={`${sizeClasses[size]} relative`}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Gradient Definitions */}
          <defs>
            <linearGradient id="freyaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="50%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
            <linearGradient id="freyaAccent" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
          </defs>
          
          {/* Main Circle Background */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="url(#freyaGradient)"
            className="drop-shadow-lg"
          />
          
          {/* Inner Circle */}
          <circle
            cx="50"
            cy="50"
            r="35"
            fill="none"
            stroke="white"
            strokeWidth="2"
            opacity="0.3"
          />
          
          {/* Stylized 'F' Letter */}
          <g fill="white">
            {/* Main vertical line of F */}
            <rect x="35" y="25" width="4" height="50" rx="2" />
            
            {/* Top horizontal line of F */}
            <rect x="35" y="25" width="25" height="4" rx="2" />
            
            {/* Middle horizontal line of F */}
            <rect x="35" y="47" width="20" height="4" rx="2" />
            
            {/* Decorative elements */}
            <circle cx="65" cy="35" r="3" fill="url(#freyaAccent)" />
            <circle cx="60" cy="57" r="2" fill="url(#freyaAccent)" />
          </g>
          
          {/* Outer glow effect */}
          <circle
            cx="50"
            cy="50"
            r="47"
            fill="none"
            stroke="url(#freyaGradient)"
            strokeWidth="1"
            opacity="0.5"
          />
        </svg>
      </div>
      
      {/* Freya Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold bg-gradient-to-r from-blue-600 via-cyan-500 to-purple-600 bg-clip-text text-transparent ${textSizeClasses[size]}`}>
            Freya
          </span>
          {size === 'lg' || size === 'xl' ? (
            <span className="text-sm text-gray-500 -mt-1">Invoice Portal</span>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default FreyaLogo;
