import React from 'react';
import { ArrowRight, Compass } from 'lucide-react';
import { useTheme } from '../utils/themeContext.tsx';

interface FinalCTAProps {
  onJoinClick: () => void;
  onExploreClick: () => void;
}

export const FinalCTA: React.FC<FinalCTAProps> = ({ onJoinClick, onExploreClick }) => {
  const { isDark } = useTheme();

  return (
    <section
      className={`py-24 border-b-2 relative overflow-hidden z-10 transition-colors duration-300 ${
        isDark
          ? 'bg-[#080812]/85 backdrop-blur-md border-white/15 text-white'
          : 'bg-white/95 backdrop-blur-md border-black/10 text-slate-900'
      }`}
    >
      {/* Decorative blurs */}
      <div
        className="absolute -top-16 -left-16 w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ backgroundColor: '#FFF025' }}
      />
      <div
        className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full opacity-25 blur-3xl pointer-events-none"
        style={{ backgroundColor: '#B11469' }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        
        {/* Floating pill accent */}
        <div
          className={`inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border ${
            isDark ? 'border-white/20 bg-white/5' : 'border-black/15 bg-amber-100/70'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full border border-black" style={{ backgroundColor: '#FFF025' }} />
          <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#FFF025]' : 'text-slate-800'}`}>
            Your Creative Home Awaits
          </span>
        </div>

        {/* Big Chewy Headline */}
        <h2
          className={`font-chewy text-5xl sm:text-6xl lg:text-7xl tracking-normal leading-[1.08] mb-6 max-w-3xl mx-auto ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          You bring the idea.{' '}
          <span className="relative inline-block text-[#B11469]">
            We'll build the community.
          </span>
        </h2>

        {/* Supporting text */}
        <p
          className={`text-lg sm:text-xl font-medium leading-relaxed max-w-2xl mx-auto mb-10 ${
            isDark ? 'text-white/85' : 'text-slate-600'
          }`}
        >
          Your next project could be the spark that inspires another student. Come share what you make, find your people and keep building.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onJoinClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 text-base sm:text-lg font-black text-black rounded-2xl border-2 border-black brand-shadow transition-all duration-150 active:translate-x-1 active:translate-y-1 hover:-translate-y-1 cursor-pointer"
            style={{ backgroundColor: '#FFF025' }}
          >
            <span>Join Build Buds</span>
            <ArrowRight className="w-5 h-5 stroke-[3]" />
          </button>

          <button
            onClick={onExploreClick}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 text-base sm:text-lg font-bold rounded-2xl border-2 transition-all duration-150 active:translate-x-1 active:translate-y-1 hover:-translate-y-1 cursor-pointer ${
              isDark
                ? 'text-white bg-black/50 hover:bg-black/70 backdrop-blur-md border-white/30 brand-shadow'
                : 'text-slate-900 bg-white hover:bg-gray-50 backdrop-blur-md border-black brand-shadow'
            }`}
          >
            <Compass className="w-5 h-5 stroke-[2.5]" style={{ color: isDark ? '#FFF025' : '#B11469' }} />
            <span>Explore Creations</span>
          </button>
        </div>

      </div>
    </section>
  );
};
