import React, { useState } from 'react';
import { ProjectItem } from '../types/index.ts';
import { X, Play, Code, BookOpen, Layers, Check, Copy, ExternalLink, Sparkles } from 'lucide-react';

interface ProjectDetailModalProps {
  project: ProjectItem | null;
  onClose: () => void;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({ project, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'learned' | 'code'>('overview');
  const [copiedCode, setCopiedCode] = useState(false);
  const [simPlaying, setSimPlaying] = useState(false);

  if (!project) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(project.sourceCodeSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-project-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl bg-white rounded-3xl border-2 border-black brand-shadow-lg overflow-hidden my-8">
        
        {/* Header Bar */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b-2 border-black"
          style={{ backgroundColor: project.previewAccent }}
        >
          <div className="flex items-center gap-3">
            <span
              className="px-2.5 py-0.5 text-xs font-black uppercase rounded border border-black bg-white text-black"
            >
              {project.category}
            </span>
            <span className="text-xs font-bold text-black/80">
              Created by {project.creator.name} • {project.creator.school}
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close project modal"
            className="p-1.5 rounded-lg border-2 border-black bg-white text-black hover:bg-black/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Project Title & Tagline */}
        <div className="px-6 pt-6 pb-4">
          <h2 id="modal-project-title" className="font-chewy text-3xl sm:text-4xl text-black">
            {project.title}
          </h2>
          <p className="text-sm font-semibold text-black/70 mt-1">
            {project.tagline}
          </p>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mt-5 border-b-2 border-black/10 pb-1" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border-2 border-black transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[#FFF025] brand-shadow-sm -translate-y-0.5'
                  : 'bg-white hover:bg-black/5'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Interactive Preview</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'learned'}
              onClick={() => setActiveTab('learned')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border-2 border-black transition-all cursor-pointer ${
                activeTab === 'learned'
                  ? 'bg-[#FFF025] brand-shadow-sm -translate-y-0.5'
                  : 'bg-white hover:bg-black/5'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>What I Learned</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'code'}
              onClick={() => setActiveTab('code')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border-2 border-black transition-all cursor-pointer ${
                activeTab === 'code'
                  ? 'bg-[#FFF025] brand-shadow-sm -translate-y-0.5'
                  : 'bg-white hover:bg-black/5'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Source Snippet</span>
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="p-6 pt-2 max-h-[60vh] overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Interactive Demo Simulation Area */}
              <div className="relative rounded-2xl border-2 border-black bg-black p-6 text-center text-white overflow-hidden min-h-[220px] flex flex-col justify-center items-center">
                <div
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{
                    backgroundImage: `radial-gradient(${project.previewAccent} 2px, transparent 2px)`,
                    backgroundSize: '20px 20px',
                  }}
                />
                
                {simPlaying ? (
                  <div className="relative z-10 w-full space-y-4">
                    <div className="inline-block px-3 py-1 rounded-full border border-[#FFF025] bg-[#FFF025]/20 text-[#FFF025] text-xs font-mono font-bold">
                      ● Live Simulation Running: {project.title}
                    </div>
                    <div className="p-4 rounded-xl border border-white/20 bg-white/5 text-xs text-left font-mono text-white/90 max-w-md mx-auto">
                      <div>// Environment: Standard Browser Sandbox</div>
                      <div>// Physics Engine: Active (60 delta-FPS)</div>
                      <div>// State: Connected to Build Buds local worker</div>
                      <div className="text-[#FFF025] mt-2">✓ User interaction verified. Ready for student feedback!</div>
                    </div>
                    <button
                      onClick={() => setSimPlaying(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold border border-white/30 text-white bg-white/10 hover:bg-white/20"
                    >
                      Reset Demo View
                    </button>
                  </div>
                ) : (
                  <div className="relative z-10 space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-2xl border-2 border-white flex items-center justify-center bg-[#B11469]">
                      <Play className="w-6 h-6 fill-white ml-0.5" />
                    </div>
                    <div className="text-sm font-bold text-white">
                      Click to Test {project.title} Demo
                    </div>
                    <p className="text-xs text-white/70 max-w-md">
                      Simulate the live build directly in this secure client preview without leaving the homepage.
                    </p>
                    <button
                      onClick={() => setSimPlaying(true)}
                      className="px-6 py-2.5 text-xs font-black text-black rounded-xl border-2 border-white cursor-pointer hover:scale-105 transition-transform"
                      style={{ backgroundColor: '#FFF025' }}
                    >
                      Launch Interactive Preview
                    </button>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-black mb-1">
                  About this Build
                </h4>
                <p className="text-sm text-black leading-relaxed">
                  {project.description}
                </p>
              </div>

              {/* Tools Used */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-black mb-2">
                  Tools & Technologies
                </h4>
                <div className="flex flex-wrap gap-2">
                  {project.tools.map((tool, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-lg border-2 border-black text-xs font-bold text-black"
                      style={{ backgroundColor: '#FFFFFF' }}
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'learned' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-black">
                Creator Reflection & Takeaways:
              </h4>
              <p className="text-xs text-black/75">
                Every Build Buds project emphasizes what the student discovered along the way, not just the finished code.
              </p>
              <div className="space-y-3 mt-3">
                {project.whatLearned.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border-2 border-black bg-white brand-shadow-sm flex items-start gap-3"
                  >
                    <span
                      className="w-6 h-6 rounded-full border-2 border-black flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                      style={{ backgroundColor: '#FFF025' }}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-xs font-medium text-black leading-relaxed">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-black">
                  Published Code Snippet
                </span>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border-2 border-black bg-white hover:bg-black/5 cursor-pointer"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-black" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 rounded-xl border-2 border-black bg-black text-[#FFF025] font-mono text-xs overflow-x-auto leading-relaxed">
                <code>{project.sourceCodeSnippet}</code>
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-black/5 border-t-2 border-black flex items-center justify-between">
          <div className="text-xs text-black font-semibold">
            {project.creator.school}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-black bg-white rounded-xl border-2 border-black hover:bg-black/10 cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
