import React, { useState, useEffect } from 'react';
import { BrandLogo } from './BrandLogo.tsx';
import { Menu, X, ArrowRight, Sparkles } from 'lucide-react';

interface SiteHeaderProps {
  onJoinClick: () => void;
  onSignInClick: () => void;
}

export const SiteHeader: React.FC<SiteHeaderProps> = ({ onJoinClick, onSignInClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('discover');

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
      className={`sticky top-0 z-40 w-full transition-all duration-200 bg-[#080811]/90 backdrop-blur-md ${
        scrolled
          ? 'border-b-2 border-black/40 shadow-[0_4px_20px_rgba(0,0,0,0.8)]'
          : 'border-b border-white/10'
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
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-white" aria-label="Main Navigation">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <a
                  key={link.id}
                  href={link.href}
                  className={`relative py-1.5 px-1 transition-colors duration-150 whitespace-nowrap hover:text-[#FFF025] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFF025] rounded ${
                    isActive ? 'text-[#FFF025] font-bold' : 'text-white/85'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-1 rounded-full"
                      style={{ backgroundColor: '#FFF025' }}
                    />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Action Zone (Sign In + Join CTA) */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={onSignInClick}
              className="px-4 py-2 text-sm font-bold text-white hover:text-[#FFF025] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFF025] rounded-lg cursor-pointer"
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

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden gap-2">
            <button
              onClick={onJoinClick}
              className="px-3 py-1.5 text-xs font-black text-black rounded-lg border-2 border-black brand-shadow-sm cursor-pointer"
              style={{ backgroundColor: '#FFF025' }}
            >
              Join
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 text-white rounded-lg border border-white/20 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFF025]"
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
        <div className="md:hidden bg-[#0c0c16] border-b border-white/15 px-4 pt-3 pb-6 space-y-3">
          <nav className="flex flex-col space-y-2" aria-label="Mobile Navigation">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 text-base font-bold text-white rounded-lg border border-transparent hover:border-white/20 hover:bg-white/10 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="pt-3 border-t border-white/15 flex flex-col gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onSignInClick();
              }}
              className="w-full py-2.5 text-center font-bold text-white border border-white/30 rounded-xl hover:bg-white/10"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onJoinClick();
              }}
              className="w-full py-3 text-center font-black text-black border-2 border-black rounded-xl brand-shadow"
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
