import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Compass, Sparkles, Terminal, MessageSquare, Play, RefreshCw, Trophy } from 'lucide-react';

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
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Starfield grid
      ctx.fillStyle = 'rgba(255, 240, 37, 0.4)';
      for (let i = 0; i < 15; i++) {
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
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
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
    <section className="relative overflow-hidden bg-white pt-10 pb-16 lg:pt-16 lg:pb-24 border-b-2 border-black">
      {/* Playful background decorative shapes strictly using brand palette */}
      <div className="absolute top-6 right-10 w-28 h-28 rounded-full pointer-events-none opacity-40 blur-2xl" style={{ backgroundColor: '#FFF025' }} />
      <div className="absolute bottom-10 left-12 w-36 h-36 rounded-full pointer-events-none opacity-30 blur-2xl" style={{ backgroundColor: '#B11469' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Text Column (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-center text-left">
            {/* Small supporting line */}
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="w-3 h-3 rounded-full border-2 border-black" style={{ backgroundColor: '#B11469' }} />
              <span className="text-xs sm:text-sm font-bold tracking-wide uppercase text-black">
                Made for curious minds and builders across schools
              </span>
            </div>

            {/* Official Headline */}
            <h1 className="font-chewy text-5xl sm:text-6xl lg:text-7xl xl:text-[5rem] text-black leading-[1.08] tracking-normal mb-6">
              Big ideas. Little builds.{' '}
              <span className="relative inline-block">
                <span className="relative z-10" style={{ color: '#B11469' }}>
                  A world of possibilities.
                </span>
                <span
                  className="absolute bottom-2 left-0 w-full h-4 sm:h-5 -z-0 -rotate-1 rounded"
                  style={{ backgroundColor: '#FFF025' }}
                />
              </span>
            </h1>

            {/* Supporting Headline */}
            <p className="text-lg sm:text-xl text-black font-medium leading-relaxed max-w-2xl mb-8">
              Build Buds is where young creators share their projects, exchange ideas, solve problems and build amazing things together.
            </p>

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
                className="inline-flex items-center justify-center gap-2 px-7 py-4 text-base sm:text-lg font-bold text-black bg-white rounded-2xl border-2 border-black brand-shadow transition-all duration-150 active:translate-x-1 active:translate-y-1 hover:-translate-y-1 hover:bg-black/5 cursor-pointer"
              >
                <Compass className="w-5 h-5 stroke-[2.5]" style={{ color: '#C15D00' }} />
                <span>Explore Creations</span>
              </button>
            </div>

            {/* Proof & Community highlight bar */}
            <div className="pt-6 border-t-2 border-black/15 flex flex-wrap items-center gap-6 text-sm text-black font-semibold">
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
                className="absolute -top-4 -left-4 z-20 px-3 py-1.5 rounded-lg border-2 border-black text-xs font-black brand-shadow-sm -rotate-3"
                style={{ backgroundColor: '#FFF025', color: '#000000' }}
              >
                Made by a builder.
              </div>

              {/* Floating label 2 */}
              <div
                className="absolute -bottom-3 right-0 z-20 px-3 py-1.5 rounded-lg border-2 border-black text-xs font-black brand-shadow-sm rotate-1"
                style={{ backgroundColor: '#B11469', color: '#FFFFFF' }}
              >
                Your next project starts here.
              </div>

              {/* Card 1: Interactive Mini Game Canvas Preview */}
              <div className="relative z-10 bg-white rounded-2xl border-2 border-black brand-shadow p-4 mb-4">
                <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-black/10">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-3 h-3 rounded-full border border-black" style={{ backgroundColor: '#B11469' }} />
                      <span className="w-3 h-3 rounded-full border border-black" style={{ backgroundColor: '#FFF025' }} />
                      <span className="w-3 h-3 rounded-full border border-black" style={{ backgroundColor: '#C15D00' }} />
                    </div>
                    <span className="text-xs font-bold text-black uppercase tracking-wider ml-1">
                      Orbital Jump • Interactive Sandbox
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded bg-black/5">
                    <Trophy className="w-3.5 h-3.5" style={{ color: '#C15D00' }} />
                    <span>Stars: {starsCollected}</span>
                  </div>
                </div>

                {/* Canvas */}
                <div className="relative rounded-xl overflow-hidden border-2 border-black bg-black">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={160}
                    className="w-full h-36 block"
                  />
                  <div className="absolute bottom-2 right-2 flex items-center gap-2">
                    <button
                      onClick={handleThrust}
                      className="px-3 py-1 text-xs font-black text-black rounded-lg border-2 border-black transition-transform active:scale-95 cursor-pointer"
                      style={{ backgroundColor: '#FFF025' }}
                    >
                      {isPlaying ? '▲ Thrust' : '▶ Play Demo'}
                    </button>
                  </div>
                  {!isPlaying && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 text-center">
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

                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-black font-medium">By Maya K. (Grade 8)</span>
                  <button
                    onClick={() => onOpenProject('orbital-jump')}
                    className="font-bold underline hover:text-[#B11469] cursor-pointer"
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
                  className="bg-white rounded-xl border-2 border-black brand-shadow-sm p-3 hover:-translate-y-1 transition-transform cursor-pointer"
                  style={{ borderTop: '6px solid #FFF025' }}
                >
                  <div className="text-[10px] font-black uppercase tracking-wider text-black/60 mb-1">
                    Website Preview
                  </div>
                  <div className="text-sm font-bold text-black leading-snug line-clamp-1">
                    EcoTracker Garden
                  </div>
                  <p className="text-xs text-black/80 mt-1 line-clamp-2">
                    Real-time soil moisture & watering scheduler for school biology.
                  </p>
                  <div className="mt-2 text-[11px] font-bold text-[#C15D00]">
                    View project →
                  </div>
                </div>

                {/* Community Discussion snippet */}
                <div
                  className="bg-white rounded-xl border-2 border-black brand-shadow-sm p-3 hover:-translate-y-1 transition-transform"
                  style={{ borderTop: '6px solid #B11469' }}
                >
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-black/60 mb-1">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-[#B11469]" />
                      Discussion
                    </span>
                    <span>2h ago</span>
                  </div>
                  <div className="text-xs font-bold text-black line-clamp-2">
                    "How can I make my character move more smoothly?"
                  </div>
                  <p className="text-[11px] text-black/75 mt-1 line-clamp-2">
                    Maya replied: Try linear friction damping...
                  </p>
                </div>
              </div>

              {/* Floating label 3 */}
              <div className="mt-5 text-center">
                <span
                  className="inline-block px-4 py-1.5 rounded-full border-2 border-black text-xs font-black brand-shadow-sm"
                  style={{ backgroundColor: '#FFFFFF', color: '#C15D00' }}
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
