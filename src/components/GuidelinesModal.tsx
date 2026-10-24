import React from 'react';
import { X, ShieldCheck, HeartHandshake, CheckCircle } from 'lucide-react';

interface GuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuidelinesModal: React.FC<GuidelinesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guidelines-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative w-full max-w-xl bg-[#10101f] text-white rounded-3xl border-2 border-white/20 brand-shadow-yellow p-6 sm:p-8 my-8 shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-5 right-5 p-1.5 rounded-lg border-2 border-white/20 bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="mb-5">
          <span
            className="inline-block px-3 py-1 rounded-md border border-black text-xs font-black uppercase mb-2"
            style={{ backgroundColor: '#B11469', color: '#FFFFFF' }}
          >
            Trust & Community
          </span>
          <h3 id="guidelines-title" className="font-chewy text-3xl sm:text-4xl text-white">
            Build Buds Community Guidelines
          </h3>
          <p className="text-xs text-white/75 font-medium mt-1">
            Our shared code of conduct for creating a positive, welcoming environment across schools.
          </p>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 text-xs text-white/90 leading-relaxed">
          <div className="p-4 rounded-xl border-2 border-white/20 bg-[#FFF025]/10">
            <h4 className="font-bold text-[#FFF025] mb-1">1. Kind & Constructive Peer Review</h4>
            <p className="text-white/85">
              When trying out another builder's project or replying to a question, begin with what works well. Offer constructive tips rather than harsh criticism.
            </p>
          </div>

          <div className="p-4 rounded-xl border-2 border-white/20 bg-[#B11469]/15">
            <h4 className="font-bold text-white mb-1">2. Originality & Respect for Attribution</h4>
            <p className="text-white/85">
              We celebrate experimentation and learning from tutorials, but always credit libraries, sample assets, or peer collaborators whose code helped you.
            </p>
          </div>

          <div className="p-4 rounded-xl border-2 border-white/20 bg-[#C15D00]/15">
            <h4 className="font-bold text-[#FFF025] mb-1">3. Student Privacy & Digital Safety</h4>
            <p className="text-white/85">
              Never share phone numbers, home addresses, passwords, or personal account credentials in project descriptions or discussion threads.
            </p>
          </div>

          <div className="p-4 rounded-xl border-2 border-white/20 bg-white/5">
            <h4 className="font-bold text-white mb-1">4. Inclusive Atmosphere for All Skill Levels</h4>
            <p className="text-white/85">
              Whether someone is writing their first HTML heading or a complex physics engine, every question deserves a respectful and helpful answer.
            </p>
          </div>
        </div>

        <div className="pt-5 mt-4 border-t-2 border-white/15">
          <button
            onClick={onClose}
            className="w-full py-3 text-sm font-black text-black rounded-xl border-2 border-black bg-[#FFF025] brand-shadow cursor-pointer"
          >
            I Understand and Agree
          </button>
        </div>
      </div>
    </div>
  );
};
