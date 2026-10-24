import React from 'react';
import { HeartHandshake, ShieldCheck, MessageCircleHeart, Award, HelpCircle, Sparkles } from 'lucide-react';

export const CommunityValues: React.FC = () => {
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
    <section className="py-20 bg-[#0a0a14]/80 backdrop-blur-md border-b border-white/15 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 mb-3 bg-white/10 px-3 py-1 rounded-full border border-white/15">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#B11469' }} />
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Community Culture & Trust
            </span>
          </div>
          <h2 className="font-chewy text-4xl sm:text-5xl lg:text-6xl text-white tracking-normal mb-4">
            Build boldly. Be kind. Help each other grow.
          </h2>
          <p className="text-base sm:text-lg text-white/85 font-medium leading-relaxed">
            Build Buds is built on mutual respect and shared curiosity. We want every creator—from elementary beginner to high school veteran—to feel supported.
          </p>
        </div>

        {/* 6 Principles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {principles.map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl border-2 border-white/20 brand-shadow bg-[#10101c]/95 backdrop-blur-md hover:-translate-y-1 transition-transform flex flex-col justify-between text-white"
            >
              <div>
                <div
                  className="w-11 h-11 rounded-2xl border-2 border-black flex items-center justify-center mb-4 text-black"
                  style={{ backgroundColor: item.accent }}
                >
                  {item.icon}
                </div>

                <h3 className="font-chewy text-2xl text-white mb-2">
                  {item.title}
                </h3>

                <p className="text-xs text-white/80 leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/15 text-[11px] font-bold text-white/60">
                Core Value #{idx + 1}
              </div>
            </div>
          ))}
        </div>

        {/* Safety & Parent/Teacher note */}
        <div className="mt-12 p-6 rounded-2xl border-2 border-white/20 bg-[#10101c]/95 backdrop-blur-md brand-shadow flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left text-white">
          <div className="w-12 h-12 rounded-2xl border-2 border-black bg-[#FFF025] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-black stroke-[2.5]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              For Parents, Educators and Mentors
            </h4>
            <p className="text-xs text-white/75 mt-0.5">
              Build Buds focuses strictly on creative coding, peer constructive review, and positive digital citizenship across participating schools.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
};
