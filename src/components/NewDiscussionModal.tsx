import React, { useState } from 'react';
import { X, Send, Sparkles } from 'lucide-react';
import { DiscussionPost } from '../types/index.ts';

interface NewDiscussionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (post: DiscussionPost) => void;
}

export const NewDiscussionModal: React.FC<NewDiscussionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [channel, setChannel] = useState<'help' | 'ideas' | 'showcase' | 'collab'>('help');
  const [authorName, setAuthorName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !question.trim()) {
      setError('Please provide both a discussion topic and a question.');
      return;
    }

    const newPost: DiscussionPost = {
      id: `disc-${Date.now()}`,
      author: {
        name: authorName.trim() || 'Curious Creator',
        grade: 'Student Builder',
        school: schoolName.trim() || 'Build Buds Network',
        avatarBg: '#FFF025',
      },
      channel,
      title: title.trim(),
      question: question.trim(),
      timestamp: 'Just now',
      repliesCount: 0,
      reactions: {
        hearts: 1,
        bulbs: 1,
        rockets: 0,
      },
      replies: [],
    };

    onSubmit(newPost);
    setTitle('');
    setQuestion('');
    setError('');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-discussion-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative w-full max-w-lg bg-[#10101f] text-white rounded-3xl border-2 border-white/20 brand-shadow-yellow p-6 sm:p-8 my-8 shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-5 right-5 p-1.5 rounded-lg border-2 border-white/20 bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="mb-6">
          <span
            className="inline-block px-3 py-1 rounded-md border border-black text-xs font-black uppercase mb-2"
            style={{ backgroundColor: '#B11469', color: '#FFFFFF' }}
          >
            Start a Conversation
          </span>
          <h3 id="new-discussion-title" className="font-chewy text-3xl sm:text-4xl text-white">
            Ask a Question or Share an Idea
          </h3>
          <p className="text-xs text-white/75 font-medium mt-1">
            Connect with other student builders across schools who are ready to help.
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl border-2 border-black bg-[#FFF025] text-xs font-bold text-black">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/90 mb-1">
              Select Discussion Channel
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'help', label: '#questions-and-help' },
                { id: 'ideas', label: '#ideas-brainstorm' },
                { id: 'showcase', label: '#show-and-tell' },
                { id: 'collab', label: '#team-up' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChannel(c.id as any)}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border-2 text-left transition-all cursor-pointer ${
                    channel === c.id
                      ? 'bg-[#FFF025] text-black border-black brand-shadow-sm font-black'
                      : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/90 mb-1">
              Discussion Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. How can I make my platformer jumping feel lighter?"
              className="w-full px-3.5 py-2.5 text-sm border-2 border-white/20 rounded-xl bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-[#FFF025]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/90 mb-1">
              Your Question or Idea Details *
            </label>
            <textarea
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Explain what you are trying to build, what you have tried, and where you are stuck..."
              className="w-full px-3.5 py-2.5 text-sm border-2 border-white/20 rounded-xl bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-[#FFF025]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/90 mb-1">
                Your Name / Nickname
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. Maya"
                className="w-full px-3.5 py-2 text-xs border-2 border-white/20 rounded-xl bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-[#FFF025]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/90 mb-1">
                School Name
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="e.g. Westfield Middle"
                className="w-full px-3.5 py-2 text-xs border-2 border-white/20 rounded-xl bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-[#FFF025]"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 text-sm font-black text-black rounded-xl border-2 border-black brand-shadow transition-transform hover:-translate-y-0.5 cursor-pointer"
              style={{ backgroundColor: '#FFF025' }}
            >
              Post to Community Stream
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
