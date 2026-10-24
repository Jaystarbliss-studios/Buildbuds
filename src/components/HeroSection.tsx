import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Compass, Sparkles, Trophy, Play, MessageSquare } from 'lucide-react';

interface HeroSectionProps {
  onJoinClick: () => void;
  onExploreClick: () => void;
  onOpenProject: (projectId: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onJoinClick,
  onExploreClick,
  onOpenProject,
}) => {
  // Interactive mini canvas game for the hero visual card
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [starsCollected, setStarsCollected] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const gameStateRef = useRef({
    x: 100,
    y: 70,
    vx: 1.5,
    vy: 0,
    starX: 200,
    starY: 70,
  });

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw starry background dots using approved colors
      ctx.fillStyle = '#0a0a14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Starfield grid
      ctx.fillStyle = 'rgba(255, 240, 37, 0.5)';
      for (let i = 0; i < 18; i++) {
        const sx = (i * 37) % canvas.width;
        const sy = (i * 29) % canvas.height;
        ctx.fillRect(sx, sy, 2, 2);
      }

      const state = gameStateRef.current;

      if (isPlaying) {
        state.x += state.vx;
        state.y += state.vy;
        state.vy += 0.08; // gravity

        // Bounce walls
        if (state.x < 15 || state.x > canvas.width - 15) state.vx *= -1;
        if (state.y > canvas.height - 20) {
          state.y = canvas.height - 20;
          state.vy = -1.8;
        }
        if (state.y < 15) {
          state.y = 15;
          state.vy = 1;
        }

        // Check star collection
        const dist = Math.hypot(state.x - state.starX, state.y - state.starY);
        if (dist < 18) {
          setStarsCollected((prev) => prev + 1);
          state.starX = 30 + Math.random() * (canvas.width - 60);
          state.starY = 30 + Math.random() * (canvas.height - 60);
        }
      }

      // Draw Target Star (Lemon Yellow)
      ctx.fillStyle = '#FFF025';
      ctx.beginPath();
      ctx.arc(state.starX, state.starY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw Player Ship (Berry Pink & Burnt Orange)
      ctx.save();
      ctx.translate(state.x, state.y);
      ctx.fillStyle = '#B11469';
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-8, -8);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#FFF025';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Thruster flame
      if (isPlaying) {
        ctx.fillStyle = '#C15D00';
        ctx.beginPath();
        ctx.moveTo(-4, 0);
        ctx.lineTo(-12, -3);
        ctx.lineTo(-16, 0);
        ctx.lineTo(-12, 3);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  const handleThrust = () => {
    setIsPlaying(true);
    gameStateRef.current.vy = -3.2;
    gameStateRef.current.vx = (Math.random() - 0.5) * 4;
  };

  return (
    <section className="relative overflow-hidden z-10 isolate pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-white/20">
      {/* Direct Background Image - 100% visible: public/assets/aistudio/images/beautiful-build-buds.png */}
      <img
        src="/assets/aistudio/images/beautiful-build-buds.png"
        alt="Build Buds colorful waves"
        className="absolute inset-0 w-full h-full object-cover object-center z-0 select-none pointer-events-none opacity-95"
      />

      {/* Light transparent gradient that lets the image shine through and gently fades into the dark theme at the bottom */}
      <div
        className="absolute inset-0 z-0 bg-gradient-to-b from-black/30 via-black/15 to-[#06060c] pointer-events-none"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Text Column (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-center text-left">
            {/* Official Headline with 'A world of possibilities.' REMOVED as requested */}
            <h1 className="font-chewy text-6xl sm:text-7xl lg:text-8xl text-white leading-[1.04] tracking-normal mb-8 drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]">
              Big ideas.{' '}
              <span className="relative inline-block text-[#FFF025] drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]">
                Little builds.
                <span
                  className="absolute bottom-2 left-0 w-full h-3 sm:h-4 -z-10 rounded opacity-80"
                  style={{ backgroundColor: '#B11469' }}
                />
              </span>
            </h1>

            {/* Action CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-8">
              <button
                onClick={onJoinClick}
                className="inline-flex items-center justify-center gap-3 px-8 py-4 text-base sm:text-lg font-black text-black rounded-2xl border-2 border-black brand-shadow transition-all duration-150 active:translate-x-1 active:translate-y-1 hover:-translate-y-1 cursor-pointer"
                style={{ backgroundColor: '#FFF025' }}
              >
                <span>Join Build Buds</span>
                <ArrowRight className="w-5 h-5 stroke-[3]" />
              </button>

              <button
                onClick={onExploreClick}
                className="inline-flex items-center justify-center gap-2 px-7 py-4 text-base sm:text-lg font-bold text-white bg-black/50 hover:bg-black/60 backdrop-blur-md rounded-2xl border-2 border-white/30 brand-shadow transition-all duration-150 active:translate-x-1 active:translate-y-1 hover:-translate-y-1 cursor-pointer"
              >
                <Compass className="w-5 h-5 stroke-[2.5]" style={{ color: '#FFF025' }} />
                <span>Explore Creations</span>
              </button>
            </div>

            {/* Community Highlights Bar */}
            <div className="bg-black/45 backdrop-blur-md rounded-2xl border border-white/20 px-5 py-3.5 flex flex-wrap items-center gap-6 text-sm text-white font-bold w-fit shadow-lg">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full border border-black" style={{ backgroundColor: '#FFF025' }} />
                <span>Games & Simulations</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full border border-black" style={{ backgroundColor: '#B11469' }} />
                <span>Websites & Utilities</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full border border-black" style={{ backgroundColor: '#C15D00' }} />
                <span>Friendly Peer Discussions</span>
              </div>
            </div>
          </div>

          {/* Right Visual Composition (5 cols) */}
          <div className="lg:col-span-5 relative">
            <div className="relative w-full max-w-lg mx-auto">
              
              {/* Floating label 1 */}
              <div
                className="absolute -top-4 -left-3 z-20 px-3.5 py-1.5 rounded-xl border-2 border-black text-xs font-black brand-shadow -rotate-3"
                style={{ backgroundColor: '#FFF025', color: '#000000' }}
              >
                Made by a builder.
              </div>

              {/* Floating label 2 */}
              <div
                className="absolute -bottom-3 right-0 z-20 px-3.5 py-1.5 rounded-xl border-2 border-white text-xs font-black brand-shadow rotate-1"
                style={{ backgroundColor: '#B11469', color: '#FFFFFF' }}
              >
                Your next project starts here.
              </div>

              {/* Card 1: Interactive Mini Game Canvas Preview in Dark Space Mode */}
              <div className="relative z-10 bg-[#10101c]/95 backdrop-blur-md rounded-3xl border-2 border-white/20 brand-shadow p-5 mb-4 text-white">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/15">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#B11469' }} />
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FFF025' }} />
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#C15D00' }} />
                    </div>
                    <span className="text-xs font-bold text-white/90 uppercase tracking-wider ml-1">
                      Orbital Jump • Interactive Sandbox
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 text-white">
                    <Trophy className="w-3.5 h-3.5" style={{ color: '#FFF025' }} />
                    <span>Stars: {starsCollected}</span>
                  </div>
                </div>

                {/* Canvas */}
                <div className="relative rounded-2xl overflow-hidden border-2 border-white/20 bg-black">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={160}
                    className="w-full h-36 block"
                  />
                  <div className="absolute bottom-2 right-2 flex items-center gap-2">
                    <button
                      onClick={handleThrust}
                      className="px-3.5 py-1.5 text-xs font-black text-black rounded-lg border-2 border-black transition-transform active:scale-95 cursor-pointer"
                      style={{ backgroundColor: '#FFF025' }}
                    >
                      {isPlaying ? '▲ Thrust' : '▶ Play Demo'}
                    </button>
                  </div>
                  {!isPlaying && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4 text-center">
                      <button
                        onClick={handleThrust}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-black border-2 border-black cursor-pointer hover:scale-105 transition-transform"
                        style={{ backgroundColor: '#FFF025' }}
                      >
                        <Play className="w-3.5 h-3.5 fill-black" />
                        <span>Tap to Launch Rocket</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-3.5 flex items-center justify-between text-xs">
                  <span className="text-white/80 font-medium">By Maya K. (Grade 8)</span>
                  <button
                    onClick={() => onOpenProject('orbital-jump')}
                    className="font-bold underline hover:text-[#FFF025] cursor-pointer text-white"
                  >
                    View Project Details →
                  </button>
                </div>
              </div>

              {/* Card 2 & 3 Layered Grid (Website & Discussion snippet) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Website snippet */}
                <div
                  onClick={() => onOpenProject('ecotracker-garden')}
                  className="bg-[#10101c]/95 backdrop-blur-md rounded-2xl border-2 border-white/20 brand-shadow p-3.5 hover:-translate-y-1 transition-transform cursor-pointer text-white"
                  style={{ borderTop: '5px solid #FFF025' }}
                >
                  <div className="text-[10px] font-black uppercase tracking-wider text-[#FFF025] mb-1">
                    Website Preview
                  </div>
                  <div className="text-sm font-bold text-white leading-snug line-clamp-1">
                    EcoTracker Garden
                  </div>
                  <p className="text-xs text-white/70 mt-1 line-clamp-2">
                    Real-time soil moisture & watering scheduler for school biology.
                  </p>
                  <div className="mt-2 text-[11px] font-bold text-[#FFF025]">
                    View project →
                  </div>
                </div>

                {/* Community Discussion snippet */}
                <div
                  className="bg-[#10101c]/95 backdrop-blur-md rounded-2xl border-2 border-white/20 brand-shadow p-3.5 hover:-translate-y-1 transition-transform text-white"
                  style={{ borderTop: '5px solid #B11469' }}
                >
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-white/60 mb-1">
                    <span className="flex items-center gap-1 text-[#B11469]">
                      <MessageSquare className="w-3 h-3" />
                      Discussion
                    </span>
                    <span>2h ago</span>
                  </div>
                  <div className="text-xs font-bold text-white line-clamp-2">
                    "How can I make my character move more smoothly?"
                  </div>
                  <p className="text-[11px] text-white/70 mt-1 line-clamp-2">
                    Maya replied: Try linear friction damping...
                  </p>
                </div>
              </div>

              {/* Floating label 3 */}
              <div className="mt-5 text-center">
                <span
                  className="inline-block px-4 py-1.5 rounded-full border-2 border-white/30 text-xs font-black brand-shadow bg-black text-[#FFF025]"
                >
                  Built. Shared. Improved.
                </span>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
