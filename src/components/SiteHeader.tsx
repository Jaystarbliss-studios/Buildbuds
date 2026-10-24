import React, { useState, useEffect } from 'react';
import { BrandLogo } from './BrandLogo.tsx';
import { Menu, X, ArrowRight, Sun, Moon, Sparkles } from 'lucide-react';
import { useTheme } from '../utils/themeContext.tsx';

interface SiteHeaderProps {
  onJoinClick: () => void;
  onSignInClick: () => void;
}

export const SiteHeader: React.FC<SiteHeaderProps> = ({ onJoinClick, onSignInClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('discover');
  const { isDark, toggleTheme, timeOfDayGreeting, isAuto } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      
      const sections = ['discover', 'community', 'challenges', 'how-it-works'];
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 120 && rect.bottom >= 120) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Discover', href: '#discover', id: 'discover' },
    { label: 'Community', href: '#community', id: 'community' },
    { label: 'Challenges', href: '#challenges', id: 'challenges' },
    { label: 'How It Works', href: '#how-it-works', id: 'how-it-works' },
  ];

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
          
          {/* Brand Wordmark Zone */}
          <div className="flex items-center">
            <a href="#" className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFF025] rounded-xl p-1">
              <BrandLogo size="md" />
            </a>
          </div>

          {/* Desktop Navigation Links */}
          <nav
            className={`hidden md:flex items-center gap-7 text-sm font-semibold transition-colors ${
              isDark ? 'text-white' : 'text-slate-800'
            }`}
            aria-label="Main Navigation"
          >
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <a
                  key={link.id}
                  href={link.href}
                  className={`relative py-1.5 px-1 transition-colors duration-150 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFF025] rounded ${
                    isActive
                      ? isDark
                        ? 'text-[#FFF025] font-bold'
                        : 'text-[#B11469] font-bold'
                      : isDark
                        ? 'text-white/85 hover:text-[#FFF025]'
                        : 'text-slate-700 hover:text-[#B11469]'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-1 rounded-full"
                      style={{ backgroundColor: isDark ? '#FFF025' : '#B11469' }}
                    />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Action Zone: Day/Night Theme Toggle + Sign In + Join CTA */}
          <div className="hidden md:flex items-center gap-3">
            
            {/* Day / Cosmic Night Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl border-2 transition-all cursor-pointer active:scale-95 ${
                isDark
                  ? 'bg-white/10 hover:bg-white/15 border-white/20 text-white'
                  : 'bg-amber-100/70 hover:bg-amber-100 border-black/15 text-slate-900 brand-shadow-sm'
              }`}
              title={`Switch to ${isDark ? 'Day/Light mode' : 'Cosmic Space mode'} (currently ${isDark ? 'Night' : 'Day'})`}
              aria-label="Toggle theme mode"
            >
              {isDark ? (
                <>
                  <Moon className="w-4 h-4 text-[#FFF025]" />
                  <span>Cosmic Night</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-[#C15D00]" />
                  <span>Day Mode</span>
                </>
              )}
            </button>

            <button
              onClick={onSignInClick}
              className={`px-4 py-2 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFF025] rounded-lg cursor-pointer ${
                isDark ? 'text-white hover:text-[#FFF025]' : 'text-slate-800 hover:text-[#B11469]'
              }`}
            >
              Sign In
            </button>

            <button
              onClick={onJoinClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-black text-black rounded-xl border-2 border-black brand-shadow transition-transform active:translate-x-0.5 active:translate-y-0.5 hover:-translate-y-0.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFF025]"
              style={{ backgroundColor: '#FFF025' }}
            >
              <span>Join Build Buds</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Mobile Actions */}
          <div className="flex items-center md:hidden gap-2">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg border transition-all ${
                isDark ? 'border-white/20 text-white' : 'border-black/20 text-slate-800'
              }`}
              aria-label="Toggle theme mode"
            >
              {isDark ? <Moon className="w-4 h-4 text-[#FFF025]" /> : <Sun className="w-4 h-4 text-[#C15D00]" />}
            </button>

            <button
              onClick={onJoinClick}
              className="px-3 py-1.5 text-xs font-black text-black rounded-lg border-2 border-black brand-shadow-sm cursor-pointer"
              style={{ backgroundColor: '#FFF025' }}
            >
              Join
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-2 rounded-lg border focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFF025] ${
                isDark ? 'text-white border-white/20 hover:bg-white/10' : 'text-slate-800 border-black/20 hover:bg-black/5'
              }`}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          className={`md:hidden border-b px-4 pt-3 pb-6 space-y-3 ${
            isDark ? 'bg-[#0c0c16] border-white/15' : 'bg-white border-black/10'
          }`}
        >
          <nav className="flex flex-col space-y-2" aria-label="Mobile Navigation">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2 px-3 rounded-xl font-bold text-sm transition-colors ${
                  activeSection === link.id
                    ? isDark
                      ? 'bg-white/10 text-[#FFF025]'
                      : 'bg-amber-100 text-[#B11469]'
                    : isDark
                      ? 'text-white/80 hover:bg-white/5'
                      : 'text-slate-700 hover:bg-black/5'
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onSignInClick();
              }}
              className={`w-full py-2.5 text-sm font-bold text-center rounded-xl border ${
                isDark ? 'border-white/20 text-white' : 'border-black/20 text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onJoinClick();
              }}
              className="w-full py-2.5 text-sm font-black text-black rounded-xl border-2 border-black brand-shadow text-center"
              style={{ backgroundColor: '#FFF025' }}
            >
              Join Build Buds
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
