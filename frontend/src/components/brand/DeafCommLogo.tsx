import React from 'react';

interface DeafCommLogoProps {
  className?: string;
  size?: number;
}

const DeafCommLogo: React.FC<DeafCommLogoProps> = ({ className = '', size = 20 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-white dark:text-zinc-100 ${className}`}
    >
      {/* Hand forming sign language waves / connection */}
      <path d="M12 11V3a1.5 1.5 0 0 1 3 0v8" />
      <path d="M15 10V4.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M18 10V6a1.5 1.5 0 0 1 3 0v7c0 4.5-3.5 8-8 8a7.9 7.9 0 0 1-5.5-2.2L3.5 11.5a1.5 1.5 0 0 1 2.1-2.1L9 12.5V5a1.5 1.5 0 0 1 3 0v6" />
      
      {/* Soundwaves representing dynamic conversion to speech */}
      <path d="M2.5 5.5a8.5 8.5 0 0 1 4 0" strokeWidth="1.5" strokeDasharray="1 1.5" />
      <path d="M1 3.5a11.5 11.5 0 0 1 7 0" strokeWidth="1.5" />
    </svg>
  );
};

export default DeafCommLogo;
