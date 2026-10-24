import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useTheme } from '../utils/themeContext.tsx';

interface HowItWorksProps {
  onJoinClick: () => void;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ onJoinClick }) => {
  const { isDark } = useTheme();

  const steps = [
    {
      num: '1',
      title: 'Make Something',
      description: 'Start with a game, a website, a creative experiment or any idea you’re excited about.',
      accent: '#FFF025',
      textColor: '#000000',
    },
    {
      num: '2',
      title: 'Share Your Work',
      description: 'Publish your project, add screenshots, link a live demo and share your code.',
      accent: '#B11469',
      textColor: '#FFFFFF',
    },
    {
      num: '3',
      title: 'Meet Other Builders',
      description: 'Join discussions, ask questions, discover projects and get constructive feedback.',
      accent: '#C15D00',
      textColor: '#FFFFFF',
    },
    {
      num: '4',
      title: 'Keep Getting Better',
      description: 'Improve your ideas, learn new techniques, collaborate and celebrate your progress.',
      accent: '#FFF025',
      textColor: '#000000',
    },
  ];

  return (
    <section
      id="how-it-works"
      className={`py-20 border-b transition-colors duration-300 ${
        isDark
          ? 'bg-[#080812]/80 backdrop-blur-md border-white/15 text-white'
          : 'bg-white/95 backdrop-blur-md border-black/10 text-slate-900'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading matching Mockup */}
        <div className="mb-14 text-left max-w-xl">
          <div className="relative inline-block">
            <h2
              className={`font-chewy text-4xl sm:text-5xl lg:text-6xl tracking-normal ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              Got an idea? <br />
              <span className="text-[#B11469]">Let’s build on it.</span>
            </h2>
          </div>
        </div>

        {/* 4 Steps Row matching Mockup */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className={`relative flex flex-col justify-between p-6 rounded-3xl border-2 transition-all brand-shadow group ${
                isDark
                  ? 'bg-[#10101d] border-white/20 hover:border-[#FFF025]'
                  : 'bg-white border-black/15 hover:border-black'
              }`}
            >
              <div>
                {/* Number Circle */}
                <div className="flex items-center justify-between mb-6">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-black text-xl border-2 border-black brand-shadow-sm"
                    style={{ backgroundColor: step.accent, color: step.textColor }}
                  >
                    {step.num}
                  </div>

                  {/* Arrow to next step (if not last) */}
                  {idx < steps.length - 1 && (
                    <div className="hidden md:block text-[#B11469]">
                      <ArrowRight className="w-5 h-5 stroke-[3]" />
                    </div>
                  )}
                </div>

                <h3 className="font-chewy text-2xl mb-2 group-hover:text-[#B11469] transition-colors">
                  {step.title}
                </h3>

                <p
                  className={`text-xs sm:text-sm font-medium leading-relaxed ${
                    isDark ? 'text-white/80' : 'text-slate-600'
                  }`}
                >
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
