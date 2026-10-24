import React, { useMemo } from 'react';
import { useTheme } from '../utils/themeContext.tsx';

/**
 * Adaptive backdrop:
 * - Night / Cosmic Space Mode: Deep #06060c night sky with twinkling brand stars,
 *   floating dust particles, and celestial glows in Lemon Yellow, Berry Pink, and Burnt Orange.
 * - Day / Afternoon Mode: Clean crisp white with cheerful faint brand warmth and soft grid.
 */
export const SpaceBackdrop: React.FC = () => {
  const { isDark } = useTheme();

  // Deterministic starfield array
  const stars = useMemo(() => {
    return Array.from({ length: 90 }, (_, i) => {
      const top = (i * 1.1 + (i % 7) * 11) % 100;
      const left = ((i * 3.7 + (i % 11) * 7)) % 100;
      const size = (i % 3 === 0) ? 2.5 : (i % 2 === 0) ? 1.5 : 1;
      const color = (i % 5 === 0) ? '#FFF025' : (i % 8 === 0) ? '#B11469' : '#FFFFFF';
      const duration = 2 + (i % 4);
      const delay = (i % 3) * 0.7;
      return { top, left, size, color, duration, delay };
    });
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none -z-20 overflow-hidden transition-colors duration-500 ${
        isDark ? 'bg-[#06060c]' : 'bg-[#FAFAFA]'
      }`}
    >
      {/* Glow Orbs */}
      <div
        className={`absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full blur-[140px] transition-opacity duration-500 ${
          isDark ? 'opacity-25' : 'opacity-10'
        }`}
        style={{ backgroundColor: '#B11469' }}
      />
      <div
        className={`absolute top-1/3 -right-32 w-[550px] h-[550px] rounded-full blur-[160px] transition-opacity duration-500 ${
          isDark ? 'opacity-20' : 'opacity-10'
        }`}
        style={{ backgroundColor: '#C15D00' }}
      />
      <div
        className={`absolute bottom-10 left-1/4 w-[700px] h-[700px] rounded-full blur-[180px] transition-opacity duration-500 ${
          isDark ? 'opacity-15' : 'opacity-10'
        }`}
        style={{ backgroundColor: '#FFF025' }}
      />

      {/* Grid Pattern */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          isDark ? 'opacity-[0.03]' : 'opacity-[0.04]'
        }`}
        style={{
          backgroundImage: `linear-gradient(to right, ${isDark ? '#FFFFFF' : '#000000'} 1px, transparent 1px), linear-gradient(to bottom, ${isDark ? '#FFFFFF' : '#000000'} 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Stars only visible in Dark Space Mode */}
      {isDark && (
        <div className="absolute inset-0 transition-opacity duration-500">
          {stars.map((star, idx) => (
            <span
              key={idx}
              className="absolute rounded-full animate-pulse"
              style={{
                top: `${star.top}%`,
                left: `${star.left}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                backgroundColor: star.color,
                boxShadow: star.size > 2 ? `0 0 6px ${star.color}` : 'none',
                animationDuration: `${star.duration}s`,
                animationDelay: `${star.delay}s`,
                opacity: star.size > 2 ? 0.9 : 0.65,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
