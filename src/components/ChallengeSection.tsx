import React from 'react';
import { Gamepad2, Globe, Lightbulb, ArrowRight } from 'lucide-react';
import { ChallengeItem } from '../types/index.ts';
import { useTheme } from '../utils/themeContext.tsx';

interface ChallengeSectionProps {
  onJoinChallengeClick: (challenge: ChallengeItem) => void;
}

export const ChallengeSection: React.FC<ChallengeSectionProps> = ({ onJoinChallengeClick }) => {
  const { isDark } = useTheme();

  const challenges = [
    {
      id: 'chal-tiny-game',
      title: 'Build a Tiny Game',
      description: 'Create a simple game using your favourite tools.',
      bg: '#FFF025',
      textColor: '#000000',
      icon: <Gamepad2 className="w-6 h-6 stroke-[2.5]" />,
      pillColor: '#000000',
      pillTextColor: '#FFFFFF',
    },
    {
      id: 'chal-useful-website',
      title: 'Create a Useful Website',
      description: 'Build something that solves a real problem.',
      bg: isDark ? '#141424' : '#FFFFFF',
      textColor: isDark ? '#FFFFFF' : '#000000',
      icon: <Globe className="w-6 h-6 stroke-[2.5] text-[#B11469]" />,
      pillColor: '#B11469',
      pillTextColor: '#FFFFFF',
    },
    {
      id: 'chal-helpful-tool',
      title: 'Design a Helpful Tool',
      description: 'Create a tool for everyday life.',
      bg: isDark ? '#141424' : '#FFFFFF',
      textColor: isDark ? '#FFFFFF' : '#000000',
      icon: <Lightbulb className="w-6 h-6 stroke-[2.5] text-[#C15D00]" />,
      pillColor: '#B11469',
      pillTextColor: '#FFFFFF',
    },
  ];

  return (
    <section
      id="challenges"
      className={`py-16 border-b transition-colors duration-300 ${
        isDark
          ? 'bg-[#080814] text-white border-white/15'
          : 'bg-[#0F172A] text-white border-black/20'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Heading, description, CTA */}
          <div className="lg:col-span-5 flex flex-col justify-center text-left">
            <h2 className="font-chewy text-3xl sm:text-4xl lg:text-5xl text-white tracking-normal mb-3">
              What will you build next?
            </h2>

            <p className="text-sm sm:text-base text-white/80 font-medium leading-relaxed mb-6">
              Take on creative prompts, join project challenges and build something amazing with the community.
            </p>

            <div>
              <button
                onClick={() =>
                  onJoinChallengeClick({
                    id: 'chal-tiny-game',
                    title: 'Build a Tiny Game',
                    theme: 'Creative game jam',
                    description: 'Create a simple game using your favourite tools.',
                    badgeText: 'Open Challenge',
                    accentColor: '#FFF025',
                    timeframe: 'Ongoing Jam',
                    participantCount: 38,
                    prompts: ['1-button runner', 'Maze escape', 'Tile puzzle'],
                  })
                }
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-black text-black rounded-2xl border-2 border-black brand-shadow transition-transform hover:-translate-y-1 active:translate-y-0.5 cursor-pointer"
                style={{ backgroundColor: '#FFF025' }}
              >
                <span>Explore Challenges</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>

          {/* Right Column: 3 Challenge Cards */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {challenges.map((chal) => (
              <div
                key={chal.id}
                onClick={() =>
                  onJoinChallengeClick({
                    id: chal.id,
                    title: chal.title,
                    theme: 'Creative Jam',
                    description: chal.description,
                    badgeText: 'Open Challenge',
                    accentColor: chal.bg === '#FFF025' ? '#FFF025' : '#B11469',
                    timeframe: 'Open Mission',
                    participantCount: 24,
                    prompts: ['Brainstorm prompt', 'Draft layout', 'Publish demo'],
                  })
                }
                className="p-5 rounded-2xl border-2 border-black brand-shadow flex flex-col justify-between transition-transform hover:-translate-y-1 cursor-pointer"
                style={{ backgroundColor: chal.bg, color: chal.textColor }}
              >
                <div>
                  <div className="mb-3">{chal.icon}</div>
                  <h3 className="font-chewy text-xl leading-snug mb-1">{chal.title}</h3>
                  <p className="text-xs leading-relaxed opacity-85 mb-4">{chal.description}</p>
                </div>

                <div className="pt-2">
                  <span
                    className="inline-block px-3 py-1 rounded-full text-[11px] font-black border border-black"
                    style={{ backgroundColor: chal.pillColor, color: chal.pillTextColor }}
                  >
                    Open Challenge
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
};
