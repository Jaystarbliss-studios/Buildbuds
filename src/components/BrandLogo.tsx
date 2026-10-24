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
  logoSrc,
  className = '',
}) => {
  if (logoSrc) {
    const sizeClasses = {
      sm: 'h-8 max-w-[140px]',
      md: 'h-10 max-w-[180px]',
      lg: 'h-14 max-w-[240px]',
    };

    return (
      <img
        src={logoSrc}
        alt="Build Buds"
        className={`object-contain ${sizeClasses[size]} ${className}`}
      />
    );
  }

  const textSize = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl md:text-5xl',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 select-none ${className}`}>
      <span
        className={`font-chewy tracking-wide text-black transition-transform duration-150 hover:-rotate-1 ${textSize[size]}`}
        style={{ letterSpacing: '0.02em' }}
      >
        Build <span style={{ color: '#B11469' }}>Buds</span>
      </span>
      {/* Playful brand accent mark using approved palette */}
      <div className="flex gap-1 items-center self-center" aria-hidden="true">
        <span className="w-2.5 h-2.5 rounded-full border-2 border-black" style={{ backgroundColor: '#FFF025' }} />
        <span className="w-2.5 h-2.5 rounded-full border-2 border-black" style={{ backgroundColor: '#C15D00' }} />
      </div>
    </div>
  );
};
