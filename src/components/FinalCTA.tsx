import React from 'react';
import { ArrowRight, Compass, Sparkles } from 'lucide-react';

interface FinalCTAProps {
  onJoinClick: () => void;
  onExploreClick: () => void;
}

export const FinalCTA: React.FC<FinalCTAProps> = ({ onJoinClick, onExploreClick }) => {
  return (
    <section className="py-24 bg-[#080812]/85 backdrop-blur-md border-b-2 border-white/15 relative overflow-hidden z-10">
      {/* Playful cosmic background decorative shapes */}
      <div
        className="absolute -top-16 -left-16 w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ backgroundColor: '#FFF025' }}
      />
      <div
        className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full opacity-25 blur-3xl pointer-events-none"
        style={{ backgroundColor: '#B11469' }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-15 blur-[120px] pointer-events-none"
        style={{ backgroundColor: '#C15D00' }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        
        {/* Floating pill accent */}
        <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-white/20 bg-white/5">
          <span className="w-2.5 h-2.5 rounded-full border border-black" style={{ backgroundColor: '#FFF025' }} />
          <span className="text-xs font-bold uppercase tracking-wider text-[#FFF025]">
            Your Creative Home Awaits
          </span>
        </div>

        {/* Big Chewy Headline */}
        <h2 className="font-chewy text-5xl sm:text-6xl lg:text-7xl text-white tracking-normal leading-[1.08] mb-6 max-w-3xl mx-auto">
          You bring the idea.{' '}
          <span className="relative inline-block text-[#FFF025]">
            We'll build the community.
          </span>
        </h2>

        {/* Supporting text */}
        <p className="text-lg sm:text-xl text-white/85 font-medium leading-relaxed max-w-2xl mx-auto mb-10">
          Your next project could be the spark that inspires another student across the galaxy. Come share what you make, find your people and keep building.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onJoinClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 text-base sm:text-lg font-black text-black rounded-2xl border-2 border-black brand-shadow-yellow transition-all duration-150 active:translate-x-1 active:translate-y-1 hover:-translate-y-1 cursor-pointer"
            style={{ backgroundColor: '#FFF025' }}
          >
            <span>Join Build Buds</span>
            <ArrowRight className="w-5 h-5 stroke-[3]" />
          </button>

          <button
            onClick={onExploreClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base sm:text-lg font-bold text-white bg-white/10 hover:bg-white/20 rounded-2xl border-2 border-white/30 backdrop-blur-sm transition-all duration-150 active:translate-x-1 active:translate-y-1 hover:-translate-y-1 cursor-pointer"
          >
            <Compass className="w-5 h-5 stroke-[2.5]" style={{ color: '#FFF025' }} />
            <span>Explore Creations</span>
          </button>
        </div>

        {/* Contextual badge */}
        <div className="mt-8 text-xs font-bold text-white/60">
          Open to student creators across all participating schools
        </div>

      </div>
    </section>
  );
};
