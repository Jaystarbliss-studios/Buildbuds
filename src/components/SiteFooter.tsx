import React from 'react';
import { BrandLogo } from './BrandLogo.tsx';
import { Heart, School, Sparkles } from 'lucide-react';

interface SiteFooterProps {
  onJoinClick: () => void;
  onOpenGuidelines: () => void;
}

export const SiteFooter: React.FC<SiteFooterProps> = ({ onJoinClick, onOpenGuidelines }) => {
  return (
    <footer className="bg-white text-black border-t-2 border-black pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b-2 border-black/15">
          
          {/* Brand & Mission Column (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <BrandLogo size="lg" />
            <p className="text-sm text-black/80 font-medium leading-relaxed max-w-sm">
              Build Buds is a connected community for young builders across schools to share games, websites, tools and creative experiments while learning together.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="w-3 h-3 rounded-full border border-black" style={{ backgroundColor: '#FFF025' }} />
              <span className="w-3 h-3 rounded-full border border-black" style={{ backgroundColor: '#B11469' }} />
              <span className="w-3 h-3 rounded-full border border-black" style={{ backgroundColor: '#C15D00' }} />
              <span className="text-xs font-bold text-black/60 ml-1">
                Official Brand Colors
              </span>
            </div>
          </div>

          {/* Column 1: Explore */}
          <div className="space-y-3">
            <div className="font-chewy text-xl text-black">
              Explore
            </div>
            <ul className="space-y-2 text-xs font-semibold text-black/80">
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

          {/* Column 2: Community & Activities */}
          <div className="space-y-3">
            <div className="font-chewy text-xl text-black">
              Community
            </div>
            <ul className="space-y-2 text-xs font-semibold text-black/80">
              <li>
                <a href="#community" className="hover:text-[#B11469] transition-colors">
                  Discussions & Q&A
                </a>
              </li>
              <li>
                <a href="#challenges" className="hover:text-[#B11469] transition-colors">
                  Challenges & Missions
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-[#B11469] transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <button
                  onClick={onJoinClick}
                  className="text-left hover:text-[#B11469] transition-colors cursor-pointer"
                >
                  Join Build Buds
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Safety & Trust */}
          <div className="space-y-3">
            <div className="font-chewy text-xl text-black">
              Trust & Guidelines
            </div>
            <ul className="space-y-2 text-xs font-semibold text-black/80">
              <li>
                <button
                  onClick={onOpenGuidelines}
                  className="text-left hover:text-[#B11469] transition-colors cursor-pointer"
                >
                  Community Guidelines
                </button>
              </li>
              <li>
                <span className="text-black/60">Student Privacy Policy</span>
              </li>
              <li>
                <span className="text-black/60">Peer Review Norms</span>
              </li>
              <li>
                <span className="text-black/60">School Partners</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Origin Statement & Copyright Row */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium text-black/80">
          
          {/* Explicit Creator Acknowledgement required by brief & user prompt */}
          <div className="flex items-center gap-2 text-center md:text-left">
            <span className="w-2.5 h-2.5 rounded-full border border-black bg-[#FFF025]" />
            <span className="font-bold text-black">
              Build Buds is created by the Smart Techies Group from JW Studios
            </span>
            <span className="hidden sm:inline text-black/50">•</span>
            <span className="hidden sm:inline text-black/70">
              Under the supervision of Jaystarbliss Studios
            </span>
          </div>

          <div className="text-black/60 text-center md:text-right">
            Designed for young builders and curious minds across schools.
          </div>
        </div>

      </div>
    </footer>
  );
};
