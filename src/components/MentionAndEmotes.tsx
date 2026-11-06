import React, { useState, useEffect, useMemo } from 'react';
import { db, collection, query, limit, onSnapshot, isApprovedStudentMember } from '../firebase.ts';
import { resolveBuilderAvatarUrl } from '../utils/avatars.ts';

// ============================================================================
// 1. VERIFIED STUDENT GRADIENT RING OF LIGHT (Yellow -> Orange -> Pink)
// ============================================================================
export interface VerifiedAvatarFrameProps {
  src: string;
  alt: string;
  isVerified?: boolean;
  sizeClass?: string;
  ringPaddingClass?: string;
  gapClassName?: string;
  imgClassName?: string;
  children?: React.ReactNode;
}

export const VerifiedAvatarFrame: React.FC<VerifiedAvatarFrameProps> = ({
  src,
  alt,
  isVerified = false,
  sizeClass = 'w-9 h-9',
  ringPaddingClass = 'p-[2.5px]',
  gapClassName = 'p-[2px] bg-[#0c0d14]',
  imgClassName = '',
  children,
}) => {
  if (!isVerified) {
    return (
      <div className={`relative inline-flex items-center justify-center shrink-0 ${sizeClass}`}>
        <img
          src={src}
          alt={alt}
          className={`w-full h-full rounded-full object-cover ${imgClassName}`}
        />
        {children}
      </div>
    );
  }

  return (
    <div
      title={`${alt} • Pro Member`}
      className={`relative inline-flex items-center justify-center rounded-full shrink-0 verified-student-ring ${ringPaddingClass} ${sizeClass}`}
    >
      <div className={`w-full h-full rounded-full flex items-center justify-center overflow-hidden shrink-0 ${gapClassName}`}>
        <img
          src={src}
          alt={alt}
          className={`w-full h-full rounded-full object-cover ${imgClassName}`}
        />
      </div>
      {children}
    </div>
  );
};

// ============================================================================
// 2. 3D-STYLE ANIMATED EMOTE PACK (Fresh, Smooth, Glossy 3D SVGs + Burst Effect)
// ============================================================================
export type EmoteKey =
  | '👍'
  | '👎'
  | '❤️'
  | '🔥'
  | '🚀'
  | '😭'
  | '🎉'
  | '💯'
  | 'like'
  | 'love'
  | 'fire'
  | 'rocket'
  | 'clap'
  | 'star';

export const normalizeEmoteKey = (raw: string): string => {
  switch (raw) {
    case 'like':
      return '👍';
    case 'love':
      return '❤️';
    case 'fire':
      return '🔥';
    case 'rocket':
      return '🚀';
    case 'clap':
      return '🎉';
    case 'star':
      return '💯';
    default:
      return raw;
  }
};

export const EMOTE_3D_META: Record<
  string,
  { label: string; glowColor: string; particleColors: [string, string] }
> = {
  '👍': {
    label: 'Thumbs Up',
    glowColor: 'rgba(255, 214, 10, 0.55)',
    particleColors: ['#FFF025', '#FF9F0A'],
  },
  '👎': {
    label: 'Thumbs Down',
    glowColor: 'rgba(255, 159, 10, 0.45)',
    particleColors: ['#FF9F0A', '#FF453A'],
  },
  '❤️': {
    label: 'Love It',
    glowColor: 'rgba(255, 45, 85, 0.65)',
    particleColors: ['#FF2D55', '#FF85A1'],
  },
  '🔥': {
    label: 'Pure Fire',
    glowColor: 'rgba(255, 107, 0, 0.65)',
    particleColors: ['#FF7A00', '#FFF025'],
  },
  '🚀': {
    label: 'Blast Off',
    glowColor: 'rgba(56, 189, 248, 0.65)',
    particleColors: ['#38BDF8', '#B11469'],
  },
  '😭': {
    label: 'Crying Laughing',
    glowColor: 'rgba(59, 130, 246, 0.6)',
    particleColors: ['#60A5FA', '#FFF025'],
  },
  '🎉': {
    label: 'Celebrate',
    glowColor: 'rgba(177, 20, 105, 0.65)',
    particleColors: ['#B11469', '#FFF025'],
  },
  '💯': {
    label: '100% Stellar',
    glowColor: 'rgba(255, 240, 37, 0.65)',
    particleColors: ['#FFF025', '#FF2D55'],
  },
};

export const Emote3DIcon: React.FC<{
  emote: string;
  size?: number;
  className?: string;
}> = ({ emote, size = 20, className = '' }) => {
  const key = normalizeEmoteKey(emote);
  const uid = React.useId().replace(/:/g, '');

  switch (key) {
    case '👍':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 36 36"
          fill="none"
          className={`emote-3d-svg drop-shadow-[0_3px_4px_rgba(0,0,0,0.38)] ${className}`}
        >
          <defs>
            <radialGradient id={`gold3d-${uid}`} cx="32%" cy="25%" r="72%">
              <stop offset="0%" stopColor="#FFF9A6" />
              <stop offset="45%" stopColor="#FFD60A" />
              <stop offset="85%" stopColor="#E68A00" />
              <stop offset="100%" stopColor="#9E5400" />
            </radialGradient>
            <linearGradient id={`cuff3d-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
          </defs>
          {/* 3D Cuff */}
          <rect
            x="4"
            y="16"
            width="8"
            height="15"
            rx="3.5"
            fill={`url(#cuff3d-${uid})`}
            stroke="#0F172A"
            strokeWidth="1.2"
          />
          {/* 3D Sculpted Hand & Thumb */}
          <path
            d="M12 17.5C13.8 14.5 16.5 9.8 17.2 6.2C17.6 4.2 20.5 4 21.3 6C22.1 8 21.4 11.8 20.8 14H28.5C30.8 14 32.3 16.2 31.5 18.3C32.4 19.4 32.2 21.3 31 22.3C31.7 23.4 31.3 25.1 29.9 26C30.3 27.3 29.4 29.2 27.5 29.5H15.5C13.5 29.5 12 28.2 12 26.2V17.5Z"
            fill={`url(#gold3d-${uid})`}
            stroke="#5C3200"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {/* Glossy Specular Highlight */}
          <ellipse
            cx="19"
            cy="9"
            rx="1.2"
            ry="2.6"
            transform="rotate(-12 19 9)"
            fill="white"
            fillOpacity="0.7"
          />
          <ellipse cx="24" cy="16.5" rx="4.2" ry="1.3" fill="white" fillOpacity="0.6" />
        </svg>
      );

    case '👎':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 36 36"
          fill="none"
          className={`emote-3d-svg drop-shadow-[0_3px_4px_rgba(0,0,0,0.38)] ${className}`}
        >
          <defs>
            <radialGradient id={`goldDown-${uid}`} cx="32%" cy="25%" r="75%">
              <stop offset="0%" stopColor="#FFF699" />
              <stop offset="48%" stopColor="#FFC700" />
              <stop offset="100%" stopColor="#A85800" />
            </radialGradient>
            <linearGradient id={`cuffDown-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F43F5E" />
              <stop offset="100%" stopColor="#9F1239" />
            </linearGradient>
          </defs>
          <g transform="matrix(1 0 0 -1 0 36)">
            <rect
              x="4"
              y="16"
              width="8"
              height="15"
              rx="3.5"
              fill={`url(#cuffDown-${uid})`}
              stroke="#4C0519"
              strokeWidth="1.2"
            />
            <path
              d="M12 17.5C13.8 14.5 16.5 9.8 17.2 6.2C17.6 4.2 20.5 4 21.3 6C22.1 8 21.4 11.8 20.8 14H28.5C30.8 14 32.3 16.2 31.5 18.3C32.4 19.4 32.2 21.3 31 22.3C31.7 23.4 31.3 25.1 29.9 26C30.3 27.3 29.4 29.2 27.5 29.5H15.5C13.5 29.5 12 28.2 12 26.2V17.5Z"
              fill={`url(#goldDown-${uid})`}
              stroke="#5C3200"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <ellipse cx="24" cy="16.5" rx="4" ry="1.2" fill="white" fillOpacity="0.55" />
          </g>
        </svg>
      );

    case '❤️':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 36 36"
          fill="none"
          className={`emote-3d-svg drop-shadow-[0_3px_5px_rgba(244,63,94,0.45)] ${className}`}
        >
          <defs>
            <radialGradient id={`heart3d-${uid}`} cx="32%" cy="24%" r="74%">
              <stop offset="0%" stopColor="#FF9EBB" />
              <stop offset="35%" stopColor="#FF2D55" />
              <stop offset="80%" stopColor="#C80036" />
              <stop offset="100%" stopColor="#6E001C" />
            </radialGradient>
          </defs>
          <path
            d="M18 31.5C18 31.5 4.5 23.2 4.5 13C4.5 8.1 8.4 4.5 12.8 4.5C15.5 4.5 17.2 5.9 18 7.5C18.8 5.9 20.5 4.5 23.2 4.5C27.6 4.5 31.5 8.1 31.5 13C31.5 23.2 18 31.5 18 31.5Z"
            fill={`url(#heart3d-${uid})`}
          />
          <ellipse
            cx="11.5"
            cy="10.2"
            rx="3.4"
            ry="2"
            transform="rotate(-28 11.5 10.2)"
            fill="white"
            fillOpacity="0.72"
          />
          <circle cx="25.5" cy="9.8" r="1.4" fill="white" fillOpacity="0.45" />
        </svg>
      );

    case '🔥':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 36 36"
          fill="none"
          className={`emote-3d-svg drop-shadow-[0_3px_5px_rgba(255,122,0,0.5)] ${className}`}
        >
          <defs>
            <radialGradient id={`fireOuter-${uid}`} cx="50%" cy="68%" r="68%">
              <stop offset="0%" stopColor="#FFF025" />
              <stop offset="45%" stopColor="#FF7A00" />
              <stop offset="82%" stopColor="#E11D48" />
              <stop offset="100%" stopColor="#881337" />
            </radialGradient>
            <radialGradient id={`fireCore-${uid}`} cx="50%" cy="75%" r="55%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="55%" stopColor="#FFF025" />
              <stop offset="100%" stopColor="#FF9500" />
            </radialGradient>
          </defs>
          <path
            d="M19.5 3C19.5 3 28.5 10.2 28.5 19.5C28.5 26.8 23.8 32.5 18 32.5C12.2 32.5 7.5 26.8 7.5 19.5C7.5 14.2 10.6 10.2 12.5 8.5C12.5 8.5 11.8 12.2 14.2 13.5C13.8 9.2 16.5 5.2 19.5 3Z"
            fill={`url(#fireOuter-${uid})`}
          />
          <path
            d="M18.2 14.5C18.2 14.5 23.5 18.8 23.5 24C23.5 28.2 21 31 18 31C15 31 12.5 28.2 12.5 24C12.5 20.5 15.2 17.5 18.2 14.5Z"
            fill={`url(#fireCore-${uid})`}
          />
          <ellipse cx="16.2" cy="24.5" rx="1.6" ry="2.8" fill="white" fillOpacity="0.75" />
        </svg>
      );

    case '🚀':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 36 36"
          fill="none"
          className={`emote-3d-svg drop-shadow-[0_3px_5px_rgba(56,189,248,0.45)] ${className}`}
        >
          <defs>
            <linearGradient id={`rocketBody-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="55%" stopColor="#E2E8F0" />
              <stop offset="100%" stopColor="#64748B" />
            </linearGradient>
            <linearGradient id={`rocketFins-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF2D55" />
              <stop offset="100%" stopColor="#B11469" />
            </linearGradient>
          </defs>
          {/* Exhaust Plume */}
          <path
            d="M11 25C8.5 27.5 6 31.5 6 31.5C6 31.5 10 29.5 12.5 27L11 25Z"
            fill="#FFF025"
            stroke="#FF7A00"
            strokeWidth="1.4"
          />
          {/* Fins */}
          <path d="M10 17L5 21L10.5 23.5L10 17Z" fill={`url(#rocketFins-${uid})`} />
          <path d="M19 26L15 31L12.5 25.5L19 26Z" fill={`url(#rocketFins-${uid})`} />
          {/* 3D Hull */}
          <path
            d="M30.5 5.5C24.5 5.5 16.5 9.8 11.5 16.8L19.2 24.5C26.2 19.5 30.5 11.5 30.5 5.5Z"
            fill={`url(#rocketBody-${uid})`}
            stroke="#1E293B"
            strokeWidth="1.1"
          />
          {/* Porthole Window */}
          <circle cx="21.5" cy="14.5" r="3.4" fill="#38BDF8" stroke="#0F172A" strokeWidth="1.2" />
          <ellipse cx="20.5" cy="13.5" rx="1.2" ry="0.8" fill="white" fillOpacity="0.85" />
        </svg>
      );

    case '😭':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 36 36"
          fill="none"
          className={`emote-3d-svg drop-shadow-[0_3px_4px_rgba(0,0,0,0.38)] ${className}`}
        >
          <defs>
            <radialGradient id={`face3d-${uid}`} cx="35%" cy="25%" r="70%">
              <stop offset="0%" stopColor="#FFF9A6" />
              <stop offset="50%" stopColor="#FFD60A" />
              <stop offset="100%" stopColor="#C15D00" />
            </radialGradient>
            <linearGradient id={`tear3d-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#7DD3FC" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
          </defs>
          <circle cx="18" cy="18" r="14" fill={`url(#face3d-${uid})`} />
          <ellipse cx="13.5" cy="10" rx="4.5" ry="2.2" fill="white" fillOpacity="0.6" />
          {/* Streams of 3D Tears */}
          <rect x="8.5" y="15.5" width="3.8" height="13" rx="1.9" fill={`url(#tear3d-${uid})`} />
          <rect x="23.7" y="15.5" width="3.8" height="13" rx="1.9" fill={`url(#tear3d-${uid})`} />
          {/* Eyes */}
          <path
            d="M9.5 14.5C11 13 13 13 14.5 14.5"
            stroke="#451A03"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M21.5 14.5C23 13 25 13 26.5 14.5"
            stroke="#451A03"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* Open Wailing Mouth */}
          <path
            d="M13 21.5C13 19.5 23 19.5 23 21.5C23 25.5 20.8 27.5 18 27.5C15.2 27.5 13 25.5 13 21.5Z"
            fill="#451A03"
          />
          <path d="M14.5 21H21.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );

    case '🎉':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 36 36"
          fill="none"
          className={`emote-3d-svg drop-shadow-[0_3px_4px_rgba(177,20,105,0.45)] ${className}`}
        >
          <defs>
            <linearGradient id={`cone3d-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF025" />
              <stop offset="55%" stopColor="#FF9F0A" />
              <stop offset="100%" stopColor="#B11469" />
            </linearGradient>
          </defs>
          <path
            d="M6 30L14 11L25 22L6 30Z"
            fill={`url(#cone3d-${uid})`}
            stroke="#451A03"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {/* Confetti Ribbons & 3D Dots */}
          <circle cx="24" cy="9" r="2.5" fill="#FF2D55" />
          <circle cx="17" cy="6.5" r="2" fill="#38BDF8" />
          <circle cx="29.5" cy="15.5" r="2.3" fill="#FFF025" />
          <path
            d="M20 13C22 10 25 10 27 7"
            stroke="#10B981"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M23 18C26 17 28 19 31 18"
            stroke="#B11469"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      );

    case '💯':
    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 36 36"
          fill="none"
          className={`emote-3d-svg drop-shadow-[0_3px_5px_rgba(255,45,85,0.45)] ${className}`}
        >
          <defs>
            <radialGradient id={`badge3d-${uid}`} cx="30%" cy="25%" r="75%">
              <stop offset="0%" stopColor="#FFF9A6" />
              <stop offset="45%" stopColor="#FFF025" />
              <stop offset="85%" stopColor="#FF7A00" />
              <stop offset="100%" stopColor="#B11469" />
            </radialGradient>
          </defs>
          <rect
            x="3"
            y="6"
            width="30"
            height="24"
            rx="8"
            fill={`url(#badge3d-${uid})`}
            stroke="#1E1B4B"
            strokeWidth="1.4"
          />
          <text
            x="18"
            y="21.5"
            textAnchor="middle"
            fill="#B11469"
            fontSize="13"
            fontWeight="900"
            fontFamily="Inter, sans-serif"
          >
            100
          </text>
          <path
            d="M8 25.5C13 24 23 24 28 25.5"
            stroke="#B11469"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <ellipse cx="11" cy="9.5" rx="5" ry="1.3" fill="white" fillOpacity="0.65" />
        </svg>
      );
  }
};

export interface AnimatedEmoteButtonProps {
  emote: string;
  count?: number;
  active?: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  size?: 'sm' | 'md';
  variant?: 'dark' | 'light';
}

export const AnimatedEmoteButton: React.FC<AnimatedEmoteButtonProps> = ({
  emote,
  count,
  active = false,
  onClick,
  title,
  size = 'sm',
  variant = 'dark',
}) => {
  const [isPopping, setIsPopping] = useState(false);
  const key = normalizeEmoteKey(emote);
  const meta = EMOTE_3D_META[key] || EMOTE_3D_META['👍'];

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsPopping(false);
    window.requestAnimationFrame(() => {
      setIsPopping(true);
    });
    onClick(e);
  };

  useEffect(() => {
    if (!isPopping) return;
    const t = window.setTimeout(() => setIsPopping(false), 600);
    return () => window.clearTimeout(t);
  }, [isPopping]);

  return (
    <button
      type="button"
      onClick={handleClick}
      title={title || meta.label}
      style={
        active
          ? {
              boxShadow: `0 0 12px ${meta.glowColor}`,
            }
          : undefined
      }
      className={`relative inline-flex items-center gap-1.5 rounded-full font-extrabold transition-all cursor-pointer select-none emote-3d-hover active:scale-90 ${
        size === 'md' ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'
      } ${
        variant === 'dark'
          ? active
            ? 'bg-gradient-to-r from-[#FFF025]/25 via-[#FF7A00]/20 to-[#B11469]/25 border-2 border-[#FFF025] text-[#FFF025]'
            : 'bg-white/[0.07] hover:bg-white/[0.14] border border-white/15 text-white/85'
          : active
          ? 'bg-[#FFF025] border-2 border-black text-black brand-shadow-sm'
          : 'bg-white hover:bg-slate-100 border-2 border-black text-slate-800'
      }`}
    >
      <span className={`inline-flex items-center justify-center ${isPopping ? 'animate-emote-3d-pop' : ''}`}>
        <Emote3DIcon emote={key} size={size === 'md' ? 19 : 16} />
      </span>
      {typeof count === 'number' && count > 0 && (
        <span className="tabular-nums font-black">{count}</span>
      )}

      {/* Floating 3D Sparkle Burst when Clicked */}
      {isPopping && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible">
          {[
            { tx: '-16px', ty: '-20px', color: meta.particleColors[0] },
            { tx: '16px', ty: '-20px', color: meta.particleColors[1] },
            { tx: '0px', ty: '-26px', color: '#FFF025' },
            { tx: '-20px', ty: '-6px', color: meta.particleColors[1] },
            { tx: '20px', ty: '-6px', color: meta.particleColors[0] },
          ].map((p, idx) => (
            <span
              key={idx}
              style={
                {
                  '--tx': p.tx,
                  '--ty': p.ty,
                  backgroundColor: p.color,
                  animation: 'emoteBurstParticle 0.55s ease-out forwards',
                } as React.CSSProperties
              }
              className="absolute w-2 h-2 rounded-full shadow-sm"
            />
          ))}
        </span>
      )}
    </button>
  );
};

// ============================================================================
// 3. REAL-TIME @USER & @ALL MENTION SYSTEM
// ============================================================================
export interface MentionableUser {
  uid: string;
  displayName: string;
  avatarUrl: string;
  avatarColor: string;
  role: string;
  schoolName?: string;
  isVerifiedStudent: boolean;
}

let cachedDirectoryUsers: MentionableUser[] = [];
let rawDirectoryDocs: Array<{ uid: string; data: Record<string, any> }> = [];
const approvedDirectoryMembershipUids = new Set<string>();
const directorySubscribers = new Set<(users: MentionableUser[]) => void>();
let isDirectoryListening = false;

const rebuildDirectoryUsers = () => {
  const list: MentionableUser[] = [];
  for (const item of rawDirectoryDocs) {
    const d = item.data;
    const uid = item.uid;
    const displayName = String(d.displayName || 'Builder').trim();
    if (!displayName) continue;
    const isApproved =
      approvedDirectoryMembershipUids.has(uid) ||
      isApprovedStudentMember({
        profile: d as any,
        membership: approvedDirectoryMembershipUids.has(uid) ? ({ status: 'approved' } as any) : null,
      });
    list.push({
      uid,
      displayName,
      avatarUrl: d.avatarUrl || '',
      avatarColor: d.avatarColor || '#FFF025',
      role: d.role || 'member',
      schoolName: d.schoolName || '',
      isVerifiedStudent: isApproved,
    });
  }
  list.sort((a, b) => a.displayName.localeCompare(b.displayName));
  cachedDirectoryUsers = list;
  directorySubscribers.forEach((cb) => cb(list));
};

const ensureDirectorySubscription = () => {
  if (isDirectoryListening) return;
  isDirectoryListening = true;

  const membershipsQuery = query(collection(db, 'communityMemberships'), limit(300));
  onSnapshot(
    membershipsQuery,
    (snap) => {
      approvedDirectoryMembershipUids.clear();
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data?.status === 'approved') {
          approvedDirectoryMembershipUids.add(data.uid || docSnap.id);
        }
      });
      rebuildDirectoryUsers();
    },
    () => {}
  );

  const q = query(collection(db, 'users'), limit(200));
  onSnapshot(
    q,
    (snap) => {
      const nextRaw: Array<{ uid: string; data: Record<string, any> }> = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        const uid = d.uid || docSnap.id;
        nextRaw.push({ uid, data: d });
      });
      rawDirectoryDocs = nextRaw;
      rebuildDirectoryUsers();
    },
    () => {}
  );
};

export const useMentionableUsers = (overrideUsers?: MentionableUser[]): MentionableUser[] => {
  const [users, setUsers] = useState<MentionableUser[]>(cachedDirectoryUsers);

  useEffect(() => {
    if (overrideUsers && overrideUsers.length > 0) {
      setUsers(overrideUsers);
      return;
    }
    ensureDirectorySubscription();
    setUsers(cachedDirectoryUsers);
    const handler = (updated: MentionableUser[]) => setUsers(updated);
    directorySubscribers.add(handler);
    return () => {
      directorySubscribers.delete(handler);
    };
  }, [overrideUsers]);

  return overrideUsers && overrideUsers.length > 0 ? overrideUsers : users;
};

/**
 * Extracts active `@query` token before the cursor or at the end of the text.
 */
export const detectActiveMentionQuery = (
  text: string,
  cursorPosition?: number
): { startIndex: number; endIndex: number; query: string } | null => {
  const pos = typeof cursorPosition === 'number' ? cursorPosition : text.length;
  const beforeCursor = text.slice(0, pos);
  // Match `@` at start of input, start of a new line, or preceded by whitespace, followed by 0–25 username chars on the same line
  const match = beforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_.\- ]{0,25})$/);
  if (!match) return null;

  const rawQuery = match[1];
  // Avoid triggering if the query spans across a newline or already completed a double space after a tag
  if (rawQuery.includes('\n') || rawQuery.includes('  ')) return null;

  const atIndex = beforeCursor.lastIndexOf('@');
  if (atIndex === -1) return null;

  return {
    startIndex: atIndex,
    endIndex: pos,
    query: rawQuery.toLowerCase(),
  };
};

export interface MentionCandidate {
  id: string;
  tagValue: string;
  displayName: string;
  subtitle: string;
  isAllTag?: boolean;
  avatarUrl?: string;
  isVerifiedStudent?: boolean;
}

export const MentionAutocompletePopover: React.FC<{
  inputValue: string;
  onSelectMention: (newValue: string) => void;
  overrideUsers?: MentionableUser[];
  position?: 'above' | 'below';
  variant?: 'dark' | 'light';
}> = ({
  inputValue,
  onSelectMention,
  overrideUsers,
  position = 'above',
  variant = 'dark',
}) => {
  const allUsers = useMentionableUsers(overrideUsers);
  const [activeIndex, setActiveIndex] = useState(0);

  const mentionMatch = useMemo(() => detectActiveMentionQuery(inputValue), [inputValue]);

  const candidates = useMemo<MentionCandidate[]>(() => {
    if (!mentionMatch) return [];
    const q = mentionMatch.query.trim();

    const results: MentionCandidate[] = [];
    if (!q || 'all'.includes(q) || 'everyone'.includes(q)) {
      results.push({
        id: '__all__',
        tagValue: 'all',
        displayName: '@all',
        subtitle: 'Notify everyone in this channel / discussion',
        isAllTag: true,
      });
    }

    const matchingUsers = allUsers.filter((u) =>
      u.displayName.toLowerCase().includes(q)
    );

    matchingUsers.slice(0, 12).forEach((u) => {
      results.push({
        id: u.uid,
        tagValue: u.displayName,
        displayName: u.displayName,
        subtitle:
          u.role === 'admin'
            ? 'Super Admin'
            : u.role === 'moderator'
            ? 'Moderator'
            : u.schoolName || 'Build Buds Builder',
        avatarUrl: resolveBuilderAvatarUrl(u.avatarUrl, u.uid),
        isVerifiedStudent: u.isVerifiedStudent,
      });
    });

    return results;
  }, [mentionMatch, allUsers]);

  useEffect(() => {
    setActiveIndex(0);
  }, [mentionMatch?.query]);

  if (!mentionMatch || candidates.length === 0) return null;

  const applyCandidate = (candidate: MentionCandidate) => {
    const prefix = inputValue.slice(0, mentionMatch.startIndex);
    const suffix = inputValue.slice(mentionMatch.endIndex);
    const inserted = `@${candidate.tagValue} `;
    onSelectMention(`${prefix}${inserted}${suffix}`);
  };

  return (
    <div
      role="listbox"
      aria-label="Tag a community member"
      className={`absolute left-0 right-0 z-50 max-w-sm rounded-2xl border-2 overflow-hidden shadow-2xl ${
        position === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'
      } ${
        variant === 'dark'
          ? 'bg-[#14161f] border-[#FFF025]/60 text-white'
          : 'bg-white border-black text-black brand-shadow'
      }`}
    >
      <div
        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider flex items-center justify-between border-b ${
          variant === 'dark'
            ? 'bg-[#1b1e2b] border-white/10 text-[#FFF025]'
            : 'bg-[#FFF025] border-black text-black'
        }`}
      >
        <span>Tag Builder or @all</span>
        <span className="opacity-75 font-mono">{candidates.length} match{candidates.length === 1 ? '' : 'es'}</span>
      </div>

      <div className="max-h-56 overflow-y-auto divide-y divide-white/5">
        {candidates.map((cand, idx) => {
          const isSelected = idx === activeIndex;
          return (
            <button
              key={cand.id}
              type="button"
              onMouseDown={(e) => {
                // Prevent input blur before selection
                e.preventDefault();
                applyCandidate(cand);
              }}
              onMouseEnter={() => setActiveIndex(idx)}
              className={`w-full px-3 py-2 flex items-center justify-between gap-2.5 text-left text-xs transition-colors cursor-pointer ${
                variant === 'dark'
                  ? isSelected
                    ? 'bg-[#FFF025]/15 text-white'
                    : 'hover:bg-white/5 text-white/85'
                  : isSelected
                  ? 'bg-[#FFF025]/40 text-black'
                  : 'hover:bg-slate-100 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {cand.isAllTag ? (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#FFF025] via-[#FF7A00] to-[#B11469] text-black font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                    @
                  </div>
                ) : (
                  <VerifiedAvatarFrame
                    src={cand.avatarUrl || '/assets/aistudio/images/aurora-logo.png'}
                    alt={cand.displayName}
                    isVerified={cand.isVerifiedStudent}
                    sizeClass="w-7 h-7"
                    ringPaddingClass="p-[2px]"
                  />
                )}
                <div className="min-w-0">
                  <div className="font-extrabold truncate flex items-center gap-1.5">
                    <span>{cand.isAllTag ? '@all' : `@${cand.displayName}`}</span>
                    {cand.isAllTag && (
                      <span className="px-1.5 py-0.2 rounded bg-[#B11469] text-white text-[9px] font-black uppercase">
                        Everyone
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-[10px] truncate ${
                      variant === 'dark' ? 'text-white/50' : 'text-slate-500'
                    }`}
                  >
                    {cand.subtitle}
                  </div>
                </div>
              </div>
              <span
                className={`text-[10px] font-mono shrink-0 ${
                  variant === 'dark' ? 'text-[#FFF025]' : 'text-[#B11469] font-bold'
                }`}
              >
                Tag ↵
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Checks if a message text mentions `@all` or a specific user's displayName.
 */
export const doesTextMentionUserOrAll = (
  text: string,
  targetDisplayName?: string | null
): { mentionsAll: boolean; mentionsUser: boolean } => {
  if (!text) return { mentionsAll: false, mentionsUser: false };
  const lower = text.toLowerCase();
  const mentionsAll = /(?:^|\s)@all(?:\b|\s|$|[!?,.:;])/i.test(lower);
  let mentionsUser = false;
  if (targetDisplayName && targetDisplayName.trim()) {
    const cleanName = targetDisplayName.trim().toLowerCase();
    if (lower.includes(`@${cleanName}`)) {
      mentionsUser = true;
    }
  }
  return { mentionsAll, mentionsUser };
};

/**
 * Renders message or comment text with highlighted `@all` and `@Username` pills.
 */
export const renderTextWithMentions = (
  text: string,
  currentUserDisplayName?: string | null,
  knownUsers?: MentionableUser[]
): React.ReactNode => {
  if (!text || !text.includes('@')) return text;

  // Build regex matching `@all` or any known `@DisplayName` or `@word`
  const userNames = (knownUsers || cachedDirectoryUsers)
    .map((u) => u.displayName.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  const pattern =
    userNames.length > 0
      ? `(@all\\b|@(?:${userNames.join('|')})|@[a-zA-Z0-9_.-]+)`
      : `(@all\\b|@[a-zA-Z0-9_.-]+)`;

  const regex = new RegExp(pattern, 'gi');
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (!part.startsWith('@')) {
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    }
    const lowerPart = part.toLowerCase();
    const isAll = lowerPart === '@all';
    const isMe =
      Boolean(currentUserDisplayName) &&
      lowerPart === `@${currentUserDisplayName!.trim().toLowerCase()}`;

    return (
      <span
        key={idx}
        className={`inline-flex items-center px-1.5 py-0.2 mx-0.5 rounded-md font-extrabold text-[0.92em] transition-colors ${
          isAll
            ? 'bg-gradient-to-r from-[#FFF025] via-[#FF7A00] to-[#B11469] text-black shadow-sm'
            : isMe
            ? 'bg-[#FFF025] text-black ring-1 ring-black'
            : 'bg-[#FFF025]/20 text-[#FFF025] border border-[#FFF025]/40'
        }`}
      >
        {part}
      </span>
    );
  });
};
