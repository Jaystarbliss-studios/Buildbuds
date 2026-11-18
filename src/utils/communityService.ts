import {
  db,
  auth,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  arrayUnion,
  arrayRemove,
  BuilderProfile,
  ADMIN_EMAIL,
  getStudentAccessState,
  isSuperAdminUser,
  isApprovedStudentMember,
} from '../firebase.ts';
import {
  ChannelActivityDoc,
  CloudinaryMediaItem,
  CommunityMembership,
  CreatorFollowDoc,
  DEFAULT_PUBLIC_CATEGORIES,
  EmailNotificationDeliveryStatus,
  PublicCategory,
  PublicComment,
  PublicCommunityConfig,
  PublicPost,
  PublicPostStatus,
  PublicReactionDoc,
  PublicReactionType,
  StudentAccessAdminNote,
  StudentAccessRequest,
  StudentAccessStatus,
  UserNotificationItem,
  AdminAuditLog,
  ShowcaseSubmission,
  CommunityChallenge,
  ChallengeLifecycleStatus,
  ChallengePublishStatus,
  ChallengeSkillLevel,
  ChallengeResourceLink,
  DEFAULT_REGISTERED_SCHOOLS,
  RegisteredSchoolsDoc,
  FeedbackCategory,
  FeedbackStatus,
  FeedbackSubmission,
  FeedbackAdminNote,
  FEEDBACK_STATUS_LABELS,
  CommunityContributionStats,
  ContributionEvent,
} from '../types/community.ts';
import {
  filterProfanity,
  normalizeCoverImageUrl,
  validatePublicShowcaseUrl,
} from './moderation.ts';
import { validateSuggestionContribution } from './contributions.ts';
import { resolveMentionedTargets } from './messageGrouping.ts';
import { INITIAL_PUBLIC_COMMUNITY_POSTS } from '../data/publicCommunitySeeds.ts';

export type ContributionAwardApiPayload =
  | {
      action: 'meaningful_reply';
      sourceKind: 'hub_thread' | 'hub_message_reply' | 'public_comment';
      sourceId: string;
      parentId: string;
      replyToMessageId?: string;
    }
  | {
      action: 'showcase_published';
      postId: string;
    }
  | {
      action: 'suggestion_submitted';
      submissionId: string;
    }
  | {
      action: 'suggestion_approved';
      submissionId: string;
    };

export async function triggerContributionAward(
  payload: ContributionAwardApiPayload
): Promise<{
  awarded: boolean;
  alreadyAwarded?: boolean;
  skippedReason?: string;
  pointsDelta?: number;
  error?: string;
}> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return { awarded: false, skippedReason: 'Not authenticated.' };
  }
  try {
    const idToken = await currentUser.getIdToken();
    const res = await fetch('/api/contributions/award', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as {
      awarded?: boolean;
      alreadyAwarded?: boolean;
      skippedReason?: string;
      pointsDelta?: number;
      error?: string;
    };
    if (!res.ok) {
      return {
        awarded: false,
        error: data.error || 'Contribution award request failed.',
      };
    }
    return {
      awarded: Boolean(data.awarded),
      alreadyAwarded: Boolean(data.alreadyAwarded),
      skippedReason: data.skippedReason,
      pointsDelta: data.pointsDelta,
    };
  } catch (err) {
    return {
      awarded: false,
      error: err instanceof Error ? err.message : 'Network error triggering contribution award.',
    };
  }
}

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
];

export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif'];
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_IMAGES_PER_POST = 5;

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export function validateCloudinaryImageFile(file: {
  name: string;
  type: string;
  size: number;
}): ImageValidationResult {
  if (!file) {
    return { valid: false, error: 'No image file provided.' };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const mimeOk = ALLOWED_IMAGE_MIME_TYPES.includes(file.type.toLowerCase());
  const extOk = ALLOWED_IMAGE_EXTENSIONS.includes(ext);

  if (!mimeOk || !extOk) {
    return {
      valid: false,
      error: `"${file.name}" has an unsupported format. Allowed formats: JPEG, PNG, WebP, AVIF.`,
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      error: `"${file.name}" is empty.`,
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `"${file.name}" is ${sizeMb} MB. Maximum file size is 5 MB per image.`,
    };
  }

  return { valid: true };
}

export function validateCloudinaryUploadBatch(
  files: Array<{ name: string; type: string; size: number }>,
  existingCount = 0
): ImageValidationResult {
  if (existingCount + files.length > MAX_IMAGES_PER_POST) {
    return {
      valid: false,
      error: `You can attach up to ${MAX_IMAGES_PER_POST} images per post (currently ${existingCount} attached).`,
    };
  }
  for (const file of files) {
    const single = validateCloudinaryImageFile(file);
    if (!single.valid) {
      return single;
    }
  }
  return { valid: true };
}

/**
 * Generates an optimized Cloudinary delivery URL with automatic format & quality (`f_auto,q_auto`).
 * Gracefully preserves non-Cloudinary URLs.
 */
export function getCloudinaryResponsiveUrl(
  url: string | undefined,
  variant: 'thumb' | 'feed' | 'detail' = 'feed'
): string {
  if (!url) return '';
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }

  const transformMap: Record<'thumb' | 'feed' | 'detail', string> = {
    thumb: 'f_auto,q_auto,c_fill,w_480,h_320',
    feed: 'f_auto,q_auto,c_limit,w_1080',
    detail: 'f_auto,q_auto,c_limit,w_1600',
  };

  return url.replace('/upload/', `/upload/${transformMap[variant]}/`);
}

/**
 * Uploads an image to Cloudinary using our signed backend endpoint (`/api/cloudinary/signature`).
 */
export async function uploadImageToCloudinarySigned(
  file: File,
  onProgress?: (percent: number) => void
): Promise<CloudinaryMediaItem> {
  const check = validateCloudinaryImageFile(file);
  if (!check.valid) {
    throw new Error(check.error);
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Please sign in with Google before uploading images.');
  }

  const accessState = await getStudentAccessState(currentUser);
  if (!accessState.isApprovedForHub) {
    throw new Error(
      'Only verified and approved Build Buds Student Hub members can upload and publish creations.'
    );
  }

  const idToken = await currentUser.getIdToken();

  const sigRes = await fetch('/api/cloudinary/signature', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    }),
  });

  const sigData = await sigRes.json().catch(() => ({}));
  if (!sigRes.ok) {
    throw new Error(
      sigData.error ||
        'Cloudinary upload signature could not be generated. Ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are configured.'
    );
  }

  const { signature, timestamp, cloudName, apiKey, uploadPreset, folder, context } = sigData;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  if (uploadPreset) {
    formData.append('upload_preset', uploadPreset);
  }
  if (folder) {
    formData.append('folder', folder);
  }
  if (context) {
    formData.append('context', context);
  }

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const uploaded = await new Promise<{
    secure_url: string;
    public_id: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
    created_at?: string;
  }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const pct = Math.round((event.loaded / event.total) * 100);
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      try {
        const responseJson = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300 && responseJson.secure_url) {
          resolve(responseJson);
        } else {
          reject(
            new Error(
              responseJson?.error?.message ||
                'Cloudinary rejected the image upload. Verify your upload preset and credentials.'
            )
          );
        }
      } catch {
        reject(new Error('Invalid response from Cloudinary upload server.'));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error while uploading image to Cloudinary.'));
    };

    xhr.send(formData);
  });

  return {
    secureUrl: uploaded.secure_url,
    publicId: uploaded.public_id,
    ownerUid: currentUser.uid,
    width: uploaded.width || 0,
    height: uploaded.height || 0,
    format: uploaded.format || file.name.split('.').pop()?.toLowerCase() || 'jpg',
    bytes: uploaded.bytes || file.size,
    createdAt: uploaded.created_at || new Date().toISOString(),
  };
}

export async function deleteCloudinaryAsset(publicId: string, postId?: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !publicId) return;
  try {
    const idToken = await currentUser.getIdToken();
    await fetch('/api/cloudinary/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ publicId, postId }),
    });
  } catch (err) {
    console.warn('Cloudinary asset cleanup warning:', err);
  }
}

const DRAFT_STORAGE_KEY_PREFIX = 'buildbuds_public_post_draft_';

export interface PublicPostDraftData {
  id?: string;
  title: string;
  summary: string;
  body: string;
  categoryId: string;
  tagsInput: string;
  websiteUrl: string;
  gameUrl: string;
  githubUrl: string;
  challengeId?: string;
  media: CloudinaryMediaItem[];
  updatedAt: string;
}

export function savePostDraftLocally(uid: string, draft: PublicPostDraftData): void {
  try {
    localStorage.setItem(`${DRAFT_STORAGE_KEY_PREFIX}${uid}`, JSON.stringify(draft));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadPostDraftLocally(uid: string): PublicPostDraftData | null {
  try {
    const raw = localStorage.getItem(`${DRAFT_STORAGE_KEY_PREFIX}${uid}`);
    if (!raw) return null;
    return JSON.parse(raw) as PublicPostDraftData;
  } catch {
    return null;
  }
}

export function clearPostDraftLocally(uid: string): void {
  try {
    localStorage.removeItem(`${DRAFT_STORAGE_KEY_PREFIX}${uid}`);
  } catch {
    // Ignore
  }
}

/**
 * Ensures initial public categories exist in Firestore when an admin initializes or updates categories.
 */
export async function seedDefaultCategoriesIfNeeded(): Promise<void> {
  try {
    if (!auth.currentUser || auth.currentUser.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return;
    }
    const snap = await getDocs(collection(db, 'publicCategories'));
    if (!snap.empty) return;
    for (const cat of DEFAULT_PUBLIC_CATEGORIES) {
      await setDoc(doc(db, 'publicCategories', cat.id), cat);
    }
  } catch {
    // Non-blocking
  }
}

/**
 * Creates or updates a Public Post in `publicPosts/{postId}`.
 */
export async function savePublicPost(params: {
  existingPostId?: string;
  title: string;
  summary: string;
  body: string;
  categoryId: string;
  categoryName: string;
  tags: string[];
  media: CloudinaryMediaItem[];
  websiteUrl?: string;
  gameUrl?: string;
  githubUrl?: string;
  challengeId?: string;
  challengeTitle?: string;
  authorProfile: BuilderProfile;
  desiredStatus: 'draft' | 'published';
  requireReview?: boolean;
}): Promise<PublicPost> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be signed in with Google to create or save a post.');
  }

  // Enforce role-based publishing permissions: only verified & approved Student Hub core members or admins can publish
  const accessState = await getStudentAccessState(currentUser, params.authorProfile);
  if (!accessState.isApprovedForHub) {
    throw new Error(
      'Only verified and approved Build Buds Student Hub members are permitted to publish public creations and posts.'
    );
  }

  if (params.authorProfile.publishingDisabled) {
    throw new Error('Public publishing has been disabled for your account by a moderator.');
  }

  const filteredTitle = filterProfanity(params.title.trim()).filteredText;
  const filteredSummary = filterProfanity(params.summary.trim()).filteredText;
  const filteredBody = filterProfanity(params.body.trim()).filteredText;

  if (!filteredTitle) {
    throw new Error('Please enter a title for your post.');
  }
  if (!filteredBody) {
    throw new Error('Please write content or a project description for your post.');
  }

  const isAdmin =
    currentUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
    params.authorProfile.role === 'admin';
  const isModeratorOrAdmin = isAdmin || params.authorProfile.role === 'moderator';

  const cleanGameUrl = params.gameUrl?.trim() || '';
  const cleanWebsiteUrl = params.websiteUrl?.trim() || '';
  const isGameCategory = params.categoryId === 'games' || Boolean(cleanGameUrl);

  let validatedGameUrl = cleanGameUrl;
  let validatedWebsiteUrl = cleanWebsiteUrl;

  if (params.desiredStatus !== 'draft') {
    if (isGameCategory) {
      const gameCheck = validatePublicShowcaseUrl(cleanGameUrl, {
        label: 'Game link',
        required: true,
      });
      if (!gameCheck.valid) {
        throw new Error(gameCheck.error);
      }
      validatedGameUrl = gameCheck.normalizedUrl;
    }

    if (cleanWebsiteUrl) {
      const webCheck = validatePublicShowcaseUrl(cleanWebsiteUrl, {
        label: 'Live Website link',
        required: false,
      });
      if (!webCheck.valid) {
        throw new Error(webCheck.error);
      }
      validatedWebsiteUrl = webCheck.normalizedUrl;
    }
  }

  // Mandatory Cloudinary image requirement for all non-draft submissions
  if (params.desiredStatus !== 'draft' && (!params.media || params.media.length < 1)) {
    throw new Error(
      'Every post requires at least 1 uploaded image hosted on Cloudinary before submission.'
    );
  }

  // Mandatory Moderator pre-approval for ALL non-moderator / non-admin submissions
  let finalStatus: PublicPostStatus = 'published';
  if (params.desiredStatus === 'draft') {
    finalStatus = 'draft';
  } else if (!isModeratorOrAdmin) {
    finalStatus = 'pending_review';
  } else {
    finalStatus = 'published';
  }

  const nowIso = new Date().toISOString();
  const postRef = params.existingPostId
    ? doc(db, 'publicPosts', params.existingPostId)
    : doc(collection(db, 'publicPosts'));

  const cleanTags = params.tags
    .map((t) => filterProfanity(t.trim().replace(/^#/, '')).filteredText)
    .filter(Boolean)
    .slice(0, 8);

  const attachedMedia = params.media.slice(0, MAX_IMAGES_PER_POST).map((m) => ({
    ...m,
    postId: postRef.id,
  }));

  if (params.existingPostId) {
    const existingSnap = await getDoc(postRef);
    if (!existingSnap.exists()) {
      throw new Error('Post not found.');
    }
    const existingData = existingSnap.data() as PublicPost;
    const updatedPost: PublicPost = {
      ...existingData,
      title: filteredTitle,
      summary: filteredSummary || filteredBody.slice(0, 160),
      body: filteredBody,
      categoryId: params.categoryId,
      categoryName: params.categoryName,
      tags: cleanTags,
      media: attachedMedia,
      websiteUrl: validatedWebsiteUrl,
      gameUrl: validatedGameUrl,
      githubUrl: params.githubUrl?.trim() || '',
      challengeId: params.challengeId?.trim() || existingData.challengeId || '',
      challengeTitle: params.challengeTitle?.trim() || existingData.challengeTitle || '',
      status: finalStatus,
      updatedAt: nowIso,
    };
    await setDoc(postRef, updatedPost, { merge: true });
    clearPostDraftLocally(currentUser.uid);
    if (finalStatus === 'pending_review') {
      void notifyModeratorsOfPendingPost(updatedPost, params.authorProfile);
    } else if (finalStatus === 'published' && existingData.status !== 'published') {
      void notifyFollowersOfPublishedPost(updatedPost);
      void dispatchMentionNotifications({
        text: `${updatedPost.title}\n${updatedPost.body}`,
        senderUid: currentUser.uid,
        senderName: params.authorProfile.displayName,
        senderAvatar: params.authorProfile.avatarUrl,
        sourceType: 'public_post',
        postId: updatedPost.id,
        contextTitle: updatedPost.title,
      });
      void triggerContributionAward({
        action: 'showcase_published',
        postId: updatedPost.id,
      });
    }
    return updatedPost;
  }

  const newPost: PublicPost = {
    id: postRef.id,
    title: filteredTitle,
    summary: filteredSummary || filteredBody.slice(0, 160),
    body: filteredBody,
    categoryId: params.categoryId,
    categoryName: params.categoryName,
    tags: cleanTags,
    media: attachedMedia,
    websiteUrl: validatedWebsiteUrl,
    gameUrl: validatedGameUrl,
    githubUrl: params.githubUrl?.trim() || '',
    challengeId: params.challengeId?.trim() || '',
    challengeTitle: params.challengeTitle?.trim() || '',
    authorId: currentUser.uid,
    authorName: params.authorProfile.displayName,
    authorAvatar: params.authorProfile.avatarUrl || '',
    authorColor: params.authorProfile.avatarColor || '#FFF025',
    authorRole: params.authorProfile.role || 'member',
    status: finalStatus,
    isFeatured: false,
    reactionCounts: {},
    totalReactions: 0,
    commentCount: 0,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await setDoc(postRef, newPost);
  clearPostDraftLocally(currentUser.uid);

  if (finalStatus === 'pending_review') {
    void notifyModeratorsOfPendingPost(newPost, params.authorProfile);
  } else if (finalStatus === 'published') {
    void notifyFollowersOfPublishedPost(newPost);
    void dispatchMentionNotifications({
      text: `${newPost.title}\n${newPost.body}`,
      senderUid: currentUser.uid,
      senderName: params.authorProfile.displayName,
      senderAvatar: params.authorProfile.avatarUrl,
      sourceType: 'public_post',
      postId: newPost.id,
      contextTitle: newPost.title,
    });
    void triggerContributionAward({
      action: 'showcase_published',
      postId: newPost.id,
    });
  }

  return newPost;
}

/**
 * Pure helper that enforces at most 1 reaction per user on a public community post.
 * Clicking the same reaction type removes it; clicking a different reaction type replaces
 * the user's previous reaction on that post.
 */
export function computeSinglePostReactionTransition(
  currentCountsInput: Record<string, number> | undefined,
  existingTypesInput: PublicReactionType[] | undefined,
  reactionType: PublicReactionType
): {
  added: boolean;
  updatedTypes: PublicReactionType[];
  reactionCounts: Record<string, number>;
  totalReactions: number;
} {
  const currentCounts: Record<string, number> = { ...(currentCountsInput || {}) };
  const existingTypes: PublicReactionType[] = Array.from(new Set(existingTypesInput || []));
  const wasReactedWithSameType = existingTypes.includes(reactionType);

  // Remove any existing reactions by this user on this post
  for (const prevType of existingTypes) {
    currentCounts[prevType] = Math.max(0, (currentCounts[prevType] || 1) - 1);
    if (currentCounts[prevType] === 0) {
      delete currentCounts[prevType];
    }
  }

  let updatedTypes: PublicReactionType[] = [];
  if (!wasReactedWithSameType) {
    updatedTypes = [reactionType];
    currentCounts[reactionType] = (currentCounts[reactionType] || 0) + 1;
  }

  const totalReactions = Object.values(currentCounts).reduce((sum, n) => sum + (n || 0), 0);
  return {
    added: !wasReactedWithSameType,
    updatedTypes,
    reactionCounts: currentCounts,
    totalReactions,
  };
}

/**
 * Toggles a reaction on a public post for the authenticated user.
 * Strictly enforces at most ONE reaction per user per post in `publicPosts/{postId}/reactions/{uid}`
 * and updates aggregate counts on the post.
 */
export async function togglePublicPostReaction(
  postId: string,
  reactionType: PublicReactionType
): Promise<{ added: boolean; updatedTypes: PublicReactionType[] }> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Please sign in with Google to react to posts.');
  }

  const postRef = doc(db, 'publicPosts', postId);
  const reactionRef = doc(db, 'publicPosts', postId, 'reactions', currentUser.uid);

  const txResult = await runTransaction(db, async (tx) => {
    const postSnap = await tx.get(postRef);
    const reactionSnap = await tx.get(reactionRef);

    let postData: PublicPost;
    if (postSnap.exists()) {
      postData = postSnap.data() as PublicPost;
    } else {
      const seedMatch = INITIAL_PUBLIC_COMMUNITY_POSTS.find((p) => p.id === postId);
      if (!seedMatch) {
        throw new Error('Post no longer exists.');
      }
      postData = { ...seedMatch };
    }

    const existingTypes: PublicReactionType[] = reactionSnap.exists()
      ? ((reactionSnap.data() as PublicReactionDoc).types || [])
      : [];

    const {
      added,
      updatedTypes,
      reactionCounts: currentCounts,
      totalReactions,
    } = computeSinglePostReactionTransition(
      postData.reactionCounts,
      existingTypes,
      reactionType
    );

    const nowIso = new Date().toISOString();

    tx.set(reactionRef, {
      uid: currentUser.uid,
      postId,
      types: updatedTypes,
      updatedAt: nowIso,
    });

    if (postSnap.exists()) {
      tx.update(postRef, {
        reactionCounts: currentCounts,
        totalReactions,
        updatedAt: nowIso,
      });
    } else {
      tx.set(postRef, {
        ...postData,
        reactionCounts: currentCounts,
        totalReactions,
        updatedAt: nowIso,
      });
    }

    return { added, updatedTypes, authorId: postData.authorId, postTitle: postData.title };
  });

  if (
    txResult.added &&
    txResult.authorId &&
    txResult.authorId !== currentUser.uid &&
    !txResult.authorId.startsWith('team-') &&
    !txResult.authorId.startsWith('seed-')
  ) {
    void sendUserInboxNotification(txResult.authorId, {
      type: 'post_reaction',
      title: `${currentUser.displayName || 'A builder'} reacted to your post`,
      message: `Your post "${txResult.postTitle.slice(0, 80)}" received a new reaction.`,
      actionUrl: `/community/posts/${postId}`,
      actionLabel: 'View Post',
      senderId: currentUser.uid,
      senderName: currentUser.displayName || 'Builder',
      postId,
    });
  }

  return { added: txResult.added, updatedTypes: txResult.updatedTypes };
}

/**
 * Adds a comment or nested reply to `publicPosts/{postId}/comments/{commentId}` and increments `commentCount`.
 */
export async function addPublicPostComment(params: {
  postId: string;
  parentCommentId?: string | null;
  text: string;
  authorProfile: BuilderProfile;
}): Promise<PublicComment> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Please sign in with Google to comment.');
  }

  const filtered = filterProfanity(params.text.trim()).filteredText;
  if (!filtered) {
    throw new Error('Comment cannot be empty.');
  }

  const commentRef = doc(collection(db, 'publicPosts', params.postId, 'comments'));
  const postRef = doc(db, 'publicPosts', params.postId);
  const nowIso = new Date().toISOString();

  const newComment: PublicComment = {
    id: commentRef.id,
    postId: params.postId,
    parentCommentId: params.parentCommentId || null,
    authorId: currentUser.uid,
    authorName: params.authorProfile.displayName,
    authorAvatar: params.authorProfile.avatarUrl || '',
    authorColor: params.authorProfile.avatarColor || '#FFF025',
    authorRole: params.authorProfile.role || 'member',
    text: filtered,
    isEdited: false,
    status: 'active',
    reactionCounts: {},
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  let postAuthorId = '';
  let postTitle = '';

  await runTransaction(db, async (tx) => {
    const postSnap = await tx.get(postRef);
    let postData: PublicPost;
    if (postSnap.exists()) {
      postData = postSnap.data() as PublicPost;
    } else {
      const seedMatch = INITIAL_PUBLIC_COMMUNITY_POSTS.find((p) => p.id === params.postId);
      if (!seedMatch) {
        throw new Error('Post not found.');
      }
      postData = { ...seedMatch };
    }
    postAuthorId = postData.authorId;
    postTitle = postData.title;

    tx.set(commentRef, newComment);
    if (postSnap.exists()) {
      tx.update(postRef, {
        commentCount: (postData.commentCount || 0) + 1,
        updatedAt: nowIso,
      });
    } else {
      tx.set(postRef, {
        ...postData,
        commentCount: (postData.commentCount || 0) + 1,
        updatedAt: nowIso,
      });
    }
  });

  if (
    postAuthorId &&
    postAuthorId !== currentUser.uid &&
    !postAuthorId.startsWith('team-') &&
    !postAuthorId.startsWith('seed-')
  ) {
    void sendUserInboxNotification(postAuthorId, {
      type: 'post_comment',
      title: `${params.authorProfile.displayName} commented on "${postTitle.slice(0, 60)}"`,
      message: filtered.slice(0, 220),
      actionUrl: `/community/posts/${params.postId}`,
      actionLabel: 'View Discussion',
      senderId: currentUser.uid,
      senderName: params.authorProfile.displayName,
      senderAvatar: params.authorProfile.avatarUrl,
      postId: params.postId,
    });
  }

  void dispatchMentionNotifications({
    text: filtered,
    senderUid: currentUser.uid,
    senderName: params.authorProfile.displayName,
    senderAvatar: params.authorProfile.avatarUrl,
    sourceType: 'public_comment',
    postId: params.postId,
    contextTitle: postTitle,
    excludeUids: postAuthorId ? [postAuthorId] : [],
  });

  void triggerContributionAward({
    action: 'meaningful_reply',
    sourceKind: 'public_comment',
    sourceId: commentRef.id,
    parentId: params.postId,
  });

  return newComment;
}

export async function updatePublicPostComment(
  postId: string,
  commentId: string,
  newText: string
): Promise<void> {
  const filtered = filterProfanity(newText.trim()).filteredText;
  if (!filtered) {
    throw new Error('Comment cannot be empty.');
  }
  const commentRef = doc(db, 'publicPosts', postId, 'comments', commentId);
  await updateDoc(commentRef, {
    text: filtered,
    isEdited: true,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteOrRemovePublicComment(
  postId: string,
  commentId: string
): Promise<void> {
  const commentRef = doc(db, 'publicPosts', postId, 'comments', commentId);
  const postRef = doc(db, 'publicPosts', postId);
  const nowIso = new Date().toISOString();

  await runTransaction(db, async (tx) => {
    const postSnap = await tx.get(postRef);
    const commentSnap = await tx.get(commentRef);
    if (!commentSnap.exists()) return;
    tx.delete(commentRef);
    if (postSnap.exists()) {
      const postData = postSnap.data() as PublicPost;
      tx.update(postRef, {
        commentCount: Math.max(0, (postData.commentCount || 1) - 1),
        updatedAt: nowIso,
      });
    }
  });
}

export async function toggleBookmarkPublicPost(
  uid: string,
  postId: string,
  currentlyBookmarked: boolean
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    bookmarkedPostIds: currentlyBookmarked ? arrayRemove(postId) : arrayUnion(postId),
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Submits or updates a student verification request in `studentAccessRequests/{uid}`.
 */
export async function submitStudentAccessApplication(params: {
  fullName: string;
  schoolName: string;
  gradeLevel: string;
  programme: string;
  studentReference?: string;
  confirmedDeclaration: boolean;
}): Promise<StudentAccessRequest> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.email) {
    throw new Error('Please sign in with your Google account before submitting a student verification request.');
  }

  if (!params.fullName.trim() || !params.schoolName.trim() || !params.gradeLevel.trim() || !params.programme.trim()) {
    throw new Error('Please complete all required student verification fields.');
  }

  if (!params.confirmedDeclaration) {
    throw new Error('You must confirm that your student details are accurate and belong to a registered Jaystarbliss Studios student.');
  }

  const nowIso = new Date().toISOString();
  const reqRef = doc(db, 'studentAccessRequests', currentUser.uid);
  const existingSnap = await getDoc(reqRef);

  if (existingSnap.exists()) {
    const existing = existingSnap.data() as StudentAccessRequest;
    if (existing.status === 'approved') {
      return existing;
    }
    if (existing.status === 'suspended') {
      throw new Error('Your student access has been suspended. Please contact a Jaystarbliss Studios administrator.');
    }
  }

  const requestDoc: StudentAccessRequest = {
    uid: currentUser.uid,
    fullName: params.fullName.trim(),
    email: currentUser.email,
    schoolName: params.schoolName.trim(),
    gradeLevel: params.gradeLevel.trim(),
    programme: params.programme.trim(),
    studentReference: params.studentReference?.trim() || '',
    confirmedDeclaration: true,
    status: 'pending',
    verifiedAgainstOfficialRecords: false,
    publicStatusNote:
      'Your student verification request has been received and is awaiting review by a Jaystarbliss Studios administrator.',
    emailNotificationStatus: 'idle',
    createdAt: existingSnap.exists() ? (existingSnap.data() as StudentAccessRequest).createdAt : nowIso,
    updatedAt: nowIso,
  };

  await setDoc(reqRef, requestDoc, { merge: true });

  // Create in-app notification for the applicant
  const notifRef = doc(collection(db, 'userNotifications', currentUser.uid, 'items'));
  const notif: UserNotificationItem = {
    id: notifRef.id,
    uid: currentUser.uid,
    type: 'student_access_submitted',
    title: 'Student Hub Verification Request Received',
    message: `We received your verification request for ${requestDoc.programme} (${requestDoc.schoolName}). We'll notify you as soon as an admin verifies your student record.`,
    actionUrl: '/student-access/status',
    actionLabel: 'View Status',
    read: false,
    createdAt: nowIso,
  };
  await setDoc(notifRef, notif);

  // Trigger backend notification endpoint (non-blocking if Resend is not configured in preview)
  try {
    const idToken = await currentUser.getIdToken();
    await fetch('/api/student-access/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        uid: currentUser.uid,
        fullName: requestDoc.fullName,
        email: requestDoc.email,
        schoolName: requestDoc.schoolName,
        gradeLevel: requestDoc.gradeLevel,
        programme: requestDoc.programme,
        studentReference: requestDoc.studentReference,
      }),
    });
  } catch {
    // Firestore state is already saved
  }

  return requestDoc;
}

/**
 * Admin Action: Approve a student access request after verifying against official Jaystarbliss Studios records.
 */
export async function adminApproveStudentAccess(params: {
  targetRequest: StudentAccessRequest;
  verifiedAgainstOfficialRecords: boolean;
  privateAdminNotes?: string;
  officialRecordReference?: string;
  publicStatusNote?: string;
}): Promise<{
  emailStatus: EmailNotificationDeliveryStatus;
  emailError?: string;
}> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.email) {
    throw new Error('Admin authentication required.');
  }

  if (!params.verifiedAgainstOfficialRecords) {
    throw new Error(
      'You must confirm that this applicant has been checked against official Jaystarbliss Studios student records before approving.'
    );
  }

  const nowIso = new Date().toISOString();
  const idempotencyKey = `approve_${params.targetRequest.uid}_${nowIso.slice(0, 16)}`;

  let emailStatus: EmailNotificationDeliveryStatus = 'skipped';
  let emailError: string | undefined;

  // Call backend approval endpoint to dispatch Resend email notification
  try {
    const idToken = await currentUser.getIdToken();
    const res = await fetch('/api/student-access/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        uid: params.targetRequest.uid,
        fullName: params.targetRequest.fullName,
        email: params.targetRequest.email,
        schoolName: params.targetRequest.schoolName,
        gradeLevel: params.targetRequest.gradeLevel,
        programme: params.targetRequest.programme,
        verifiedAgainstOfficialRecords: true,
        publicStatusNote: params.publicStatusNote,
        idempotencyKey,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.emailNotificationStatus) {
      emailStatus = data.emailNotificationStatus;
      emailError = data.emailNotificationError;
    } else {
      emailStatus = 'failed';
      emailError = data.error || 'Email service returned an error.';
    }
  } catch (err) {
    emailStatus = 'failed';
    emailError = err instanceof Error ? err.message : 'Network error calling email endpoint.';
  }

  // Update Firestore records regardless of whether Resend email succeeded or failed
  const reqRef = doc(db, 'studentAccessRequests', params.targetRequest.uid);
  const membershipRef = doc(db, 'communityMemberships', params.targetRequest.uid);
  const userRef = doc(db, 'users', params.targetRequest.uid);

  await setDoc(
    reqRef,
    {
      status: 'approved',
      verifiedAgainstOfficialRecords: true,
      reviewedBy: currentUser.uid,
      reviewedByEmail: currentUser.email,
      reviewedAt: nowIso,
      publicStatusNote:
        params.publicStatusNote?.trim() ||
        'Approved! Your Jaystarbliss Studios student membership is verified. You can now enter the Build Buds Student Hub.',
      emailNotificationStatus: emailStatus,
      emailNotificationError: emailError || '',
      lastNotificationAttemptAt: nowIso,
      lastNotificationIdempotencyKey: idempotencyKey,
      updatedAt: nowIso,
    },
    { merge: true }
  );

  const membershipDoc: CommunityMembership = {
    uid: params.targetRequest.uid,
    email: params.targetRequest.email,
    displayName: params.targetRequest.fullName,
    status: 'approved',
    approvedBy: currentUser.uid,
    approvedByEmail: currentUser.email,
    approvedAt: nowIso,
    programme: params.targetRequest.programme,
    schoolName: params.targetRequest.schoolName,
    gradeLevel: params.targetRequest.gradeLevel,
    updatedAt: nowIso,
  };
  await setDoc(membershipRef, membershipDoc, { merge: true });

  // Also enrich the user's BuilderProfile with their verified school & grade
  try {
    await setDoc(
      userRef,
      {
        schoolName: params.targetRequest.schoolName,
        gradeLevel: params.targetRequest.gradeLevel,
        accountType: 'student',
        isApprovedStudent: true,
        studentAccessStatus: 'approved',
        updatedAt: nowIso,
      },
      { merge: true }
    );
  } catch {
    // Non-blocking if user doc hasn't been created yet
  }

  // Save private admin review notes in separate admin-only collection
  if (params.privateAdminNotes !== undefined || params.officialRecordReference !== undefined) {
    const noteDoc: StudentAccessAdminNote = {
      uid: params.targetRequest.uid,
      privateNotes: params.privateAdminNotes || '',
      officialRecordReference: params.officialRecordReference || '',
      verificationSource: 'manual_admin_check',
      updatedBy: currentUser.uid,
      updatedByEmail: currentUser.email,
      updatedAt: nowIso,
    };
    await setDoc(doc(db, 'studentAccessAdminNotes', params.targetRequest.uid), noteDoc, {
      merge: true,
    });
  }

  // Create in-app notification for the student
  const notifRef = doc(collection(db, 'userNotifications', params.targetRequest.uid, 'items'));
  const notif: UserNotificationItem = {
    id: notifRef.id,
    uid: params.targetRequest.uid,
    type: 'student_access_approved',
    title: "You're approved! Welcome to the Build Buds Student Hub 🎉",
    message: `Your student record for ${params.targetRequest.programme} at ${params.targetRequest.schoolName} has been verified. Click below to enter the private Student Hub!`,
    actionUrl: '/hub',
    actionLabel: 'Enter Build Buds Student Hub',
    read: false,
    createdAt: nowIso,
  };
  await setDoc(notifRef, notif);

  // Record audit log
  const auditLog: AdminAuditLog = {
    action: 'approve_student',
    targetUid: params.targetRequest.uid,
    targetEmail: params.targetRequest.email,
    targetName: params.targetRequest.fullName,
    adminUid: currentUser.uid,
    adminEmail: currentUser.email,
    verifiedAgainstOfficialRecords: true,
    reason: params.publicStatusNote || 'Verified against official Jaystarbliss Studios student records',
    emailDeliveryStatus: emailStatus,
    createdAt: nowIso,
  };
  await addDoc(collection(db, 'adminAuditLogs'), auditLog);

  // Broadcast welcome & guideline notification in #general-chat, #announcements, and #guidelines
  await broadcastNewMemberJoinedToHub({
    uid: params.targetRequest.uid,
    displayName: params.targetRequest.fullName,
    schoolName: params.targetRequest.schoolName,
    programme: params.targetRequest.programme,
  });

  return { emailStatus, emailError };
}

/**
 * Posts automatic real-time notifications in #general-chat and #announcements (and ensures #guidelines
 * has a detailed guideline post) whenever a student is approved by an Admin into the Private Student Hub.
 */
export async function broadcastNewMemberJoinedToHub(params: {
  uid: string;
  displayName: string;
  schoolName?: string;
  programme?: string;
}): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const cleanName = params.displayName.trim() || 'New Builder';
  const cleanSchool = params.schoolName?.trim() || 'Jaystarbliss Studios Partner School';
  const cleanProgramme = params.programme?.trim() || 'Build Buds Creator Club';
  const nowMillis = Date.now();

  try {
    // 1. Welcome notification in #general-chat
    await addDoc(collection(db, 'messages'), {
      channelId: 'general-chat',
      authorId: currentUser.uid,
      authorName: 'Build Buds Bot • Official',
      authorColor: '#FFF025',
      authorRole: 'admin',
      text: `🎉 Welcome @${cleanName} to the Build Buds Private Student Hub!\n🏫 School: ${cleanSchool} • Programme: ${cleanProgramme}\n✨ Everyone say hello! Check out #announcements and #guidelines to see how our creative channels work and start sharing what you're building!`,
      hadProfanity: false,
      threadCount: 0,
      reactions: { '🎉': 1, '🚀': 1 },
      userReactions: { '🎉': [currentUser.uid], '🚀': [currentUser.uid] },
      createdAt: serverTimestamp(),
      createdAtMillis: nowMillis,
    });

    // 2. Official New Member & Guideline summary in #announcements
    await addDoc(collection(db, 'messages'), {
      channelId: 'announcements',
      authorId: currentUser.uid,
      authorName: 'Jaystarbliss Studios Admin',
      authorColor: '#FFF025',
      authorRole: 'admin',
      text: `📣 NEW CORE MEMBER APPROVED: @${cleanName} (${cleanSchool}) has officially joined the Build Buds Private Student Hub!\n\n🛡️ Quick Community Guidelines for All Core Members:\n1. Respect & Kindness: Always give constructive, encouraging feedback on fellow builders' creations.\n2. Showcase Channels: Post playable games in #games, web apps in #websites, videos in #videos, and stories in #novels.\n3. Tagging & Mentions: Type @username to mention a specific builder or @all for group updates.\n4. Public Showcase Curation: Core members can publish creations to the Public Community Discovery feed or click "Request Public Showcase" on any link shared in chat!`,
      hadProfanity: false,
      threadCount: 0,
      reactions: { '🔥': 1, '👏': 1 },
      userReactions: { '🔥': [currentUser.uid], '👏': [currentUser.uid] },
      createdAt: serverTimestamp(),
      createdAtMillis: nowMillis + 10,
    });

    // 3. Ensure #guidelines has a comprehensive Community Guidelines reference post
    const guidelinesSnap = await getDocs(
      query(collection(db, 'messages'), where('channelId', '==', 'guidelines'), limit(3))
    );
    if (guidelinesSnap.empty) {
      await addDoc(collection(db, 'messages'), {
        channelId: 'guidelines',
        authorId: currentUser.uid,
        authorName: 'Jaystarbliss Studios Admin',
        authorColor: '#FFF025',
        authorRole: 'admin',
        text: `🛡️ OFFICIAL BUILD BUDS STUDENT HUB GUIDELINES\n\nWelcome to the private Build Buds Student Hub! Every member here has been verified by Jaystarbliss Studios and carries the Pro Core Member gradient ring.\n\n1️⃣ Build Boldly & Share Often:\n• Use #games, #websites, #videos, and #novels to post links and screenshots of your projects.\n• Use #help whenever you hit a bug or design challenge.\n\n2️⃣ Positive Peer Feedback:\n• Treat every builder with kindness and respect. Celebrate each other's launches and help debug issues together.\n• Profanity, bullying, or spam links are strictly filtered and moderated.\n\n3️⃣ Unique Builder Identity:\n• Every member has a unique username. Use @username to tag teammates or @all for important announcements.\n\n4️⃣ Public Community Publishing:\n• As a verified Student Hub member, you have publishing privileges on the Public Community Discovery page! Share your best work to inspire young creators everywhere.`,
        hadProfanity: false,
        threadCount: 0,
        reactions: { '❤️': 1, '🚀': 1 },
        userReactions: { '❤️': [currentUser.uid], '🚀': [currentUser.uid] },
        createdAt: serverTimestamp(),
        createdAtMillis: nowMillis + 20,
      });
    }
  } catch (err) {
    console.warn('Could not post welcome message to chat channels:', err);
  }
}

/**
 * Admin Action: Reject, Request More Information, or Suspend a student access request.
 */
export async function adminUpdateStudentAccessDecision(params: {
  targetRequest: StudentAccessRequest;
  newStatus: 'rejected' | 'more_information_required' | 'suspended';
  publicStatusNote: string;
  privateAdminNotes?: string;
  officialRecordReference?: string;
}): Promise<{
  emailStatus: EmailNotificationDeliveryStatus;
  emailError?: string;
}> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.email) {
    throw new Error('Admin authentication required.');
  }

  const nowIso = new Date().toISOString();
  const idempotencyKey = `${params.newStatus}_${params.targetRequest.uid}_${nowIso.slice(0, 16)}`;

  let emailStatus: EmailNotificationDeliveryStatus = 'skipped';
  let emailError: string | undefined;

  try {
    const idToken = await currentUser.getIdToken();
    const res = await fetch('/api/student-access/reject', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        uid: params.targetRequest.uid,
        fullName: params.targetRequest.fullName,
        email: params.targetRequest.email,
        schoolName: params.targetRequest.schoolName,
        programme: params.targetRequest.programme,
        status: params.newStatus,
        publicStatusNote: params.publicStatusNote,
        idempotencyKey,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.emailNotificationStatus) {
      emailStatus = data.emailNotificationStatus;
      emailError = data.emailNotificationError;
    } else {
      emailStatus = 'failed';
      emailError = data.error || 'Email service returned an error.';
    }
  } catch (err) {
    emailStatus = 'failed';
    emailError = err instanceof Error ? err.message : 'Network error calling email endpoint.';
  }

  const reqRef = doc(db, 'studentAccessRequests', params.targetRequest.uid);
  const membershipRef = doc(db, 'communityMemberships', params.targetRequest.uid);

  await setDoc(
    reqRef,
    {
      status: params.newStatus,
      reviewedBy: currentUser.uid,
      reviewedByEmail: currentUser.email,
      reviewedAt: nowIso,
      publicStatusNote: params.publicStatusNote.trim(),
      emailNotificationStatus: emailStatus,
      emailNotificationError: emailError || '',
      lastNotificationAttemptAt: nowIso,
      lastNotificationIdempotencyKey: idempotencyKey,
      updatedAt: nowIso,
    },
    { merge: true }
  );

  // Revoke or suspend communityMemberships record so private chat access is immediately blocked
  await setDoc(
    membershipRef,
    {
      uid: params.targetRequest.uid,
      email: params.targetRequest.email,
      displayName: params.targetRequest.fullName,
      status: params.newStatus === 'suspended' ? 'suspended' : 'revoked',
      approvedBy: currentUser.uid,
      approvedByEmail: currentUser.email,
      approvedAt: nowIso,
      updatedAt: nowIso,
    },
    { merge: true }
  );

  // Also ensure users/{uid} accountType is set back to 'public' so they are not treated as student
  try {
    await setDoc(
      doc(db, 'users', params.targetRequest.uid),
      {
        accountType: 'public',
        isApprovedStudent: false,
        studentAccessStatus: params.newStatus,
        updatedAt: nowIso,
      },
      { merge: true }
    );
  } catch {
    // Non-fatal
  }

  if (params.privateAdminNotes !== undefined || params.officialRecordReference !== undefined) {
    const noteDoc: StudentAccessAdminNote = {
      uid: params.targetRequest.uid,
      privateNotes: params.privateAdminNotes || '',
      officialRecordReference: params.officialRecordReference || '',
      verificationSource: 'manual_admin_check',
      updatedBy: currentUser.uid,
      updatedByEmail: currentUser.email,
      updatedAt: nowIso,
    };
    await setDoc(doc(db, 'studentAccessAdminNotes', params.targetRequest.uid), noteDoc, {
      merge: true,
    });
  }

  const notifTypeMap: Record<
    'rejected' | 'more_information_required' | 'suspended',
    UserNotificationItem['type']
  > = {
    rejected: 'student_access_rejected',
    more_information_required: 'student_access_more_info',
    suspended: 'student_access_suspended',
  };

  const notifTitleMap: Record<
    'rejected' | 'more_information_required' | 'suspended',
    string
  > = {
    rejected: 'Update on Your Student Hub Access Request',
    more_information_required: 'Additional Details Needed for Student Hub Verification',
    suspended: 'Student Hub Access Suspended',
  };

  const notifRef = doc(collection(db, 'userNotifications', params.targetRequest.uid, 'items'));
  const notif: UserNotificationItem = {
    id: notifRef.id,
    uid: params.targetRequest.uid,
    type: notifTypeMap[params.newStatus],
    title: notifTitleMap[params.newStatus],
    message: params.publicStatusNote.trim(),
    actionUrl: '/student-access/status',
    actionLabel:
      params.newStatus === 'more_information_required' ? 'Update Application' : 'View Status',
    read: false,
    createdAt: nowIso,
  };
  await setDoc(notifRef, notif);

  const actionMap: Record<
    'rejected' | 'more_information_required' | 'suspended',
    AdminAuditLog['action']
  > = {
    rejected: 'reject_student',
    more_information_required: 'request_more_info',
    suspended: 'suspend_student',
  };

  const auditLog: AdminAuditLog = {
    action: actionMap[params.newStatus],
    targetUid: params.targetRequest.uid,
    targetEmail: params.targetRequest.email,
    targetName: params.targetRequest.fullName,
    adminUid: currentUser.uid,
    adminEmail: currentUser.email,
    verifiedAgainstOfficialRecords: params.targetRequest.verifiedAgainstOfficialRecords,
    reason: params.publicStatusNote.trim(),
    emailDeliveryStatus: emailStatus,
    createdAt: nowIso,
  };
  await addDoc(collection(db, 'adminAuditLogs'), auditLog);

  return { emailStatus, emailError };
}

/**
 * Retries a failed email notification for an already reviewed student access request.
 */
export async function adminRetryStudentNotification(
  targetRequest: StudentAccessRequest
): Promise<{
  emailStatus: EmailNotificationDeliveryStatus;
  emailError?: string;
}> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.email) {
    throw new Error('Admin authentication required.');
  }

  const nowIso = new Date().toISOString();
  const idempotencyKey = `retry_${targetRequest.status}_${targetRequest.uid}_${nowIso}`;

  let emailStatus: EmailNotificationDeliveryStatus = 'failed';
  let emailError: string | undefined;

  try {
    const idToken = await currentUser.getIdToken();
    const res = await fetch('/api/student-access/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        uid: targetRequest.uid,
        fullName: targetRequest.fullName,
        email: targetRequest.email,
        schoolName: targetRequest.schoolName,
        programme: targetRequest.programme,
        status: targetRequest.status,
        publicStatusNote: targetRequest.publicStatusNote,
        idempotencyKey,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.emailNotificationStatus) {
      emailStatus = data.emailNotificationStatus;
      emailError = data.emailNotificationError;
    } else {
      emailStatus = 'failed';
      emailError = data.error || 'Email retry failed.';
    }
  } catch (err) {
    emailStatus = 'failed';
    emailError = err instanceof Error ? err.message : 'Network error retrying notification.';
  }

  await updateDoc(doc(db, 'studentAccessRequests', targetRequest.uid), {
    emailNotificationStatus: emailStatus,
    emailNotificationError: emailError || '',
    lastNotificationAttemptAt: nowIso,
    lastNotificationIdempotencyKey: idempotencyKey,
    updatedAt: nowIso,
  });

  await addDoc(collection(db, 'adminAuditLogs'), {
    action: 'retry_notification',
    targetUid: targetRequest.uid,
    targetEmail: targetRequest.email,
    targetName: targetRequest.fullName,
    adminUid: currentUser.uid,
    adminEmail: currentUser.email,
    verifiedAgainstOfficialRecords: targetRequest.verifiedAgainstOfficialRecords,
    reason: `Retried email notification for status: ${targetRequest.status}`,
    emailDeliveryStatus: emailStatus,
    createdAt: nowIso,
  } satisfies AdminAuditLog);

  return { emailStatus, emailError };
}

/**
 * Admin Migration / Direct Approval Helper: Approves a registered builder (`users/{uid}`) into `communityMemberships/{uid}`
 * and broadcasts their join notification to #general-chat and #announcements.
 */
export async function adminMigrateLegacyBuilderToStudent(
  builder: BuilderProfile,
  email?: string
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.email) {
    throw new Error('Admin authentication required.');
  }

  const nowIso = new Date().toISOString();
  const membershipRef = doc(db, 'communityMemberships', builder.uid);
  const reqRef = doc(db, 'studentAccessRequests', builder.uid);

  const membership: CommunityMembership = {
    uid: builder.uid,
    email: email || '',
    displayName: builder.displayName,
    status: 'approved',
    approvedBy: currentUser.uid,
    approvedByEmail: currentUser.email,
    approvedAt: nowIso,
    programme: builder.primaryInterest || 'Build Buds School Creator Club',
    schoolName: builder.schoolName || 'Jaystarbliss Studios Partner School',
    gradeLevel: builder.gradeLevel || 'Student Builder',
    isLegacyMigrated: true,
    updatedAt: nowIso,
  };

  await setDoc(membershipRef, membership, { merge: true });

  await setDoc(
    reqRef,
    {
      uid: builder.uid,
      fullName: builder.displayName,
      email: email || '',
      schoolName: builder.schoolName || 'Jaystarbliss Studios Partner School',
      gradeLevel: builder.gradeLevel || 'Student Builder',
      programme: builder.primaryInterest || 'Build Buds School Creator Club',
      studentReference: 'ADMIN-APPROVED',
      confirmedDeclaration: true,
      status: 'approved',
      verifiedAgainstOfficialRecords: true,
      reviewedBy: currentUser.uid,
      reviewedByEmail: currentUser.email,
      reviewedAt: nowIso,
      publicStatusNote: 'Approved by Admin for Build Buds Private Student Hub access.',
      emailNotificationStatus: 'skipped',
      createdAt: builder.createdAt || nowIso,
      updatedAt: nowIso,
    } satisfies StudentAccessRequest,
    { merge: true }
  );

  await setDoc(
    doc(db, 'users', builder.uid),
    {
      accountType: 'student',
      isApprovedStudent: true,
      updatedAt: nowIso,
    },
    { merge: true }
  );

  // Create in-app notification for the approved member
  const notifRef = doc(collection(db, 'userNotifications', builder.uid, 'items'));
  await setDoc(notifRef, {
    id: notifRef.id,
    uid: builder.uid,
    type: 'student_access_approved',
    title: "You're approved! Welcome to the Build Buds Student Hub 🎉",
    message: `An administrator has approved your Build Buds Student Hub membership. Click below to enter the private Student Hub!`,
    actionUrl: '/hub',
    actionLabel: 'Enter Build Buds Student Hub',
    read: false,
    createdAt: nowIso,
  } satisfies UserNotificationItem);

  await addDoc(collection(db, 'adminAuditLogs'), {
    action: 'migrate_legacy_student',
    targetUid: builder.uid,
    targetEmail: email || 'builder-account',
    targetName: builder.displayName,
    adminUid: currentUser.uid,
    adminEmail: currentUser.email,
    verifiedAgainstOfficialRecords: true,
    reason: 'Approved registered builder into private Student Hub membership',
    emailDeliveryStatus: 'skipped',
    createdAt: nowIso,
  } satisfies AdminAuditLog);

  // Broadcast welcome & guideline notification in #general-chat, #announcements, and #guidelines
  await broadcastNewMemberJoinedToHub({
    uid: builder.uid,
    displayName: builder.displayName,
    schoolName: builder.schoolName || 'Jaystarbliss Studios Partner School',
    programme: builder.primaryInterest || 'Build Buds Creator Club',
  });
}

/**
 * Admin Action: Revoke or Reject Student Hub access for a registered user (`users/{uid}`),
 * immediately removing them from the Private Student Hub while keeping their public community account intact.
 */
export async function adminRevokeStudentHubAccess(
  builder: {
    uid: string;
    displayName: string;
    email?: string;
    schoolName?: string;
    gradeLevel?: string;
    primaryInterest?: string;
  },
  reason: string = 'Access restricted to verified Jaystarbliss Studios Student Hub members.'
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.email) {
    throw new Error('Admin authentication required.');
  }

  const nowIso = new Date().toISOString();

  await setDoc(
    doc(db, 'communityMemberships', builder.uid),
    {
      uid: builder.uid,
      email: builder.email || '',
      displayName: builder.displayName,
      status: 'revoked',
      approvedBy: currentUser.uid,
      approvedByEmail: currentUser.email,
      approvedAt: nowIso,
      updatedAt: nowIso,
    },
    { merge: true }
  );

  await setDoc(
    doc(db, 'studentAccessRequests', builder.uid),
    {
      uid: builder.uid,
      fullName: builder.displayName,
      email: builder.email || '',
      schoolName: builder.schoolName || 'Not specified',
      gradeLevel: builder.gradeLevel || 'Not specified',
      programme: builder.primaryInterest || 'General Community',
      confirmedDeclaration: false,
      status: 'rejected',
      verifiedAgainstOfficialRecords: false,
      reviewedBy: currentUser.uid,
      reviewedByEmail: currentUser.email,
      reviewedAt: nowIso,
      publicStatusNote: reason,
      emailNotificationStatus: 'skipped',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    { merge: true }
  );

  await setDoc(
    doc(db, 'users', builder.uid),
    {
      accountType: 'public',
      isApprovedStudent: false,
      studentAccessStatus: 'rejected',
      updatedAt: nowIso,
    },
    { merge: true }
  );

  await addDoc(collection(db, 'adminAuditLogs'), {
    action: 'reject_student',
    targetUid: builder.uid,
    targetEmail: builder.email || 'builder-account',
    targetName: builder.displayName,
    adminUid: currentUser.uid,
    adminEmail: currentUser.email,
    verifiedAgainstOfficialRecords: false,
    reason,
    emailDeliveryStatus: 'skipped',
    createdAt: nowIso,
  } satisfies AdminAuditLog);
}

export async function updatePublicCommunityConfig(
  updates: Partial<PublicCommunityConfig>
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Authentication required.');
  const nowIso = new Date().toISOString();
  await setDoc(
    doc(db, 'community_settings', 'public_config'),
    {
      ...updates,
      updatedBy: currentUser.uid,
      updatedAt: nowIso,
    },
    { merge: true }
  );
}

/**
 * Submits a creator link from private student hub for consideration in the public community showcase.
 */
export async function submitCreationForPublicShowcase(params: {
  messageId: string;
  channelId: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  creatorColor?: string;
  title: string;
  description: string;
  linkUrl: string;
  linkCategory?: string;
  linkDomain?: string;
  coverImageUrl?: string;
}): Promise<ShowcaseSubmission> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Authentication required.');

  const linkCheck = validatePublicShowcaseUrl(params.linkUrl, {
    label: 'Showcase link',
    required: true,
  });
  if (!linkCheck.valid) {
    throw new Error(linkCheck.error);
  }

  const nowIso = new Date().toISOString();
  const subRef = doc(db, 'showcaseSubmissions', params.messageId);

  const submission: ShowcaseSubmission = {
    id: params.messageId,
    sourceMessageId: params.messageId,
    channelId: params.channelId,
    creatorId: params.creatorId,
    creatorName: params.creatorName,
    creatorAvatar: params.creatorAvatar || '',
    creatorColor: params.creatorColor || '#FFF025',
    title: params.title.trim(),
    description: params.description.trim(),
    linkUrl: linkCheck.normalizedUrl,
    linkCategory: params.linkCategory || 'projects',
    linkDomain: params.linkDomain || '',
    coverImageUrl: params.coverImageUrl || '',
    status: 'pending',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await setDoc(subRef, submission, { merge: true });

  // Update the message metadata in messages collection if exists
  try {
    const msgRef = doc(db, 'messages', params.messageId);
    await updateDoc(msgRef, {
      showcaseStatus: 'pending',
      showcaseRequestedAt: nowIso,
    });
  } catch {
    // If message is in subchannel or different path, non-fatal
  }

  return submission;
}

/**
 * Admin curates a private showcase submission, either approving it and publishing it as a PublicPost
 * or rejecting it with feedback.
 */
export async function adminCurateShowcaseSubmission(
  submissionId: string,
  updates: {
    title: string;
    summary: string;
    body: string;
    categoryId: string;
    categoryName: string;
    tags: string[];
    media?: CloudinaryMediaItem[];
    status: 'approved' | 'rejected';
    adminNotes?: string;
    fallbackSubmission?: {
      sourceMessageId?: string;
      channelId?: string;
      creatorId: string;
      creatorName: string;
      creatorAvatar?: string;
      creatorColor?: string;
      linkUrl: string;
      linkCategory?: string;
      linkDomain?: string;
      coverImageUrl?: string;
    };
  }
): Promise<{ success: boolean; publicPostId?: string }> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.email) {
    throw new Error('Admin credentials required.');
  }

  const nowIso = new Date().toISOString();
  const subRef = doc(db, 'showcaseSubmissions', submissionId);
  const subSnap = await getDoc(subRef);

  let submission: ShowcaseSubmission | null = null;
  if (subSnap.exists()) {
    submission = subSnap.data() as ShowcaseSubmission;
  } else if (updates.fallbackSubmission && updates.fallbackSubmission.linkUrl) {
    const fb = updates.fallbackSubmission;
    submission = {
      id: submissionId,
      sourceMessageId: fb.sourceMessageId || submissionId,
      channelId: fb.channelId || 'general-chat',
      creatorId: fb.creatorId || currentUser.uid,
      creatorName: fb.creatorName || 'Student Builder',
      creatorAvatar: fb.creatorAvatar || '',
      creatorColor: fb.creatorColor || '#FFF025',
      title: updates.title.trim() || 'Student Creation',
      description: updates.body.trim() || updates.summary.trim() || '',
      linkUrl: fb.linkUrl.trim(),
      linkCategory: fb.linkCategory || 'other',
      linkDomain: fb.linkDomain || '',
      coverImageUrl: fb.coverImageUrl || '',
      status: 'pending',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  } else {
    // Fallback to checking the source message document directly in Firestore
    try {
      const msgSnap = await getDoc(doc(db, 'messages', submissionId));
      if (msgSnap.exists()) {
        const msgData = msgSnap.data() as Record<string, any>;
        submission = {
          id: submissionId,
          sourceMessageId: submissionId,
          channelId: String(msgData.channelId || 'general-chat'),
          creatorId: String(msgData.authorId || currentUser.uid),
          creatorName: String(msgData.authorName || 'Student Builder'),
          creatorAvatar: String(msgData.authorAvatar || ''),
          creatorColor: String(msgData.authorColor || '#FFF025'),
          title: updates.title.trim() || String(msgData.linkTitle || 'Student Creation'),
          description: updates.body.trim() || String(msgData.linkDescription || msgData.text || ''),
          linkUrl: String(msgData.linkUrl || ''),
          linkCategory: String(msgData.linkCategory || 'other'),
          linkDomain: String(msgData.linkDomain || ''),
          coverImageUrl: String(msgData.coverImageUrl || ''),
          status: 'pending',
          createdAt: nowIso,
          updatedAt: nowIso,
        };
      }
    } catch {
      // Fall through to error if truly missing
    }
  }

  if (!submission) {
    throw new Error('Showcase submission not found.');
  }

  const resolvedCover = normalizeCoverImageUrl(
    submission.coverImageUrl || '',
    (submission.linkCategory as any) || (updates.categoryId === 'games' ? 'game' : updates.categoryId === 'websites' ? 'website' : 'other')
  );

  if (updates.status === 'approved') {
    const linkCheck = validatePublicShowcaseUrl(submission.linkUrl, {
      label: 'Showcase link',
      required: true,
    });
    if (!linkCheck.valid) {
      throw new Error(linkCheck.error);
    }
    const cleanShowcaseUrl = linkCheck.normalizedUrl;

    const postRef = doc(collection(db, 'publicPosts'));
    const mediaItems: CloudinaryMediaItem[] =
      updates.media && updates.media.length > 0
        ? updates.media
        : resolvedCover
        ? [
            {
              publicId: `submission-${submissionId}`,
              secureUrl: resolvedCover,
              ownerUid: submission.creatorId,
              format: 'jpg',
              width: 1200,
              height: 675,
              bytes: 0,
              createdAt: nowIso,
            },
          ]
        : [];

    const isGame =
      updates.categoryId === 'games' ||
      submission.linkCategory === 'game' ||
      submission.linkCategory === 'games';

    const newPublicPost: PublicPost = {
      id: postRef.id,
      title: updates.title.trim(),
      summary: updates.summary.trim() || updates.body.slice(0, 160),
      body: updates.body.trim() || updates.summary.trim() || updates.title.trim(),
      categoryId: updates.categoryId,
      categoryName: updates.categoryName,
      tags: updates.tags && updates.tags.length > 0 ? updates.tags : ['Showcase', 'Student Builder'],
      media: mediaItems,
      websiteUrl: cleanShowcaseUrl,
      gameUrl: isGame ? cleanShowcaseUrl : '',
      githubUrl: '',
      authorId: submission.creatorId,
      authorName: submission.creatorName,
      authorAvatar: submission.creatorAvatar || '',
      authorColor: submission.creatorColor || '#FFF025',
      authorRole: 'member',
      status: 'published',
      isFeatured: true,
      reactionCounts: {},
      totalReactions: 0,
      commentCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await setDoc(postRef, newPublicPost);

    await setDoc(
      subRef,
      {
        ...submission,
        title: updates.title.trim() || submission.title,
        description: updates.summary.trim() || submission.description,
        status: 'approved',
        publicPostId: postRef.id,
        reviewedBy: currentUser.uid,
        adminNotes: updates.adminNotes || 'Featured in public community showcase.',
        updatedAt: nowIso,
      },
      { merge: true }
    );

    try {
      const msgRef = doc(db, 'messages', submission.sourceMessageId || submissionId);
      await updateDoc(msgRef, {
        showcaseStatus: 'approved',
        publicPostId: postRef.id,
      });
    } catch {
      // Non-fatal
    }

    // Notify creator
    try {
      const notifRef = doc(collection(db, 'userNotifications', submission.creatorId, 'items'));
      const notif: UserNotificationItem = {
        id: notifRef.id,
        uid: submission.creatorId,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'Build Buds Admin',
        type: 'curation_approved',
        title: 'Project Featured in Public Showcase! 🎉',
        message: `Your project "${updates.title}" has been curated by our mentors and is now showcased publicly on the Build Buds Explore page.`,
        actionUrl: `/community/creations`,
        actionLabel: 'View Showcase',
        read: false,
        createdAt: nowIso,
      };
      await setDoc(notifRef, notif);
    } catch {
      // Non-fatal
    }

    try {
      await addDoc(collection(db, 'adminAuditLogs'), {
        action: 'curate_showcase',
        targetUid: submission.creatorId,
        targetEmail: 'student-builder',
        targetName: submission.creatorName,
        adminUid: currentUser.uid,
        adminEmail: currentUser.email,
        verifiedAgainstOfficialRecords: true,
        reason: `Approved & published showcase post ${postRef.id}`,
        createdAt: nowIso,
      } satisfies AdminAuditLog);
    } catch {
      // Non-fatal
    }

    void triggerContributionAward({
      action: 'showcase_published',
      postId: postRef.id,
    });

    return { success: true, publicPostId: postRef.id };
  } else {
    // Rejected
    await setDoc(
      subRef,
      {
        ...submission,
        status: 'rejected',
        reviewedBy: currentUser.uid,
        adminNotes: updates.adminNotes || 'Not selected for public showcase at this time.',
        updatedAt: nowIso,
      },
      { merge: true }
    );

    try {
      const msgRef = doc(db, 'messages', submission.sourceMessageId || submissionId);
      await updateDoc(msgRef, {
        showcaseStatus: 'rejected',
      });
    } catch {
      // Non-fatal
    }

    try {
      const notifRef = doc(collection(db, 'userNotifications', submission.creatorId, 'items'));
      const notif: UserNotificationItem = {
        id: notifRef.id,
        uid: submission.creatorId,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'Build Buds Admin',
        type: 'curation_rejected',
        title: 'Showcase Submission Review',
        message: updates.adminNotes || 'Your project submission was reviewed. Keep building and sharing updates in the student hub!',
        actionUrl: `/community`,
        actionLabel: 'Community Home',
        read: false,
        createdAt: nowIso,
      };
      await setDoc(notifRef, notif);
    } catch {
      // Non-fatal
    }

    return { success: true };
  }
}

/**
 * Admin unpublishes or removes a public post from the showcase.
 */
export async function adminUnpublishPublicPost(postId: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Admin credentials required.');

  const nowIso = new Date().toISOString();
  const postRef = doc(db, 'publicPosts', postId);
  await updateDoc(postRef, {
    status: 'removed',
    updatedAt: nowIso,
  });
}

/**
 * Subscribes to pending and reviewed showcase submissions for admin curation.
 */
export function subscribeToShowcaseSubmissions(
  callback: (submissions: ShowcaseSubmission[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(collection(db, 'showcaseSubmissions'), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as ShowcaseSubmission);
      callback(list);
    },
    (err) => {
      if (onError) onError(err as unknown as Error);
    }
  );
}

/**
 * Subscribes to user notifications in real-time.
 */
export function subscribeToUserNotifications(
  uid: string,
  callback: (notifications: UserNotificationItem[]) => void
): () => void {
  const notifRef = collection(db, 'userNotifications', uid, 'items');
  const q = query(notifRef, orderBy('createdAt', 'desc'), limit(25));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => d.data() as UserNotificationItem);
      callback(items);
    },
    () => {
      // Fallback empty
      callback([]);
    }
  );
}

/**
 * Marks a notification as read.
 */
export async function markNotificationAsRead(uid: string, notifId: string): Promise<void> {
  try {
    const notifRef = doc(db, 'userNotifications', uid, 'items', notifId);
    await updateDoc(notifRef, { read: true });
  } catch {
    // Non-fatal
  }
}

export async function markAllNotificationsAsRead(
  uid: string,
  notifications: UserNotificationItem[]
): Promise<void> {
  const unread = notifications.filter((n) => !n.read);
  if (unread.length === 0) return;
  await Promise.all(
    unread.map((n) =>
      updateDoc(doc(db, 'userNotifications', uid, 'items', n.id), { read: true }).catch(() => {})
    )
  );
}

/**
 * Low-level safe helper for dispatching an in-app notification to a user's Inbox (`userNotifications/{uid}/items`).
 */
export async function sendUserInboxNotification(
  targetUid: string,
  payload: Omit<UserNotificationItem, 'id' | 'uid' | 'read' | 'createdAt'>
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !targetUid || targetUid === currentUser.uid) return;
  if (targetUid.startsWith('seed-') || targetUid.startsWith('team-')) return;

  try {
    const notifRef = doc(collection(db, 'userNotifications', targetUid, 'items'));
    const notif: UserNotificationItem = {
      id: notifRef.id,
      uid: targetUid,
      type: payload.type,
      title: String(payload.title || 'New Build Buds Update').slice(0, 195),
      message: String(payload.message || '').slice(0, 990),
      actionUrl: payload.actionUrl || '/community',
      actionLabel: payload.actionLabel || 'Open',
      senderId: payload.senderId || currentUser.uid,
      senderName: payload.senderName || currentUser.displayName || 'Builder',
      senderAvatar: payload.senderAvatar || '',
      channelId: payload.channelId || '',
      ...(payload.streamId ? { streamId: payload.streamId } : {}),
      ...(payload.messageId ? { messageId: payload.messageId } : {}),
      ...(payload.reportId ? { reportId: payload.reportId } : {}),
      postId: payload.postId || '',
      read: false,
      createdAt: new Date().toISOString(),
    };
    await setDoc(notifRef, notif);
  } catch {
    // Non-blocking notification delivery
  }
}

// ===============================================================
// Creator Follow System (`creatorFollows/{followerUid}_{creatorUid}`)
// ===============================================================

export function creatorFollowDocId(followerUid: string, creatorUid: string): string {
  return `${followerUid}_${creatorUid}`;
}

export async function followCreator(params: {
  creatorUid: string;
  creatorName: string;
  followerProfile: BuilderProfile;
}): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Please sign in with Google to follow creators.');
  }
  if (!params.creatorUid || params.creatorUid === currentUser.uid) return;

  const followId = creatorFollowDocId(currentUser.uid, params.creatorUid);
  const followDoc: CreatorFollowDoc = {
    id: followId,
    followerUid: currentUser.uid,
    creatorUid: params.creatorUid,
    followerName: params.followerProfile.displayName,
    creatorName: params.creatorName,
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'creatorFollows', followId), followDoc);

  void sendUserInboxNotification(params.creatorUid, {
    type: 'new_follower',
    title: `${params.followerProfile.displayName} started following you`,
    message: 'They will now receive Inbox updates whenever your new creations are published!',
    actionUrl: '/community',
    actionLabel: 'Explore Community',
    senderId: currentUser.uid,
    senderName: params.followerProfile.displayName,
    senderAvatar: params.followerProfile.avatarUrl,
  });
}

export async function unfollowCreator(creatorUid: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !creatorUid) return;
  const followId = creatorFollowDocId(currentUser.uid, creatorUid);
  await deleteDoc(doc(db, 'creatorFollows', followId));
}

export function subscribeToMyFollowing(
  followerUid: string,
  callback: (followedCreatorUids: string[]) => void
): () => void {
  const q = query(
    collection(db, 'creatorFollows'),
    where('followerUid', '==', followerUid),
    limit(200)
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => (d.data() as CreatorFollowDoc).creatorUid).filter(Boolean));
    },
    () => callback([])
  );
}

export async function getCreatorFollowerCount(creatorUid: string): Promise<number> {
  if (!creatorUid || creatorUid.startsWith('seed-') || creatorUid.startsWith('team-')) {
    return 0;
  }
  try {
    const q = query(
      collection(db, 'creatorFollows'),
      where('creatorUid', '==', creatorUid),
      limit(200)
    );
    const snap = await getDocs(q);
    return snap.size;
  } catch {
    return 0;
  }
}

// ===============================================================
// Channel Activity & Cross-Platform @Mention / Follower / Mod Dispatchers
// ===============================================================

export async function updateChannelActivitySnapshot(params: {
  channelId: string;
  streamId: string;
  messageId: string;
  authorId: string;
  authorName: string;
  text: string;
  mentionedUids: string[];
  mentionAll: boolean;
}): Promise<void> {
  if (!params.channelId) return;
  try {
    const activityDoc: ChannelActivityDoc = {
      channelId: params.channelId,
      streamId: params.streamId || params.channelId,
      lastMessageId: params.messageId,
      lastMessageAtMillis: Date.now(),
      lastMessageAuthorId: params.authorId,
      lastMessageAuthorName: params.authorName,
      lastMessagePreview: params.text.trim().slice(0, 140),
      lastMentionedUids: params.mentionedUids.slice(0, 40),
      lastMentionAll: params.mentionAll,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'channelActivity', params.channelId), activityDoc, { merge: true });
  } catch {
    // Non-blocking activity summary write
  }
}

export async function dispatchMentionNotifications(params: {
  text: string;
  senderUid: string;
  senderName: string;
  senderAvatar?: string;
  sourceType: 'hub_channel' | 'hub_thread' | 'public_post' | 'public_comment';
  channelId?: string;
  channelName?: string;
  postId?: string;
  contextTitle?: string;
  excludeUids?: string[];
}): Promise<{ mentionedUids: string[]; mentionAll: boolean }> {
  const cleanText = params.text.trim();
  if (!cleanText || !cleanText.includes('@')) {
    return { mentionedUids: [], mentionAll: false };
  }

  try {
    const usersSnap = await getDocs(query(collection(db, 'users'), limit(150)));
    const allUsers = usersSnap.docs.map((d) => d.data() as BuilderProfile);

    const { mentionedUids, mentionAll } = resolveMentionedTargets(
      cleanText,
      allUsers,
      params.senderUid
    );

    const excludeSet = new Set(params.excludeUids || []);
    let targetProfiles: BuilderProfile[] = [];

    if (mentionAll) {
      const isHubSource = params.sourceType === 'hub_channel' || params.sourceType === 'hub_thread';
      targetProfiles = allUsers.filter(
        (u) =>
          u.uid !== params.senderUid &&
          !excludeSet.has(u.uid) &&
          u.status !== 'banned' &&
          (!isHubSource || isApprovedStudentMember({ profile: u }))
      );
    } else {
      targetProfiles = allUsers.filter(
        (u) => mentionedUids.includes(u.uid) && !excludeSet.has(u.uid) && u.status !== 'banned'
      );
    }

    const actionUrl =
      params.sourceType === 'hub_channel' || params.sourceType === 'hub_thread'
        ? `/hub?channel=${encodeURIComponent(params.channelId || 'general-chat')}`
        : params.postId
        ? `/community/posts/${params.postId}`
        : '/community';

    const title =
      params.sourceType === 'hub_channel' || params.sourceType === 'hub_thread'
        ? `${params.senderName} tagged ${mentionAll ? '@all' : 'you'} in #${params.channelName || params.channelId || 'hub'}`
        : `${params.senderName} tagged ${mentionAll ? '@all' : 'you'} on "${(params.contextTitle || 'a post').slice(0, 50)}"`;

    await Promise.all(
      targetProfiles.slice(0, 60).map((u) =>
        sendUserInboxNotification(u.uid, {
          type: 'mention',
          title,
          message: cleanText.slice(0, 240),
          actionUrl,
          actionLabel:
            params.sourceType === 'hub_channel' || params.sourceType === 'hub_thread'
              ? `Open #${params.channelName || params.channelId || 'chat'}`
              : 'View Post',
          senderId: params.senderUid,
          senderName: params.senderName,
          senderAvatar: params.senderAvatar,
          channelId: params.channelId,
          postId: params.postId,
        })
      )
    );

    return {
      mentionedUids: targetProfiles.map((u) => u.uid),
      mentionAll,
    };
  } catch {
    return { mentionedUids: [], mentionAll: false };
  }
}

export async function notifyModeratorsOfPendingPost(
  post: PublicPost,
  authorProfile: BuilderProfile
): Promise<void> {
  try {
    const usersSnap = await getDocs(
      query(collection(db, 'users'), where('role', 'in', ['moderator', 'admin']), limit(40))
    );
    const modUids = new Set<string>();
    usersSnap.docs.forEach((d) => {
      const u = d.data() as BuilderProfile;
      if (u.uid && u.uid !== post.authorId) modUids.add(u.uid);
    });

    await Promise.all(
      Array.from(modUids).map((uid) =>
        sendUserInboxNotification(uid, {
          type: 'post_pending_review',
          title: `New post awaits Moderator review`,
          message: `${authorProfile.displayName} submitted "${post.title.slice(0, 90)}" (${post.categoryName}).`,
          actionUrl: '/community?tab=review',
          actionLabel: 'Review Queue',
          senderId: post.authorId,
          senderName: authorProfile.displayName,
          senderAvatar: authorProfile.avatarUrl,
          postId: post.id,
        })
      )
    );
  } catch {
    // Non-blocking
  }
}

export async function notifyModeratorsAndAdminsOfReport(params: {
  reporterUid: string;
  reporterName: string;
  channelId: string;
  streamId?: string;
  channelName?: string;
  messageId?: string;
  reportId?: string;
  flaggedMessageText?: string;
  flaggedAuthorName?: string;
  targetSummary: string;
  reason: string;
  channelModeratorIds?: string[];
}): Promise<void> {
  try {
    const [usersSnap, adminsSnap] = await Promise.all([
      getDocs(
        query(collection(db, 'users'), where('role', 'in', ['moderator', 'admin']), limit(40))
      ),
      getDocs(query(collection(db, 'admins'), limit(20))).catch(() => null),
    ]);
    const recipientUids = new Set<string>(params.channelModeratorIds || []);
    usersSnap.docs.forEach((d) => {
      const u = d.data() as BuilderProfile;
      if (u.uid) recipientUids.add(u.uid);
    });
    adminsSnap?.docs.forEach((d) => {
      if (d.id) recipientUids.add(d.id);
    });
    recipientUids.delete(params.reporterUid);

    const isPublic = params.channelId.startsWith('publicPosts/');
    const rawStreamId = params.streamId || params.channelId;
    const baseChannelId = params.channelId.split('__group__')[0];

    let actionUrl = isPublic
      ? `/${params.channelId.replace('publicPosts/', 'community/posts/')}`
      : `/hub?channel=${encodeURIComponent(baseChannelId)}`;

    if (isPublic && params.reportId) {
      actionUrl = `${actionUrl}?reportId=${encodeURIComponent(params.reportId)}`;
    } else if (!isPublic) {
      const qs = new URLSearchParams();
      qs.set('channel', baseChannelId);
      if (rawStreamId && rawStreamId !== baseChannelId) {
        qs.set('stream', rawStreamId);
      }
      if (params.messageId) {
        qs.set('messageId', params.messageId);
      }
      if (params.reportId) {
        qs.set('reportId', params.reportId);
      }
      actionUrl = `/hub?${qs.toString()}`;
    }

    const previewText = (params.flaggedMessageText || '').trim();
    const channelDisplay = params.channelName || baseChannelId;
    const richMessage = previewText
      ? `${params.flaggedAuthorName ? `${params.flaggedAuthorName} in #${channelDisplay}: ` : `#${channelDisplay}: `}"${previewText.slice(0, 320)}" (${params.reason.slice(0, 120)})`
      : `${params.targetSummary} — "${params.reason.slice(0, 140)}"`;

    await Promise.all(
      Array.from(recipientUids).map((uid) =>
        sendUserInboxNotification(uid, {
          type: 'moderation_report',
          title: `Flagged ${isPublic ? 'post' : 'message'} in #${channelDisplay} · Reported by ${params.reporterName}`,
          message: richMessage.slice(0, 950),
          actionUrl,
          actionLabel: isPublic
            ? 'Open Flagged Post'
            : params.messageId
              ? 'Jump to Flagged Message'
              : 'Open Flagged Reports',
          senderId: params.reporterUid,
          senderName: params.reporterName,
          channelId: isPublic ? undefined : baseChannelId,
          streamId: isPublic ? undefined : rawStreamId,
          messageId: params.messageId,
          reportId: params.reportId,
          postId: isPublic ? params.channelId.replace('publicPosts/', '') : undefined,
        })
      )
    );
  } catch {
    // Non-blocking
  }
}

export async function notifyFollowersOfPublishedPost(post: PublicPost): Promise<void> {
  if (!post.authorId || post.status !== 'published') return;
  try {
    const followsSnap = await getDocs(
      query(
        collection(db, 'creatorFollows'),
        where('creatorUid', '==', post.authorId),
        limit(100)
      )
    );
    const followers = followsSnap.docs
      .map((d) => d.data() as CreatorFollowDoc)
      .filter((f) => f.followerUid && f.followerUid !== post.authorId);

    await Promise.all(
      followers.map((f) =>
        sendUserInboxNotification(f.followerUid, {
          type: 'followed_creator_post',
          title: `${post.authorName} published a new ${post.categoryName} post!`,
          message: `"${post.title.slice(0, 120)}" — ${post.summary.slice(0, 120)}`,
          actionUrl: `/community/posts/${post.id}`,
          actionLabel: 'Read Post',
          senderId: post.authorId,
          senderName: post.authorName,
          senderAvatar: post.authorAvatar,
          postId: post.id,
        })
      )
    );
  } catch {
    // Non-blocking
  }
}

/**
 * Moderator / Admin Action: Approve, hide, or remove a submitted PublicPost.
 * Approving a pending post automatically publishes it and notifies both the author and all followers!
 */
export async function moderatePublicPostStatus(params: {
  post: PublicPost;
  newStatus: 'published' | 'hidden' | 'removed';
  reason?: string;
}): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Moderator authentication required.');
  }

  const nowIso = new Date().toISOString();
  await updateDoc(doc(db, 'publicPosts', params.post.id), {
    status: params.newStatus,
    updatedAt: nowIso,
  });

  const approved = params.newStatus === 'published';

  if (params.post.authorId && params.post.authorId !== currentUser.uid) {
    void sendUserInboxNotification(params.post.authorId, {
      type: 'post_moderated',
      title: approved
        ? `Your post "${params.post.title.slice(0, 65)}" was approved!`
        : `Post status update: "${params.post.title.slice(0, 65)}"`,
      message: approved
        ? 'A moderator reviewed and published your creation to the Public Community!'
        : params.reason?.trim() || 'Your post was not approved for public listing at this time.',
      actionUrl: `/community/posts/${params.post.id}`,
      actionLabel: approved ? 'View Live Post' : 'View Details',
      senderId: currentUser.uid,
      senderName: currentUser.displayName || 'Moderator',
      postId: params.post.id,
    });
  }

  if (approved && params.post.status !== 'published') {
    const publishedPost: PublicPost = { ...params.post, status: 'published', updatedAt: nowIso };
    void notifyFollowersOfPublishedPost(publishedPost);
    void dispatchMentionNotifications({
      text: `${publishedPost.title}\n${publishedPost.body}`,
      senderUid: publishedPost.authorId,
      senderName: publishedPost.authorName,
      senderAvatar: publishedPost.authorAvatar,
      sourceType: 'public_post',
      postId: publishedPost.id,
      contextTitle: publishedPost.title,
    });
    void triggerContributionAward({
      action: 'showcase_published',
      postId: publishedPost.id,
    });
  }

  try {
    await addDoc(collection(db, 'adminAuditLogs'), {
      action: 'moderate_post',
      targetUid: params.post.authorId,
      targetEmail: 'creator',
      targetName: params.post.title.slice(0, 80),
      adminUid: currentUser.uid,
      adminEmail: currentUser.email || 'moderator',
      verifiedAgainstOfficialRecords: true,
      reason: params.reason?.trim() || `Changed status to ${params.newStatus}`,
      createdAt: nowIso,
    } satisfies AdminAuditLog);
  } catch {
    // Non-blocking audit log
  }
}

/**
 * Pure helper to determine if a user has publishing permissions for public creations/posts.
 * Strictly requires approved Student Hub membership or Admin status, and not having publishing disabled.
 */
export function canUserPublishPublicContent(params: {
  isAuthenticated: boolean;
  isApprovedForHub: boolean;
  isAdmin: boolean;
  publishingDisabled?: boolean;
}): boolean {
  if (!params.isAuthenticated) return false;
  if (params.publishingDisabled && !params.isAdmin) return false;
  return Boolean(params.isAdmin || params.isApprovedForHub);
}

/**
 * Normalizes category slugs and aliases so filtering by category Dropdown works reliably across all published content.
 */
const CATEGORY_ALIAS_GROUPS: Record<string, string[]> = {
  games: ['games', 'game', 'game-development'],
  websites: ['websites', 'website', 'web', 'website-creation'],
  'project-showcases': ['project-showcases', 'projects', 'project', 'showcase'],
  'technology-discoveries': [
    'technology-discoveries',
    'technology',
    'discoveries',
    'tech',
    'technology-experiments',
  ],
  'tutorials-learning': ['tutorials-learning', 'tutorials', 'learning', 'tutorial'],
  'community-questions': ['community-questions', 'questions', 'question', 'help'],
  announcements: ['announcements', 'announcement', 'updates', 'news'],
  'creative-experiments': ['creative-experiments', 'experiments', 'experiment', 'creative-tools'],
};

export function doesPostMatchCategoryFilter(
  post: Pick<PublicPost, 'categoryId' | 'categoryName'>,
  selectedCategoryId: string
): boolean {
  if (!selectedCategoryId || selectedCategoryId === 'all') {
    return true;
  }

  const normalizedSelected = selectedCategoryId.trim().toLowerCase();
  const postCatId = (post.categoryId || '').trim().toLowerCase();
  const postCatNameSlug = (post.categoryName || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  if (postCatId === normalizedSelected || postCatNameSlug === normalizedSelected) {
    return true;
  }

  // Check alias groups
  for (const [canonicalId, aliases] of Object.entries(CATEGORY_ALIAS_GROUPS)) {
    if (canonicalId === normalizedSelected || aliases.includes(normalizedSelected)) {
      if (
        postCatId === canonicalId ||
        aliases.includes(postCatId) ||
        aliases.includes(postCatNameSlug)
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Subscribes to Community Challenges (`communityChallenges/{challengeId}`).
 * Non-admin visitors only query published challenges (`publishStatus == 'published'`).
 * Administrators query all challenges so they can manage drafts, published, and archived challenges.
 */
export function subscribeToCommunityChallenges(
  callback: (challenges: CommunityChallenge[]) => void,
  includeAllForAdmin = false
): () => void {
  const colRef = collection(db, 'communityChallenges');
  const q = includeAllForAdmin
    ? query(colRef, orderBy('createdAt', 'desc'))
    : query(colRef, where('publishStatus', '==', 'published'));

  return onSnapshot(
    q,
    (snap) => {
      const list: CommunityChallenge[] = [];
      snap.forEach((docSnap) => {
        list.push({ ...(docSnap.data() as CommunityChallenge), id: docSnap.id });
      });
      list.sort(
        (a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
      );
      callback(list);
    },
    () => {
      callback([]);
    }
  );
}

/**
 * Admin Action: Create or update a Community Challenge in `communityChallenges/{challengeId}`.
 */
export async function saveCommunityChallenge(params: {
  existingChallengeId?: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  categoryId: string;
  learnerGroup: string;
  skillLevel: ChallengeSkillLevel;
  programme?: string;
  instructions: string;
  resources: ChallengeResourceLink[];
  startDate?: string;
  deadline?: string;
  challengeStatus: ChallengeLifecycleStatus;
  publishStatus: ChallengePublishStatus;
  accentColor: '#FFF025' | '#B11469' | '#C15D00';
  coverImageUrl?: string;
  featured?: boolean;
}): Promise<CommunityChallenge> {
  const currentUser = auth.currentUser;
  if (!currentUser || !isSuperAdminUser(currentUser)) {
    throw new Error('Only authorised Build Buds administrators can create or edit challenges.');
  }

  const cleanTitle = params.title.trim();
  const cleanDescription = params.description.trim();
  const cleanInstructions = params.instructions.trim();

  if (!cleanTitle) {
    throw new Error('Please enter a challenge title.');
  }
  if (!cleanDescription) {
    throw new Error('Please enter a challenge description.');
  }

  const nowIso = new Date().toISOString();
  const challengeRef = params.existingChallengeId
    ? doc(db, 'communityChallenges', params.existingChallengeId)
    : doc(collection(db, 'communityChallenges'));

  let createdAt = nowIso;
  if (params.existingChallengeId) {
    const existingSnap = await getDoc(challengeRef);
    if (existingSnap.exists()) {
      createdAt = (existingSnap.data() as CommunityChallenge).createdAt || nowIso;
    }
  }

  const validResources = (params.resources || [])
    .map((r) => ({ title: r.title.trim(), url: r.url.trim() }))
    .filter((r) => r.title && r.url)
    .slice(0, 10);

  const challengeDoc: CommunityChallenge = {
    id: challengeRef.id,
    title: cleanTitle,
    summary: params.summary.trim() || cleanDescription.slice(0, 180),
    description: cleanDescription,
    category: params.category.trim() || 'Creative Learning Activity',
    categoryId: params.categoryId.trim() || 'general-creative',
    learnerGroup: params.learnerGroup.trim() || 'All Builders',
    skillLevel: params.skillLevel || 'All Levels',
    programme: params.programme?.trim() || '',
    instructions: cleanInstructions || cleanDescription,
    resources: validResources,
    startDate: params.startDate?.trim() || '',
    deadline: params.deadline?.trim() || '',
    challengeStatus: params.challengeStatus || 'active',
    publishStatus: params.publishStatus || 'draft',
    accentColor: params.accentColor || '#FFF025',
    coverImageUrl: params.coverImageUrl?.trim() || '',
    featured: Boolean(params.featured),
    createdBy: currentUser.uid,
    createdByName: currentUser.displayName || 'Build Buds Team',
    createdAt,
    updatedAt: nowIso,
  };

  await setDoc(challengeRef, challengeDoc, { merge: true });

  try {
    await addDoc(collection(db, 'adminAuditLogs'), {
      action: 'manage_challenge',
      targetUid: challengeDoc.id,
      targetEmail: currentUser.email || ADMIN_EMAIL,
      targetName: challengeDoc.title,
      adminUid: currentUser.uid,
      adminEmail: currentUser.email || ADMIN_EMAIL,
      verifiedAgainstOfficialRecords: true,
      reason: `${params.existingChallengeId ? 'Updated' : 'Created'} challenge (${challengeDoc.publishStatus})`,
      createdAt: nowIso,
    } satisfies AdminAuditLog);
  } catch {
    // Non-fatal audit log
  }

  return challengeDoc;
}

/**
 * Admin Action: Update a challenge's publish status (`draft`, `published`, `archived`) or lifecycle status.
 */
export async function updateCommunityChallengeStatus(
  challengeId: string,
  publishStatus: ChallengePublishStatus,
  challengeStatus?: ChallengeLifecycleStatus
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !isSuperAdminUser(currentUser)) {
    throw new Error('Only authorised administrators can update challenge status.');
  }

  const nowIso = new Date().toISOString();
  const updates: Record<string, unknown> = {
    publishStatus,
    updatedAt: nowIso,
  };
  if (challengeStatus) {
    updates.challengeStatus = challengeStatus;
  }

  await updateDoc(doc(db, 'communityChallenges', challengeId), updates);
}

/**
 * Admin Action: Permanently delete a challenge from `communityChallenges/{challengeId}`.
 */
export async function deleteCommunityChallenge(challengeId: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !isSuperAdminUser(currentUser)) {
    throw new Error('Only authorised administrators can delete challenges.');
  }

  await deleteDoc(doc(db, 'communityChallenges', challengeId));
}

// ===============================================================
// Registered Schools Configuration (`community_settings/schools`)
// ===============================================================

const PLACEHOLDER_SCHOOL_NAMES = new Set([
  '',
  'not specified',
  'build buds',
  'build buds community',
  'build buds network',
  'build buds creator club',
  'public member',
  'public community account',
  'school or academy',
  'school or club',
  'school / academy',
  'school / club',
  'jaystarbliss studios partner school',
  'jaystarbliss partner school',
]);

export function isPlaceholderSchoolName(name?: string | null): boolean {
  const clean = String(name || '').trim().toLowerCase();
  return PLACEHOLDER_SCHOOL_NAMES.has(clean);
}

/**
 * Pure helper that normalizes, deduplicates, and merges configured registered schools
 * with optional extra school names so no student's real school is missing from dropdowns.
 */
export function normalizeRegisteredSchoolsList(
  configuredSchools?: string[],
  extraSchoolNames?: Array<string | undefined | null>
): string[] {
  const baseList =
    Array.isArray(configuredSchools) && configuredSchools.length > 0
      ? configuredSchools
      : DEFAULT_REGISTERED_SCHOOLS;

  const seenLower = new Set<string>();
  const result: string[] = [];

  const pushIfValid = (raw?: string | null) => {
    const clean = String(raw || '').trim().replace(/\s+/g, ' ');
    if (!clean || clean.length < 2 || isPlaceholderSchoolName(clean)) {
      return;
    }
    const lower = clean.toLowerCase();
    if (seenLower.has(lower)) return;
    seenLower.add(lower);
    result.push(clean);
  };

  for (const s of baseList) {
    pushIfValid(s);
  }
  if (Array.isArray(extraSchoolNames)) {
    for (const s of extraSchoolNames) {
      pushIfValid(s);
    }
  }

  return result;
}

/**
 * Subscribes in real-time to the Admin-configured Registered Schools list in `community_settings/schools`.
 */
export function subscribeToRegisteredSchools(
  callback: (schools: string[]) => void
): () => void {
  const docRef = doc(db, 'community_settings', 'schools');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Partial<RegisteredSchoolsDoc>;
        if (Array.isArray(data.schools)) {
          // Even if an admin removed some defaults, preserve their exact non-empty list
          const cleaned = data.schools
            .map((s) => String(s || '').trim().replace(/\s+/g, ' '))
            .filter((s) => s.length >= 2 && !isPlaceholderSchoolName(s));
          const deduped: string[] = [];
          const seen = new Set<string>();
          for (const item of cleaned) {
            const lower = item.toLowerCase();
            if (!seen.has(lower)) {
              seen.add(lower);
              deduped.push(item);
            }
          }
          callback(deduped.length > 0 ? deduped : [...DEFAULT_REGISTERED_SCHOOLS]);
          return;
        }
      }
      callback([...DEFAULT_REGISTERED_SCHOOLS]);
    },
    () => {
      callback([...DEFAULT_REGISTERED_SCHOOLS]);
    }
  );
}

/**
 * Admin Action: Save the full list of registered schools to `community_settings/schools`.
 */
export async function adminSaveRegisteredSchools(schools: string[]): Promise<string[]> {
  const currentUser = auth.currentUser;
  if (!currentUser || !isSuperAdminUser(currentUser)) {
    throw new Error('Only authorised administrators can configure registered schools.');
  }

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const raw of schools) {
    const clean = String(raw || '').trim().replace(/\s+/g, ' ');
    if (!clean || clean.length < 2 || isPlaceholderSchoolName(clean)) continue;
    const lower = clean.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      deduped.push(clean);
    }
  }

  const nowIso = new Date().toISOString();
  await setDoc(
    doc(db, 'community_settings', 'schools'),
    {
      schools: deduped,
      updatedBy: currentUser.uid,
      updatedByEmail: currentUser.email || ADMIN_EMAIL,
      updatedAt: nowIso,
    } satisfies RegisteredSchoolsDoc,
    { merge: true }
  );

  return deduped;
}

/**
 * Admin Action: Add a new school to the registered schools dropdown list.
 */
export async function adminAddRegisteredSchool(
  schoolName: string,
  currentSchools: string[]
): Promise<string[]> {
  const clean = String(schoolName || '').trim().replace(/\s+/g, ' ');
  if (!clean || clean.length < 2) {
    throw new Error('Please enter a valid school name.');
  }
  if (isPlaceholderSchoolName(clean)) {
    throw new Error('Please enter a specific school or academy name.');
  }

  const next = await adminSaveRegisteredSchools([...currentSchools, clean]);

  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      await addDoc(collection(db, 'adminAuditLogs'), {
        action: 'manage_schools',
        targetUid: 'community_settings/schools',
        targetEmail: currentUser.email || ADMIN_EMAIL,
        targetName: clean,
        adminUid: currentUser.uid,
        adminEmail: currentUser.email || ADMIN_EMAIL,
        verifiedAgainstOfficialRecords: true,
        reason: `Added registered school "${clean}" to student dropdown`,
        createdAt: new Date().toISOString(),
      } satisfies AdminAuditLog);
    }
  } catch {
    // Non-blocking audit log
  }

  return next;
}

/**
 * Admin Action: Remove a school from the registered schools dropdown list.
 */
export async function adminRemoveRegisteredSchool(
  schoolName: string,
  currentSchools: string[]
): Promise<string[]> {
  const targetLower = String(schoolName || '').trim().toLowerCase();
  const filtered = currentSchools.filter((s) => s.trim().toLowerCase() !== targetLower);
  if (filtered.length === 0) {
    throw new Error('At least one registered school must remain in the dropdown list.');
  }

  const next = await adminSaveRegisteredSchools(filtered);

  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      await addDoc(collection(db, 'adminAuditLogs'), {
        action: 'manage_schools',
        targetUid: 'community_settings/schools',
        targetEmail: currentUser.email || ADMIN_EMAIL,
        targetName: schoolName,
        adminUid: currentUser.uid,
        adminEmail: currentUser.email || ADMIN_EMAIL,
        verifiedAgainstOfficialRecords: true,
        reason: `Removed registered school "${schoolName}" from student dropdown`,
        createdAt: new Date().toISOString(),
      } satisfies AdminAuditLog);
    }
  } catch {
    // Non-blocking audit log
  }

  return next;
}

/**
 * Normalizes any external URL (`gameUrl`, `websiteUrl`, `githubUrl`) so it always has a valid
 * `https://` or `http://` protocol and never produces a broken relative link.
 */
export function ensureValidExternalHref(rawUrl?: string | null): string {
  const clean = String(rawUrl || '').trim();
  if (!clean) return '';
  if (/^https?:\/\//i.test(clean)) {
    return clean;
  }
  if (clean.startsWith('//')) {
    return `https:${clean}`;
  }
  if (clean.includes('.') && !clean.includes(' ')) {
    return `https://${clean.replace(/^\/+/, '')}`;
  }
  return '';
}

/**
 * Admin / Moderator Action: Toggle featured status on a PublicPost (`publicPosts/{postId}`).
 */
export async function adminToggleFeaturedPost(post: PublicPost): Promise<boolean> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required.');
  }
  const nextFeatured = !post.isFeatured;
  await updateDoc(doc(db, 'publicPosts', post.id), {
    isFeatured: nextFeatured,
    updatedAt: new Date().toISOString(),
  });
  return nextFeatured;
}

/**
 * Admin Action: Permanently delete a post document from `publicPosts/{postId}`.
 */
export async function adminDeletePublicPostPermanently(postId: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required.');
  }
  await deleteDoc(doc(db, 'publicPosts', postId));
}

/**
 * Clones a published project's metadata into a new derivative work with reference to the original.
 */
export async function forkProject(params: {
  originalPost: PublicPost;
  authorProfile: BuilderProfile;
  customTitle?: string;
  customSummary?: string;
}): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required to fork a project.');
  }
  const { originalPost, authorProfile, customTitle, customSummary } = params;
  const postRef = doc(collection(db, 'publicPosts'));
  const nowIso = new Date().toISOString();

  const newPost: PublicPost = {
    id: postRef.id,
    title: customTitle?.trim() || `Fork of ${originalPost.title}`,
    summary: customSummary?.trim() || originalPost.summary || '',
    body: originalPost.body || '',
    categoryId: originalPost.categoryId,
    categoryName: originalPost.categoryName,
    tags: originalPost.tags || [],
    media: originalPost.media || [],
    websiteUrl: originalPost.websiteUrl || '',
    gameUrl: originalPost.gameUrl || '',
    githubUrl: originalPost.githubUrl || '',
    challengeId: originalPost.challengeId || '',
    challengeTitle: originalPost.challengeTitle || '',
    forkedFromPostId: originalPost.id,
    forkedFromTitle: originalPost.title,
    forkedFromAuthorName: originalPost.authorName,
    authorId: currentUser.uid,
    authorName: authorProfile.displayName,
    authorAvatar: authorProfile.avatarUrl || '',
    authorColor: authorProfile.avatarColor || '#FFF025',
    authorRole: authorProfile.role || 'member',
    status: 'published',
    isFeatured: false,
    reactionCounts: {},
    totalReactions: 0,
    commentCount: 0,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await setDoc(postRef, newPost);

  if (originalPost.authorId && originalPost.authorId !== currentUser.uid) {
    await sendUserInboxNotification(originalPost.authorId, {
      type: 'general',
      title: `Project Forked by @${authorProfile.displayName}`,
      message: `@${authorProfile.displayName} forked your project "${originalPost.title}" into a new derivative work!`,
      postId: postRef.id,
      senderId: currentUser.uid,
      senderName: authorProfile.displayName,
      senderAvatar: authorProfile.avatarUrl,
    });
  }

  return postRef.id;
}

/**
 * Sends a collaboration request message / notification to a project creator.
 */
export async function sendCollaborationRequest(params: {
  targetPostId: string;
  targetPostTitle: string;
  targetAuthorId: string;
  targetAuthorName: string;
  senderProfile: BuilderProfile;
  message: string;
}): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required.');
  }
  const { targetPostId, targetPostTitle, targetAuthorId, senderProfile, message } = params;
  if (!targetAuthorId || targetAuthorId === currentUser.uid) {
    throw new Error('Cannot send collaboration request to your own project.');
  }
  await sendUserInboxNotification(targetAuthorId, {
    type: 'general',
    title: `Collaboration Request from @${senderProfile.displayName}`,
    message: message.trim() || `@${senderProfile.displayName} would like to collaborate with you on "${targetPostTitle}".`,
    postId: targetPostId,
    senderId: currentUser.uid,
    senderName: senderProfile.displayName,
    senderAvatar: senderProfile.avatarUrl,
  });
}

// ===============================================================
// Feature Suggestions, Feedback Centre & Community Contributors
// ===============================================================

export async function submitFeedbackSuggestion(params: {
  title: string;
  explanation: string;
  category: FeedbackCategory;
  attachmentUrl?: string;
  attachmentPublicId?: string;
  authorProfile: BuilderProfile;
}): Promise<{ submission: FeedbackSubmission; pointsAwarded: number }> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Please sign in to submit a suggestion or feedback report.');
  }

  const cleanTitle = filterProfanity(params.title.trim()).filteredText;
  const cleanExplanation = filterProfanity(params.explanation.trim()).filteredText;
  const check = validateSuggestionContribution({
    title: cleanTitle,
    explanation: cleanExplanation,
  });
  if (!check.valid) {
    throw new Error(check.reason || 'Please provide a clear title and explanation.');
  }

  const docRef = doc(collection(db, 'feedbackSubmissions'));
  const nowIso = new Date().toISOString();

  const submission: FeedbackSubmission = {
    id: docRef.id,
    authorId: currentUser.uid,
    authorName: params.authorProfile.displayName || 'Builder',
    authorAvatar: params.authorProfile.avatarUrl || '',
    authorColor: params.authorProfile.avatarColor || '#FFF025',
    schoolName: params.authorProfile.schoolName || '',
    title: cleanTitle.slice(0, 160),
    explanation: cleanExplanation.slice(0, 5000),
    category: params.category,
    attachmentUrl: params.attachmentUrl?.trim() || '',
    attachmentPublicId: params.attachmentPublicId?.trim() || '',
    status: 'received',
    isUseful: false,
    submissionPointAwarded: false,
    bonusPointAwarded: false,
    moderatorResponse: '',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await setDoc(docRef, submission);

  const awardRes = await triggerContributionAward({
    action: 'suggestion_submitted',
    submissionId: submission.id,
  });

  return {
    submission: {
      ...submission,
      submissionPointAwarded: Boolean(awardRes.awarded),
    },
    pointsAwarded: awardRes.awarded ? awardRes.pointsDelta || 1 : 0,
  };
}

export function subscribeToMyFeedbackSubmissions(
  uid: string,
  callback: (items: FeedbackSubmission[]) => void
): () => void {
  if (!uid) {
    callback([]);
    return () => {};
  }
  const q = query(
    collection(db, 'feedbackSubmissions'),
    where('authorId', '==', uid),
    limit(50)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: FeedbackSubmission[] = [];
      snap.forEach((docSnap) => {
        items.push({ ...(docSnap.data() as FeedbackSubmission), id: docSnap.id });
      });
      items.sort(
        (a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
      );
      callback(items);
    },
    () => callback([])
  );
}

export function subscribeToAllFeedbackSubmissions(
  callback: (items: FeedbackSubmission[]) => void
): () => void {
  const q = query(
    collection(db, 'feedbackSubmissions'),
    orderBy('createdAt', 'desc'),
    limit(150)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: FeedbackSubmission[] = [];
      snap.forEach((docSnap) => {
        items.push({ ...(docSnap.data() as FeedbackSubmission), id: docSnap.id });
      });
      callback(items);
    },
    () => callback([])
  );
}

export function subscribeToFeedbackAdminNote(
  submissionId: string,
  callback: (note: FeedbackAdminNote | null) => void
): () => void {
  if (!submissionId) {
    callback(null);
    return () => {};
  }
  return onSnapshot(
    doc(db, 'feedbackAdminNotes', submissionId),
    (snap) => {
      callback(snap.exists() ? (snap.data() as FeedbackAdminNote) : null);
    },
    () => callback(null)
  );
}

export async function adminUpdateFeedbackSubmission(params: {
  submission: FeedbackSubmission;
  status: FeedbackStatus;
  awardUsefulBonus?: boolean;
  moderatorResponse?: string;
  internalNotes?: string;
}): Promise<{ bonusAwarded: boolean }> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.email) {
    throw new Error('Moderator or administrator credentials required.');
  }

  const nowIso = new Date().toISOString();
  const cleanResponse = params.moderatorResponse?.trim() || '';
  const shouldMarkUseful = Boolean(params.awardUsefulBonus) || params.submission.isUseful;

  await updateDoc(doc(db, 'feedbackSubmissions', params.submission.id), {
    status: params.status,
    isUseful: shouldMarkUseful,
    moderatorResponse: cleanResponse,
    reviewedBy: currentUser.uid,
    reviewedAt: nowIso,
    updatedAt: nowIso,
  });

  if (typeof params.internalNotes === 'string') {
    await setDoc(
      doc(db, 'feedbackAdminNotes', params.submission.id),
      {
        submissionId: params.submission.id,
        internalNotes: params.internalNotes.trim(),
        updatedBy: currentUser.uid,
        updatedByEmail: currentUser.email,
        updatedAt: nowIso,
      } satisfies FeedbackAdminNote,
      { merge: true }
    );
  }

  let bonusAwarded = false;
  if (params.awardUsefulBonus && !params.submission.bonusPointAwarded) {
    const res = await triggerContributionAward({
      action: 'suggestion_approved',
      submissionId: params.submission.id,
    });
    bonusAwarded = Boolean(res.awarded);
  }

  const statusLabel = FEEDBACK_STATUS_LABELS[params.status] || params.status;
  if (params.submission.authorId && params.submission.authorId !== currentUser.uid) {
    void sendUserInboxNotification(params.submission.authorId, {
      type: 'feedback_status',
      title: `Suggestion Update: ${statusLabel}`,
      message: cleanResponse
        ? `"${params.submission.title.slice(0, 65)}" is now ${statusLabel}: ${cleanResponse.slice(0, 180)}`
        : `Your feedback "${params.submission.title.slice(0, 75)}" was moved to ${statusLabel}.`,
      actionUrl: '/community',
      actionLabel: 'Open Feedback Centre',
      senderId: currentUser.uid,
      senderName: currentUser.displayName || 'Build Buds Team',
    });
  }

  try {
    await addDoc(collection(db, 'adminAuditLogs'), {
      action: 'manage_feedback',
      targetUid: params.submission.authorId,
      targetEmail: params.submission.authorName,
      targetName: params.submission.title.slice(0, 80),
      adminUid: currentUser.uid,
      adminEmail: currentUser.email,
      verifiedAgainstOfficialRecords: true,
      reason: `Updated feedback status to ${statusLabel}${params.awardUsefulBonus ? ' (+2 bonus pts)' : ''}`,
      createdAt: nowIso,
    } satisfies AdminAuditLog);
  } catch {
    // Non-blocking audit log
  }

  return { bonusAwarded };
}

export function subscribeToLeaderboardStats(
  limitCount = 100,
  callback: (stats: CommunityContributionStats[]) => void
): () => void {
  const q = query(
    collection(db, 'communityContributionStats'),
    orderBy('lifetimePoints', 'desc'),
    limit(Math.max(10, Math.min(limitCount, 200)))
  );
  return onSnapshot(
    q,
    (snap) => {
      const list: CommunityContributionStats[] = [];
      snap.forEach((docSnap) => {
        list.push({ ...(docSnap.data() as CommunityContributionStats), uid: docSnap.id });
      });
      callback(list);
    },
    () => callback([])
  );
}

export function subscribeToMemberContributionStats(
  uid: string,
  callback: (stats: CommunityContributionStats | null) => void
): () => void {
  if (!uid) {
    callback(null);
    return () => {};
  }
  return onSnapshot(
    doc(db, 'communityContributionStats', uid),
    (snap) => {
      callback(snap.exists() ? ({ ...(snap.data() as CommunityContributionStats), uid: snap.id }) : null);
    },
    () => callback(null)
  );
}

export function subscribeToContributionEvents(
  options: { uid?: string; limitCount?: number },
  callback: (events: ContributionEvent[]) => void
): () => void {
  const colRef = collection(db, 'communityContributionEvents');
  const maxItems = Math.max(5, Math.min(options.limitCount || 40, 150));
  const q = options.uid
    ? query(colRef, where('uid', '==', options.uid), limit(maxItems))
    : query(colRef, orderBy('createdAt', 'desc'), limit(maxItems));

  return onSnapshot(
    q,
    (snap) => {
      const events: ContributionEvent[] = [];
      snap.forEach((docSnap) => {
        events.push({ ...(docSnap.data() as ContributionEvent), id: docSnap.id });
      });
      events.sort(
        (a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
      );
      callback(events);
    },
    () => callback([])
  );
}

export async function adminReverseContributionEvent(
  eventId: string,
  reason: string
): Promise<{ reversed: boolean; pointsDeducted?: number }> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Administrator authentication required.');
  }
  const cleanReason = reason.trim();
  if (cleanReason.length < 3) {
    throw new Error('Please enter a brief moderation reason for reversing these points.');
  }

  const idToken = await currentUser.getIdToken();
  const res = await fetch('/api/contributions/award', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      action: 'reverse_event',
      eventId,
      reason: cleanReason,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    reversed?: boolean;
    pointsDeducted?: number;
    error?: string;
    skippedReason?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || 'Failed to reverse contribution points.');
  }
  return {
    reversed: Boolean(data.reversed),
    pointsDeducted: data.pointsDeducted,
  };
}
