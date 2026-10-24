import React from 'react';
import { HeartHandshake, ShieldCheck, MessageCircleHeart, Award, HelpCircle, Sparkles } from 'lucide-react';
import { useTheme } from '../utils/themeContext.tsx';

export const CommunityValues: React.FC = () => {
  const { isDark } = useTheme();

  const principles = [
    {
      title: 'Respect Other Creators',
      desc: 'Every student project represents hours of trial and error. We treat every member’s effort with kindness and encouragement.',
      icon: <HeartHandshake className="w-5 h-5 stroke-[2.5]" />,
      accent: '#FFF025',
    },
    {
      title: 'Give Constructive Feedback',
      desc: 'Point out what you loved first, then share polite tips on what could make their code or interface even stronger.',
      icon: <MessageCircleHeart className="w-5 h-5 stroke-[2.5]" />,
      accent: '#B11469',
    },
    {
      title: 'Give Credit Where Due',
      desc: 'If you remixed a friend’s formula or adapted an open-source tutorial, always give credit to the original creator.',
      icon: <Award className="w-5 h-5 stroke-[2.5]" />,
      accent: '#C15D00',
    },
    {
      title: 'Ask Without Fear',
      desc: 'There are no silly questions in Build Buds. Every experienced programmer once had trouble centering a div or writing a loop.',
      icon: <HelpCircle className="w-5 h-5 stroke-[2.5]" />,
      accent: '#FFF025',
    },
    {
      title: 'Share Responsibly',
      desc: 'Keep private personal info safe. Share your creations, your learning insights, and your code—never sensitive passwords or private data.',
      icon: <ShieldCheck className="w-5 h-5 stroke-[2.5]" />,
      accent: '#B11469',
    },
    {
      title: 'Celebrate Every Milestone',
      desc: 'Fixing your first bug is just as worthy of applause as deploying a full game. We celebrate the journey of building.',
      icon: <Sparkles className="w-5 h-5 stroke-[2.5]" />,
      accent: '#C15D00',
    },
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
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div
            className={`inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full border ${
              isDark ? 'bg-white/10 border-white/15' : 'bg-amber-100/70 border-black/15'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#B11469' }} />
            <span className="text-xs font-bold uppercase tracking-wider">
              Community Culture & Trust
            </span>
          </div>

          <h2
            className={`font-chewy text-4xl sm:text-5xl lg:text-6xl tracking-normal mb-4 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Build boldly. Be kind. Help each other grow.
          </h2>

          <p
            className={`text-base sm:text-lg font-medium leading-relaxed ${
              isDark ? 'text-white/85' : 'text-slate-600'
            }`}
          >
            Build Buds is built on mutual respect and shared curiosity. We want every creator—from elementary beginner to high school veteran—to feel supported.
          </p>
        </div>

        {/* 6 Core Principles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {principles.map((item, idx) => (
            <div
              key={idx}
              className={`p-6 rounded-3xl border-2 brand-shadow transition-all hover:-translate-y-1 ${
                isDark
                  ? 'bg-[#10101d] border-white/20 hover:border-[#FFF025] text-white'
                  : 'bg-white border-black/15 hover:border-black text-slate-900'
              }`}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center border-2 border-black mb-4 shadow-sm"
                style={{
                  backgroundColor: item.accent,
                  color: item.accent === '#FFF025' ? '#000000' : '#FFFFFF',
                }}
              >
                {item.icon}
              </div>

              <h3 className="font-chewy text-2xl mb-2">{item.title}</h3>

              <p
                className={`text-xs sm:text-sm font-medium leading-relaxed ${
                  isDark ? 'text-white/80' : 'text-slate-600'
                }`}
              >
                {item.desc}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
