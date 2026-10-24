import React, { useState } from 'react';
import { SAMPLE_CHALLENGES } from '../data/mockData.ts';
import { ChallengeItem } from '../types/index.ts';
import { Flame, Clock, Users, CheckSquare, Sparkles, ArrowRight, X } from 'lucide-react';

interface ChallengeSectionProps {
  onJoinChallengeClick: (challenge: ChallengeItem) => void;
}

export const ChallengeSection: React.FC<ChallengeSectionProps> = ({ onJoinChallengeClick }) => {
  const [selectedChallengeModal, setSelectedChallengeModal] = useState<ChallengeItem | null>(null);

  const featuredChallenge = SAMPLE_CHALLENGES.find((c) => c.featured) || SAMPLE_CHALLENGES[0];
  const sideChallenges = SAMPLE_CHALLENGES.filter((c) => !c.featured);

  return (
    <section id="challenges" className="py-20 bg-white border-b-2 border-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full border border-black" style={{ backgroundColor: '#FFF025' }} />
            <span className="text-xs font-bold uppercase tracking-wider text-black">
              Community Missions & Prompts
            </span>
          </div>
          <h2 className="font-chewy text-4xl sm:text-5xl lg:text-6xl text-black tracking-normal mb-4">
            What will you build next?
          </h2>
          <p className="text-base sm:text-lg text-black font-medium leading-relaxed">
            Need an idea or a spark of inspiration? Jump into creative prompts and friendly building challenges designed to exercise your maker muscles.
          </p>
        </div>

        {/* Challenges Grid: 1 Featured (7 cols) + 2 Smaller (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Featured Challenge Card */}
          <div className="lg:col-span-7 flex flex-col justify-between p-8 rounded-3xl border-2 border-black brand-shadow-lg bg-black text-white relative overflow-hidden">
            {/* Background geometric accents */}
            <div
              className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-30 pointer-events-none"
              style={{ backgroundColor: '#FFF025' }}
            />

            <div className="relative z-10">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <span
                  className="px-3.5 py-1 text-xs font-black uppercase tracking-wider rounded-lg border-2 border-black text-black"
                  style={{ backgroundColor: '#FFF025' }}
                >
                  {featuredChallenge.badgeText}
                </span>
                <span className="text-xs font-bold text-white/80 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#FFF025]" />
                  {featuredChallenge.timeframe}
                </span>
              </div>

              <h3 className="font-chewy text-3xl sm:text-4xl lg:text-5xl text-white mb-3 leading-tight">
                {featuredChallenge.title}
              </h3>

              <p className="text-sm sm:text-base text-white/90 font-medium mb-6 leading-relaxed">
                {featuredChallenge.description}
              </p>

              {/* Prompt Checklist */}
              <div className="space-y-3 mb-8 bg-white/10 p-5 rounded-2xl border border-white/20">
                <div className="text-xs font-bold uppercase text-[#FFF025] tracking-wider">
                  Challenge Guidelines:
                </div>
                {featuredChallenge.prompts.map((prompt, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-white/90">
                    <CheckSquare className="w-4 h-4 text-[#FFF025] shrink-0 mt-0.5" />
                    <span>{prompt}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10 pt-4 border-t border-white/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-white/70">
                Playful, friendly prompt • No pressure or strict ranking
              </div>
              <button
                onClick={() => onJoinChallengeClick(featuredChallenge)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-xs sm:text-sm font-black text-black rounded-xl border-2 border-white brand-shadow-yellow transition-transform hover:-translate-y-0.5 active:translate-y-0.5 cursor-pointer"
                style={{ backgroundColor: '#FFF025' }}
              >
                <span>Take on this Challenge</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>

          {/* 2 Smaller Challenges (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6 justify-between">
            {sideChallenges.map((challenge) => (
              <div
                key={challenge.id}
                className="flex-1 p-6 rounded-3xl border-2 border-black brand-shadow bg-white flex flex-col justify-between hover:-translate-y-1 transition-transform"
                style={{ borderLeft: `8px solid ${challenge.accentColor}` }}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className="px-2.5 py-0.5 text-[11px] font-black uppercase rounded border border-black"
                      style={{
                        backgroundColor: challenge.accentColor,
                        color: challenge.accentColor === '#FFF025' ? '#000000' : '#FFFFFF',
                      }}
                    >
                      {challenge.badgeText}
                    </span>
                    <span className="text-xs font-semibold text-black/60">
                      {challenge.timeframe}
                    </span>
                  </div>

                  <h4 className="font-chewy text-2xl text-black mb-2">
                    {challenge.title}
                  </h4>

                  <p className="text-xs text-black/80 leading-relaxed mb-4">
                    {challenge.description}
                  </p>
                </div>

                <div className="pt-3 border-t-2 border-black/10 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-black/60">
                    Open to all grades
                  </span>
                  <button
                    onClick={() => onJoinChallengeClick(challenge)}
                    className="text-xs font-bold text-black underline hover:text-[#B11469] cursor-pointer"
                  >
                    View prompt details →
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
};
