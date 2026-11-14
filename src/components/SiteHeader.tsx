import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { BrandLogo } from './BrandLogo.tsx';
import { useTheme } from '../utils/themeContext.tsx';
import { BuilderProfile, User } from '../firebase.ts';
import { StudentAccessStatus, UserNotificationItem } from '../types/community.ts';
import { UserAccountMenu } from './UserAccountMenu.tsx';

interface SiteHeaderProps {
  currentUser?: User | null;
  builderProfile?: BuilderProfile | null;
  isAuthChecking?: boolean;
  studentAccessStatus?: StudentAccessStatus;
  isApprovedForHub?: boolean;
  notifications?: UserNotificationItem[];
  onOpenInbox?: () => void;
  onSelectNotification?: (notif: UserNotificationItem) => void;
  onSignInClick: () => void;
  onJoinClick?: () => void;
  onLaunchAppMode?: () => void;
  onSignOut?: () => void;
  onNavigate?: (path: string) => void;
}

export const SiteHeader: React.FC<SiteHeaderProps> = ({
  currentUser = null,
  builderProfile = null,
  isAuthChecking = false,
  studentAccessStatus = 'not_requested',
  isApprovedForHub = false,
  notifications = [],
  onOpenInbox,
  onSelectNotification,
  onSignInClick,
  onJoinClick,
  onSignOut = () => {},
  onNavigate = () => {},
}) => {
  const [scrolled, setScrolled] = useState(false);
  const { isDark } = useTheme();
  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${
        isDark
          ? scrolled
            ? 'bg-[#080811]/95 backdrop-blur-md border-b-2 border-black/40 shadow-[0_4px_20px_rgba(0,0,0,0.8)]'
            : 'bg-[#080811]/85 backdrop-blur-md border-b border-white/10'
          : scrolled
            ? 'bg-white/95 backdrop-blur-md border-b-2 border-black/15 shadow-sm'
            : 'bg-white/90 backdrop-blur-md border-b border-black/10'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Brand Logo on the Left — clickable and leads to homepage */}
          <div className="flex items-center">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/');
              }}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFF025] rounded-xl p-1 cursor-pointer"
              aria-label="Build Buds Home"
            >
              <BrandLogo size="md" />
            </a>
          </div>

          {/* Clean Navigation & Account Controls on the Far Right */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {currentUser && onOpenInbox && (
              <button
                type="button"
                onClick={onOpenInbox}
                aria-label="Open Inbox Center"
                title="Open Inbox Center"
                className={`relative p-2 rounded-xl border-2 border-black cursor-pointer transition-colors ${
                  isDark
                    ? 'bg-[#171726] hover:bg-[#232338] text-white'
                    : 'bg-white hover:bg-slate-100 text-black'
                }`}
              >
                <Bell className="w-4 h-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#B11469] text-white text-[10px] font-black border border-black flex items-center justify-center">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>
            )}

            <UserAccountMenu
              currentUser={currentUser}
              builderProfile={builderProfile}
              isAuthChecking={isAuthChecking}
              studentAccessStatus={studentAccessStatus}
              isApprovedForHub={isApprovedForHub}
              notifications={notifications}
              onSelectNotification={onSelectNotification}
              onOpenInbox={onOpenInbox}
              onSignInClick={onSignInClick}
              onJoinClick={onJoinClick}
              onSignOut={onSignOut}
              onNavigate={onNavigate}
            />
          </div>
        </div>
      </div>
    </header>
  );
};
