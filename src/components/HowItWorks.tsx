import React, { useState } from 'react';
import { Hammer, Share2, Users2, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';

interface HowItWorksProps {
  onJoinClick: () => void;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ onJoinClick }) => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      num: '01',
      title: 'Make Something',
      description: 'Start with a game, a website, a creative experiment or any idea you are excited to bring to life.',
      detail: 'No idea is too small. Whether it is an interactive quiz or a 3D simulation, tinkering is how learning starts.',
      accent: '#FFF025',
      icon: <Hammer className="w-6 h-6 stroke-[2.5]" />,
    },
    {
      num: '02',
      title: 'Share Your Work',
      description: 'Publish a project description, add screenshots, link to a live demo and share relevant source-code resources.',
      detail: 'Give your project a dedicated home with tags for your tools, reflection notes, and live playable previews.',
      accent: '#B11469',
      icon: <Share2 className="w-6 h-6 stroke-[2.5]" />,
    },
    {
      num: '03',
      title: 'Meet Other Builders',
      description: 'Join discussions, ask questions, discover other projects and get constructive feedback.',
      detail: 'Exchange tips with students from different schools who love building the same things as you.',
      accent: '#C15D00',
      icon: <Users2 className="w-6 h-6 stroke-[2.5]" />,
    },
    {
      num: '04',
      title: 'Keep Getting Better',
      description: 'Improve your ideas, learn new techniques, collaborate on future projects and celebrate the things you accomplish.',
      detail: 'Refactor your code, fix edge-case bugs, team up on group challenges, and watch your skills level up.',
      accent: '#FFF025',
      icon: <TrendingUp className="w-6 h-6 stroke-[2.5]" />,
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-[#080812]/80 backdrop-blur-md border-b border-white/15 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 mb-3 bg-white/10 px-3 py-1 rounded-full border border-white/15">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#FFF025' }} />
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              The Build Buds Journey
            </span>
          </div>
          <h2 className="font-chewy text-4xl sm:text-5xl lg:text-6xl text-white tracking-normal mb-4">
            Got an idea? Let’s build on it.
          </h2>
          <p className="text-base sm:text-lg text-white/85 font-medium leading-relaxed">
            From the moment inspiration strikes to celebrating your live project, here is how young builders bring ideas to life together.
          </p>
        </div>

        {/* 4 Step Connected Flow Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {steps.map((step, idx) => {
            const isSelected = activeStep === idx;
            return (
              <div
                key={step.num}
                onClick={() => setActiveStep(idx)}
                className={`relative flex flex-col justify-between p-6 rounded-3xl border-2 transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'border-[#FFF025] brand-shadow -translate-y-2'
                    : 'bg-[#10101c]/95 border-white/20 hover:-translate-y-1 brand-shadow text-white'
                }`}
                style={{
                  backgroundColor: isSelected ? step.accent : undefined,
                  color: isSelected && (step.accent === '#FFF025' || step.accent === '#C15D00') ? '#000000' : '#FFFFFF',
                }}
              >
                {/* Step Top Bar: Number & Icon */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`text-2xl font-black font-mono px-3 py-1 rounded-xl border-2 border-black ${
                        isSelected && step.accent === '#FFF025' ? 'bg-black text-white' : 'bg-black text-[#FFF025]'
                      }`}
                    >
                      {step.num}
                    </span>
                    <div
                      className={`w-10 h-10 rounded-xl border-2 border-black flex items-center justify-center ${
                        isSelected && step.accent === '#FFF025' ? 'bg-black text-[#FFF025]' : 'bg-white text-black'
                      }`}
                    >
                      {step.icon}
                    </div>
                  </div>

                  <h3
                    className={`font-chewy text-2xl sm:text-3xl mb-2 ${
                      isSelected && step.accent === '#FFF025' ? 'text-black' : 'text-white'
                    }`}
                  >
                    {step.title}
                  </h3>

                  <p
                    className={`text-xs font-semibold leading-relaxed mb-4 ${
                      isSelected && step.accent === '#FFF025' ? 'text-black/85' : 'text-white/80'
                    }`}
                  >
                    {step.description}
                  </p>
                </div>

                {/* Additional Detail Box */}
                <div
                  className={`pt-3 border-t-2 text-xs leading-relaxed ${
                    isSelected && step.accent === '#FFF025'
                      ? 'border-black/20 text-black/80'
                      : 'border-white/15 text-white/70'
                  }`}
                >
                  {step.detail}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Interactive Step Action */}
        <div className="mt-14 text-center">
          <button
            onClick={onJoinClick}
            className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-black text-black rounded-xl border-2 border-black brand-shadow transition-transform hover:-translate-y-0.5 active:translate-y-0.5 cursor-pointer"
            style={{ backgroundColor: '#FFF025' }}
          >
            <span>Start Step 1: Join the Community</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

      </div>
    </section>
  );
};
