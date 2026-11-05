import React, { useState, useEffect, useRef } from 'react';
import {
  User as UserIcon,
  LogOut,
  Sun,
  Moon,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  Bookmark,
  FileText,
  Settings,
  ChevronDown,
  Trophy,
  Compass,
  Bell,
} from 'lucide-react';
import { useTheme } from '../utils/themeContext.tsx';
import { BuilderProfile, isSuperAdminUser, User } from '../firebase.ts';
import { StudentAccessStatus, UserNotificationItem } from '../types/community.ts';
import { resolveBuilderAvatarUrl } from '../utils/avatars.ts';

interface UserAccountMenuProps {
  currentUser: User | null;
  builderProfile: BuilderProfile | null;
  isAuthChecking?: boolean;
  studentAccessStatus?: StudentAccessStatus;
  isApprovedForHub?: boolean;
  notifications?: UserNotificationItem[];
  onSelectNotification?: (notif: UserNotificationItem) => void;
  onSignInClick: () => void;
  onJoinClick?: () => void;
  onSignOut: () => void;
  onNavigate: (path: string) => void;
  onOpenCurationModal?: () => void;
  onOpenCategoriesModal?: () => void;
  onOpenChallengesModal?: () => void;
}

export const UserAccountMenu: React.FC<UserAccountMenuProps> = ({
  currentUser,
  builderProfile,
  isAuthChecking = false,
  studentAccessStatus = 'not_requested',
  isApprovedForHub = false,
  notifications = [],
  onSelectNotification,
  onSignInClick,
  onJoinClick,
  onSignOut,
  onNavigate,
  onOpenCurationModal,
  onOpenCategoriesModal,
  onOpenChallengesModal,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isNotifExpanded, setIsNotifExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { isDark, toggleTheme } = useTheme();

  const isAdmin = isSuperAdminUser(currentUser, builderProfile);
  const canPublish = Boolean(isAdmin || isApprovedForHub);
  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  const effectiveDisplayName =
    builderProfile?.displayName ||
    currentUser?.displayName ||
    (currentUser?.email ? currentUser.email.split('@')[0] : 'Creator');
  const effectiveAvatarColor = builderProfile?.avatarColor || '#FFF025';
  const effectiveAvatarUrl = currentUser
    ? resolveBuilderAvatarUrl(
        builderProfile?.avatarUrl || currentUser.photoURL || undefined,
        currentUser.uid
      )
    : '';

  // Close when clicking outside, or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen]);

  const handleAction = (callback: () => void) => {
    setIsOpen(false);
    callback();
  };

  if (isAuthChecking && !currentUser) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 text-xs font-bold ${
          isDark
            ? 'border-white/20 bg-white/5 text-white/70'
            : 'border-black/20 bg-slate-50 text-slate-600'
        }`}
      >
        <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
        <span className="hidden sm:inline">Loading...</span>
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Account Control Button */}
      {currentUser ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label="User account menu"
          className={`relative flex items-center gap-2 px-2.5 py-1.5 rounded-xl border-2 transition-transform active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FFF025] ${
            isDark
              ? 'border-white/25 bg-white/10 hover:bg-white/15 text-white'
              : 'border-black bg-white hover:bg-slate-50 text-black brand-shadow-sm'
          }`}
        >
          <div className="relative shrink-0">
            <img
              src={effectiveAvatarUrl}
              alt={effectiveDisplayName}
              className="w-7 h-7 rounded-full border border-black object-cover"
              style={{ backgroundColor: effectiveAvatarColor }}
            />
            {unreadNotifCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#B11469] text-white border border-black text-[9px] font-black flex items-center justify-center">
                {unreadNotifCount}
              </span>
            )}
          </div>
          <span className="text-xs font-black max-w-[120px] truncate hidden sm:inline">
            {effectiveDisplayName}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 opacity-60 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSignInClick}
            className="px-3.5 py-1.5 rounded-xl border-2 border-black bg-[#FFF025] hover:bg-[#ffe500] text-black text-xs font-black brand-shadow-sm cursor-pointer transition-transform active:scale-95"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-haspopup="menu"
            aria-label="Account & appearance menu"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border-2 text-xs font-black transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FFF025] ${
              isDark
                ? 'border-white/25 bg-white/10 hover:bg-white/15 text-white'
                : 'border-black bg-white hover:bg-slate-50 text-black brand-shadow-sm'
            }`}
          >
            <div className="w-6 h-6 rounded-full border border-current flex items-center justify-center bg-black/10 shrink-0">
              <UserIcon className="w-3.5 h-3.5" />
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 opacity-60 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      )}

      {/* Account Dropdown Panel */}
      {isOpen && (
        <div
          role="menu"
          className={`absolute right-0 mt-2 w-80 rounded-2xl border-3 z-50 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-100 ${
            isDark
              ? 'border-white/25 bg-[#10121e] text-white'
              : 'border-black bg-white text-black brand-shadow'
          }`}
        >
          {currentUser ? (
            /* Authenticated User Header */
            <div
              className={`p-4 border-b-2 ${
                isDark ? 'bg-white/5 border-white/15' : 'bg-slate-50 border-black/15'
              }`}
            >
              <div className="flex items-center gap-3">
                <img
                  src={effectiveAvatarUrl}
                  alt={effectiveDisplayName}
                  className="w-10 h-10 rounded-full border-2 border-black object-cover"
                  style={{ backgroundColor: effectiveAvatarColor }}
                />
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-sm font-black truncate ${
                      isDark ? 'text-white' : 'text-black'
                    }`}
                  >
                    {effectiveDisplayName}
                  </div>
                  <div
                    className={`text-[11px] truncate font-mono ${
                      isDark ? 'text-white/65' : 'text-slate-600'
                    }`}
                  >
                    {currentUser.email}
                  </div>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="mt-2.5">
                {isApprovedForHub ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border border-black bg-emerald-300 text-[10px] font-black text-black uppercase">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Approved Student Member</span>
                  </span>
                ) : studentAccessStatus === 'pending' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border border-black bg-[#FFF025] text-[10px] font-black text-black uppercase">
                    <Clock className="w-3 h-3" />
                    <span>Access Request Pending</span>
                  </span>
                ) : studentAccessStatus === 'more_information_required' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border border-black bg-amber-300 text-[10px] font-black text-black uppercase">
                    <span>More Info Required</span>
                  </span>
                ) : studentAccessStatus === 'suspended' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border border-black bg-rose-600 text-white text-[10px] font-black uppercase">
                    <span>Chat Access Suspended</span>
                  </span>
                ) : (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold ${
                      isDark
                        ? 'border-white/20 bg-white/10 text-white/85'
                        : 'border-black/30 bg-slate-200 text-slate-800'
                    }`}
                  >
                    <span>Build Buds Community Member</span>
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* Logged-Out Visitor Header */
            <div
              className={`p-4 border-b-2 ${
                isDark ? 'bg-white/5 border-white/15' : 'bg-[#FFFDF5] border-black/15'
              }`}
            >
              <div
                className={`text-xs font-black uppercase tracking-wider ${
                  isDark ? 'text-[#FFF025]' : 'text-black'
                }`}
              >
                Build Buds Community
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                Sign in with Google to react, comment, and save your favourite creations.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleAction(onSignInClick)}
                  className="flex-1 py-2 px-3 rounded-xl border-2 border-black bg-[#FFF025] hover:bg-[#ffe500] text-black text-xs font-black brand-shadow-sm cursor-pointer"
                >
                  Sign In
                </button>
                {onJoinClick && (
                  <button
                    type="button"
                    onClick={() => handleAction(onJoinClick)}
                    className="flex-1 py-2 px-3 rounded-xl border-2 border-black bg-[#B11469] hover:bg-[#951058] text-white text-xs font-black brand-shadow-sm cursor-pointer"
                  >
                    Join
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Menu Items */}
          <div
            className={`p-2 space-y-1 text-xs font-bold ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            {/* Notifications Section inside Profile Dropdown (For Signed-In Users) */}
            {currentUser && (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setIsNotifExpanded(!isNotifExpanded)}
                  className={`w-full px-3 py-2 rounded-xl text-left flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                    isDark ? 'hover:bg-white/10' : 'hover:bg-[#FFF025]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Bell
                      className={`w-4 h-4 ${
                        unreadNotifCount > 0
                          ? 'text-[#B11469]'
                          : isDark
                          ? 'text-white/70'
                          : 'text-slate-700'
                      }`}
                    />
                    <span>Notifications</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    {unreadNotifCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-[#B11469] text-white border border-black text-[10px] font-black">
                        {unreadNotifCount} new
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        {notifications.length}
                      </span>
                    )}
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${
                        isNotifExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </span>
                </button>

                {isNotifExpanded && (
                  <div
                    className={`mx-1 rounded-xl border-2 border-black overflow-hidden max-h-56 overflow-y-auto divide-y ${
                      isDark
                        ? 'bg-[#171929] divide-white/10 text-white'
                        : 'bg-slate-50 divide-black/10 text-black'
                    }`}
                  >
                    {notifications.length === 0 ? (
                      <div
                        className={`p-4 text-center text-[11px] font-medium ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            setIsOpen(false);
                            onSelectNotification?.(n);
                          }}
                          className={`p-2.5 text-left cursor-pointer transition-colors ${
                            isDark
                              ? !n.read
                                ? 'bg-white/10 hover:bg-white/15'
                                : 'hover:bg-white/5'
                              : !n.read
                              ? 'bg-amber-50/80 hover:bg-white'
                              : 'hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="text-[11px] font-black">{n.title}</span>
                            {!n.read && (
                              <span className="w-2 h-2 rounded-full bg-[#B11469] shrink-0" />
                            )}
                          </div>
                          <p
                            className={`text-[11px] leading-snug ${
                              isDark ? 'text-slate-300' : 'text-slate-600'
                            }`}
                          >
                            {n.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(() => onNavigate('/community'))}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2.5 cursor-pointer transition-colors ${
                isDark ? 'hover:bg-white/10' : 'hover:bg-[#FFF025]'
              }`}
            >
              <Compass
                className={`w-4 h-4 ${isDark ? 'text-[#FFF025]' : 'text-[#B11469]'}`}
              />
              <span>Community Discovery</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(() => onNavigate('/community/challenges'))}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2.5 cursor-pointer transition-colors ${
                isDark ? 'hover:bg-white/10' : 'hover:bg-[#FFF025]'
              }`}
            >
              <Trophy
                className={`w-4 h-4 ${isDark ? 'text-[#FFF025]' : 'text-[#C15D00]'}`}
              />
              <span>Explore Challenges</span>
            </button>

            {currentUser && (
              <>
                {canPublish && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleAction(() => onNavigate('/community?tab=my-posts'))}
                    className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2.5 cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-white/10' : 'hover:bg-[#FFF025]'
                    }`}
                  >
                    <FileText
                      className={`w-4 h-4 ${isDark ? 'text-white/70' : 'text-slate-700'}`}
                    />
                    <span>My Public Posts</span>
                  </button>
                )}

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleAction(() => onNavigate('/community?tab=saved'))}
                  className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2.5 cursor-pointer transition-colors ${
                    isDark ? 'hover:bg-white/10' : 'hover:bg-[#FFF025]'
                  }`}
                >
                  <Bookmark
                    className={`w-4 h-4 ${isDark ? 'text-white/70' : 'text-slate-700'}`}
                  />
                  <span>
                    Saved Creations ({builderProfile?.bookmarkedPostIds?.length || 0})
                  </span>
                </button>

                {/* Private Chat Access (Strictly according to membership) */}
                <div
                  className={`pt-1 border-t my-1 ${
                    isDark ? 'border-white/15' : 'border-black/10'
                  }`}
                />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    handleAction(() => {
                      if (isApprovedForHub) {
                        onNavigate('/hub');
                      } else if (studentAccessStatus === 'not_requested') {
                        onNavigate('/student-access');
                      } else {
                        onNavigate('/student-access/status');
                      }
                    })
                  }
                  className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between gap-2 cursor-pointer border-2 ${
                    isApprovedForHub
                      ? 'bg-emerald-300 hover:bg-emerald-400 text-black border-black font-black'
                      : isDark
                        ? 'bg-white/5 hover:bg-white/10 text-white border-white/20'
                        : 'bg-[#FFFDF5] hover:bg-[#FFF025] text-black border-black/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#B11469]" />
                    <span>
                      {isApprovedForHub
                        ? 'Enter Private Chats'
                        : studentAccessStatus === 'not_requested'
                          ? 'Request Private Chat Access'
                          : studentAccessStatus === 'pending'
                            ? 'Access Request Pending'
                            : studentAccessStatus === 'suspended'
                              ? 'Chat Access Suspended'
                              : 'Check Verification Status'}
                    </span>
                  </div>
                  {isApprovedForHub && (
                    <span className="text-[10px] font-mono uppercase bg-black text-white px-1.5 py-0.2 rounded">
                      Open
                    </span>
                  )}
                </button>
              </>
            )}

            {/* Administrator Only Tools */}
            {isAdmin && (
              <>
                <div
                  className={`pt-1 border-t my-1 ${
                    isDark ? 'border-white/15' : 'border-black/10'
                  }`}
                >
                  <div
                    className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                      isDark ? 'text-white/50' : 'text-slate-500'
                    }`}
                  >
                    Administrator Controls
                  </div>
                </div>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleAction(() => onNavigate('/admin/student-access'))}
                  className="w-full px-3 py-2 rounded-xl text-left bg-black text-[#FFF025] hover:bg-slate-900 border border-[#FFF025]/40 flex items-center gap-2 cursor-pointer font-black"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify Student Membership</span>
                </button>

                {onOpenChallengesModal ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleAction(onOpenChallengesModal)}
                    className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 cursor-pointer ${
                      isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'
                    }`}
                  >
                    <Trophy
                      className={`w-4 h-4 ${isDark ? 'text-[#FFF025]' : 'text-[#C15D00]'}`}
                    />
                    <span>Manage Community Challenges</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleAction(() => onNavigate('/community/challenges'))}
                    className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 cursor-pointer ${
                      isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'
                    }`}
                  >
                    <Trophy
                      className={`w-4 h-4 ${isDark ? 'text-[#FFF025]' : 'text-[#C15D00]'}`}
                    />
                    <span>Manage Community Challenges</span>
                  </button>
                )}

                {onOpenCurationModal && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleAction(onOpenCurationModal)}
                    className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 cursor-pointer ${
                      isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'
                    }`}
                  >
                    <Layers
                      className={`w-4 h-4 ${isDark ? 'text-white/75' : 'text-slate-700'}`}
                    />
                    <span>Manage Public Posts & Curation</span>
                  </button>
                )}

                {onOpenCategoriesModal && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleAction(onOpenCategoriesModal)}
                    className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 cursor-pointer ${
                      isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'
                    }`}
                  >
                    <Settings
                      className={`w-4 h-4 ${isDark ? 'text-white/75' : 'text-slate-700'}`}
                    />
                    <span>Manage Categories & Review Mode</span>
                  </button>
                )}
              </>
            )}

            {/* Appearance Settings (Day Mode / Cosmic Night) inside Profile Dropdown */}
            <div
              className={`pt-1 border-t my-1 ${
                isDark ? 'border-white/15' : 'border-black/10'
              }`}
            />
            <div
              className={`px-3 py-2 flex items-center justify-between rounded-xl border ${
                isDark
                  ? 'bg-white/5 border-white/15 text-white'
                  : 'bg-slate-50 border-black/10 text-slate-700'
              }`}
            >
              <span className="text-xs font-bold">Appearance</span>
              <button
                type="button"
                onClick={toggleTheme}
                title={`Switch to ${isDark ? 'Day Mode' : 'Cosmic Night'}`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border-2 text-xs font-black cursor-pointer transition-colors ${
                  isDark
                    ? 'border-white/30 bg-[#08090f] text-[#FFF025] hover:bg-white/15'
                    : 'border-black bg-white text-black hover:bg-[#FFF025]'
                }`}
              >
                {isDark ? (
                  <>
                    <Moon className="w-3.5 h-3.5 text-[#FFF025]" />
                    <span>Cosmic Night</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-[#C15D00]" />
                    <span>Day Mode</span>
                  </>
                )}
              </button>
            </div>

            {/* Sign Out (Only for authenticated user) */}
            {currentUser && (
              <button
                type="button"
                role="menuitem"
                onClick={() => handleAction(onSignOut)}
                className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 cursor-pointer font-bold ${
                  isDark
                    ? 'text-rose-400 hover:bg-rose-950/50'
                    : 'text-rose-600 hover:bg-rose-50'
                }`}
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
