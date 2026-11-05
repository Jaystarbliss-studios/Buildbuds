import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Globe,
  Gamepad2,
  Code2,
  MessageSquare,
  Bookmark,
  Share2,
  Flag,
  Trash2,
  Pencil,
  Reply,
  Check,
  ShieldAlert,
  Star,
  EyeOff,
  CheckCircle2,
  Send,
} from 'lucide-react';
import {
  db,
  doc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  BuilderProfile,
  User,
  isSuperAdminUser,
} from '../firebase.ts';
import {
  PublicPost,
  PublicComment,
  PublicReactionType,
  PUBLIC_REACTION_OPTIONS,
} from '../types/community.ts';
import {
  getCloudinaryResponsiveUrl,
  togglePublicPostReaction,
  addPublicPostComment,
  updatePublicPostComment,
  deleteOrRemovePublicComment,
} from '../utils/communityService.ts';
import { resolveBuilderAvatarUrl } from '../utils/avatars.ts';
import {
  VerifiedAvatarFrame,
  AnimatedEmoteButton,
  MentionAutocompletePopover,
  renderTextWithMentions,
  useMentionableUsers,
} from './MentionAndEmotes.tsx';
import { useTheme } from '../utils/themeContext.tsx';

interface PublicPostDetailModalProps {
  post: PublicPost | null;
  currentUser: User | null;
  builderProfile: BuilderProfile | null;
  userReactions: PublicReactionType[];
  isBookmarked: boolean;
  onClose: () => void;
  onRequireAuth: (actionDescription: string) => void;
  onToggleBookmark: (postId: string) => void;
  onEditPost?: (post: PublicPost) => void;
  onPostUpdated?: (updated: PublicPost) => void;
  onPostDeleted?: (postId: string) => void;
}

export const PublicPostDetailModal: React.FC<PublicPostDetailModalProps> = ({
  post,
  currentUser,
  builderProfile,
  userReactions,
  isBookmarked,
  onClose,
  onRequireAuth,
  onToggleBookmark,
  onEditPost,
  onPostUpdated,
  onPostDeleted,
}) => {
  const { isDark } = useTheme();
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const isAdmin = isSuperAdminUser(currentUser, builderProfile);
  const isOwner = Boolean(currentUser && post && currentUser.uid === post.authorId);
  const directoryUsers = useMentionableUsers();
  const verifiedUserIds = React.useMemo(() => {
    const s = new Set<string>();
    directoryUsers.forEach((u) => {
      if (u.isVerifiedStudent || u.role === 'admin' || u.role === 'moderator') {
        s.add(u.uid);
      }
    });
    return s;
  }, [directoryUsers]);

  useEffect(() => {
    setActiveImageIndex(0);
    setReplyingToId(null);
    setEditingCommentId(null);
    setFeedbackBanner(null);

    if (!post) {
      setComments([]);
      return;
    }

    const q = query(
      collection(db, 'publicPosts', post.id, 'comments'),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: PublicComment[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as PublicComment;
          if (data.status !== 'removed') {
            list.push({ ...data, id: docSnap.id });
          }
        });
        setComments(list);
      },
      () => {
        // Ignore snapshot errors on seed posts not yet written
      }
    );

    return () => unsub();
  }, [post?.id]);

  if (!post) return null;

  const topLevelComments = comments.filter((c) => !c.parentCommentId);
  const getReplies = (parentId: string) =>
    comments.filter((c) => c.parentCommentId === parentId);

  const handleReact = async (type: PublicReactionType) => {
    if (!currentUser || !builderProfile) {
      onRequireAuth('react to this post');
      return;
    }
    try {
      await togglePublicPostReaction(post.id, type);
    } catch (err) {
      setFeedbackBanner(err instanceof Error ? err.message : 'Could not update reaction.');
    }
  };

  const handleAddTopLevelComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !builderProfile) {
      onRequireAuth('leave a comment on this post');
      return;
    }
    if (!newCommentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      await addPublicPostComment({
        postId: post.id,
        parentCommentId: null,
        text: newCommentText,
        authorProfile: builderProfile,
      });
      setNewCommentText('');
    } catch (err) {
      setFeedbackBanner(err instanceof Error ? err.message : 'Could not post comment.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleAddReply = async (parentCommentId: string) => {
    if (!currentUser || !builderProfile) {
      onRequireAuth('reply to this comment');
      return;
    }
    if (!replyText.trim()) return;

    setIsSubmittingComment(true);
    try {
      await addPublicPostComment({
        postId: post.id,
        parentCommentId,
        text: replyText,
        authorProfile: builderProfile,
      });
      setReplyText('');
      setReplyingToId(null);
    } catch (err) {
      setFeedbackBanner(err instanceof Error ? err.message : 'Could not post reply.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleSaveEditedComment = async (commentId: string) => {
    if (!editingCommentText.trim()) return;
    try {
      await updatePublicPostComment(post.id, commentId, editingCommentText);
      setEditingCommentId(null);
      setEditingCommentText('');
    } catch (err) {
      setFeedbackBanner(err instanceof Error ? err.message : 'Could not edit comment.');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteOrRemovePublicComment(post.id, commentId);
    } catch (err) {
      setFeedbackBanner(err instanceof Error ? err.message : 'Could not delete comment.');
    }
  };

  const handleReportContent = async (targetType: 'post' | 'comment', targetId: string) => {
    if (!currentUser) {
      onRequireAuth('report content to moderators');
      return;
    }
    try {
      await addDoc(collection(db, 'reports'), {
        messageId: `${targetType}:${targetId}`,
        channelId: `publicPosts/${post.id}`,
        reporterId: currentUser.uid,
        reason: `Reported public ${targetType} in "${post.title}"`,
        status: 'open',
        createdAt: new Date().toISOString(),
      });
      setFeedbackBanner('Thank you! Your report has been sent to our moderation team.');
    } catch {
      setFeedbackBanner('Could not submit report right now.');
    }
  };

  const handleCopyShareLink = () => {
    const shareUrl = `${window.location.origin}/community/posts/${post.id}`;
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleAdminModerateStatus = async (
    newStatus: 'published' | 'hidden' | 'removed'
  ) => {
    if (!isAdmin) return;
    try {
      const postRef = doc(db, 'publicPosts', post.id);
      const updated = {
        ...post,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(postRef, {
        status: newStatus,
        updatedAt: updated.updatedAt,
      });
      onPostUpdated?.(updated);
      setFeedbackBanner(`Post status updated to "${newStatus}".`);
    } catch (err) {
      setFeedbackBanner(err instanceof Error ? err.message : 'Moderation update failed.');
    }
  };

  const handleAdminToggleFeatured = async () => {
    if (!isAdmin) return;
    try {
      const nextFeatured = !post.isFeatured;
      const updated = {
        ...post,
        isFeatured: nextFeatured,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(doc(db, 'publicPosts', post.id), {
        isFeatured: nextFeatured,
        updatedAt: updated.updatedAt,
      });
      onPostUpdated?.(updated);
      setFeedbackBanner(
        nextFeatured ? 'Pinned as Featured Community Creation!' : 'Removed from Featured.'
      );
    } catch (err) {
      setFeedbackBanner(err instanceof Error ? err.message : 'Could not toggle featured state.');
    }
  };

  const handleDeleteEntirePost = async () => {
    if (!isOwner && !isAdmin) return;
    try {
      await deleteDoc(doc(db, 'publicPosts', post.id));
      onPostDeleted?.(post.id);
      onClose();
    } catch (err) {
      setFeedbackBanner(err instanceof Error ? err.message : 'Could not delete post.');
    }
  };

  const handleAdminDisableAuthorPublishing = async () => {
    if (!isAdmin || !post.authorId) return;
    try {
      await updateDoc(doc(db, 'users', post.authorId), {
        publishingDisabled: true,
        updatedAt: new Date().toISOString(),
      });
      setFeedbackBanner(`Disabled public publishing for ${post.authorName}.`);
    } catch {
      setFeedbackBanner('Could not update user publishing status.');
    }
  };

  const validMedia = (post.media || []).filter((m) => m.secureUrl && !brokenImages[m.secureUrl]);
  const activeMediaItem = validMedia[activeImageIndex] || validMedia[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto"
    >
      <div
        className={`relative w-full max-w-4xl rounded-3xl border-3 border-black brand-shadow my-6 max-h-[92vh] overflow-y-auto transition-colors ${
          isDark ? 'bg-[#121222] text-white' : 'bg-white text-black'
        }`}
      >
        {/* Sticky Top Bar */}
        <div
          className={`sticky top-0 z-20 backdrop-blur-md border-b-2 border-black px-5 sm:px-8 py-4 flex items-center justify-between gap-3 ${
            isDark ? 'bg-[#121222]/95 text-white' : 'bg-white/95 text-black'
          }`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-xl border-2 border-black bg-[#FFF025] text-black text-xs font-black uppercase tracking-wider">
              {post.categoryName}
            </span>
            {post.isFeatured && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border-2 border-black bg-[#B11469] text-white text-xs font-black">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>Featured</span>
              </span>
            )}
            {post.status !== 'published' && (
              <span className="px-2.5 py-1 rounded-xl border-2 border-black bg-amber-100 text-amber-900 text-xs font-black uppercase">
                Status: {post.status}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {(isOwner || isAdmin) && onEditPost && (
              <button
                type="button"
                onClick={() => onEditPost(post)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-black text-xs font-black cursor-pointer ${
                  isDark
                    ? 'bg-[#1b1b2f] hover:bg-[#FFF025] hover:text-black text-white'
                    : 'bg-white hover:bg-[#FFF025] text-black'
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}
            {(isOwner || isAdmin) && !post.id.startsWith('seed-') && (
              <button
                type="button"
                onClick={handleDeleteEntirePost}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-black bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 text-xs font-black cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close post view"
              className={`p-2 rounded-xl border-2 border-black cursor-pointer ${
                isDark
                  ? 'bg-[#1b1b2f] hover:bg-[#FFF025] hover:text-black text-white'
                  : 'bg-white hover:bg-[#FFF025] text-black'
              }`}
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Admin Moderation Bar */}
        {isAdmin && !post.id.startsWith('seed-') && (
          <div className="bg-slate-900 text-white px-5 sm:px-8 py-3 border-b-2 border-black flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-black text-[#FFF025]">
              <ShieldAlert className="w-4 h-4" />
              <span>Admin Moderation Controls:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAdminToggleFeatured}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFF025] text-black font-black cursor-pointer"
              >
                <Star className="w-3.5 h-3.5" />
                <span>{post.isFeatured ? 'Unpin Featured' : 'Pin Featured'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleAdminModerateStatus('published')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 text-black font-black cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approve / Publish</span>
              </button>
              <button
                type="button"
                onClick={() => handleAdminModerateStatus('hidden')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400 text-black font-black cursor-pointer"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Hide</span>
              </button>
              <button
                type="button"
                onClick={() => handleAdminModerateStatus('removed')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 text-white font-black cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
              <button
                type="button"
                onClick={handleAdminDisableAuthorPublishing}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-bold cursor-pointer"
              >
                <span>Disable Author Publishing</span>
              </button>
            </div>
          </div>
        )}

        <div className="p-5 sm:p-8 space-y-6">
          {feedbackBanner && (
            <div className="p-3 rounded-xl bg-[#FFF025] border-2 border-black text-xs font-bold text-black flex items-center justify-between">
              <span>{feedbackBanner}</span>
              <button
                type="button"
                onClick={() => setFeedbackBanner(null)}
                className="text-xs font-black underline ml-3 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Title & Author Header */}
          <div className="space-y-4">
            <h1
              id="post-detail-title"
              className="font-chewy text-3xl sm:text-4xl leading-tight"
            >
              {post.title}
            </h1>

            <div
              className={`flex flex-wrap items-center justify-between gap-4 pb-4 border-b-2 ${
                isDark ? 'border-white/15' : 'border-black/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <VerifiedAvatarFrame
                  src={resolveBuilderAvatarUrl(post.authorAvatar, post.authorId)}
                  alt={post.authorName}
                  isVerified={
                    post.authorRole === 'admin' ||
                    post.authorRole === 'moderator' ||
                    verifiedUserIds.has(post.authorId) ||
                    !post.authorId.startsWith('seed-')
                  }
                  sizeClass="w-11 h-11"
                  ringPaddingClass="p-[2.5px]"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm">{post.authorName}</span>
                    {post.authorRole === 'admin' && (
                      <span className="px-2 py-0.5 rounded-md border border-black bg-[#FFF025] text-black text-[10px] font-black uppercase">
                        Official Team
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-xs font-medium ${
                      isDark ? 'text-slate-400' : 'text-slate-600'
                    }`}
                  >
                    Published{' '}
                    {new Date(post.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>

              {/* Share / Bookmark / Report Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!currentUser) {
                      onRequireAuth('bookmark and save posts');
                      return;
                    }
                    onToggleBookmark(post.id);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-black text-xs font-black cursor-pointer transition-colors ${
                    isBookmarked
                      ? 'bg-[#FFF025] text-black brand-shadow-sm'
                      : isDark
                      ? 'bg-[#1b1b2f] hover:bg-white/10 text-white'
                      : 'bg-white hover:bg-slate-100 text-black'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-black' : ''}`} />
                  <span>{isBookmarked ? 'Saved' : 'Save'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-black text-xs font-black cursor-pointer ${
                    isDark
                      ? 'bg-[#1b1b2f] hover:bg-white/10 text-white'
                      : 'bg-white hover:bg-slate-100 text-black'
                  }`}
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleReportContent('post', post.id)}
                  title="Report inappropriate content"
                  className={`p-2 rounded-xl border-2 cursor-pointer ${
                    isDark
                      ? 'border-white/20 hover:border-rose-400 text-slate-300 hover:text-rose-400'
                      : 'border-black/20 hover:border-black text-slate-600 hover:text-rose-600'
                  }`}
                >
                  <Flag className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Media Gallery */}
          {activeMediaItem && (
            <div className="space-y-3">
              <div className="rounded-2xl border-3 border-black overflow-hidden bg-slate-950 max-h-[500px] flex items-center justify-center">
                <img
                  src={getCloudinaryResponsiveUrl(activeMediaItem.secureUrl, 'detail')}
                  alt={post.title}
                  onError={() =>
                    setBrokenImages((prev) => ({
                      ...prev,
                      [activeMediaItem.secureUrl]: true,
                    }))
                  }
                  className="max-h-[500px] w-auto object-contain"
                />
              </div>

              {validMedia.length > 1 && (
                <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                  {validMedia.map((m, idx) => (
                    <button
                      key={m.publicId || idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-20 h-14 rounded-xl border-2 overflow-hidden shrink-0 cursor-pointer transition-all ${
                        idx === activeImageIndex
                          ? 'border-black ring-2 ring-[#FFF025] scale-105'
                          : 'border-black/30 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={getCloudinaryResponsiveUrl(m.secureUrl, 'thumb')}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* External Project / Creation Links */}
          {(post.websiteUrl || post.gameUrl || post.githubUrl) && (
            <div
              className={`flex flex-wrap items-center gap-3 p-4 rounded-2xl border-2 border-black ${
                isDark ? 'bg-[#1b1b2f]' : 'bg-[#FFFDF5]'
              }`}
            >
              <span className="text-xs font-black uppercase tracking-wider mr-1">
                Try This Creation:
              </span>
              {post.gameUrl && (
                <a
                  href={post.gameUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-black bg-[#FFF025] hover:bg-[#ffe500] text-black text-xs font-black brand-shadow-sm"
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>Play Game Demo</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {post.websiteUrl && (
                <a
                  href={post.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-black bg-[#B11469] text-white text-xs font-black brand-shadow-sm"
                >
                  <Globe className="w-4 h-4" />
                  <span>Visit Live Website</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {post.githubUrl && (
                <a
                  href={post.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-black text-xs font-black ${
                    isDark
                      ? 'bg-[#121222] hover:bg-white/10 text-white'
                      : 'bg-white hover:bg-slate-100 text-black'
                  }`}
                >
                  <Code2 className="w-4 h-4" />
                  <span>View Source / Repo</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}

          {/* Full Post Body */}
          <div
            className={`text-base leading-relaxed whitespace-pre-line font-medium ${
              isDark ? 'text-slate-100' : 'text-slate-900'
            }`}
          >
            {renderTextWithMentions(post.body, builderProfile?.displayName, directoryUsers)}
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className={`px-3 py-1 rounded-xl border-2 border-black text-xs font-bold ${
                    isDark ? 'bg-[#1b1b2f] text-slate-200' : 'bg-slate-100 text-slate-900'
                  }`}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Persistent Reactions Bar (3D Animated Emote Pack) */}
          <div
            className={`pt-4 border-t-2 flex flex-wrap items-center justify-between gap-4 ${
              isDark ? 'border-white/15' : 'border-black/10'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              {PUBLIC_REACTION_OPTIONS.map((opt) => {
                const count = post.reactionCounts?.[opt.type] || 0;
                const active = userReactions.includes(opt.type);
                return (
                  <AnimatedEmoteButton
                    key={opt.type}
                    emote={opt.type}
                    count={count}
                    active={active}
                    title={opt.label}
                    size="md"
                    variant={isDark ? 'dark' : 'light'}
                    onClick={() => handleReact(opt.type)}
                  />
                );
              })}
            </div>

            <div
              className={`text-xs font-bold flex items-center gap-1.5 ${
                isDark ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-[#B11469]" />
              <span>
                {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
              </span>
            </div>
          </div>

          {/* Threaded Comments Section */}
          <div className="pt-6 border-t-3 border-black space-y-5">
            <h3 className="font-chewy text-2xl">
              Community Discussion ({comments.length})
            </h3>

            {/* Comment Composer with Multi-Line Support & @Mention Autocomplete */}
            {currentUser && builderProfile ? (
              <form onSubmit={handleAddTopLevelComment} className="space-y-2.5">
                <div className="relative">
                  <MentionAutocompletePopover
                    inputValue={newCommentText}
                    onSelectMention={(nextVal) => setNewCommentText(nextVal)}
                    overrideUsers={directoryUsers}
                    position="above"
                    variant={isDark ? 'dark' : 'light'}
                  />
                  <textarea
                    rows={3}
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Share constructive feedback, type @ to tag a builder or @all, or press Enter for a new line..."
                    className={`w-full px-4 py-3 text-sm rounded-2xl border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFF025] ${
                      isDark
                        ? 'bg-[#1b1b2f] text-white placeholder:text-slate-400'
                        : 'bg-white text-black placeholder:text-slate-400'
                    }`}
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !newCommentText.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-black bg-[#FFF025] hover:bg-[#ffe500] text-black text-xs font-black brand-shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{isSubmittingComment ? 'Posting...' : 'Post Comment'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div
                className={`p-4 rounded-2xl border-2 border-black flex flex-wrap items-center justify-between gap-3 ${
                  isDark ? 'bg-[#1b1b2f] text-white' : 'bg-slate-50 text-slate-800'
                }`}
              >
                <div className="text-xs sm:text-sm font-bold">
                  Sign in with your Google account to join the discussion and leave a comment.
                </div>
                <button
                  type="button"
                  onClick={() => onRequireAuth('leave a comment on this post')}
                  className="px-4 py-2 rounded-xl border-2 border-black bg-[#FFF025] hover:bg-[#ffe500] text-black text-xs font-black brand-shadow-sm cursor-pointer"
                >
                  Sign In with Google
                </button>
              </div>
            )}

            {/* Comments List */}
            {topLevelComments.length === 0 ? (
              <div
                className={`py-8 text-center text-sm font-medium rounded-2xl border-2 border-dashed ${
                  isDark
                    ? 'bg-[#1b1b2f]/60 border-white/20 text-slate-400'
                    : 'bg-slate-50 border-black/20 text-slate-600'
                }`}
              >
                No comments yet. Be the first builder to share feedback!
              </div>
            ) : (
              <div className="space-y-4">
                {topLevelComments.map((comment) => {
                  const replies = getReplies(comment.id);
                  const canManageComment =
                    Boolean(currentUser && currentUser.uid === comment.authorId) || isAdmin;

                  return (
                    <div
                      key={comment.id}
                      className={`p-4 rounded-2xl border-2 border-black space-y-3 ${
                        isDark ? 'bg-[#1b1b2f]' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <VerifiedAvatarFrame
                            src={resolveBuilderAvatarUrl(comment.authorAvatar, comment.authorId)}
                            alt={comment.authorName}
                            isVerified={
                              comment.authorRole === 'admin' ||
                              comment.authorRole === 'moderator' ||
                              verifiedUserIds.has(comment.authorId)
                            }
                            sizeClass="w-8 h-8"
                            ringPaddingClass="p-[2px]"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black">{comment.authorName}</span>
                              {comment.authorRole === 'admin' && (
                                <span className="px-1.5 py-0.2 rounded bg-[#FFF025] text-black border border-black text-[9px] font-black uppercase">
                                  Admin
                                </span>
                              )}
                              {comment.isEdited && (
                                <span
                                  className={`text-[10px] ${
                                    isDark ? 'text-slate-400' : 'text-slate-500'
                                  }`}
                                >
                                  (edited)
                                </span>
                              )}
                            </div>
                            <div
                              className={`text-[11px] ${
                                isDark ? 'text-slate-400' : 'text-slate-500'
                              }`}
                            >
                              {new Date(comment.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (!currentUser) {
                                onRequireAuth('reply to comments');
                                return;
                              }
                              setReplyingToId(replyingToId === comment.id ? null : comment.id);
                              setReplyText('');
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                              isDark
                                ? 'text-slate-200 hover:bg-white/10'
                                : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <Reply className="w-3.5 h-3.5" />
                            <span>Reply</span>
                          </button>

                          {canManageComment && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCommentId(comment.id);
                                  setEditingCommentText(comment.text);
                                }}
                                className={`p-1.5 rounded-lg cursor-pointer ${
                                  isDark
                                    ? 'text-slate-300 hover:bg-white/10'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                                title="Edit comment"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(comment.id)}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                                title="Delete comment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => handleReportContent('comment', comment.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                            title="Report comment"
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {editingCommentId === comment.id ? (
                        <div className="space-y-2">
                          <div className="relative">
                            <MentionAutocompletePopover
                              inputValue={editingCommentText}
                              onSelectMention={(nextVal) => setEditingCommentText(nextVal)}
                              overrideUsers={directoryUsers}
                              position="above"
                              variant={isDark ? 'dark' : 'light'}
                            />
                            <textarea
                              rows={2}
                              value={editingCommentText}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                              className={`w-full px-3 py-2 text-sm rounded-xl border-2 border-black ${
                                isDark ? 'bg-[#121222] text-white' : 'bg-white text-black'
                              }`}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveEditedComment(comment.id)}
                              className="px-3 py-1 rounded-lg border-2 border-black bg-[#FFF025] text-black text-xs font-black cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCommentId(null)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                                isDark ? 'text-slate-300' : 'text-slate-600'
                              }`}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p
                          className={`text-sm whitespace-pre-wrap leading-relaxed ${
                            isDark ? 'text-slate-100' : 'text-slate-900'
                          }`}
                        >
                          {renderTextWithMentions(
                            comment.text,
                            builderProfile?.displayName,
                            directoryUsers
                          )}
                        </p>
                      )}

                      {/* Inline Reply Box with @Mention Autocomplete */}
                      {replyingToId === comment.id && (
                        <div
                          className={`pl-4 border-l-2 pt-2 space-y-2 ${
                            isDark ? 'border-white/20' : 'border-black/20'
                          }`}
                        >
                          <div className="relative">
                            <MentionAutocompletePopover
                              inputValue={replyText}
                              onSelectMention={(nextVal) => setReplyText(nextVal)}
                              overrideUsers={directoryUsers}
                              position="above"
                              variant={isDark ? 'dark' : 'light'}
                            />
                            <textarea
                              rows={2}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder={`Reply to ${comment.authorName} (type @ to tag, Enter for new line)...`}
                              className={`w-full px-3 py-2 text-xs rounded-xl border-2 border-black ${
                                isDark ? 'bg-[#121222] text-white' : 'bg-slate-50 text-black'
                              }`}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isSubmittingComment || !replyText.trim()}
                              onClick={() => handleAddReply(comment.id)}
                              className="px-3.5 py-1.5 rounded-xl border-2 border-black bg-[#FFF025] text-xs font-black text-black cursor-pointer"
                            >
                              Post Reply
                            </button>
                            <button
                              type="button"
                              onClick={() => setReplyingToId(null)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                                isDark ? 'text-slate-300' : 'text-slate-600'
                              }`}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Nested Replies */}
                      {replies.length > 0 && (
                        <div className="pl-4 sm:pl-6 border-l-3 border-[#FFF025] space-y-2.5 pt-2">
                          {replies.map((reply) => {
                            const canManageReply =
                              Boolean(currentUser && currentUser.uid === reply.authorId) || isAdmin;
                            return (
                              <div
                                key={reply.id}
                                className={`p-3 rounded-xl border space-y-1.5 ${
                                  isDark
                                    ? 'bg-[#121222] border-white/15'
                                    : 'bg-slate-50 border-black/20'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <VerifiedAvatarFrame
                                      src={resolveBuilderAvatarUrl(
                                        reply.authorAvatar,
                                        reply.authorId
                                      )}
                                      alt={reply.authorName}
                                      isVerified={
                                        reply.authorRole === 'admin' ||
                                        reply.authorRole === 'moderator' ||
                                        verifiedUserIds.has(reply.authorId)
                                      }
                                      sizeClass="w-6 h-6"
                                      ringPaddingClass="p-[1.5px]"
                                    />
                                    <span className="text-xs font-black">
                                      {reply.authorName}
                                    </span>
                                    <span
                                      className={`text-[10px] ${
                                        isDark ? 'text-slate-400' : 'text-slate-500'
                                      }`}
                                    >
                                      {new Date(reply.createdAt).toLocaleString()}
                                    </span>
                                  </div>
                                  {canManageReply && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteComment(reply.id)}
                                      className="p-1 text-rose-500 hover:bg-rose-500/10 rounded cursor-pointer"
                                      title="Delete reply"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                                <p
                                  className={`text-xs sm:text-sm whitespace-pre-wrap ${
                                    isDark ? 'text-slate-200' : 'text-slate-800'
                                  }`}
                                >
                                  {renderTextWithMentions(
                                    reply.text,
                                    builderProfile?.displayName,
                                    directoryUsers
                                  )}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
