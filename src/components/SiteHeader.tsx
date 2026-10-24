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
      className={`sticky top-0 z-40 w-full bg-white transition-all duration-200 ${
        scrolled
          ? 'border-b-2 border-black shadow-[0_4px_0_0_#000000]'
          : 'border-b border-black/15'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Brand Wordmark Zone */}
          <div className="flex items-center">
            <a href="#" className="focus:outline-none focus-visible:ring-2 focus-visible:ring-black rounded-lg p-1">
              <BrandLogo size="md" />
            </a>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-black" aria-label="Main Navigation">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <a
                  key={link.id}
                  href={link.href}
                  className={`relative py-1.5 px-1 transition-colors duration-150 whitespace-nowrap hover:text-[#B11469] focus:outline-none focus-visible:ring-2 focus-visible:ring-black rounded ${
                    isActive ? 'text-[#B11469] font-bold' : 'text-black'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-1 rounded-full"
                      style={{ backgroundColor: '#FFF025', border: '1px solid #000000' }}
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
              className="px-4 py-2 text-sm font-bold text-black hover:text-[#B11469] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black rounded-lg cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={onJoinClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-black text-black rounded-xl border-2 border-black brand-shadow transition-transform active:translate-x-0.5 active:translate-y-0.5 hover:-translate-y-0.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
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
              className="p-2.5 text-black rounded-lg border-2 border-black hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
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
        <div className="md:hidden bg-white border-b-2 border-black px-4 pt-3 pb-6 space-y-3">
          <nav className="flex flex-col space-y-2" aria-label="Mobile Navigation">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 text-base font-bold text-black rounded-lg border-2 border-transparent hover:border-black hover:bg-[#FFF025]/30 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="pt-3 border-t border-black/15 flex flex-col gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onSignInClick();
              }}
              className="w-full py-2.5 text-center font-bold text-black border-2 border-black rounded-xl hover:bg-black/5"
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
