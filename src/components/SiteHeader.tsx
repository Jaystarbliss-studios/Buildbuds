import React, { useState, useEffect } from 'react';
import { BrandLogo } from './BrandLogo.tsx';
import { useTheme } from '../utils/themeContext.tsx';
import { BuilderProfile, User } from '../firebase.ts';
import { StudentAccessStatus } from '../types/community.ts';
import { UserAccountMenu } from './UserAccountMenu.tsx';

interface SiteHeaderProps {
  currentUser?: User | null;
  builderProfile?: BuilderProfile | null;
  isAuthChecking?: boolean;
  studentAccessStatus?: StudentAccessStatus;
  isApprovedForHub?: boolean;
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
  onSignInClick,
  onJoinClick,
  onSignOut = () => {},
  onNavigate = () => {},
}) => {
  const [scrolled, setScrolled] = useState(false);
  const { isDark } = useTheme();

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

          {/* Clean User Account / Profile Control on the Far Right */}
          <div className="flex items-center gap-3">
            <UserAccountMenu
              currentUser={currentUser}
              builderProfile={builderProfile}
              isAuthChecking={isAuthChecking}
              studentAccessStatus={studentAccessStatus}
              isApprovedForHub={isApprovedForHub}
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
