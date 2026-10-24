import React, { useState } from 'react';
import { DiscussionPost } from '../types/index.ts';
import { toggleReaction, addReplyToPost } from '../utils/communityLogic.ts';
import { MessageSquare, Heart, Lightbulb, Rocket, Send, Plus, Users, Sparkles } from 'lucide-react';

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
  const [discussions, setDiscussions] = useState<DiscussionPost[]>(initialDiscussions);
  const [activeChannel, setActiveChannel] = useState<'all' | 'help' | 'showcase' | 'ideas' | 'collab'>('all');
  const [replyInput, setReplyInput] = useState<Record<string, string>>({});
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  const handleToggleReaction = (postId: string, type: 'hearts' | 'bulbs' | 'rockets') => {
    setDiscussions((prev) =>
      prev.map((post) => (post.id === postId ? toggleReaction(post, type) : post))
    );
  };

  const handleSendReply = (postId: string) => {
    const text = replyInput[postId];
    if (!text || !text.trim()) return;

    setDiscussions((prev) =>
      prev.map((post) =>
        post.id === postId ? addReplyToPost(post, 'You (Student Builder)', 'Build Buds Explorer', text) : post
      )
    );

    setReplyInput((prev) => ({ ...prev, [postId]: '' }));
    setExpandedReplies((prev) => ({ ...prev, [postId]: true }));
  };

  const filteredDiscussions =
    activeChannel === 'all'
      ? discussions
      : discussions.filter((d) => d.channel === activeChannel);

  const channels: Array<{ id: 'all' | 'help' | 'showcase' | 'ideas' | 'collab'; label: string }> = [
    { id: 'all', label: 'All Discussions' },
    { id: 'help', label: '#questions-and-help' },
    { id: 'ideas', label: '#ideas-brainstorm' },
    { id: 'showcase', label: '#show-and-tell' },
    { id: 'collab', label: '#team-up' },
  ];

  return (
    <section id="community" className="py-20 bg-white border-b-2 border-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full border border-black" style={{ backgroundColor: '#C15D00' }} />
            <span className="text-xs font-bold uppercase tracking-wider text-black">
              Peer Learning & Community
            </span>
          </div>
          <h2 className="font-chewy text-4xl sm:text-5xl lg:text-6xl text-black tracking-normal mb-4">
            Making things is better together.
          </h2>
          <p className="text-base sm:text-lg text-black font-medium leading-relaxed">
            Have a question, a challenge or an idea you can’t stop thinking about? Find other builders who are ready to think, experiment and figure things out with you.
          </p>
        </div>

        {/* Community Channel Tabs & Action */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 pb-4 border-b-2 border-black/10">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto" role="tablist">
            {channels.map((chan) => {
              const isActive = activeChannel === chan.id;
              return (
                <button
                  key={chan.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveChannel(chan.id)}
                  className={`px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-xl border-2 border-black transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#B11469] text-white brand-shadow-sm -translate-y-0.5'
                      : 'bg-white text-black hover:bg-black/5'
                  }`}
                >
                  {chan.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={onNewDiscussionClick}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-black text-black rounded-xl border-2 border-black brand-shadow transition-transform hover:-translate-y-0.5 active:translate-y-0.5 cursor-pointer shrink-0"
            style={{ backgroundColor: '#FFF025' }}
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Ask or Share Idea</span>
          </button>
        </div>

        {/* Discussions List */}
        <div className="space-y-6 max-w-4xl mx-auto">
          {filteredDiscussions.map((post) => {
            const isExpanded = expandedReplies[post.id] ?? false;

            return (
              <div
                key={post.id}
                className="bg-white rounded-2xl border-2 border-black brand-shadow p-6 transition-all"
              >
                {/* Author Info & Channel Tag */}
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center font-bold text-xs"
                      style={{ backgroundColor: post.author.avatarBg }}
                    >
                      {post.author.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-black flex items-center gap-2">
                        <span>{post.author.name}</span>
                        <span className="text-xs font-normal text-black/60">• {post.author.grade}</span>
                      </div>
                      <div className="text-xs text-black/60">
                        {post.author.school}
                      </div>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold text-black/70 px-2.5 py-1 rounded-md bg-black/5 border border-black/10">
                    {post.timestamp}
                  </span>
                </div>

                {/* Title & Question */}
                <h3 className="font-chewy text-2xl text-black mb-2 hover:text-[#B11469] transition-colors">
                  {post.title}
                </h3>
                <p className="text-sm text-black leading-relaxed mb-5">
                  {post.question}
                </p>

                {/* Reaction Controls & Reply Button */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t-2 border-black/10">
                  <div className="flex items-center gap-2">
                    {/* Heart Reaction */}
                    <button
                      onClick={() => handleToggleReaction(post.id, 'hearts')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border-2 border-black text-xs font-bold transition-all cursor-pointer ${
                        post.userReacted?.hearts ? 'bg-[#FFF025] brand-shadow-sm' : 'bg-white hover:bg-black/5'
                      }`}
                      aria-label="React with Heart"
                    >
                      <Heart className={`w-3.5 h-3.5 ${post.userReacted?.hearts ? 'fill-black' : ''}`} />
                      <span>{post.reactions.hearts}</span>
                    </button>

                    {/* Bulb Reaction */}
                    <button
                      onClick={() => handleToggleReaction(post.id, 'bulbs')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border-2 border-black text-xs font-bold transition-all cursor-pointer ${
                        post.userReacted?.bulbs ? 'bg-[#FFF025] brand-shadow-sm' : 'bg-white hover:bg-black/5'
                      }`}
                      aria-label="React with Idea Bulb"
                    >
                      <Lightbulb className={`w-3.5 h-3.5 ${post.userReacted?.bulbs ? 'fill-black' : ''}`} />
                      <span>{post.reactions.bulbs}</span>
                    </button>

                    {/* Rocket Reaction */}
                    <button
                      onClick={() => handleToggleReaction(post.id, 'rockets')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border-2 border-black text-xs font-bold transition-all cursor-pointer ${
                        post.userReacted?.rockets ? 'bg-[#FFF025] brand-shadow-sm' : 'bg-white hover:bg-black/5'
                      }`}
                      aria-label="React with Rocket"
                    >
                      <Rocket className={`w-3.5 h-3.5 ${post.userReacted?.rockets ? 'fill-black' : ''}`} />
                      <span>{post.reactions.rockets}</span>
                    </button>
                  </div>

                  <button
                    onClick={() =>
                      setExpandedReplies((prev) => ({ ...prev, [post.id]: !isExpanded }))
                    }
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-black hover:text-[#B11469] cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{post.repliesCount} {post.repliesCount === 1 ? 'Reply' : 'Replies'}</span>
                  </button>
                </div>

                {/* Expanded Replies Thread */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-black/15 space-y-3">
                    {post.replies.map((reply) => (
                      <div
                        key={reply.id}
                        className="p-3.5 rounded-xl border border-black/20 bg-black/5 text-xs"
                      >
                        <div className="flex items-center justify-between font-bold text-black mb-1">
                          <span>{reply.author} <span className="font-normal text-black/60">({reply.school})</span></span>
                          <span className="text-black/50 text-[10px]">{reply.timestamp}</span>
                        </div>
                        <p className="text-black leading-relaxed">{reply.text}</p>
                      </div>
                    ))}

                    {/* Leave a reply input */}
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="text"
                        value={replyInput[post.id] || ''}
                        onChange={(e) =>
                          setReplyInput((prev) => ({ ...prev, [post.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSendReply(post.id);
                        }}
                        placeholder="Write a helpful tip or encouraging word..."
                        className="flex-1 px-3 py-2 text-xs font-medium border-2 border-black rounded-xl bg-white text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-[#B11469]"
                      />
                      <button
                        onClick={() => handleSendReply(post.id)}
                        className="p-2 rounded-xl border-2 border-black bg-[#FFF025] hover:scale-105 transition-transform cursor-pointer"
                        aria-label="Send reply"
                      >
                        <Send className="w-4 h-4 text-black" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Discover Community CTA Banner */}
        <div className="mt-12 text-center">
          <button
            onClick={onJoinClick}
            className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-black text-white rounded-xl border-2 border-black brand-shadow transition-transform hover:-translate-y-0.5 active:translate-y-0.5 cursor-pointer"
            style={{ backgroundColor: '#B11469' }}
          >
            <Users className="w-4 h-4" />
            <span>Discover the Community & Join Threads</span>
          </button>
        </div>

      </div>
    </section>
  );
};
