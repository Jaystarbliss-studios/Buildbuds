import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  maxSize: number;
  color: string;
  glowColor: string;
  alpha: number;
  life: number;
  maxLife: number;
  rotation: number;
  rotationSpeed: number;
  shape: 'star' | 'circle' | 'diamond';
}

const BRAND_SPARKLE_COLORS = [
  { color: '#FFF025', glow: 'rgba(255, 240, 37, 0.8)' }, // Lemon Yellow
  { color: '#B11469', glow: 'rgba(177, 20, 105, 0.8)' }, // Berry Pink
  { color: '#C15D00', glow: 'rgba(193, 93, 0, 0.8)' },   // Burnt Orange
  { color: '#FFFFFF', glow: 'rgba(255, 255, 255, 0.9)' }, // Pure White glint
];

/**
 * Interactive fairy dust / cosmic sparkle cursor trail.
 * Sprites bubble and trail behind mouse motion in official brand colors
 * (Lemon Yellow, Berry Pink, Burnt Orange, White) and softly drift & fade away.
 */
export const SparkleCursor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isRunningRef = useRef<boolean>(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const handleResize = () => {
      if (!canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const spawnSparkles = (x: number, y: number, count = 2, speedMultiplier = 1) => {
      const shapes: ('star' | 'circle' | 'diamond')[] = ['star', 'star', 'diamond', 'circle'];

      for (let i = 0; i < count; i++) {
        const colorObj = BRAND_SPARKLE_COLORS[Math.floor(Math.random() * BRAND_SPARKLE_COLORS.length)];
        const angle = Math.random() * Math.PI * 2;
        const speed = (0.5 + Math.random() * 2.2) * speedMultiplier;
        
        // Gentle upward drift like fairy dust floating in space
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed - 0.6; // slight upward buoy

        const maxSize = 5 + Math.random() * 9;
        const maxLife = 28 + Math.floor(Math.random() * 22);

        particlesRef.current.push({
          x: x + (Math.random() - 0.5) * 8,
          y: y + (Math.random() - 0.5) * 8,
          vx,
          vy,
          size: 1,
          maxSize,
          color: colorObj.color,
          glowColor: colorObj.glow,
          alpha: 1,
          life: 0,
          maxLife,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.15,
          shape: shapes[Math.floor(Math.random() * shapes.length)],
        });
      }

      // Limit particle count for high performance
      if (particlesRef.current.length > 140) {
        particlesRef.current.splice(0, particlesRef.current.length - 140);
      }

      startLoop();
    };

    // Draw 4-pointed twinkling star (Tinkerbell / cosmic sparkle)
    const drawStar = (
      context: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      spikes: number,
      outerRadius: number,
      innerRadius: number
    ) => {
      let rot = (Math.PI / 2) * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      context.beginPath();
      context.moveTo(cx, cy - outerRadius);

      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        context.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        context.lineTo(x, y);
        rot += step;
      }
      context.lineTo(cx, cy - outerRadius);
      context.closePath();
      context.fill();
    };

    const drawDiamond = (context: CanvasRenderingContext2D, cx: number, cy: number, radius: number) => {
      context.beginPath();
      context.moveTo(cx, cy - radius * 1.3);
      context.lineTo(cx + radius * 0.7, cy);
      context.lineTo(cx, cy + radius * 1.3);
      context.lineTo(cx - radius * 0.7, cy);
      context.closePath();
      context.fill();
    };

    const render = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96; // soft friction
        p.vy *= 0.96;
        p.rotation += p.rotationSpeed;

        // Size curve: grows quickly then slowly shrinks
        const progress = p.life / p.maxLife;
        if (progress < 0.25) {
          p.size = p.maxSize * (progress / 0.25);
        } else {
          p.size = p.maxSize * (1 - (progress - 0.25) / 0.75);
        }

        p.alpha = Math.max(0, 1 - progress);

        if (p.life >= p.maxLife || p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.glowColor;
        ctx.shadowBlur = Math.min(p.size * 2, 14);

        if (p.shape === 'star') {
          drawStar(ctx, 0, 0, 4, p.size, p.size * 0.28);
        } else if (p.shape === 'diamond') {
          drawDiamond(ctx, 0, 0, p.size * 0.8);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      ctx.restore();

      if (particles.length > 0) {
        animFrameRef.current = requestAnimationFrame(render);
      } else {
        isRunningRef.current = false;
      }
    };

    const startLoop = () => {
      if (!isRunningRef.current) {
        isRunningRef.current = true;
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      let clientX: number;
      let clientY: number;

      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else {
        return;
      }

      if (lastPosRef.current) {
        const dist = Math.hypot(clientX - lastPosRef.current.x, clientY - lastPosRef.current.y);
        // Only spawn if moved sufficiently to avoid stationary spam
        if (dist > 3) {
          const spawnCount = Math.min(Math.max(1, Math.floor(dist / 8)), 4);
          spawnSparkles(clientX, clientY, spawnCount);
          lastPosRef.current = { x: clientX, y: clientY };
        }
      } else {
        lastPosRef.current = { x: clientX, y: clientY };
        spawnSparkles(clientX, clientY, 2);
      }
    };

    const handleClick = (e: MouseEvent) => {
      // Playful burst on click
      spawnSparkles(e.clientX, e.clientY, 8, 1.6);
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('click', handleClick, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('click', handleClick);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-50 transition-opacity duration-300"
      style={{ willChange: 'transform' }}
    />
  );
};
