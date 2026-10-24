import React, { useState } from 'react';
import { ExternalLink, Code2, Sparkles, Terminal, CheckCircle2, ArrowRight } from 'lucide-react';

interface ProjectPublishingSectionProps {
  onPublishClick: () => void;
}

export const ProjectPublishingSection: React.FC<ProjectPublishingSectionProps> = ({ onPublishClick }) => {
  const [activeInteractiveDemo, setActiveInteractiveDemo] = useState<'preview' | 'code' | 'learnings'>('preview');

  return (
    <section className="py-20 bg-[#0a0a14]/80 backdrop-blur-md border-b border-white/15 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 mb-3 bg-white/10 px-3 py-1 rounded-full border border-white/15">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#FFF025' }} />
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Creator Portfolio Experience
            </span>
          </div>
          <h2 className="font-chewy text-4xl sm:text-5xl lg:text-6xl text-white tracking-normal mb-4">
            Your work deserves a home.
          </h2>
          <p className="text-base sm:text-lg text-white/85 font-medium leading-relaxed">
            Share what you built, explain how it works, show people what you learned and let other creators explore the details.
          </p>
        </div>

        {/* Interactive Feature Showcase Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Feature Breakdown */}
          <div className="lg:col-span-5 space-y-4">
            <div
              onClick={() => setActiveInteractiveDemo('preview')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                activeInteractiveDemo === 'preview'
                  ? 'bg-[#FFF025] border-black text-black brand-shadow -translate-y-1'
                  : 'bg-white/5 border-white/15 text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-black uppercase mb-1">
                <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                <span>Live Interactive Previews</span>
              </div>
              <h3 className={`font-chewy text-xl ${activeInteractiveDemo === 'preview' ? 'text-black' : 'text-white'}`}>
                Playable Games & Web Demos
              </h3>
              <p className={`text-xs mt-1 leading-relaxed ${activeInteractiveDemo === 'preview' ? 'text-black/90' : 'text-white/70'}`}>
                Embed your HTML5 games, responsive prototypes, or simulations directly in the project page so visitors can play immediately.
              </p>
            </div>

            <div
              onClick={() => setActiveInteractiveDemo('learnings')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                activeInteractiveDemo === 'learnings'
                  ? 'bg-[#B11469] border-white text-white brand-shadow -translate-y-1'
                  : 'bg-white/5 border-white/15 text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-black uppercase mb-1">
                <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                <span>Reflection & Learnings</span>
              </div>
              <h3 className="font-chewy text-xl text-white">
                Document What You Learned
              </h3>
              <p className={`text-xs mt-1 leading-relaxed ${activeInteractiveDemo === 'learnings' ? 'text-white/90' : 'text-white/70'}`}>
                Explain the math formulas you conquered, physics bugs you fixed, and how you worked through tricky problems.
              </p>
            </div>

            <div
              onClick={() => setActiveInteractiveDemo('code')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                activeInteractiveDemo === 'code'
                  ? 'bg-[#C15D00] border-white text-white brand-shadow -translate-y-1'
                  : 'bg-white/5 border-white/15 text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-black uppercase mb-1">
                <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                <span>Source Code & Resources</span>
              </div>
              <h3 className="font-chewy text-xl text-white">
                Share Your Code Snippets
              </h3>
              <p className={`text-xs mt-1 leading-relaxed ${activeInteractiveDemo === 'code' ? 'text-white/90' : 'text-white/70'}`}>
                Publish your key loops and algorithms with syntax highlighting so other students can inspect and learn from your architecture.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={onPublishClick}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-black text-black rounded-xl border-2 border-black brand-shadow transition-transform hover:-translate-y-0.5 cursor-pointer"
                style={{ backgroundColor: '#FFF025' }}
              >
                <span>Share your project</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>

          {/* Right Column: Visual Mockup of a Published Project Page */}
          <div className="lg:col-span-7">
            <div className="bg-[#10101c]/95 backdrop-blur-md rounded-3xl border-2 border-white/20 brand-shadow overflow-hidden text-white">
              {/* Browser style titlebar */}
              <div className="px-5 py-3.5 border-b border-white/15 bg-black/60 flex items-center justify-between text-white text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#B11469]" />
                    <span className="w-3 h-3 rounded-full bg-[#FFF025]" />
                    <span className="w-3 h-3 rounded-full bg-[#C15D00]" />
                  </div>
                  <span className="font-mono text-[11px] text-white/70 ml-2">
                    buildbuds.club/showcase/orbital-jump
                  </span>
                </div>
                <span className="text-[11px] font-bold text-[#FFF025]">
                  Live Project Card
                </span>
              </div>

              {/* Dynamic Mockup Body */}
              <div className="p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/15">
                  <div>
                    <span className="text-[11px] font-black uppercase text-[#FFF025]">
                      Featured Creation • HTML5 Canvas
                    </span>
                    <h4 className="font-chewy text-3xl text-white">
                      Orbital Jump: Gravitational Flight
                    </h4>
                    <p className="text-xs font-semibold text-white/70">
                      By Maya K. • 8th Grade, Westfield Middle
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setActiveInteractiveDemo('preview')}
                      className="px-3 py-1.5 text-xs font-black rounded-lg border-2 border-black bg-[#FFF025] text-black cursor-pointer"
                    >
                      View the live demo
                    </button>
                  </div>
                </div>

                {activeInteractiveDemo === 'preview' && (
                  <div className="space-y-4">
                    <div className="relative rounded-2xl border-2 border-white/20 bg-black p-6 text-center text-white h-52 flex flex-col items-center justify-center">
                      <div className="text-3xl mb-2">🚀</div>
                      <div className="font-chewy text-2xl text-[#FFF025]">
                        Interactive Canvas Runtime
                      </div>
                      <p className="text-xs text-white/70 max-w-sm mt-1">
                        Young creators can embed live playable experiments with standard responsive controls for desktop & mobile.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 rounded-xl border border-white/15 bg-white/5">
                        <div className="text-[10px] uppercase font-bold text-white/60">Category</div>
                        <div className="text-xs font-black text-white">Physics Game</div>
                      </div>
                      <div className="p-3 rounded-xl border border-white/15 bg-white/5">
                        <div className="text-[10px] uppercase font-bold text-white/60">Tools</div>
                        <div className="text-xs font-black text-white">Canvas + TS</div>
                      </div>
                      <div className="p-3 rounded-xl border border-white/15 bg-white/5">
                        <div className="text-[10px] uppercase font-bold text-white/60">Status</div>
                        <div className="text-xs font-black text-white">Playable v1.2</div>
                      </div>
                    </div>
                  </div>
                )}

                {activeInteractiveDemo === 'learnings' && (
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl border-2 border-black bg-[#FFF025]/20">
                      <div className="text-xs font-black text-black mb-1">
                        1. Vector Mathematics & Orbit Angles
                      </div>
                      <p className="text-xs text-black/80">
                        "I learned how to use Math.atan2 to calculate the angle towards the nearest planet center so the ship always rotates correctly."
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border-2 border-black bg-[#B11469]/10">
                      <div className="text-xs font-black text-black mb-1">
                        2. 60 FPS RequestAnimationFrame Scheduling
                      </div>
                      <p className="text-xs text-black/80">
                        "Avoiding setInterval and switching to requestAnimationFrame made the movement butter-smooth on school Chromebooks."
                      </p>
                    </div>
                  </div>
                )}

                {activeInteractiveDemo === 'code' && (
                  <div className="space-y-3">
                    <pre className="p-4 rounded-xl border-2 border-black bg-black text-[#FFF025] font-mono text-xs overflow-x-auto">
                      <code>{`// Explore the source code
function stepPhysics(planetoid, ship) {
  const dx = planetoid.x - ship.x;
  const dy = planetoid.y - ship.y;
  const rad = Math.hypot(dx, dy);
  ship.vx += (dx / rad) * (planetoid.mass / (rad * rad));
}`}</code>
                    </pre>
                  </div>
                )}

              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
