import React, { useState } from 'react';
import { DiscussionPost } from '../types/index.ts';
import { toggleReaction, addReplyToPost } from '../utils/communityLogic.ts';
import { MessageSquare, Heart, Send, Plus, ArrowRight, Sparkles } from 'lucide-react';
import { useTheme } from '../utils/themeContext.tsx';

interface CommunityPreviewProps {
  initialDiscussions: DiscussionPost[];
  onNewDiscussionClick: () => void;
  onJoinClick: () => void;
}

export const CommunityPreview: React.FC<CommunityPreviewProps> = ({
  initialDiscussions,
  onNewDiscussionClick,
  onJoinClick,
}) => {
  const { isDark } = useTheme();
  const [discussions, setDiscussions] = useState<DiscussionPost[]>(initialDiscussions);
  const [activeDiscussion, setActiveDiscussion] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const handleToggleReaction = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDiscussions((prev) =>
      prev.map((post) => (post.id === postId ? toggleReaction(post, 'hearts') : post))
    );
  };

  const handleSendReply = (postId: string) => {
    if (!replyText.trim()) return;
    setDiscussions((prev) =>
      prev.map((post) =>
        post.id === postId ? addReplyToPost(post, 'You (Student Builder)', 'Build Buds Explorer', replyText) : post
      )
    );
    setReplyText('');
  };

  return (
    <section
      id="community"
      className={`py-20 border-b transition-colors duration-300 ${
        isDark
          ? 'bg-[#080812]/80 backdrop-blur-md border-white/15 text-white'
          : 'bg-white/95 backdrop-blur-md border-black/10 text-slate-900'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Photo of students collaborating around laptop */}
          <div className="lg:col-span-4 flex justify-center">
            <div className="relative w-full max-w-sm">
              {/* Vibrant organic background shapes behind the image */}
              <div
                className="absolute -top-4 -left-4 w-28 h-28 rounded-full blur-xl opacity-40 -z-10"
                style={{ backgroundColor: '#FFF025' }}
              />
              <div
                className="absolute -bottom-4 -right-4 w-32 h-32 rounded-full blur-xl opacity-40 -z-10"
                style={{ backgroundColor: '#B11469' }}
              />

              <div
                className={`relative rounded-3xl overflow-hidden border-2 brand-shadow transition-all ${
                  isDark ? 'border-white/25 bg-[#121222]' : 'border-black bg-white'
                }`}
              >
                <img
                  src="/assets/aistudio/extracted/community-collab.png"
                  alt="Students collaborating on Build Buds projects"
                  className="w-full h-auto object-cover block"
                />
              </div>
            </div>
          </div>

          {/* Center Column: Text, Value Proposition & CTA */}
          <div className="lg:col-span-4 flex flex-col justify-center text-left">
            <div
              className={`inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full border w-fit ${
                isDark ? 'bg-white/10 border-white/15 text-white' : 'bg-amber-100/70 border-black/15 text-slate-800'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#B11469' }} />
              <span className="text-xs font-bold uppercase tracking-wider">
                Peer Learning & Sharing
              </span>
            </div>

            <h2
              className={`font-chewy text-4xl sm:text-5xl leading-tight mb-4 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              Making things is better together.
            </h2>

            <p
              className={`text-sm sm:text-base font-medium leading-relaxed mb-6 ${
                isDark ? 'text-white/85' : 'text-slate-600'
              }`}
            >
              Have a question, a challenge or an idea you can’t stop thinking about? Find other builders who are ready to think, experiment and figure things out with you.
            </p>

            <div>
              <button
                onClick={onJoinClick}
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-black text-white rounded-2xl border-2 border-black brand-shadow transition-transform hover:-translate-y-1 active:translate-y-0.5 cursor-pointer"
                style={{ backgroundColor: '#B11469' }}
              >
                <span>Discover the Community</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Right Column: Community Discussion Card */}
          <div className="lg:col-span-4">
            <div
              className={`rounded-3xl border-2 p-5 brand-shadow ${
                isDark
                  ? 'bg-[#10101d] border-white/20 text-white'
                  : 'bg-white border-black/15 text-slate-900'
              }`}
            >
              <div
                className={`flex items-center justify-between pb-3 mb-3 border-b ${
                  isDark ? 'border-white/15' : 'border-black/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-chewy text-lg">Community Discussion</span>
                </div>
                <button
                  onClick={onNewDiscussionClick}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-black rounded-lg border border-black bg-[#FFF025] text-black brand-shadow-sm cursor-pointer active:scale-95"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                  <span>Ask Question</span>
                </button>
              </div>

              {/* Discussions List */}
              <div className="space-y-3">
                {discussions.slice(0, 4).map((post) => {
                  const isExpanded = activeDiscussion === post.id;
                  return (
                    <div
                      key={post.id}
                      onClick={() => setActiveDiscussion(isExpanded ? null : post.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isExpanded
                          ? isDark
                            ? 'bg-white/10 border-[#FFF025]'
                            : 'bg-amber-50 border-black'
                          : isDark
                            ? 'bg-white/5 border-white/10 hover:border-white/30'
                            : 'bg-gray-50 border-black/10 hover:border-black/30'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center font-black text-xs text-black border border-black"
                          style={{ backgroundColor: post.author.avatarBg || '#FFF025' }}
                        >
                          {post.author.name.charAt(0)}
                        </span>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold leading-snug line-clamp-2">
                            {post.title}
                          </h4>
                          <div className="flex items-center gap-3 mt-1 text-[11px] opacity-70">
                            <span>{post.repliesCount} replies</span>
                            <span>•</span>
                            <button
                              onClick={(e) => handleToggleReaction(post.id, e)}
                              className="inline-flex items-center gap-1 hover:text-[#B11469] cursor-pointer"
                            >
                              <Heart className="w-3 h-3 fill-current text-[#B11469]" />
                              <span>{post.reactions.hearts}</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded quick reply flow */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-black/10 dark:border-white/10">
                          <p className="text-xs opacity-85 mb-2 leading-relaxed">
                            {post.question}
                          </p>

                          {post.replies.length > 0 && (
                            <div className="mb-2 space-y-1.5 pl-2 border-l-2 border-[#B11469]">
                              {post.replies.slice(-2).map((r) => (
                                <div key={r.id} className="text-[11px]">
                                  <span className="font-bold">{r.author}: </span>
                                  <span className="opacity-80">{r.text}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-1.5 mt-2">
                            <input
                              type="text"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Write a friendly reply..."
                              onClick={(e) => e.stopPropagation()}
                              className={`flex-1 px-2.5 py-1 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#B11469] ${
                                isDark ? 'bg-black/40 border-white/20 text-white' : 'bg-white border-black/20 text-slate-900'
                              }`}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendReply(post.id);
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-black text-black bg-[#FFF025] border border-black cursor-pointer active:scale-95"
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
