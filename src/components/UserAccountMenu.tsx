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
  const isVerifiedCoreMember = Boolean(isApprovedForHub || isAdmin);
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

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="Open account menu"
        className={`relative flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full border-2 border-black transition-all cursor-pointer brand-shadow-sm ${
          isDark
            ? 'bg-[#1a1a2e] hover:bg-[#24243e] text-white'
            : 'bg-white hover:bg-slate-50 text-black'
        }`}
      >
        <VerifiedAvatarFrame
          src={avatarSrc}
          alt={displayName}
          isVerified={isVerifiedCoreMember}
          sizeClass="w-7 h-7"
          ringPaddingClass="p-[2px]"
        />
        <span className="text-xs font-extrabold max-w-[110px] truncate hidden sm:inline">
          {displayName}
        </span>
        {unreadNotifCount > 0 && (
          <span
            title={`${unreadNotifCount} unread notification${unreadNotifCount === 1 ? '' : 's'}`}
            className="w-2.5 h-2.5 rounded-full bg-[#B11469] border border-black shrink-0"
          />
        )}
        <ChevronDown className="w-3.5 h-3.5 opacity-70 shrink-0" />
      </button>

      {isOpen && (
        <div
          className={`fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-80 max-w-[calc(100vw-1.5rem)] max-h-[82dvh] overflow-y-auto rounded-2xl border-3 border-black brand-shadow z-50 ${
            isDark ? 'bg-[#131322] text-white' : 'bg-white text-black'
          }`}
        >
          {/* Header: Identity + Verified Student Ring of Light */}
          <div
            className={`p-3.5 sm:p-4 border-b-2 border-black ${
              isDark ? 'bg-[#1b1b30]' : 'bg-[#FFFDF5]'
            }`}
          >
            <div className="flex items-center gap-3">
              <VerifiedAvatarFrame
                src={avatarSrc}
                alt={displayName}
                isVerified={isVerifiedCoreMember}
                sizeClass="w-11 h-11"
                ringPaddingClass="p-[2.5px]"
              />
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-sm truncate flex items-center gap-1.5">
                  <span className="truncate">{displayName}</span>
                </div>
                {email && (
                  <div
                    className={`text-[11px] font-medium truncate ${
                      isDark ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    {email}
                  </div>
                )}
                {builderProfile?.schoolName && (
                  <div
                    className={`text-[10px] font-bold truncate mt-0.5 ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    🏫 {builderProfile.schoolName}
                  </div>
                )}
              </div>
            </div>

            {/* Role Pill Badges (Verified Student text badge removed; indicated by the Yellow-Orange-Pink avatar ring) */}
            {(isAdmin || !isApprovedForHub) && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#FFF025] text-black border border-black">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Administrator</span>
                  </span>
                )}
                {!isAdmin && !isApprovedForHub && isPendingAccess && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-300 text-black border border-black">
                    <Clock className="w-3 h-3" />
                    <span>Student Access Pending</span>
                  </span>
                )}
                {!isAdmin && !isApprovedForHub && !isPendingAccess && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                      isDark
                        ? 'bg-white/10 text-slate-200 border-white/20'
                        : 'bg-slate-200 text-slate-800 border-black'
                    }`}
                  >
                    <UserCheck className="w-3 h-3" />
                    <span>Public Community Member</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div className="p-2 space-y-1 text-xs font-bold">
            {/* Appearance / Dark Mode Toggle inside User Dropdown */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'hover:bg-white/10 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
              }`}
            >
              <span className="flex items-center gap-2.5">
                {isDark ? (
                  <Sun className="w-4 h-4 text-[#FFF025]" />
                ) : (
                  <Moon className="w-4 h-4 text-[#B11469]" />
                )}
                <span>Appearance: {isDark ? 'Dark Mode' : 'Light Mode'}</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-black border border-black ${
                  isDark ? 'bg-[#FFF025] text-black' : 'bg-slate-200 text-black'
                }`}
              >
                Switch
              </span>
            </button>

            {/* Notifications Section inside User Dropdown */}
            <button
              type="button"
              onClick={() => setShowNotificationsList((prev) => !prev)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'hover:bg-white/10 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-[#C15D00]" />
                <span>Notifications</span>
              </span>
              <span className="flex items-center gap-1.5">
                {unreadNotifCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-[#B11469] text-white text-[10px] font-black border border-black">
                    {unreadNotifCount} new
                  </span>
                ) : (
                  <span className="text-[10px] opacity-60">{notifications.length}</span>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    showNotificationsList ? 'rotate-180' : ''
                  }`}
                />
              </span>
            </button>

            {showNotificationsList && (
              <div
                className={`mx-1 my-1 rounded-xl border-2 border-black max-h-48 overflow-y-auto divide-y divide-black/10 ${
                  isDark ? 'bg-[#0d0d18]' : 'bg-slate-50'
                }`}
              >
                {notifications.length === 0 ? (
                  <div className="p-3 text-center text-[11px] opacity-70">
                    No notifications yet. When builders react or comment on your creations, they
                    will appear here.
                  </div>
                ) : (
                  notifications.slice(0, 12).map((n) => (
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
                            ? 'bg-[#FFF025]/10 hover:bg-[#FFF025]/20'
                            : 'bg-[#FFF025]/25 hover:bg-[#FFF025]/40'
                          : isDark
                          ? 'hover:bg-white/5'
                          : 'hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-extrabold">{n.title}</div>
                      <div className="opacity-80 mt-0.5 line-clamp-2">
                        {n.message || (n as { body?: string }).body || ''}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate('/community');
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'hover:bg-white/10 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#C15D00]" />
              <span>Public Community Discovery</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate('/community/challenges');
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'hover:bg-white/10 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
              }`}
            >
              <Trophy className="w-4 h-4 text-[#C15D00]" />
              <span>Community Challenges</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate('/community/my-posts');
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'hover:bg-white/10 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
              }`}
            >
              <FolderGit2 className="w-4 h-4 text-[#B11469]" />
              <span>My Posts & Creations</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate('/community/saved');
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'hover:bg-white/10 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
              }`}
            >
              <Bookmark className="w-4 h-4 text-[#B11469]" />
              <span>Saved Bookmarks</span>
            </button>

            {/* Admin-Only Management Tools */}
            {isAdmin && (
              <div
                className={`pt-1.5 mt-1.5 border-t ${
                  isDark ? 'border-white/10' : 'border-slate-200'
                } space-y-1`}
              >
                <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#C15D00]">
                  Admin Controls
                </div>
                {onOpenChallengesModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenChallengesModal();
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                      isDark
                        ? 'hover:bg-white/10 text-[#FFF025]'
                        : 'hover:bg-amber-50 text-slate-900'
                    }`}
                  >
                    <Trophy className="w-4 h-4 text-[#C15D00]" />
                    <span>Create / Manage Challenges</span>
                  </button>
                )}
                {onOpenCurationModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenCurationModal();
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                      isDark
                        ? 'hover:bg-white/10 text-[#FFF025]'
                        : 'hover:bg-amber-50 text-slate-900'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#B11469]" />
                    <span>Curate Showcase Submissions</span>
                  </button>
                )}
                {onOpenCategoriesModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenCategoriesModal();
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                      isDark
                        ? 'hover:bg-white/10 text-[#FFF025]'
                        : 'hover:bg-amber-50 text-slate-900'
                    }`}
                  >
                    <Sliders className="w-4 h-4 text-[#C15D00]" />
                    <span>Manage Categories & Settings</span>
                  </button>
                )}
              </div>
            )}

            {/* Private Student Hub / Enter Private Chats Action (Neutral styling, green highlight removed) */}
            <div
              className={`pt-1.5 mt-1.5 border-t ${
                isDark ? 'border-white/10' : 'border-slate-200'
              }`}
            >
              {isApprovedForHub || isAdmin ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onNavigate('/hub');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-white/10 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#C15D00]" />
                    <span>Enter Private Chats</span>
                  </span>
                  <span className="text-[10px] font-black uppercase opacity-75">Open →</span>
                </button>
              ) : studentAccessStatus === 'pending' ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onNavigate('/student-access');
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-amber-200 hover:bg-amber-300 text-black border-2 border-black font-black transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Student Access Pending</span>
                  </span>
                  <span className="text-[10px] uppercase">Status →</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onNavigate('/student-access');
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#FFF025] hover:bg-[#ffe500] text-black border-2 border-black font-black transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    <span>Request Student Hub Access</span>
                  </span>
                  <span className="text-[10px] uppercase">Apply →</span>
                </button>
              )}
            </div>

            {/* Sign Out */}
            <div
              className={`pt-1.5 mt-1.5 border-t ${
                isDark ? 'border-white/10' : 'border-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onSignOut();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 font-extrabold transition-colors cursor-pointer"
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
