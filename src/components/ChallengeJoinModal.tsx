import React, { useState } from 'react';
import { X, Check, Flame, Trophy, Sparkles } from 'lucide-react';
import { ChallengeItem } from '../types/index.ts';

interface ChallengeJoinModalProps {
  challenge: ChallengeItem | null;
  onClose: () => void;
}

export const ChallengeJoinModal: React.FC<ChallengeJoinModalProps> = ({ challenge, onClose }) => {
  const [joined, setJoined] = useState(false);

  if (!challenge) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="challenge-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl border-2 border-black brand-shadow-lg p-6 sm:p-8 my-8">
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-5 right-5 p-1.5 rounded-lg border-2 border-black bg-white hover:bg-black/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="mb-5">
          <span
            className="inline-block px-3 py-1 rounded-md border border-black text-xs font-black uppercase mb-2"
            style={{
              backgroundColor: challenge.accentColor,
              color: challenge.accentColor === '#FFF025' ? '#000000' : '#FFFFFF',
            }}
          >
            {challenge.badgeText}
          </span>
          <h3 id="challenge-modal-title" className="font-chewy text-3xl sm:text-4xl text-black">
            {challenge.title}
          </h3>
          <p className="text-xs font-semibold text-black/70 mt-1">
            {challenge.theme}
          </p>
        </div>

        <div className="p-4 rounded-2xl border-2 border-black bg-black/5 text-xs text-black/85 leading-relaxed mb-5">
          {challenge.description}
        </div>

        <div className="space-y-3 mb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-black">
            Prompt Guidelines & Success Criteria:
          </div>
          {challenge.prompts.map((p, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-xs text-black/90">
              <span
                className="w-5 h-5 rounded-md border border-black flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5"
                style={{ backgroundColor: challenge.accentColor }}
              >
                {idx + 1}
              </span>
              <span>{p}</span>
            </div>
          ))}
        </div>

        {joined ? (
          <div className="p-4 rounded-xl border-2 border-black bg-[#FFF025] text-center space-y-2">
            <div className="font-chewy text-xl text-black">
              ✓ Challenge Accepted!
            </div>
            <p className="text-xs text-black font-semibold">
              You are now tracking this prompt. Build your prototype, then use the "Share a Project" button to submit your link or demo!
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-4 py-2 text-xs font-bold rounded-lg border-2 border-black bg-white"
            >
              Back to Homepage
            </button>
          </div>
        ) : (
          <div className="space-y-3 pt-2 border-t-2 border-black/10">
            <button
              onClick={() => setJoined(true)}
              className="w-full py-3.5 text-sm font-black text-black rounded-xl border-2 border-black brand-shadow transition-transform hover:-translate-y-0.5 cursor-pointer"
              style={{ backgroundColor: '#FFF025' }}
            >
              Accept Mission & Start Building
            </button>
            <p className="text-[11px] text-center text-black/60 font-medium">
              Friendly creative prompt for student builders • No strict deadlines or grading
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
