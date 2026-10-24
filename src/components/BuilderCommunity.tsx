import React, { useState } from 'react';
import { BUILDER_PERSONAS } from '../data/mockData.ts';
import { Gamepad2, Globe, Wrench, Sparkles, Lightbulb, Users, School } from 'lucide-react';

interface BuilderCommunityProps {
  onJoinClick: () => void;
}

export const BuilderCommunity: React.FC<BuilderCommunityProps> = ({ onJoinClick }) => {
  const [selectedPersona, setSelectedPersona] = useState<number | null>(null);

  const getIcon = (type: string) => {
    switch (type) {
      case 'gamepad':
        return <Gamepad2 className="w-5 h-5" />;
      case 'globe':
        return <Globe className="w-5 h-5" />;
      case 'tool':
        return <Wrench className="w-5 h-5" />;
      case 'sparkles':
        return <Sparkles className="w-5 h-5" />;
      case 'lightbulb':
        return <Lightbulb className="w-5 h-5" />;
      case 'users':
      default:
        return <Users className="w-5 h-5" />;
    }
  };

  return (
    <section className="py-20 bg-white border-b-2 border-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full border border-black" style={{ backgroundColor: '#C15D00' }} />
            <span className="text-xs font-bold uppercase tracking-wider text-black">
              Collaborative Culture
            </span>
          </div>
          <h2 className="font-chewy text-4xl sm:text-5xl lg:text-6xl text-black tracking-normal mb-3">
            Your people are building here.
          </h2>
          <p className="font-chewy text-xl sm:text-2xl text-[#B11469] mb-4">
            Different schools. Different ideas. One community of builders.
          </p>
          <p className="text-base text-black font-medium leading-relaxed max-w-2xl mx-auto">
            Build Buds connects creators across schools. You do not need to be an expert coder to belong—curiosity and the excitement of making things are all you need.
          </p>
        </div>

        {/* Builder Interests & Personas Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {BUILDER_PERSONAS.map((persona, idx) => {
            const isSelected = selectedPersona === idx;
            return (
              <div
                key={idx}
                onClick={() => setSelectedPersona(isSelected ? null : idx)}
                className={`p-6 rounded-3xl border-2 border-black transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'brand-shadow-lg -translate-y-1.5'
                    : 'bg-white hover:-translate-y-1 brand-shadow'
                }`}
                style={{
                  backgroundColor: isSelected ? persona.accentColor : '#FFFFFF',
                  color: isSelected && persona.accentColor === '#B11469' ? '#FFFFFF' : '#000000',
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="w-11 h-11 rounded-2xl border-2 border-black flex items-center justify-center bg-white text-black"
                  >
                    {getIcon(persona.iconType)}
                  </div>
                  <span
                    className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-md border border-black bg-black text-white"
                  >
                    Active Group
                  </span>
                </div>

                <h3
                  className={`font-chewy text-2xl sm:text-3xl mb-2 ${
                    isSelected && persona.accentColor === '#B11469' ? 'text-white' : 'text-black'
                  }`}
                >
                  {persona.role}
                </h3>

                <p
                  className={`text-xs font-medium leading-relaxed mb-4 ${
                    isSelected && persona.accentColor === '#B11469' ? 'text-white/90' : 'text-black/80'
                  }`}
                >
                  {persona.tagline}
                </p>

                <div
                  className={`pt-3 border-t-2 text-xs font-bold ${
                    isSelected && persona.accentColor === '#B11469'
                      ? 'border-white/20 text-white'
                      : 'border-black/10 text-black/70'
                  }`}
                >
                  Examples: {persona.exampleProject}
                </div>
              </div>
            );
          })}
        </div>

        {/* Cross-School Network Visual Banner */}
        <div className="mt-12 p-6 rounded-2xl border-2 border-black bg-black/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl border-2 border-black bg-[#FFF025] flex items-center justify-center text-black shrink-0">
              <School className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="text-sm font-black text-black">
                Connecting Student Builders Across Classrooms & Campuses
              </div>
              <p className="text-xs text-black/70">
                Build Buds is a cross-school creator network, not a closed school portal. Everyone learns faster together.
              </p>
            </div>
          </div>
          <button
            onClick={onJoinClick}
            className="px-5 py-2.5 text-xs font-black text-black rounded-xl border-2 border-black bg-[#FFF025] brand-shadow-sm hover:-translate-y-0.5 transition-transform cursor-pointer shrink-0"
          >
            Find Fellow Builders
          </button>
        </div>

      </div>
    </section>
  );
};
