import React, { useState } from 'react';
import { X, Sparkles, Check, Upload } from 'lucide-react';
import { ProjectItem } from '../types/index.ts';

interface ShareProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProject: (project: ProjectItem) => void;
}

export const ShareProjectModal: React.FC<ShareProjectModalProps> = ({
  isOpen,
  onClose,
  onAddProject,
}) => {
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'games' | 'websites' | 'experiments' | 'tools'>('games');
  const [toolsStr, setToolsStr] = useState('HTML5 Canvas, JavaScript');
  const [learningNotes, setLearningNotes] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('// My project entry point\nfunction init() {\n  console.log("Ready!");\n}');
  const [creatorName, setCreatorName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [accentColor, setAccentColor] = useState('#FFF025');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Please provide a project title and description.');
      return;
    }

    const newProject: ProjectItem = {
      id: `proj-${Date.now()}`,
      title: title.trim(),
      tagline: tagline.trim() || 'A creative student build',
      description: description.trim(),
      category,
      creator: {
        name: creatorName.trim() || 'Young Builder',
        grade: 'Student Creator',
        school: schoolName.trim() || 'Build Buds Network',
        avatarBg: accentColor,
      },
      tools: toolsStr
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      whatLearned: learningNotes.trim()
        ? [learningNotes.trim()]
        : ['How to break a large programming challenge down into small steps.'],
      sourceCodeSnippet: codeSnippet.trim() || '// Custom project logic',
      demoType: category === 'games' ? 'playable-game' : 'interactive-web',
      previewAccent: accentColor,
    };

    onAddProject(newProject);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-project-modal-title"
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

        <div className="mb-6">
          <span
            className="inline-block px-3 py-1 rounded-md border border-black text-xs font-black uppercase mb-2 text-black"
            style={{ backgroundColor: '#FFF025' }}
          >
            Showcase Your Build
          </span>
          <h3 id="share-project-modal-title" className="font-chewy text-3xl sm:text-4xl text-white">
            Publish a Project
          </h3>
          <p className="text-xs text-white/75 font-medium mt-1">
            Share what you built, what tools you used, and what you learned with other young creators.
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl border-2 border-black bg-[#FFF025] text-xs font-bold text-black">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/90 mb-1">
                Project Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Gravity Jump"
                className="w-full px-3.5 py-2 text-sm border-2 border-white/20 rounded-xl bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-[#FFF025]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/90 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3.5 py-2 text-sm border-2 border-white/20 rounded-xl bg-[#1c1c30] text-white focus:outline-none focus:border-[#FFF025]"
              >
                <option value="games">Games</option>
                <option value="websites">Websites</option>
                <option value="experiments">Digital Experiments</option>
                <option value="tools">Creative Tools</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/90 mb-1">
              Short Tagline
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. 2D platformer with space physics"
              className="w-full px-3.5 py-2 text-sm border-2 border-white/20 rounded-xl bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-[#FFF025]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/90 mb-1">
              Description *
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell others what your creation does, how it works, and who it is for..."
              className="w-full px-3.5 py-2 text-sm border-2 border-white/20 rounded-xl bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-[#FFF025]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/90 mb-1">
              Tools Used (comma separated)
            </label>
            <input
              type="text"
              value={toolsStr}
              onChange={(e) => setToolsStr(e.target.value)}
              placeholder="e.g. React, Canvas, Web Audio"
              className="w-full px-3.5 py-2 text-xs border-2 border-white/20 rounded-xl bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-[#FFF025]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/90 mb-1">
              What Did You Learn While Making It?
            </label>
            <input
              type="text"
              value={learningNotes}
              onChange={(e) => setLearningNotes(e.target.value)}
              placeholder="e.g. How to use vector math for collision detection"
              className="w-full px-3.5 py-2 text-xs border-2 border-white/20 rounded-xl bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-[#FFF025]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/90 mb-1">
                Your Name / Nickname
              </label>
              <input
                type="text"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="e.g. Maya"
                className="w-full px-3 py-2 text-xs border-2 border-white/20 rounded-xl bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-[#FFF025]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/90 mb-1">
                Your School
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="e.g. Riverdale STEM"
                className="w-full px-3 py-2 text-xs border-2 border-white/20 rounded-xl bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-[#FFF025]"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 text-sm font-black text-black rounded-xl border-2 border-black brand-shadow transition-transform hover:-translate-y-0.5 cursor-pointer"
              style={{ backgroundColor: '#FFF025' }}
            >
              Add Project to Showcase
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
