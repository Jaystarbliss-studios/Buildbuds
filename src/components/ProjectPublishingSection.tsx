import React, { useState } from 'react';
import { Check, ArrowRight, ExternalLink, Code2, Sparkles, Gamepad2 } from 'lucide-react';
import { useTheme } from '../utils/themeContext.tsx';

interface ProjectPublishingSectionProps {
  onPublishClick: () => void;
}

export const ProjectPublishingSection: React.FC<ProjectPublishingSectionProps> = ({ onPublishClick }) => {
  const { isDark } = useTheme();
  const [demoActive, setDemoActive] = useState(false);

  const features = [
    'Live websites and interactive demos',
    'Games you’ve built',
    'Project descriptions and screenshots',
    'GitHub repository links',
    'Source code and resources',
    'Tools used in your project',
    'What you learned',
    'Future improvements',
  ];

  return (
    <section
      className={`py-20 border-b transition-colors duration-300 ${
        isDark
          ? 'bg-[#0a0a16]/80 backdrop-blur-md border-white/15 text-white'
          : 'bg-white/95 backdrop-blur-md border-black/10 text-slate-900'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Heading, description, 2-column checklist, and Share Project button */}
          <div className="lg:col-span-7 flex flex-col justify-center text-left">
            
            <h2
              className={`font-chewy text-4xl sm:text-5xl lg:text-6xl tracking-normal mb-4 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              Your work deserves a home.
            </h2>

            <p
              className={`text-base sm:text-lg font-medium leading-relaxed mb-8 ${
                isDark ? 'text-white/85' : 'text-slate-600'
              }`}
            >
              Share what you built, explain how it works, show people what you learned and let other creators explore the details.
            </p>

            {/* 2-Column Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-6 mb-8">
              {features.map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2.5">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 border border-black shadow-xs"
                    style={{ backgroundColor: '#FFF025' }}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3] text-black" />
                  </div>
                  <span className={`text-sm font-semibold ${isDark ? 'text-white/90' : 'text-slate-800'}`}>
                    {feat}
                  </span>
                </div>
              ))}
            </div>

            {/* Share Your Project CTA */}
            <div>
              <button
                onClick={onPublishClick}
                className="inline-flex items-center gap-2.5 px-8 py-4 text-base font-black text-black rounded-2xl border-2 border-black brand-shadow transition-transform hover:-translate-y-1 active:translate-y-0.5 cursor-pointer"
                style={{ backgroundColor: '#FFF025' }}
              >
                <span>Share Your Project</span>
                <ArrowRight className="w-5 h-5 stroke-[3]" />
              </button>
            </div>

          </div>

          {/* Right Column: Featured Project Card (Forest Quest) */}
          <div className="lg:col-span-5">
            <div
              className={`rounded-3xl border-2 p-5 brand-shadow transition-all ${
                isDark
                  ? 'bg-[#10101d] border-white/20 text-white'
                  : 'bg-white border-black/15 text-slate-900'
              }`}
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                
                {/* Forest Quest Screenshot */}
                <div className="sm:col-span-6 rounded-2xl overflow-hidden border border-black/20 bg-black/80 aspect-4/3 flex items-center justify-center">
                  <img
                    src="/assets/aistudio/extracted/forest-quest.png"
                    alt="Forest Quest game screenshot"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Forest Quest Details */}
                <div className="sm:col-span-6 flex flex-col justify-between h-full py-1">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Gamepad2 className="w-4 h-4 text-[#B11469]" />
                      <span className="text-xs font-bold uppercase tracking-wider text-[#B11469]">
                        Game
                      </span>
                    </div>

                    <h3 className="font-chewy text-2xl mb-1">Forest Quest</h3>
                    <p
                      className={`text-xs leading-relaxed mb-3 ${
                        isDark ? 'text-white/80' : 'text-slate-600'
                      }`}
                    >
                      A third-person adventure game set in a mysterious forest.
                    </p>

                    <div className="text-xs font-semibold mb-4 opacity-80">
                      <span>Built with: </span>
                      <span className="font-bold">Unity, C#</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setDemoActive(!demoActive)}
                      className="w-full py-2 px-3 text-xs font-black text-black rounded-xl border border-black brand-shadow-sm text-center cursor-pointer transition-transform active:scale-95"
                      style={{ backgroundColor: '#FFF025' }}
                    >
                      {demoActive ? '✓ Demo Running' : 'View Live Demo'}
                    </button>

                    <button
                      onClick={onPublishClick}
                      className={`w-full py-2 px-3 text-xs font-bold rounded-xl border text-center transition-colors cursor-pointer ${
                        isDark
                          ? 'border-white/20 hover:bg-white/10 text-white'
                          : 'border-black/20 hover:bg-black/5 text-slate-800'
                      }`}
                    >
                      Explore Source Code
                    </button>
                  </div>

                </div>

              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
