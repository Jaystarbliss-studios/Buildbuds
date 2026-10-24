import React, { useState } from 'react';
import { ArrowRight, Compass, Sparkles, MessageSquare, Star, Code2, Heart } from 'lucide-react';
import { useTheme } from '../utils/themeContext.tsx';

interface HeroSectionProps {
  onJoinClick: () => void;
  onExploreClick: () => void;
  onOpenProject: (projectId: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onJoinClick,
  onExploreClick,
  onOpenProject,
}) => {
  const { isDark } = useTheme();
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null);

  return (
    <section className="relative overflow-hidden z-10 isolate pt-10 pb-16 lg:pt-16 lg:pb-24 border-b transition-colors duration-300 border-white/10 dark:border-white/15">
      {/* Background Image: public/assets/aistudio/images/beautiful-build-buds.png */}
      <img
        src="/assets/aistudio/images/beautiful-build-buds.png"
        alt="Build Buds colorful waves"
        className="absolute inset-0 w-full h-full object-cover object-center z-0 select-none pointer-events-none opacity-90 transition-opacity duration-300"
      />

      {/* Adaptive Theme Overlay: Clean bright overlay in Day mode, deep cosmic overlay in Night mode */}
      <div
        className={`absolute inset-0 z-0 pointer-events-none transition-colors duration-300 ${
          isDark
            ? 'bg-gradient-to-b from-[#06060c]/80 via-[#06060c]/50 to-[#06060c]'
            : 'bg-gradient-to-b from-white/75 via-white/50 to-white/90'
        }`}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          
          {/* Left Text Column (6 cols) */}
          <div className="lg:col-span-6 flex flex-col justify-center text-left">
            {/* Chewy Big Headline without the removed text */}
            <h1
              className={`font-chewy text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-normal mb-6 transition-colors duration-200 ${
                isDark ? 'text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]' : 'text-slate-900'
              }`}
            >
              Big ideas.{' '}
              <span className="relative inline-block text-[#B11469]">
                Little builds.
                <span
                  className="absolute bottom-1.5 left-0 w-full h-3 sm:h-4 -z-10 rounded opacity-60"
                  style={{ backgroundColor: '#FFF025' }}
                />
              </span>
            </h1>

            <p
              className={`text-base sm:text-lg font-medium leading-relaxed mb-8 max-w-xl transition-colors duration-200 ${
                isDark ? 'text-white/85' : 'text-slate-700'
              }`}
            >
              The community for young creators to share projects, exchange constructive ideas, solve problems, and build amazing games and apps together.
            </p>

            {/* Action CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-8">
              <button
                onClick={onJoinClick}
                className="inline-flex items-center justify-center gap-3 px-8 py-4 text-base sm:text-lg font-black text-black rounded-2xl border-2 border-black brand-shadow transition-all duration-150 active:translate-x-1 active:translate-y-1 hover:-translate-y-1 cursor-pointer"
                style={{ backgroundColor: '#FFF025' }}
              >
                <span>Join Build Buds</span>
                <ArrowRight className="w-5 h-5 stroke-[3]" />
              </button>

              <button
                onClick={onExploreClick}
                className={`inline-flex items-center justify-center gap-2 px-7 py-4 text-base sm:text-lg font-bold rounded-2xl border-2 transition-all duration-150 active:translate-x-1 active:translate-y-1 hover:-translate-y-1 cursor-pointer ${
                  isDark
                    ? 'text-white bg-black/60 hover:bg-black/80 backdrop-blur-md border-white/30 brand-shadow'
                    : 'text-slate-900 bg-white/90 hover:bg-white backdrop-blur-md border-black brand-shadow'
                }`}
              >
                <Compass className="w-5 h-5 stroke-[2.5]" style={{ color: isDark ? '#FFF025' : '#B11469' }} />
                <span>Explore Creations</span>
              </button>
            </div>

            {/* Community Highlights Bar */}
            <div
              className={`rounded-2xl border px-5 py-3.5 flex flex-wrap items-center gap-5 text-xs sm:text-sm font-bold w-fit transition-colors duration-200 ${
                isDark
                  ? 'bg-black/55 backdrop-blur-md border-white/20 text-white shadow-lg'
                  : 'bg-white/85 backdrop-blur-md border-black/15 text-slate-800 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full border border-black" style={{ backgroundColor: '#FFF025' }} />
                <span>Games & Simulations</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full border border-black" style={{ backgroundColor: '#B11469' }} />
                <span>Websites & Utilities</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full border border-black" style={{ backgroundColor: '#C15D00' }} />
                <span>Friendly Peer Discussions</span>
              </div>
            </div>
          </div>

          {/* Right Visual Composition (6 cols): Lady holding laptop with project cards & stickers */}
          <div className="lg:col-span-6 relative flex justify-center">
            <div className="relative w-full max-w-xl group">
              
              {/* Outer Playful Aura */}
              <div
                className="absolute -inset-4 rounded-3xl blur-2xl opacity-30 -z-10 transition-opacity duration-300"
                style={{
                  background: isDark
                    ? 'radial-gradient(circle, #B11469 0%, #FFF025 50%, transparent 70%)'
                    : 'radial-gradient(circle, #FFF025 0%, #B11469 50%, transparent 70%)',
                }}
              />

              {/* Main Visual Showcase Frame */}
              <div
                className={`relative rounded-3xl overflow-hidden border-2 transition-all duration-300 brand-shadow-lg ${
                  isDark
                    ? 'border-white/25 bg-[#0e0e18]/90'
                    : 'border-black bg-white'
                }`}
              >
                {/* Visual Image extracted directly from mockup */}
                <img
                  src="/assets/aistudio/extracted/hero-creator.png"
                  alt="Build Buds Creator with laptop and project showcase cards"
                  className="w-full h-auto object-contain block transition-transform duration-300 group-hover:scale-[1.01]"
                />

                {/* Interactive Hotspots & Quick Actions on Bottom Bar */}
                <div
                  className={`px-4 py-3 border-t flex flex-wrap items-center justify-between gap-2 text-xs font-bold transition-colors ${
                    isDark
                      ? 'bg-black/60 border-white/15 text-white/90'
                      : 'bg-amber-50/70 border-black/10 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-[#B11469] font-black">
                      <Sparkles className="w-3.5 h-3.5 fill-current" />
                      Youth Creator Showcase
                    </span>
                    <span className="hidden sm:inline text-gray-400">•</span>
                    <span className="hidden sm:inline text-xs opacity-75">
                      Space Runner • My Portfolio • Doodle Studio
                    </span>
                  </div>

                  <button
                    onClick={() => onOpenProject('galaxy-explorer')}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black text-black bg-[#FFF025] hover:bg-[#ffe600] border border-black brand-shadow-sm cursor-pointer transition-transform active:scale-95"
                  >
                    <span>View Projects</span>
                    <ArrowRight className="w-3 h-3 stroke-[3]" />
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
