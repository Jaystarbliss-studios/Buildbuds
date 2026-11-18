import React, { useState, useEffect, useRef } from 'react';
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
  UserPlus,
  UserCheck,
  GitFork,
  Trophy,
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
  evaluateChatComposerKeyDown,
  isFocusComposerShortcut,
} from '../utils/messageGrouping.ts';
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
  moderatePublicPostStatus,
  notifyModeratorsAndAdminsOfReport,
  forkProject,
  sendCollaborationRequest,
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
  isFollowingAuthor?: boolean;
  onToggleFollowAuthor?: (
    creatorUid: string,
    creatorName: string,
    currentlyFollowing: boolean
  ) => Promise<void> | void;
  onClose: () => void;
  onRequireAuth: (actionDescription: string) => void;
  onToggleBookmark: (postId: string) => void;
  onEditPost?: (post: PublicPost) => void;
  onPostUpdated?: (updated: PublicPost) => void;
  onPostDeleted?: (postId: string) => void;
  onSelectMemberProfile?: (info: {
    uid: string;
    displayName: string;
    avatarUrl?: string;
    role?: string;
  }) => void;
}

export const PublicPostDetailModal: React.FC<PublicPostDetailModalProps> = ({
  post,
  currentUser,
  builderProfile,
  userReactions,
  isBookmarked,
  isFollowingAuthor = false,
  onToggleFollowAuthor,
  onClose,
  onRequireAuth,
  onToggleBookmark,
  onEditPost,
  onPostUpdated,
  onPostDeleted,
  onSelectMemberProfile,
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
  const newCommentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const isReactingRef = useRef(false);

  const [isForkModalOpen, setIsForkModalOpen] = useState(false);
  const [forkTitle, setForkTitle] = useState('');
  const [forkSummary, setForkSummary] = useState('');
  const [isForking, setIsForking] = useState(false);

  const [isCollaborateModalOpen, setIsCollaborateModalOpen] = useState(false);
  const [collaborateMessage, setCollaborateMessage] = useState('');
  const [isCollaborating, setIsCollaborating] = useState(false);

  const handleConfirmFork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post) return;
    if (!currentUser || !builderProfile) {
      onRequireAuth('fork this project');
      return;
    }
    setIsForking(true);
    setFeedbackBanner(null);
    try {
      await forkProject({
        originalPost: post,
        authorProfile: builderProfile,
        customTitle: forkTitle,
        customSummary: forkSummary,
      });
      setIsForkModalOpen(false);
      setFeedbackBanner('Project successfully forked into your profile with a reference to the original!');
    } catch (err) {
      setFeedbackBanner(err instanceof Error ? err.message : 'Could not fork project.');
    } finally {
      setIsForking(false);
    }
  };

  const handleSendCollaboration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post) return;
    if (!currentUser || !builderProfile) {
      onRequireAuth('send a collaboration request');
      return;
    }
    setIsCollaborating(true);
    setFeedbackBanner(null);
    try {
      await sendCollaborationRequest({
        targetPostId: post.id,
        targetPostTitle: post.title,
        targetAuthorId: post.authorId,
        targetAuthorName: post.authorName,
        senderProfile: builderProfile,
        message: collaborateMessage,
      });
      setIsCollaborateModalOpen(false);
      setCollaborateMessage('');
      setFeedbackBanner(`Collaboration request successfully sent to @${post.authorName}!`);
    } catch (err) {
      setFeedbackBanner(err instanceof Error ? err.message : 'Could not send collaboration request.');
    } finally {
      setIsCollaborating(false);
    }
  };

  const isAdmin = isSuperAdminUser(currentUser, builderProfile);
  const isModeratorOrAdmin = isAdmin || builderProfile?.role === 'moderator';
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

  useEffect(() => {
    if (!post) return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        isFocusComposerShortcut({
          key: e.key,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
        })
      ) {
        e.preventDefault();
        newCommentTextareaRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [post]);

  if (!post) return null;

  const topLevelComments = comments.filter((c) => !c.parentCommentId);
  const getReplies = (parentId: string) =>
    comments.filter((c) => c.parentCommentId === parentId);

  const handleReact = async (type: PublicReactionType) => {
    if (!currentUser || !builderProfile) {
      onRequireAuth('react to this post');
      return;
    }
    if (isReactingRef.current) return;
    isReactingRef.current = true;
    try {
      await togglePublicPostReaction(post.id, type);
    } catch (err) {
      setFeedbackBanner(err instanceof Error ? err.message : 'Could not update reaction.');
    } finally {
      isReactingRef.current = false;
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
    const reporterName =
      builderProfile?.displayName || currentUser.displayName || 'Community Member';
    const reason = `Reported public ${targetType} in "${post.title}"`;
    try {
      const reportRef = await addDoc(collection(db, 'reports'), {
        messageId: `${targetType}:${targetId}`,
        channelId: `publicPosts/${post.id}`,
        reporterId: currentUser.uid,
        reporterName,
        reportedUserId: post.authorId || '',
        reportedUserName: post.authorName || '',
        messageSnippet: post.title.slice(0, 140),
        messageText: (post.summary || post.body || post.title).slice(0, 1000),
        reason,
        status: 'open',
        createdAt: new Date().toISOString(),
        createdAtMillis: Date.now(),
      });
      void notifyModeratorsAndAdminsOfReport({
        reporterUid: currentUser.uid,
        reporterName,
        channelId: `publicPosts/${post.id}`,
        channelName: post.categoryName || 'Showcase',
        messageId: `${targetType}:${targetId}`,
        reportId: reportRef.id,
        flaggedMessageText: post.title,
        flaggedAuthorName: post.authorName || 'Builder',
        targetSummary: `Public ${targetType} on "${post.title.slice(0, 60)}"`,
        reason,
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
    if (!isModeratorOrAdmin) return;
    try {
      await moderatePublicPostStatus({ post, newStatus });
      const updated = {
        ...post,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
      onPostUpdated?.(updated);
      setFeedbackBanner(
        newStatus === 'published'
          ? 'Post approved and published! Author and followers have been notified.'
          : `Post status updated to "${newStatus}".`
      );
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
    if (!isOwner && !isModeratorOrAdmin) return;
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
            {(isOwner || isModeratorOrAdmin) && !post.id.startsWith('seed-') && (
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

        {/* Moderator & Admin Moderation Bar */}
        {isModeratorOrAdmin && !post.id.startsWith('seed-') && (
          <div className="bg-slate-900 text-white px-5 sm:px-8 py-3 border-b-2 border-black flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-black text-[#FFF025]">
              <ShieldAlert className="w-4 h-4" />
              <span>{isAdmin ? 'Admin' : 'Moderator'} Review Controls:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleAdminToggleFeatured}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFF025] text-black font-black cursor-pointer"
                >
                <Star className="w-3.5 h-3.5" />
                <span>{post.isFeatured ? 'Unpin Featured' : 'Pin Featured'}</span>
              </button>
              )}
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
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleAdminDisableAuthorPublishing}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-bold cursor-pointer"
                >
                  <span>Disable Author Publishing</span>
                </button>
              )}
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
            {(post.challengeTitle || post.forkedFromPostId) && (
              <div className="flex flex-wrap items-center gap-2">
                {post.challengeTitle && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border-2 border-black bg-[#FFF025] text-black text-xs font-black">
                    <span>🎯 Challenge: {post.challengeTitle}</span>
                  </span>
                )}
                {post.forkedFromPostId && post.forkedFromAuthorName && (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border-2 border-black text-xs font-bold ${
                    isDark ? 'bg-[#1b1b2f] text-slate-200' : 'bg-slate-100 text-slate-800'
                  }`}>
                    <span>🔗 Forked from {post.forkedFromAuthorName}&apos;s &quot;{post.forkedFromTitle}&quot;</span>
                  </span>
                )}
              </div>
            )}
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
              <button
                type="button"
                onClick={() =>
                  onSelectMemberProfile?.({
                    uid: post.authorId,
                    displayName: post.authorName,
                    avatarUrl: post.authorAvatar,
                    role: post.authorRole,
                  })
                }
                title={`View ${post.authorName}'s profile`}
                className="flex items-center gap-3 text-left group cursor-pointer rounded-xl p-1 -m-1 hover:bg-black/5 transition-colors"
              >
                <VerifiedAvatarFrame
                  src={resolveBuilderAvatarUrl(post.authorAvatar, post.authorId)}
                  alt={post.authorName}
                  isVerified={
                    post.authorRole === 'admin' ||
                    post.authorRole === 'moderator' ||
                    verifiedUserIds.has(post.authorId)
                  }
                  sizeClass="w-11 h-11"
                  ringPaddingClass="p-[2.5px]"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-black text-sm group-hover:underline ${
                        post.authorRole === 'admin' ||
                        post.authorRole === 'moderator' ||
                        verifiedUserIds.has(post.authorId)
                          ? 'verified-student-name-gradient'
                          : ''
                      }`}
                    >
                      {post.authorName}
                    </span>
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
              </button>

              {/* Follow / Share / Bookmark / Report Actions */}
              <div className="flex flex-wrap items-center gap-2">
                {onToggleFollowAuthor &&
                  !isOwner &&
                  post.authorId &&
                  !post.authorId.startsWith('seed-') &&
                  !post.authorId.startsWith('team-') && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!currentUser) {
                          onRequireAuth(`follow ${post.authorName}`);
                          return;
                        }
                        onToggleFollowAuthor(post.authorId, post.authorName, isFollowingAuthor);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-black text-xs font-black cursor-pointer transition-colors ${
                        isFollowingAuthor
                          ? isDark
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                            : 'bg-emerald-100 text-emerald-900'
                          : 'bg-[#B11469] hover:bg-[#931057] text-white'
                      }`}
                    >
                      {isFollowingAuthor ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                  )}

                {!isOwner && currentUser && builderProfile && (
                  <button
                    type="button"
                    onClick={() => setIsCollaborateModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-black bg-[#FFF025] hover:bg-[#ffe500] text-black text-xs font-black cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Collaborate</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (!currentUser || !builderProfile) {
                      onRequireAuth('fork this project');
                      return;
                    }
                    setForkTitle(`Fork of ${post.title}`);
                    setForkSummary(post.summary || '');
                    setIsForkModalOpen(true);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-black text-xs font-black cursor-pointer ${
                    isDark ? 'bg-[#1b1b2f] hover:bg-white/10 text-white' : 'bg-white hover:bg-slate-100 text-black'
                  }`}
                >
                  <GitFork className="w-3.5 h-3.5" />
                  <span>Fork</span>
                </button>

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
                    ref={newCommentTextareaRef}
                    rows={3}
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      const action = evaluateChatComposerKeyDown({
                        key: e.key,
                        ctrlKey: e.ctrlKey,
                        metaKey: e.metaKey,
                        shiftKey: e.shiftKey,
                        isComposing: e.nativeEvent.isComposing,
                      });
                      if (action === 'send') {
                        e.preventDefault();
                        handleAddTopLevelComment(e as unknown as React.FormEvent);
                      }
                    }}
                    placeholder="Share constructive feedback (Enter = post, Shift+Enter = new line, Ctrl+K = focus, type @ to tag)..."
                    className={`w-full px-4 py-3 text-sm rounded-2xl border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFF025] ${
                      isDark
                        ? 'bg-[#1b1b2f] text-white placeholder:text-slate-400'
                        : 'bg-white text-black placeholder:text-slate-400'
                    }`}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Enter = post comment • Shift + Enter = new line • Ctrl + K = focus
                  </span>
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !newCommentText.trim()}
                    title="Post Comment (Enter)"
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
                        <button
                          type="button"
                          onClick={() =>
                            onSelectMemberProfile?.({
                              uid: comment.authorId,
                              displayName: comment.authorName,
                              avatarUrl: comment.authorAvatar,
                              role: comment.authorRole,
                            })
                          }
                          title={`View ${comment.authorName}'s profile`}
                          className="flex items-center gap-2.5 text-left group cursor-pointer rounded-xl p-1 -m-1 hover:bg-black/5 transition-colors"
                        >
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
                              <span
                                className={`text-xs font-black group-hover:underline ${
                                  comment.authorRole === 'admin' ||
                                  comment.authorRole === 'moderator' ||
                                  verifiedUserIds.has(comment.authorId)
                                    ? 'verified-student-name-gradient'
                                    : ''
                                }`}
                              >
                                {comment.authorName}
                              </span>
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
                        </button>

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
                              onKeyDown={(e) => {
                                const action = evaluateChatComposerKeyDown({
                                  key: e.key,
                                  ctrlKey: e.ctrlKey,
                                  metaKey: e.metaKey,
                                  shiftKey: e.shiftKey,
                                  isComposing: e.nativeEvent.isComposing,
                                });
                                if (action === 'cancel') {
                                  setReplyingToId(null);
                                } else if (action === 'send') {
                                  e.preventDefault();
                                  handleAddReply(comment.id);
                                }
                              }}
                              placeholder={`Reply to ${comment.authorName} (Enter = send, Shift+Enter = new line)...`}
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
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onSelectMemberProfile?.({
                                        uid: reply.authorId,
                                        displayName: reply.authorName,
                                        avatarUrl: reply.authorAvatar,
                                        role: reply.authorRole,
                                      })
                                    }
                                    title={`View ${reply.authorName}'s profile`}
                                    className="flex items-center gap-2 text-left group cursor-pointer rounded-lg p-0.5 -m-0.5 hover:bg-black/5 transition-colors"
                                  >
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
                                    <span
                                      className={`text-xs font-black group-hover:underline ${
                                        reply.authorRole === 'admin' ||
                                        reply.authorRole === 'moderator' ||
                                        verifiedUserIds.has(reply.authorId)
                                          ? 'verified-student-name-gradient'
                                          : ''
                                      }`}
                                    >
                                      {reply.authorName}
                                    </span>
                                    <span
                                      className={`text-[10px] ${
                                        isDark ? 'text-slate-400' : 'text-slate-500'
                                      }`}
                                    >
                                      {new Date(reply.createdAt).toLocaleString()}
                                    </span>
                                  </button>
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

      {/* Fork Project Modal */}
      {isForkModalOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-3xl border-3 border-black p-6 space-y-5 brand-shadow ${isDark ? 'bg-[#121222] text-white' : 'bg-white text-black'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitFork className="w-5 h-5 text-[#FFF025]" />
                <h3 className="font-chewy text-2xl">Fork Project</h3>
              </div>
              <button type="button" onClick={() => setIsForkModalOpen(false)} className="p-1.5 rounded-xl border-2 border-black bg-white text-black cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Clones this project&apos;s metadata, media, and code links into your own profile as a derivative work with a reference back to @{post.authorName}.
            </p>
            <form onSubmit={handleConfirmFork} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-1">New Project Title *</label>
                <input
                  type="text"
                  required
                  value={forkTitle}
                  onChange={(e) => setForkTitle(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border-2 border-black ${isDark ? 'bg-[#1b1b2f] text-white' : 'bg-white text-black'}`}
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-1">Project Summary / Notes</label>
                <textarea
                  rows={3}
                  value={forkSummary}
                  onChange={(e) => setForkSummary(e.target.value)}
                  placeholder="Describe your changes or additions in this fork..."
                  className={`w-full px-3 py-2 text-xs rounded-xl border-2 border-black ${isDark ? 'bg-[#1b1b2f] text-white' : 'bg-white text-black'}`}
                />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button type="button" onClick={() => setIsForkModalOpen(false)} className="px-4 py-2 rounded-xl border-2 border-black text-xs font-bold bg-slate-200 text-black cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isForking} className="px-5 py-2 rounded-xl border-2 border-black bg-[#FFF025] text-black text-xs font-black cursor-pointer">
                  {isForking ? 'Forking Project...' : 'Publish Forked Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collaborate Request Modal */}
      {isCollaborateModalOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-3xl border-3 border-black p-6 space-y-5 brand-shadow ${isDark ? 'bg-[#121222] text-white' : 'bg-white text-black'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#FFF025]" />
                <h3 className="font-chewy text-2xl">Collaborate with @{post.authorName}</h3>
              </div>
              <button type="button" onClick={() => setIsCollaborateModalOpen(false)} className="p-1.5 rounded-xl border-2 border-black bg-white text-black cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Send a collaboration request message to @{post.authorName}. They will receive an instant notification in their inbox.
            </p>
            <form onSubmit={handleSendCollaboration} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-1">Collaboration Message *</label>
                <textarea
                  rows={4}
                  required
                  value={collaborateMessage}
                  onChange={(e) => setCollaborateMessage(e.target.value)}
                  placeholder={`Hi @${post.authorName}, I saw your project "${post.title}" and would love to collaborate on...`}
                  className={`w-full px-3 py-2 text-xs rounded-xl border-2 border-black ${isDark ? 'bg-[#1b1b2f] text-white' : 'bg-white text-black'}`}
                />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button type="button" onClick={() => setIsCollaborateModalOpen(false)} className="px-4 py-2 rounded-xl border-2 border-black text-xs font-bold bg-slate-200 text-black cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isCollaborating || !collaborateMessage.trim()} className="px-5 py-2 rounded-xl border-2 border-black bg-[#FFF025] text-black text-xs font-black cursor-pointer">
                  {isCollaborating ? 'Sending Request...' : 'Send Collaboration Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
