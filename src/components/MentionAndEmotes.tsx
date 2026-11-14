import React, { useState, useEffect, useMemo } from 'react';
import { db, collection, query, limit, getDocs, isApprovedStudentMember } from '../firebase.ts';
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
// 2. WHATSAPP-STYLE REACTION SYSTEM (Clean, Crisp Emoji Glyphs + Sleek Pills)
// ============================================================================
export const WHATSAPP_QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const;

export type EmoteKey =
  | '👍'
  | '❤️'
  | '😂'
  | '😮'
  | '😢'
  | '🙏'
  | '👎'
  | '🔥'
  | '🚀'
  | '😭'
  | '🎉'
  | '💯'
  | '👏'
  | '✨'
  | 'like'
  | 'love'
  | 'fire'
  | 'rocket'
  | 'clap'
  | 'sparkle'
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
      return '👏';
    case 'sparkle':
      return '✨';
    case 'star':
      return '💯';
    default:
      return raw;
  }
};

export const EMOTE_3D_META: Record<
  string,
  { label: string }
> = {
  '👍': { label: 'Like' },
  '❤️': { label: 'Love' },
  '😂': { label: 'Haha' },
  '😮': { label: 'Wow' },
  '😢': { label: 'Sad' },
  '🙏': { label: 'Thanks' },
  '👎': { label: 'Dislike' },
  '🔥': { label: 'Fire' },
  '🚀': { label: 'Rocket' },
  '😭': { label: 'Cry' },
  '🎉': { label: 'Celebrate' },
  '👏': { label: 'Applaud' },
  '✨': { label: 'Sparkle' },
  '💯': { label: '100%' },
};

export const Emote3DIcon: React.FC<{
  emote: string;
  size?: number;
  className?: string;
}> = ({ emote, size = 18, className = '' }) => {
  const key = normalizeEmoteKey(emote);
  const uid = React.useId().replace(/:/g, '');
  const label = EMOTE_3D_META[key]?.label || key;

  const renderSvgArtwork = () => {
    switch (key) {
      case '👍':
        return (
          <svg viewBox="0 0 36 36" width={size} height={size} className="overflow-visible">
            <defs>
              <radialGradient id={`g-skin-${uid}`} cx="35%" cy="28%" r="75%">
                <stop offset="0%" stopColor="#FFE875" />
                <stop offset="55%" stopColor="#FFC83D" />
                <stop offset="100%" stopColor="#E5890A" />
              </radialGradient>
              <linearGradient id={`g-cuff-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#58A6FF" />
                <stop offset="100%" stopColor="#1E54B7" />
              </linearGradient>
            </defs>
            <g filter="drop-shadow(0 1.5px 1.5px rgba(0,0,0,0.35))">
              <path
                d="M11.5 16.5C12.8 14.5 16 10.6 16.7 6.8C17.1 4.4 18.6 3.2 20.1 3.5C21.8 3.9 22.3 6.1 21.8 8.9C21.4 11 20.6 12.7 20.1 13.7H27.8C29.8 13.7 31.3 15.1 31.3 16.9C31.3 18 30.8 18.9 30 19.5C30.8 20.1 31.2 21.1 31 22.2C30.8 23.3 30 24.1 29.1 24.5C29.6 25.2 29.7 26.2 29.3 27.1C28.8 28.2 27.6 28.9 26.2 29H15.8C13.5 29 11.7 27.9 11 26.4V16.5H11.5Z"
                fill={`url(#g-skin-${uid})`}
              />
              <path
                d="M17.3 7.5C17.8 5.4 19 4.5 19.8 4.9C19 6.8 18.3 9.2 17.5 11.5"
                stroke="#FFF7C2"
                strokeWidth="1.2"
                strokeLinecap="round"
                fill="none"
                opacity="0.7"
              />
              <path
                d="M21 19H29.6M21.5 23.6H28.8M22 27.6H26.4"
                stroke="#D47400"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.45"
              />
              <rect x="4.5" y="16" width="7.2" height="14" rx="2.6" fill={`url(#g-cuff-${uid})`} />
              <circle cx="8" cy="26.8" r="1.2" fill="#DCEBFF" opacity="0.85" />
            </g>
          </svg>
        );
      case '❤️':
        return (
          <svg viewBox="0 0 36 36" width={size} height={size} className="overflow-visible">
            <defs>
              <radialGradient id={`g-heart-${uid}`} cx="34%" cy="28%" r="76%">
                <stop offset="0%" stopColor="#FF7A90" />
                <stop offset="40%" stopColor="#F82849" />
                <stop offset="100%" stopColor="#A60422" />
              </radialGradient>
            </defs>
            <g filter="drop-shadow(0 1.5px 1.8px rgba(0,0,0,0.38))">
              <path
                d="M18 31.6C17.3 31.6 4.2 22.8 4.2 12.6C4.2 7.8 8 4.2 12.5 4.2C15.1 4.2 17.1 5.5 18 7.1C18.9 5.5 20.9 4.2 23.5 4.2C28 4.2 31.8 7.8 31.8 12.6C31.8 22.8 18.7 31.6 18 31.6Z"
                fill={`url(#g-heart-${uid})`}
              />
              <ellipse
                cx="11.2"
                cy="10.4"
                rx="3.6"
                ry="2.1"
                transform="rotate(-32 11.2 10.4)"
                fill="#FFFFFF"
                opacity="0.48"
              />
            </g>
          </svg>
        );
      case '😂':
        return (
          <svg viewBox="0 0 36 36" width={size} height={size} className="overflow-visible">
            <defs>
              <radialGradient id={`g-face-${uid}`} cx="35%" cy="26%" r="75%">
                <stop offset="0%" stopColor="#FFF08A" />
                <stop offset="60%" stopColor="#FFC933" />
                <stop offset="100%" stopColor="#E68A00" />
              </radialGradient>
              <linearGradient id={`g-tear-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#A6EAFF" />
                <stop offset="100%" stopColor="#2692F2" />
              </linearGradient>
            </defs>
            <g filter="drop-shadow(0 1.5px 1.6px rgba(0,0,0,0.36))">
              <circle cx="18" cy="18" r="14.5" fill={`url(#g-face-${uid})`} />
              <ellipse cx="13" cy="8.5" rx="6.5" ry="3" fill="#FFFBE0" opacity="0.45" />
              <path d="M9.5 15.2C10.5 13.5 13.5 13.5 14.5 15.2" stroke="#573100" strokeWidth="2.1" strokeLinecap="round" fill="none" />
              <path d="M21.5 15.2C22.5 13.5 25.5 13.5 26.5 15.2" stroke="#573100" strokeWidth="2.1" strokeLinecap="round" fill="none" />
              <path d="M9.5 19.3C9.5 25.4 13.3 28.4 18 28.4C22.7 28.4 26.5 25.4 26.5 19.3H9.5Z" fill="#61290C" />
              <path d="M10.4 19.3H25.6C25.3 21 24.4 21.8 23.2 21.8H12.8C11.6 21.8 10.7 21 10.4 19.3Z" fill="#FFFFFF" />
              <path d="M13.2 26C14.5 24.4 21.5 24.4 22.8 26C21.5 27.6 19.8 28.2 18 28.2C16.2 28.2 14.5 27.6 13.2 26Z" fill="#FF5D78" />
              <path d="M7.5 17.5C4.5 18 2.8 20.6 3.7 22.8C4.6 25 7.4 24.6 8.3 22.5C9 20.8 8.4 18.7 7.5 17.5Z" fill={`url(#g-tear-${uid})`} />
              <path d="M28.5 17.5C31.5 18 33.2 20.6 32.3 22.8C31.4 25 28.6 24.6 27.7 22.5C27 20.8 27.6 18.7 28.5 17.5Z" fill={`url(#g-tear-${uid})`} />
            </g>
          </svg>
        );
      case '😮':
        return (
          <svg viewBox="0 0 36 36" width={size} height={size} className="overflow-visible">
            <defs>
              <radialGradient id={`g-wow-${uid}`} cx="35%" cy="26%" r="75%">
                <stop offset="0%" stopColor="#FFF08A" />
                <stop offset="60%" stopColor="#FFC933" />
                <stop offset="100%" stopColor="#E68A00" />
              </radialGradient>
            </defs>
            <g filter="drop-shadow(0 1.5px 1.6px rgba(0,0,0,0.36))">
              <circle cx="18" cy="18" r="14.5" fill={`url(#g-wow-${uid})`} />
              <ellipse cx="13" cy="8.5" rx="6" ry="2.8" fill="#FFFBE0" opacity="0.45" />
              <ellipse cx="12.5" cy="14" rx="2.1" ry="2.8" fill="#4A2700" />
              <ellipse cx="23.5" cy="14" rx="2.1" ry="2.8" fill="#4A2700" />
              <circle cx="11.9" cy="13.2" r="0.7" fill="#FFFFFF" opacity="0.7" />
              <circle cx="22.9" cy="13.2" r="0.7" fill="#FFFFFF" opacity="0.7" />
              <ellipse cx="18" cy="24.2" rx="3.9" ry="4.9" fill="#5A2208" />
              <ellipse cx="18" cy="26.5" rx="2.3" ry="1.4" fill="#E84E68" opacity="0.75" />
            </g>
          </svg>
        );
      case '😢':
        return (
          <svg viewBox="0 0 36 36" width={size} height={size} className="overflow-visible">
            <defs>
              <radialGradient id={`g-sad-${uid}`} cx="35%" cy="26%" r="75%">
                <stop offset="0%" stopColor="#FFF08A" />
                <stop offset="60%" stopColor="#FFC933" />
                <stop offset="100%" stopColor="#E68A00" />
              </radialGradient>
              <linearGradient id={`g-drop-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#A6EAFF" />
                <stop offset="100%" stopColor="#2692F2" />
              </linearGradient>
            </defs>
            <g filter="drop-shadow(0 1.5px 1.6px rgba(0,0,0,0.36))">
              <circle cx="18" cy="18" r="14.5" fill={`url(#g-sad-${uid})`} />
              <ellipse cx="13" cy="8.5" rx="6" ry="2.8" fill="#FFFBE0" opacity="0.42" />
              <path d="M9.2 12.8C10.5 11.4 12.8 11.2 14.3 12" stroke="#703E00" strokeWidth="1.6" strokeLinecap="round" fill="none" />
              <path d="M26.8 12.8C25.5 11.4 23.2 11.2 21.7 12" stroke="#703E00" strokeWidth="1.6" strokeLinecap="round" fill="none" />
              <circle cx="12.4" cy="16.2" r="2.2" fill="#4A2700" />
              <circle cx="23.6" cy="16.2" r="2.2" fill="#4A2700" />
              <path d="M13 24.8C14.7 22.3 21.3 22.3 23 24.8" stroke="#5A2F00" strokeWidth="2.1" strokeLinecap="round" fill="none" />
              <path d="M26 19C26 19 29.5 23.5 29.5 26C29.5 28 28 29.5 26 29.5C24 29.5 22.5 28 22.5 26C22.5 23.5 26 19 26 19Z" fill={`url(#g-drop-${uid})`} />
            </g>
          </svg>
        );
      case '🙏':
        return (
          <svg viewBox="0 0 36 36" width={size} height={size} className="overflow-visible">
            <defs>
              <linearGradient id={`g-pray-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFE875" />
                <stop offset="65%" stopColor="#FFC83D" />
                <stop offset="100%" stopColor="#E08508" />
              </linearGradient>
              <linearGradient id={`g-slv-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#46D6C8" />
                <stop offset="100%" stopColor="#0E7C7B" />
              </linearGradient>
            </defs>
            <g filter="drop-shadow(0 1.5px 1.6px rgba(0,0,0,0.36))">
              <path d="M18 4.8L12.2 17.5L12.6 27.5H17.8V4.8H18Z" fill={`url(#g-pray-${uid})`} />
              <path d="M18 4.8L23.8 17.5L23.4 27.5H18.2V4.8H18Z" fill={`url(#g-pray-${uid})`} />
              <line x1="18" y1="5.2" x2="18" y2="27.2" stroke="#C86D00" strokeWidth="1.2" opacity="0.6" />
              <path d="M7.5 29.8L11.2 22L16.5 24.5L13.5 31.8H7.5V29.8Z" fill={`url(#g-slv-${uid})`} />
              <path d="M28.5 29.8L24.8 22L19.5 24.5L22.5 31.8H28.5V29.8Z" fill={`url(#g-slv-${uid})`} />
              <path d="M10.5 6L9 3M18 3.2V1.2M25.5 6L27 3" stroke="#7AE4FF" strokeWidth="1.7" strokeLinecap="round" />
            </g>
          </svg>
        );
      case '🔥':
        return (
          <svg viewBox="0 0 36 36" width={size} height={size} className="overflow-visible">
            <defs>
              <linearGradient id={`g-fire1-${uid}`} x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="#FF9E1B" />
                <stop offset="55%" stopColor="#FF4B1F" />
                <stop offset="100%" stopColor="#B81600" />
              </linearGradient>
              <linearGradient id={`g-fire2-${uid}`} x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="#FFF475" />
                <stop offset="100%" stopColor="#FFB300" />
              </linearGradient>
            </defs>
            <g filter="drop-shadow(0 1.5px 1.6px rgba(0,0,0,0.36))">
              <path
                d="M19.8 3.2C20.5 7.9 16.5 10.6 15.8 14.3C14.1 12.7 13.7 10.4 13.9 8.6C9.6 11.4 7.2 16.4 7.2 21.1C7.2 27.6 12.1 32.5 18.4 32.5C24.9 32.5 29.2 27.7 29.2 21.4C29.2 14.3 24.5 8.1 19.8 3.2Z"
                fill={`url(#g-fire1-${uid})`}
              />
              <path
                d="M18.4 16.5C18.8 19.6 16.5 21.4 15.9 23.4C14.8 22.3 14.5 20.8 14.6 19.8C12.3 21.3 11.3 24.1 11.3 26.6C11.3 29.8 14.4 32.3 18.2 32.3C22.2 32.3 24.8 29.7 24.8 26.1C24.8 22.1 21.6 18.8 18.4 16.5Z"
                fill={`url(#g-fire2-${uid})`}
              />
            </g>
          </svg>
        );
      case '🚀':
        return (
          <svg viewBox="0 0 36 36" width={size} height={size} className="overflow-visible">
            <defs>
              <linearGradient id={`g-rbody-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="65%" stopColor="#D7E1EC" />
                <stop offset="100%" stopColor="#94A3B8" />
              </linearGradient>
              <linearGradient id={`g-rnose-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF5F7E" />
                <stop offset="100%" stopColor="#C10F39" />
              </linearGradient>
            </defs>
            <g filter="drop-shadow(0 1.5px 1.6px rgba(0,0,0,0.36))">
              <path d="M9.5 23.5L4.5 26.2L7.3 19.5L13 18.2L9.5 23.5Z" fill={`url(#g-rnose-${uid})`} />
              <path d="M12.5 26.5L9.8 31.5L16.5 28.7L17.8 23L12.5 26.5Z" fill={`url(#g-rnose-${uid})`} />
              <path d="M30.8 5.2C23.5 5.4 17.3 9.2 12.6 15.6L20.4 23.4C26.8 18.7 30.6 12.5 30.8 5.2Z" fill={`url(#g-rbody-${uid})`} />
              <path d="M30.8 5.2C27.5 5.3 24.5 6.3 21.9 7.9L28.1 14.1C29.7 11.5 30.7 8.5 30.8 5.2Z" fill={`url(#g-rnose-${uid})`} />
              <circle cx="21.5" cy="14.5" r="3" fill="#38BDF8" stroke="#1E3A8A" strokeWidth="1.2" />
              <path d="M7.8 24.5C5.2 26.4 4.2 30.2 5.4 31.4C6.6 32.6 10.2 31.2 12 28.5L7.8 24.5Z" fill="#FFB300" />
            </g>
          </svg>
        );
      default:
        return (
          <span
            style={{
              fontSize: `${size}px`,
              lineHeight: 1,
              fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
            }}
            className="inline-flex items-center justify-center leading-none select-none drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.45)]"
          >
            {key}
          </span>
        );
    }
  };

  return (
    <span
      role="img"
      aria-label={label}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
    >
      {renderSvgArtwork()}
    </span>
  );
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
  const meta = EMOTE_3D_META[key] || { label: key };

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
    const t = window.setTimeout(() => setIsPopping(false), 320);
    return () => window.clearTimeout(t);
  }, [isPopping]);

  return (
    <button
      type="button"
      onClick={handleClick}
      title={title || meta.label}
      className={`relative inline-flex items-center gap-1 rounded-full font-semibold transition-all cursor-pointer select-none active:scale-95 ${
        size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px]'
      } ${
        variant === 'dark'
          ? active
            ? 'bg-[#2a3942] border border-[#00a884]/70 text-[#e9edef] shadow-xs'
            : 'bg-[#202c33] hover:bg-[#2a3942] border border-white/10 text-[#d1d7db]'
          : active
          ? 'bg-amber-100 border border-black text-black'
          : 'bg-slate-100 hover:bg-slate-200 border border-black/20 text-slate-800'
      }`}
    >
      <span
        className={`inline-flex items-center justify-center transition-transform duration-200 ${
          isPopping ? 'scale-125' : ''
        }`}
      >
        <Emote3DIcon emote={key} size={size === 'md' ? 16 : 14} />
      </span>
      {typeof count === 'number' && count > 0 && (
        <span className="tabular-nums font-bold text-[11px] opacity-90">{count}</span>
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
  try {
    window.localStorage.setItem('buildbuds_mention_directory_cache', JSON.stringify(list));
  } catch {
    // Ignore storage quota errors
  }
  directorySubscribers.forEach((cb) => cb(list));
};

const ensureDirectorySubscription = () => {
  if (isDirectoryListening) return;
  isDirectoryListening = true;

  try {
    const cachedRaw = window.localStorage.getItem('buildbuds_mention_directory_cache');
    if (cachedRaw) {
      const parsed = JSON.parse(cachedRaw) as MentionableUser[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedDirectoryUsers = parsed;
        directorySubscribers.forEach((cb) => cb(parsed));
      }
    }
  } catch {
    // Ignore storage read errors
  }

  Promise.all([
    getDocs(query(collection(db, 'communityMemberships'), limit(60))).catch(() => null),
    getDocs(query(collection(db, 'users'), limit(60))).catch(() => null),
  ])
    .then(([membershipsSnap, usersSnap]) => {
      if (membershipsSnap) {
        approvedDirectoryMembershipUids.clear();
        membershipsSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data?.status === 'approved') {
            approvedDirectoryMembershipUids.add(data.uid || docSnap.id);
          }
        });
      }
      if (usersSnap) {
        const nextRaw: Array<{ uid: string; data: Record<string, any> }> = [];
        usersSnap.forEach((docSnap) => {
          const d = docSnap.data();
          const uid = d.uid || docSnap.id;
          nextRaw.push({ uid, data: d });
        });
        rawDirectoryDocs = nextRaw;
      }
      if (membershipsSnap || usersSnap) {
        rebuildDirectoryUsers();
      }
    })
    .catch(() => {});
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
