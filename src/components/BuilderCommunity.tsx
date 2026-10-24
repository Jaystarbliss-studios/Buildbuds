import React, { useState } from 'react';
import { Gamepad2, Globe, Wrench, Sparkles, Lightbulb, Users, ArrowRight } from 'lucide-react';
import { useTheme } from '../utils/themeContext.tsx';

interface BuilderCommunityProps {
  onJoinClick: () => void;
}

export const BuilderCommunity: React.FC<BuilderCommunityProps> = ({ onJoinClick }) => {
  const { isDark } = useTheme();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const tags = [
    { label: 'Game builders', icon: <Gamepad2 className="w-4 h-4 text-[#FFF025]" /> },
    { label: 'Website makers', icon: <Globe className="w-4 h-4 text-[#B11469]" /> },
    { label: 'Problem solvers', icon: <Wrench className="w-4 h-4 text-[#C15D00]" /> },
    { label: 'Creative explorers', icon: <Sparkles className="w-4 h-4 text-[#FFF025]" /> },
    { label: 'Curious beginners', icon: <Lightbulb className="w-4 h-4 text-[#B11469]" /> },
    { label: 'Students helping students', icon: <Users className="w-4 h-4 text-[#C15D00]" /> },
  ];

  return (
    <section
      className={`py-20 border-b transition-colors duration-300 ${
        isDark
          ? 'bg-[#0a0a14]/80 backdrop-blur-md border-white/15 text-white'
          : 'bg-white/95 backdrop-blur-md border-black/10 text-slate-900'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Photo Banner */}
          <div className="lg:col-span-3 flex justify-center">
            <div className="relative w-full max-w-xs">
              <div
                className="absolute -top-3 -left-3 w-20 h-20 rounded-full blur-xl opacity-40 -z-10"
                style={{ backgroundColor: '#B11469' }}
              />
              <div
                className={`rounded-3xl overflow-hidden border-2 brand-shadow ${
                  isDark ? 'border-white/20 bg-[#121222]' : 'border-black bg-white'
                }`}
              >
                <img
                  src="/assets/aistudio/extracted/builder-group.png"
                  alt="Young student creators collaborating"
                  className="w-full h-auto object-cover block"
                />
              </div>
            </div>
          </div>

          {/* Center Column: Description & Builder Interest Badges */}
          <div className="lg:col-span-5 flex flex-col justify-center text-left">
            <div
              className={`inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full border w-fit ${
                isDark ? 'bg-white/10 border-white/15' : 'bg-amber-100/70 border-black/15'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#FFF025' }} />
              <span className="text-xs font-bold uppercase tracking-wider">
                Welcoming Community
              </span>
            </div>

            <h2
              className={`font-chewy text-3xl sm:text-4xl lg:text-5xl tracking-normal mb-3 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              Your people are building here.
            </h2>

            <p
              className={`text-sm sm:text-base font-medium leading-relaxed mb-6 ${
                isDark ? 'text-white/80' : 'text-slate-600'
              }`}
            >
              Build Buds connects creators across schools and helps you discover others who share your interests.
            </p>

            {/* Interest Badges */}
            <div className="flex flex-wrap gap-2.5">
              {tags.map((tag, idx) => {
                const isSelected = selectedTag === tag.label;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedTag(isSelected ? null : tag.label)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#FFF025] text-black border-black brand-shadow-sm -translate-y-0.5'
                        : isDark
                          ? 'bg-white/5 border-white/15 text-white/90 hover:bg-white/10'
                          : 'bg-gray-50 border-black/15 text-slate-800 hover:bg-gray-100'
                    }`}
                  >
                    <span>{tag.icon}</span>
                    <span>{tag.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Pink Tilted Highlight Badge */}
          <div className="lg:col-span-4 flex justify-center">
            <div
              className="relative p-8 rounded-3xl border-2 border-black brand-shadow-lg rotate-1 max-w-sm w-full text-center"
              style={{ backgroundColor: '#B11469' }}
            >
              <div className="absolute -top-3 -right-3 text-2xl animate-bounce">
                ✨
              </div>
              <h3 className="font-chewy text-2xl sm:text-3xl text-white leading-snug mb-4">
                Different schools.<br />
                Different ideas.<br />
                <span className="text-[#FFF025]">One community of builders.</span>
              </h3>
              <button
                onClick={onJoinClick}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-black bg-[#FFF025] hover:bg-[#ffe600] border border-black brand-shadow-sm transition-transform active:scale-95 cursor-pointer"
              >
                <span>Find Your Crew</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
