import React from 'react';
import Image from 'next/image';
import freyaLogo from '../assets/freya.png';

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
      {/* Freya Logo - Using actual logo image */}
      <div className={`${sizeClasses[size]} relative`}>
        <Image
          src={freyaLogo}
          alt="Freya Logo"
          className="w-full h-full object-contain"
          priority
        />
      </div>
      
      {/* Freya Text
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent ${textSizeClasses[size]}`}>
            FREYA
          </span>
          {size === 'lg' || size === 'xl' ? (
            <span className="text-sm text-gray-500 -mt-1 font-medium tracking-wide">Invoice Portal</span>
          ) : null}
        </div>
      )} */}
    </div>
  );
};

export default FreyaLogo;
