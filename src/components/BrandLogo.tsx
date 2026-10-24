import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  logoSrc?: string;
  className?: string;
}

/**
 * Reusable BrandLogo component.
 * Until the official image logo is provided, renders the text "Build Buds"
 * styled with the brand typeface Chewy and official colors.
 * When official image is supplied via logoSrc, preserves aspect ratio seamlessly.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  logoSrc = '/assets/aistudio/images/aurora-logo.png',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'h-10 max-w-[140px]',
    md: 'h-12 max-w-[180px]',
    lg: 'h-24 max-w-[280px]',
  };

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <img
        src={logoSrc}
        alt="Build Buds Logo"
        className={`object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] ${sizeClasses[size]}`}
      />
    </div>
  );
};
