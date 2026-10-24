import React, { useState } from 'react';
import { HOMEPAGE_FAQS } from '../data/mockData.ts';
import { ChevronDown, HelpCircle, ArrowRight } from 'lucide-react';

interface FAQSectionProps {
  onJoinClick: () => void;
}

export const FAQSection: React.FC<FAQSectionProps> = ({ onJoinClick }) => {
  const [openIndices, setOpenIndices] = useState<Record<number, boolean>>({ 0: true });

  const toggleIndex = (index: number) => {
    setOpenIndices((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <section className="py-20 bg-[#0a0a14]/80 backdrop-blur-md border-b-2 border-white/15 relative z-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full border border-white/20 bg-white/5">
            <span className="w-2.5 h-2.5 rounded-full border border-black" style={{ backgroundColor: '#FFF025' }} />
            <span className="text-xs font-bold uppercase tracking-wider text-[#FFF025]">
              Questions & Answers
            </span>
          </div>
          <h2 className="font-chewy text-4xl sm:text-5xl text-white tracking-normal mb-3">
            Frequently Asked Questions
          </h2>
          <p className="text-base text-white/80 font-medium">
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
                className="rounded-2xl border-2 border-white/20 bg-[#10101f]/90 backdrop-blur-sm overflow-hidden transition-all hover:border-white/40"
              >
                <button
                  type="button"
                  onClick={() => toggleIndex(index)}
                  aria-expanded={isOpen}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-chewy text-xl sm:text-2xl text-white hover:text-[#FFF025] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFF025]"
                >
                  <span>{faq.question}</span>
                  <div
                    className={`w-8 h-8 rounded-xl border-2 border-white/20 flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 bg-[#FFF025] text-black border-transparent' : 'bg-white/10 text-white'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4 stroke-[3]" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-sm text-white/85 font-medium leading-relaxed border-t border-white/10">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Still have questions banner */}
        <div className="mt-12 text-center p-6 sm:p-8 rounded-3xl border-2 border-white/20 bg-gradient-to-r from-[#140b1e] via-[#101020] to-[#1c0f18] text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl">
          <div className="text-left">
            <div className="font-chewy text-2xl sm:text-3xl text-[#FFF025]">
              Ready to take your first step?
            </div>
            <div className="text-sm text-white/80">
              Join students who are already sharing what they create in our space community.
            </div>
          </div>
          <button
            onClick={onJoinClick}
            className="px-6 py-3 text-xs sm:text-sm font-black text-black rounded-xl border-2 border-black brand-shadow-yellow hover:-translate-y-0.5 transition-transform cursor-pointer shrink-0"
            style={{ backgroundColor: '#FFF025' }}
          >
            Join Build Buds Today
          </button>
        </div>

      </div>
    </section>
  );
};
