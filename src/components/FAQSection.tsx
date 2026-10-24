import React, { useState } from 'react';
import { HOMEPAGE_FAQS } from '../data/mockData.ts';
import { ChevronDown, HelpCircle, ArrowRight } from 'lucide-react';
import { useTheme } from '../utils/themeContext.tsx';

interface FAQSectionProps {
  onJoinClick: () => void;
}

export const FAQSection: React.FC<FAQSectionProps> = ({ onJoinClick }) => {
  const { isDark } = useTheme();
  const [openIndices, setOpenIndices] = useState<Record<number, boolean>>({ 0: true });

  const toggleIndex = (index: number) => {
    setOpenIndices((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <section
      className={`py-20 border-b-2 transition-colors duration-300 relative z-10 ${
        isDark
          ? 'bg-[#0a0a14]/80 backdrop-blur-md border-white/15 text-white'
          : 'bg-white/95 backdrop-blur-md border-black/10 text-slate-900'
      }`}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div
            className={`inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full border ${
              isDark ? 'border-white/20 bg-white/5' : 'border-black/15 bg-amber-100/70'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full border border-black" style={{ backgroundColor: '#FFF025' }} />
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#FFF025]' : 'text-slate-800'}`}>
              Questions & Answers
            </span>
          </div>

          <h2
            className={`font-chewy text-4xl sm:text-5xl tracking-normal mb-3 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Frequently Asked Questions
          </h2>

          <p className={`text-base font-medium ${isDark ? 'text-white/80' : 'text-slate-600'}`}>
            Everything you need to know about the Build Buds platform and how to get involved.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {HOMEPAGE_FAQS.map((faq, index) => {
            const isOpen = openIndices[index] ?? false;
            return (
              <div
                key={index}
                className={`rounded-2xl border-2 transition-all ${
                  isDark
                    ? 'border-white/20 bg-[#10101f]/90 hover:border-white/40'
                    : 'border-black/15 bg-white hover:border-black brand-shadow-sm'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleIndex(index)}
                  aria-expanded={isOpen}
                  className={`w-full p-5 text-left flex items-center justify-between gap-4 font-chewy text-xl sm:text-2xl transition-colors cursor-pointer focus:outline-none ${
                    isDark
                      ? 'text-white hover:text-[#FFF025]'
                      : 'text-slate-900 hover:text-[#B11469]'
                  }`}
                >
                  <span>{faq.question}</span>
                  <div
                    className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isOpen
                        ? 'rotate-180 bg-[#FFF025] text-black border-black'
                        : isDark
                          ? 'border-white/20 bg-white/10 text-white'
                          : 'border-black/20 bg-black/5 text-black'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4 stroke-[3]" />
                  </div>
                </button>

                {isOpen && (
                  <div
                    className={`px-5 pb-5 pt-1 text-sm sm:text-base leading-relaxed border-t ${
                      isDark
                        ? 'border-white/10 text-white/85'
                        : 'border-black/10 text-slate-600'
                    }`}
                  >
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Help Note */}
        <div className="mt-12 text-center">
          <p className={`text-sm mb-3 ${isDark ? 'text-white/70' : 'text-slate-500'}`}>
            Still have a question that isn't answered here?
          </p>
          <button
            onClick={onJoinClick}
            className="inline-flex items-center gap-2 font-bold text-sm text-[#B11469] hover:underline cursor-pointer"
          >
            <span>Ask the community directly</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

      </div>
    </section>
  );
};
