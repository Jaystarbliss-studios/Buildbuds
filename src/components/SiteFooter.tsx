import React from 'react';
import { BrandLogo } from './BrandLogo.tsx';
import { Heart } from 'lucide-react';
import { useTheme } from '../utils/themeContext.tsx';

interface SiteFooterProps {
  onJoinClick: () => void;
  onOpenGuidelines: () => void;
}

export const SiteFooter: React.FC<SiteFooterProps> = ({ onJoinClick, onOpenGuidelines }) => {
  const { isDark } = useTheme();

  return (
    <footer
      className={`border-t-2 pt-16 pb-12 relative z-10 backdrop-blur-md transition-colors duration-300 ${
        isDark
          ? 'bg-[#070712]/95 text-white border-white/15'
          : 'bg-white text-slate-900 border-black/10'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b-2 ${
            isDark ? 'border-white/15' : 'border-black/10'
          }`}
        >
          {/* Brand & Mission Column (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <BrandLogo size="lg" />
            <p
              className={`text-sm font-medium leading-relaxed max-w-sm ${
                isDark ? 'text-white/80' : 'text-slate-600'
              }`}
            >
              Build Buds is a connected community for young builders across schools to share games, websites, tools and creative experiments while learning together.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="w-3 h-3 rounded-full border border-black" style={{ backgroundColor: '#FFF025' }} />
              <span className="w-3 h-3 rounded-full border border-black" style={{ backgroundColor: '#B11469' }} />
              <span className="w-3 h-3 rounded-full border border-black" style={{ backgroundColor: '#C15D00' }} />
              <span className={`text-xs font-bold ml-1 ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
                Official Brand Colors
              </span>
            </div>
          </div>

          {/* Column 1: Discover */}
          <div className="space-y-3">
            <div className="font-chewy text-xl">Discover</div>
            <ul className={`space-y-2 text-xs font-semibold ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
              <li>
                <a href="#discover" className="hover:text-[#B11469] transition-colors">
                  Project Showcase
                </a>
              </li>
              <li>
                <a href="#discover" className="hover:text-[#B11469] transition-colors">
                  Games & Interactive
                </a>
              </li>
              <li>
                <a href="#discover" className="hover:text-[#B11469] transition-colors">
                  Websites & Portfolios
                </a>
              </li>
              <li>
                <a href="#discover" className="hover:text-[#B11469] transition-colors">
                  Digital Experiments
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Community */}
          <div className="space-y-3">
            <div className="font-chewy text-xl">Community</div>
            <ul className={`space-y-2 text-xs font-semibold ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
              <li>
                <a href="#community" className="hover:text-[#B11469] transition-colors">
                  Discussions & Q&A
                </a>
              </li>
              <li>
                <a href="#challenges" className="hover:text-[#B11469] transition-colors">
                  Maker Challenges
                </a>
              </li>
              <li>
                <button
                  onClick={onOpenGuidelines}
                  className="hover:text-[#B11469] transition-colors text-left cursor-pointer"
                >
                  Community Guidelines
                </button>
              </li>
              <li>
                <button onClick={onJoinClick} className="hover:text-[#B11469] transition-colors text-left cursor-pointer">
                  Join Member Hub
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Platform */}
          <div className="space-y-3">
            <div className="font-chewy text-xl">Platform</div>
            <ul className={`space-y-2 text-xs font-semibold ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
              <li>
                <a href="#how-it-works" className="hover:text-[#B11469] transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <button onClick={onOpenGuidelines} className="hover:text-[#B11469] transition-colors text-left cursor-pointer">
                  Safety & Privacy
                </button>
              </li>
              <li>
                <span className="opacity-75">Jaystarbliss Studios</span>
              </li>
              <li>
                <span className="opacity-75">Smart Techies Group</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Credits matching mockup */}
        <div
          className={`pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium ${
            isDark ? 'text-white/60' : 'text-slate-500'
          }`}
        >
          <div>
            © {new Date().getFullYear()} Build Buds. Created by the Smart Techies Group from JW Studios / Jaystarbliss Studios.
          </div>

          <div className="flex items-center gap-6 text-xs">
            <a href="#discover" className="hover:underline">
              Discover
            </a>
            <a href="#community" className="hover:underline">
              Community
            </a>
            <a href="#challenges" className="hover:underline">
              Challenges
            </a>
            <button onClick={onOpenGuidelines} className="hover:underline cursor-pointer">
              Guidelines
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
