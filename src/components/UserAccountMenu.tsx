import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  LogOut,
  ShieldCheck,
  Sparkles,
  Bookmark,
  FolderGit2,
  Clock,
  Lock,
  MessageSquare,
  Sliders,
  CheckCircle2,
  UserCheck,
  Loader2,
  Trophy,
  Bell,
  Sun,
  Moon,
  Inbox,
} from 'lucide-react';
import { BuilderProfile, User, isSuperAdminUser } from '../firebase.ts';
import { StudentAccessStatus, UserNotificationItem } from '../types/community.ts';
import { resolveBuilderAvatarUrl } from '../utils/avatars.ts';
import { useTheme } from '../utils/themeContext.tsx';
import { VerifiedAvatarFrame } from './MentionAndEmotes.tsx';

interface UserAccountMenuProps {
  currentUser: User | null;
  builderProfile: BuilderProfile | null;
  studentAccessStatus: StudentAccessStatus;
  isApprovedForHub: boolean;
  isAuthChecking?: boolean;
  notifications?: UserNotificationItem[];
  onSelectNotification?: (notif: UserNotificationItem) => void;
  onOpenInbox?: () => void;
  onSignInClick: () => void;
  onJoinClick?: () => void;
  onSignOut: () => void;
  onNavigate: (path: string) => void;
  onOpenCurationModal?: () => void;
  onOpenCategoriesModal?: () => void;
  onOpenChallengesModal?: () => void;
  variant?: 'light' | 'dark';
}

export const UserAccountMenu: React.FC<UserAccountMenuProps> = ({
  currentUser,
  builderProfile,
  studentAccessStatus,
  isApprovedForHub,
  isAuthChecking = false,
  notifications = [],
  onSelectNotification,
  onOpenInbox,
  onSignInClick,
  onJoinClick,
  onSignOut,
  onNavigate,
  onOpenCurationModal,
  onOpenCategoriesModal,
  onOpenChallengesModal,
  variant,
}) => {
  const { isDark: themeIsDark, toggleTheme } = useTheme();
  const isDark = variant ? variant === 'dark' : themeIsDark;

  const [isOpen, setIsOpen] = useState(false);
  const [showNotificationsList, setShowNotificationsList] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowNotificationsList(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Show a subtle loading pill while Firebase resolves the persisted session
  if (isAuthChecking) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 border-black text-xs font-extrabold ${
          isDark ? 'bg-[#171726] text-slate-300' : 'bg-white text-slate-700'
        }`}
        aria-label="Restoring account session"
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#B11469]" />
        <span className="hidden sm:inline">Checking session...</span>
      </div>
    );
  }

  // Signed-out state: show explicit Sign In and Join Community CTAs + Dark Mode toggle
  if (!currentUser) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className={`p-2 rounded-xl border-2 border-black cursor-pointer transition-colors ${
            isDark
              ? 'bg-[#171726] text-[#FFF025] hover:bg-[#222238]'
              : 'bg-white text-slate-800 hover:bg-slate-100'
          }`}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onSignInClick}
          className={`px-3 py-1.5 rounded-xl border-2 border-black text-xs font-extrabold transition-all cursor-pointer ${
            isDark
              ? 'bg-[#171726] hover:bg-[#232338] text-white'
              : 'bg-white hover:bg-slate-100 text-black'
          }`}
        >
          Sign In
        </button>
        {onJoinClick && (
          <button
            type="button"
            onClick={onJoinClick}
            className="px-3 py-1.5 rounded-xl border-2 border-black bg-[#FFF025] hover:bg-[#ffe500] text-black text-xs font-black brand-shadow-sm transition-transform hover:-translate-y-0.5 cursor-pointer"
          >
            Join Community
          </button>
        )}
      </div>
    );
  }

  const isAdmin = isSuperAdminUser(currentUser, builderProfile);
  const isModerator = builderProfile?.role === 'moderator';
  const isModOrAdmin = isAdmin || isModerator;
  const isVerifiedCoreMember = Boolean(isApprovedForHub || isModOrAdmin);
  const displayName =
    builderProfile?.displayName ||
    currentUser.displayName ||
    currentUser.email?.split('@')[0] ||
    'Builder';
  const email = currentUser.email || (builderProfile as { email?: string } | null)?.email || '';
  const avatarSrc = resolveBuilderAvatarUrl(builderProfile?.avatarUrl, currentUser.uid);
  const unreadNotifCount = notifications.filter((n) => !n.read).length;
  const isPendingAccess =
    studentAccessStatus === 'pending' || studentAccessStatus === 'more_information_required';

  const rowClass = isDark
    ? 'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-xs font-semibold text-slate-200 hover:bg-white/[0.07] transition-colors cursor-pointer'
    : 'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer';

  const mutedLabelClass = isDark
    ? 'px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400'
    : 'px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500';

  const dividerClass = isDark ? 'border-t border-white/10' : 'border-t border-slate-200';

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="Open account menu"
        className={`relative flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
          isDark
            ? 'bg-[#171823] hover:bg-[#1f2130] border-white/15 text-white'
            : 'bg-white hover:bg-slate-50 border-black/20 text-black'
        }`}
      >
        <VerifiedAvatarFrame
          src={avatarSrc}
          alt={displayName}
          isVerified={isVerifiedCoreMember}
          sizeClass="w-7 h-7"
          ringPaddingClass="p-[2px]"
        />
        <span className="text-xs font-bold max-w-[110px] truncate hidden sm:inline">
          {displayName}
        </span>
        {unreadNotifCount > 0 && (
          <span
            title={`${unreadNotifCount} unread notification${unreadNotifCount === 1 ? '' : 's'}`}
            className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-black leading-none flex items-center justify-center tabular-nums shrink-0"
          >
            {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
      </button>

      {isOpen && (
        <div
          className={`fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-72 max-w-[calc(100vw-1.5rem)] max-h-[82dvh] overflow-y-auto rounded-xl border shadow-2xl z-50 divide-y ${
            isDark
              ? 'bg-[#13141c] border-white/12 text-white divide-white/10'
              : 'bg-white border-black/15 text-slate-900 divide-slate-200'
          }`}
        >
          {/* Group 1: Minimal Profile Identity */}
          <div className="p-3.5">
            <div className="flex items-center gap-3">
              <VerifiedAvatarFrame
                src={avatarSrc}
                alt={displayName}
                isVerified={isVerifiedCoreMember}
                sizeClass="w-10 h-10"
                ringPaddingClass="p-[2px]"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm truncate">{displayName}</span>
                  {(isAdmin || isModerator) && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                        isDark ? 'bg-white/10 text-white/85' : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {isAdmin ? 'Admin' : 'Moderator'}
                    </span>
                  )}
                </div>
                {email && (
                  <div
                    className={`text-[11px] truncate ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {email}
                  </div>
                )}
                {builderProfile?.schoolName && (
                  <div
                    className={`text-[10px] truncate mt-0.5 ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {builderProfile.schoolName}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Group 2: Inbox & Quick Notifications */}
          <div className="p-1.5">
            {onOpenInbox && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setShowNotificationsList(false);
                  onOpenInbox();
                }}
                className={rowClass}
              >
                <span className="flex items-center gap-2.5">
                  <Inbox className="w-4 h-4 opacity-70" />
                  <span>Inbox Center</span>
                </span>
                {unreadNotifCount > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowNotificationsList((prev) => !prev)}
              className={rowClass}
            >
              <span className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 opacity-70" />
                <span>Recent Alerts</span>
              </span>
              <span className="flex items-center gap-1.5 text-[11px] opacity-70 tabular-nums">
                <span>{notifications.length}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    showNotificationsList ? 'rotate-180' : ''
                  }`}
                />
              </span>
            </button>

            {showNotificationsList && (
              <div
                className={`mx-1.5 my-1 rounded-lg border max-h-44 overflow-y-auto divide-y ${
                  isDark
                    ? 'bg-[#0c0d14] border-white/10 divide-white/10'
                    : 'bg-slate-50 border-slate-200 divide-slate-200'
                }`}
              >
                {notifications.length === 0 ? (
                  <div className="p-3 text-center text-[11px] opacity-60">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        setShowNotificationsList(false);
                        onSelectNotification?.(n);
                      }}
                      className={`w-full text-left p-2.5 text-[11px] transition-colors cursor-pointer ${
                        !n.read
                          ? isDark
                            ? 'bg-white/[0.06] hover:bg-white/[0.1]'
                            : 'bg-amber-50 hover:bg-amber-100/70'
                          : isDark
                          ? 'hover:bg-white/[0.04]'
                          : 'hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between gap-2">
                        <span className="truncate">{n.title}</span>
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />}
                      </div>
                      <div className="opacity-70 mt-0.5 line-clamp-2">
                        {n.message || (n as { body?: string }).body || ''}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Group 3: Community & Library */}
          <div className="p-1.5">
            <div className={mutedLabelClass}>Community</div>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate('/community');
              }}
              className={rowClass}
            >
              <span className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 opacity-70" />
                <span>Public Community</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate('/community/challenges');
              }}
              className={rowClass}
            >
              <span className="flex items-center gap-2.5">
                <Trophy className="w-4 h-4 opacity-70" />
                <span>Challenges</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate('/community/my-posts');
              }}
              className={rowClass}
            >
              <span className="flex items-center gap-2.5">
                <FolderGit2 className="w-4 h-4 opacity-70" />
                <span>My Posts &amp; Creations</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate('/community/saved');
              }}
              className={rowClass}
            >
              <span className="flex items-center gap-2.5">
                <Bookmark className="w-4 h-4 opacity-70" />
                <span>Saved Bookmarks</span>
              </span>
            </button>
          </div>

          {/* Group 4: Moderation & Admin Tools (Visible to Admin & Moderators) */}
          {isModOrAdmin && (
            <div className="p-1.5">
              <div className={mutedLabelClass}>
                {isAdmin ? 'Admin & Moderation' : 'Moderator Tools'}
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onNavigate('/community?tab=review');
                }}
                className={rowClass}
              >
                <span className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 opacity-70" />
                  <span>Post Review Queue</span>
                </span>
              </button>
              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onNavigate('/admin/student-access');
                    }}
                    className={rowClass}
                  >
                    <span className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 opacity-70" />
                      <span>Student Access Portal</span>
                    </span>
                    <span className="text-[10px] opacity-60">→</span>
                  </button>
                  {onOpenChallengesModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onOpenChallengesModal();
                      }}
                      className={rowClass}
                    >
                      <span className="flex items-center gap-2.5">
                        <Trophy className="w-4 h-4 opacity-70" />
                        <span>Manage Challenges</span>
                      </span>
                    </button>
                  )}
                  {onOpenCurationModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onOpenCurationModal();
                      }}
                      className={rowClass}
                    >
                      <span className="flex items-center gap-2.5">
                        <UserCheck className="w-4 h-4 opacity-70" />
                        <span>Curate Showcases</span>
                      </span>
                    </button>
                  )}
                  {onOpenCategoriesModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onOpenCategoriesModal();
                      }}
                      className={rowClass}
                    >
                      <span className="flex items-center gap-2.5">
                        <Sliders className="w-4 h-4 opacity-70" />
                        <span>Categories &amp; Settings</span>
                      </span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Group 5: Private Student Hub & Preferences */}
          <div className="p-1.5">
            {isApprovedForHub || isModOrAdmin ? (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onNavigate('/hub');
                }}
                className={rowClass}
              >
                <span className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 opacity-70" />
                  <span>Private Student Hub</span>
                </span>
                <span className="text-[10px] opacity-60">Open →</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onNavigate('/student-access');
                }}
                className={rowClass}
              >
                <span className="flex items-center gap-2.5">
                  {isPendingAccess ? (
                    <Clock className="w-4 h-4 opacity-70" />
                  ) : (
                    <Lock className="w-4 h-4 opacity-70" />
                  )}
                  <span>
                    {isPendingAccess ? 'Student Access Pending' : 'Request Student Hub Access'}
                  </span>
                </span>
                <span className="text-[10px] opacity-60">→</span>
              </button>
            )}

            <button type="button" onClick={toggleTheme} className={rowClass}>
              <span className="flex items-center gap-2.5">
                {isDark ? (
                  <Sun className="w-4 h-4 opacity-70" />
                ) : (
                  <Moon className="w-4 h-4 opacity-70" />
                )}
                <span>Theme: {isDark ? 'Dark' : 'Light'}</span>
              </span>
              <span className="text-[10px] opacity-60">Switch</span>
            </button>

            <div className={`mt-1 pt-1 ${dividerClass}`}>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onSignOut();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-500 transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-rose-500/10' : 'hover:bg-rose-50'
                }`}
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
