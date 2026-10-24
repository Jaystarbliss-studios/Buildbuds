import React, { useMemo } from 'react';

/**
 * Sticky/fixed cosmic space backdrop for the entire page.
 * Features subtle twinkling stars, cosmic dust, and celestial nebulae
 * strictly using the approved brand color palette (Lemon Yellow, Berry Pink, Burnt Orange, White, Black).
 */
export const SpaceBackdrop: React.FC = () => {
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
      className="fixed inset-0 pointer-events-none -z-20 overflow-hidden bg-[#06060c]"
    >
      {/* Cosmic Nebula Glows in Brand Palette */}
      <div
        className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full blur-[140px] opacity-25"
        style={{ backgroundColor: '#B11469' }}
      />
      <div
        className="absolute top-1/3 -right-32 w-[550px] h-[550px] rounded-full blur-[160px] opacity-20"
        style={{ backgroundColor: '#C15D00' }}
      />
      <div
        className="absolute bottom-10 left-1/4 w-[700px] h-[700px] rounded-full blur-[180px] opacity-15"
        style={{ backgroundColor: '#FFF025' }}
      />

      {/* Subtle Space Grid Mesh */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(to right, #FFFFFF 1px, transparent 1px), linear-gradient(to bottom, #FFFFFF 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Twinkling Starfield */}
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
  );
};
