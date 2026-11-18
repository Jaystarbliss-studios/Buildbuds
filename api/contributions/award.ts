import {
  verifyFirebaseIdTokenFromHeader,
  type VerifiedAuthUser,
} from '../_lib/firebaseAuthVerifier.ts';
import {
  adminBatchGetDocs,
  adminBeginTransaction,
  adminCommitTransaction,
  adminGetDoc,
  buildAutoFirestoreId,
  isFirestoreAdminConfigured,
  type FirestoreTransactionWrite,
} from '../_lib/firestoreAdmin.ts';
import {
  CONTRIBUTION_POINTS,
  buildDeterministicContributionEventId,
  getUtcDayKey,
  getUtcMonthKey,
  getUtcWeekKey,
  validateMeaningfulReplyEligibility,
  validateSuggestionContribution,
} from '../../src/utils/contributions.ts';
import { validatePublicShowcaseUrl } from '../../src/utils/moderation.ts';
import type {
  CommunityContributionStats,
  ContributionEvent,
  ContributionEventType,
} from '../../src/types/community.ts';
import type { ApiRequest, ApiResponse } from '../cloudinary/signature.ts';

type AwardActionBody =
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
    }
  | {
      action: 'reverse_event';
      eventId: string;
      reason: string;
    };

async function isModeratorOrAdmin(
  verifiedUser: VerifiedAuthUser
): Promise<boolean> {
  if (verifiedUser.isAdmin) return true;
  const userDoc = await adminGetDoc<{ role?: string }>(`users/${verifiedUser.uid}`);
  if (userDoc?.role === 'admin' || userDoc?.role === 'moderator') {
    return true;
  }
  const adminDoc = await adminGetDoc(`admins/${verifiedUser.uid}`);
  return Boolean(adminDoc);
}

function buildEmptyStats(
  uid: string,
  userProfile: Record<string, unknown> | null | undefined,
  fallbackDisplayName: string,
  nowIso: string,
  dayKey: string,
  monthKey: string,
  weekKey: string
): CommunityContributionStats {
  const rawRole = String(userProfile?.role || 'member');
  const role: 'member' | 'moderator' | 'admin' =
    rawRole === 'admin' || rawRole === 'moderator' ? rawRole : 'member';

  return {
    uid,
    displayName: String(userProfile?.displayName || fallbackDisplayName || 'Builder'),
    avatarUrl: String(userProfile?.avatarUrl || ''),
    avatarColor: String(userProfile?.avatarColor || '#FFF025'),
    role,
    schoolName: String(userProfile?.schoolName || ''),
    lifetimePoints: 0,
    monthlyPoints: 0,
    monthlyPeriodKey: monthKey,
    weeklyPoints: 0,
    weeklyPeriodKey: weekKey,
    meaningfulRepliesCount: 0,
    totalRepliesCount: 0,
    approvedCreationsCount: 0,
    suggestionsSubmittedCount: 0,
    suggestionsAcceptedCount: 0,
    dailyReplyDateKey: dayKey,
    dailyReplyRewardsCount: 0,
    recentReplyFingerprints: [],
    lastContributionAt: nowIso,
    updatedAt: nowIso,
  };
}

function applyPointsToStats(
  existing: Record<string, unknown> | null | undefined,
  uid: string,
  userProfile: Record<string, unknown> | null | undefined,
  fallbackDisplayName: string,
  pointsDelta: number,
  actionType: ContributionEventType,
  nowIso: string,
  dayKey: string,
  monthKey: string,
  weekKey: string,
  replyFingerprint?: string
): CommunityContributionStats {
  const base = existing
    ? ({
        ...buildEmptyStats(uid, userProfile, fallbackDisplayName, nowIso, dayKey, monthKey, weekKey),
        ...(existing as Partial<CommunityContributionStats>),
        uid,
        displayName: String(
          userProfile?.displayName || existing.displayName || fallbackDisplayName || 'Builder'
        ),
        avatarUrl: String(userProfile?.avatarUrl ?? existing.avatarUrl ?? ''),
        avatarColor: String(userProfile?.avatarColor ?? existing.avatarColor ?? '#FFF025'),
        schoolName: String(userProfile?.schoolName ?? existing.schoolName ?? ''),
      } satisfies CommunityContributionStats)
    : buildEmptyStats(uid, userProfile, fallbackDisplayName, nowIso, dayKey, monthKey, weekKey);

  const currentMonthPoints =
    base.monthlyPeriodKey === monthKey ? Math.max(0, Number(base.monthlyPoints || 0)) : 0;
  const currentWeekPoints =
    base.weeklyPeriodKey === weekKey ? Math.max(0, Number(base.weeklyPoints || 0)) : 0;
  const isSameReplyDay = base.dailyReplyDateKey === dayKey;
  const prevDailyReplyCount = isSameReplyDay ? Math.max(0, Number(base.dailyReplyRewardsCount || 0)) : 0;
  const prevFingerprints =
    isSameReplyDay && Array.isArray(base.recentReplyFingerprints)
      ? base.recentReplyFingerprints.map((x) => String(x))
      : [];

  return {
    ...base,
    lifetimePoints: Math.max(0, Number(base.lifetimePoints || 0)) + pointsDelta,
    monthlyPoints: currentMonthPoints + pointsDelta,
    monthlyPeriodKey: monthKey,
    weeklyPoints: currentWeekPoints + pointsDelta,
    weeklyPeriodKey: weekKey,
    meaningfulRepliesCount:
      Math.max(0, Number(base.meaningfulRepliesCount || 0)) +
      (actionType === 'meaningful_reply' ? 1 : 0),
    totalRepliesCount:
      Math.max(0, Number(base.totalRepliesCount || 0)) +
      (actionType === 'meaningful_reply' ? 1 : 0),
    approvedCreationsCount:
      Math.max(0, Number(base.approvedCreationsCount || 0)) +
      (actionType === 'showcase_published' ? 1 : 0),
    suggestionsSubmittedCount:
      Math.max(0, Number(base.suggestionsSubmittedCount || 0)) +
      (actionType === 'suggestion_submitted' ? 1 : 0),
    suggestionsAcceptedCount:
      Math.max(0, Number(base.suggestionsAcceptedCount || 0)) +
      (actionType === 'suggestion_approved' ? 1 : 0),
    dailyReplyDateKey: dayKey,
    dailyReplyRewardsCount:
      actionType === 'meaningful_reply' ? prevDailyReplyCount + 1 : prevDailyReplyCount,
    recentReplyFingerprints:
      actionType === 'meaningful_reply' && replyFingerprint
        ? [...prevFingerprints, replyFingerprint].slice(-20)
        : prevFingerprints,
    lastContributionAt: nowIso,
    updatedAt: nowIso,
  };
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  let verifiedUser: VerifiedAuthUser;
  try {
    const authHeader = Array.isArray(req.headers.authorization)
      ? req.headers.authorization[0]
      : req.headers.authorization;
    verifiedUser = await verifyFirebaseIdTokenFromHeader(authHeader);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Authentication required.';
    return res.status(401).json({ error: message });
  }

  if (!isFirestoreAdminConfigured()) {
    return res.status(503).json({
      awarded: false,
      configured: false,
      error:
        'FB_ADMIN_SERVICE_ACCOUNT_JSON is not configured on the server. Contribution points cannot be written without trusted Admin credentials.',
    });
  }

  let body: AwardActionBody;
  try {
    body = (typeof req.body === 'string'
      ? JSON.parse(req.body || '{}')
      : req.body || {}) as AwardActionBody;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON request payload.' });
  }

  const nowDate = new Date();
  const nowIso = nowDate.toISOString();
  const dayKey = getUtcDayKey(nowDate);
  const monthKey = getUtcMonthKey(nowDate);
  const weekKey = getUtcWeekKey(nowDate);

  try {
    // -------------------------------------------------------------
    // 1. MEANINGFUL REPLY (+2 pts, capped at 5 per UTC day)
    // -------------------------------------------------------------
    if (body.action === 'meaningful_reply') {
      const { sourceKind, sourceId, parentId, replyToMessageId } = body;
      if (!sourceId || !parentId || !['hub_thread', 'hub_message_reply', 'public_comment'].includes(sourceKind)) {
        return res.status(400).json({ error: 'Missing valid reply source metadata.' });
      }

      const eventId = buildDeterministicContributionEventId({
        actionType: 'meaningful_reply',
        sourceKind,
        sourceId,
      });

      const replyPath =
        sourceKind === 'hub_thread'
          ? `messages/${parentId}/threadReplies/${sourceId}`
          : sourceKind === 'public_comment'
            ? `publicPosts/${parentId}/comments/${sourceId}`
            : `messages/${sourceId}`;

      const parentPath =
        sourceKind === 'hub_thread'
          ? `messages/${parentId}`
          : sourceKind === 'public_comment'
            ? `publicPosts/${parentId}`
            : `messages/${replyToMessageId || parentId}`;

      const tx = await adminBeginTransaction();
      const eventPath = `communityContributionEvents/${eventId}`;
      const statsPath = `communityContributionStats/${verifiedUser.uid}`;
      const userPath = `users/${verifiedUser.uid}`;

      const docs = await adminBatchGetDocs(
        [replyPath, parentPath, eventPath, statsPath, userPath],
        tx
      );

      const replyDoc = docs.get(replyPath);
      const parentDoc = docs.get(parentPath);
      const existingEvent = docs.get(eventPath);
      const existingStats = docs.get(statsPath);
      const userProfile = docs.get(userPath);

      if (!replyDoc) {
        return res.status(404).json({ awarded: false, error: 'Reply document not found.' });
      }
      if (String(replyDoc.authorId || '') !== verifiedUser.uid) {
        return res.status(403).json({ awarded: false, error: 'Cannot claim points for another member\'s reply.' });
      }
      if (String(userProfile?.status || 'active') === 'banned') {
        return res.status(403).json({ awarded: false, error: 'Suspended/banned accounts cannot earn contribution points.' });
      }
      if (existingEvent) {
        return res.status(200).json({
          awarded: false,
          alreadyAwarded: true,
          skippedReason: 'Contribution already recorded for this reply.',
        });
      }

      if (!parentDoc) {
        return res.status(200).json({
          awarded: false,
          skippedReason: 'Parent item could not be verified.',
        });
      }
      if (sourceKind === 'public_comment' && String(parentDoc.status || '') !== 'published') {
        return res.status(200).json({
          awarded: false,
          skippedReason: 'Only replies on published posts qualify.',
        });
      }

      const sameDay = existingStats?.dailyReplyDateKey === dayKey;
      const dailyCount = sameDay ? Number(existingStats?.dailyReplyRewardsCount || 0) : 0;
      const recentFingerprints =
        sameDay && Array.isArray(existingStats?.recentReplyFingerprints)
          ? existingStats!.recentReplyFingerprints.map((x) => String(x))
          : [];

      const validation = validateMeaningfulReplyEligibility({
        replyText: String(replyDoc.text || ''),
        parentText: String(parentDoc.text || parentDoc.body || parentDoc.title || ''),
        actorUid: verifiedUser.uid,
        parentAuthorUid: String(parentDoc.authorId || ''),
        dailyReplyRewardsCount: dailyCount,
        recentReplyFingerprints: recentFingerprints,
      });

      if (!validation.eligible) {
        return res.status(200).json({
          awarded: false,
          skippedReason: validation.reason,
        });
      }

      const points = CONTRIBUTION_POINTS.meaningful_reply;
      const nextStats = applyPointsToStats(
        existingStats,
        verifiedUser.uid,
        userProfile,
        verifiedUser.displayName || String(replyDoc.authorName || 'Builder'),
        points,
        'meaningful_reply',
        nowIso,
        dayKey,
        monthKey,
        weekKey,
        validation.fingerprint
      );

      const newEvent: ContributionEvent = {
        id: eventId,
        uid: verifiedUser.uid,
        displayName: nextStats.displayName,
        actionType: 'meaningful_reply',
        points,
        sourceCollection:
          sourceKind === 'hub_thread'
            ? 'messages/threadReplies'
            : sourceKind === 'public_comment'
              ? 'publicPosts/comments'
              : 'messages',
        sourceId,
        parentId,
        label:
          sourceKind === 'public_comment'
            ? `Helpful comment on "${String(parentDoc.title || 'Community Post').slice(0, 60)}"`
            : 'Helpful reply in Student Hub discussion',
        dayKey,
        monthKey,
        weekKey,
        fingerprint: validation.fingerprint,
        reversed: false,
        createdAt: nowIso,
      };

      await adminCommitTransaction(tx, [
        {
          relativeDocPath: eventPath,
          data: newEvent as unknown as Record<string, unknown>,
          preconditionExists: false,
        },
        {
          relativeDocPath: statsPath,
          data: nextStats as unknown as Record<string, unknown>,
        },
      ]);

      return res.status(200).json({
        awarded: true,
        pointsDelta: points,
        event: newEvent,
        stats: nextStats,
      });
    }

    // -------------------------------------------------------------
    // 2. SHOWCASE PUBLISHED (+5 pts, mod/admin verified)
    // -------------------------------------------------------------
    if (body.action === 'showcase_published') {
      const allowed = await isModeratorOrAdmin(verifiedUser);
      if (!allowed) {
        return res.status(403).json({ error: 'Only moderators or admins can verify showcase publication awards.' });
      }
      if (!body.postId) {
        return res.status(400).json({ error: 'postId is required.' });
      }

      const postPath = `publicPosts/${body.postId}`;
      const eventId = buildDeterministicContributionEventId({
        actionType: 'showcase_published',
        sourceId: body.postId,
      });
      const eventPath = `communityContributionEvents/${eventId}`;

      const postDoc = await adminGetDoc<Record<string, unknown>>(postPath);
      if (!postDoc) {
        return res.status(404).json({ awarded: false, error: 'Public post not found.' });
      }
      if (String(postDoc.status || '') !== 'published') {
        return res.status(200).json({
          awarded: false,
          skippedReason: 'Only published creations earn showcase contribution points.',
        });
      }

      const authorId = String(postDoc.authorId || '');
      if (!authorId || authorId.startsWith('seed-') || authorId.startsWith('team-')) {
        return res.status(200).json({
          awarded: false,
          skippedReason: 'Seed/system posts do not earn contributor points.',
        });
      }

      const categoryId = String(postDoc.categoryId || '');
      const websiteUrl = String(postDoc.websiteUrl || '').trim();
      const gameUrl = String(postDoc.gameUrl || '').trim();
      if (categoryId === 'games') {
        const gameCheck = validatePublicShowcaseUrl(gameUrl || websiteUrl, {
          label: 'Game link',
          required: true,
        });
        if (!gameCheck.valid) {
          return res.status(400).json({ awarded: false, error: gameCheck.error });
        }
      } else {
        if (gameUrl) {
          const check = validatePublicShowcaseUrl(gameUrl, { label: 'Game link', required: false });
          if (!check.valid) return res.status(400).json({ awarded: false, error: check.error });
        }
        if (websiteUrl) {
          const check = validatePublicShowcaseUrl(websiteUrl, { label: 'Website link', required: false });
          if (!check.valid) return res.status(400).json({ awarded: false, error: check.error });
        }
      }

      const tx = await adminBeginTransaction();
      const statsPath = `communityContributionStats/${authorId}`;
      const userPath = `users/${authorId}`;
      const docs = await adminBatchGetDocs([eventPath, statsPath, userPath], tx);

      if (docs.get(eventPath)) {
        return res.status(200).json({
          awarded: false,
          alreadyAwarded: true,
          skippedReason: 'Showcase contribution already awarded for this post.',
        });
      }

      const existingStats = docs.get(statsPath) || null;
      const userProfile = docs.get(userPath) || null;
      const points = CONTRIBUTION_POINTS.showcase_published;

      const nextStats = applyPointsToStats(
        existingStats,
        authorId,
        userProfile,
        String(postDoc.authorName || 'Builder'),
        points,
        'showcase_published',
        nowIso,
        dayKey,
        monthKey,
        weekKey
      );

      const newEvent: ContributionEvent = {
        id: eventId,
        uid: authorId,
        displayName: nextStats.displayName,
        actionType: 'showcase_published',
        points,
        sourceCollection: 'publicPosts',
        sourceId: body.postId,
        label: `Published Showcase: "${String(postDoc.title || 'Project').slice(0, 80)}"`,
        dayKey,
        monthKey,
        weekKey,
        reversed: false,
        createdAt: nowIso,
      };

      const notifId = buildAutoFirestoreId();
      const writes: FirestoreTransactionWrite[] = [
        {
          relativeDocPath: eventPath,
          data: newEvent as unknown as Record<string, unknown>,
          preconditionExists: false,
        },
        {
          relativeDocPath: statsPath,
          data: nextStats as unknown as Record<string, unknown>,
        },
        {
          relativeDocPath: `userNotifications/${authorId}/items/${notifId}`,
          data: {
            id: notifId,
            uid: authorId,
            type: 'contribution_awarded',
            title: `+${points} Builder Contribution Points!`,
            message: `Your published creation "${String(postDoc.title || 'Project').slice(0, 70)}" earned +${points} points on the Community Contributors leaderboard.`,
            actionUrl: `/community/contributors`,
            actionLabel: 'View Leaderboard',
            senderId: verifiedUser.uid,
            senderName: 'Build Buds',
            postId: body.postId,
            read: false,
            createdAt: nowIso,
          },
          preconditionExists: false,
        },
      ];

      await adminCommitTransaction(tx, writes);
      return res.status(200).json({
        awarded: true,
        pointsDelta: points,
        event: newEvent,
        stats: nextStats,
      });
    }

    // -------------------------------------------------------------
    // 3. SUGGESTION SUBMITTED (+1 pt, verified owner)
    // -------------------------------------------------------------
    if (body.action === 'suggestion_submitted') {
      if (!body.submissionId) {
        return res.status(400).json({ error: 'submissionId is required.' });
      }

      const subPath = `feedbackSubmissions/${body.submissionId}`;
      const eventId = buildDeterministicContributionEventId({
        actionType: 'suggestion_submitted',
        sourceId: body.submissionId,
      });
      const eventPath = `communityContributionEvents/${eventId}`;
      const statsPath = `communityContributionStats/${verifiedUser.uid}`;
      const userPath = `users/${verifiedUser.uid}`;

      const tx = await adminBeginTransaction();
      const docs = await adminBatchGetDocs([subPath, eventPath, statsPath, userPath], tx);
      const subDoc = docs.get(subPath);

      if (!subDoc) {
        return res.status(404).json({ awarded: false, error: 'Feedback submission not found.' });
      }
      if (String(subDoc.authorId || '') !== verifiedUser.uid) {
        return res.status(403).json({ awarded: false, error: 'Forbidden.' });
      }
      if (docs.get(eventPath)) {
        return res.status(200).json({
          awarded: false,
          alreadyAwarded: true,
          skippedReason: 'Suggestion credit already awarded.',
        });
      }

      const validCheck = validateSuggestionContribution({
        title: String(subDoc.title || ''),
        explanation: String(subDoc.explanation || ''),
      });
      if (!validCheck.valid) {
        return res.status(200).json({
          awarded: false,
          skippedReason: validCheck.reason,
        });
      }

      const existingStats = docs.get(statsPath) || null;
      const userProfile = docs.get(userPath) || null;
      const points = CONTRIBUTION_POINTS.suggestion_submitted;
      const nextStats = applyPointsToStats(
        existingStats,
        verifiedUser.uid,
        userProfile,
        verifiedUser.displayName || String(subDoc.authorName || 'Builder'),
        points,
        'suggestion_submitted',
        nowIso,
        dayKey,
        monthKey,
        weekKey
      );

      const newEvent: ContributionEvent = {
        id: eventId,
        uid: verifiedUser.uid,
        displayName: nextStats.displayName,
        actionType: 'suggestion_submitted',
        points,
        sourceCollection: 'feedbackSubmissions',
        sourceId: body.submissionId,
        label: `Submitted Suggestion: "${String(subDoc.title || 'Feedback').slice(0, 75)}"`,
        dayKey,
        monthKey,
        weekKey,
        reversed: false,
        createdAt: nowIso,
      };

      await adminCommitTransaction(tx, [
        {
          relativeDocPath: eventPath,
          data: newEvent as unknown as Record<string, unknown>,
          preconditionExists: false,
        },
        {
          relativeDocPath: statsPath,
          data: nextStats as unknown as Record<string, unknown>,
        },
        {
          relativeDocPath: subPath,
          data: { submissionPointAwarded: true, updatedAt: nowIso },
          mergeFields: ['submissionPointAwarded', 'updatedAt'],
        },
      ]);

      return res.status(200).json({
        awarded: true,
        pointsDelta: points,
        event: newEvent,
        stats: nextStats,
      });
    }

    // -------------------------------------------------------------
    // 4. SUGGESTION APPROVED / MARKED USEFUL (+2 bonus pts, mod/admin)
    // -------------------------------------------------------------
    if (body.action === 'suggestion_approved') {
      const allowed = await isModeratorOrAdmin(verifiedUser);
      if (!allowed) {
        return res.status(403).json({ error: 'Only moderators or admins can award useful suggestion bonus points.' });
      }
      if (!body.submissionId) {
        return res.status(400).json({ error: 'submissionId is required.' });
      }

      const subPath = `feedbackSubmissions/${body.submissionId}`;
      const subDoc = await adminGetDoc<Record<string, unknown>>(subPath);
      if (!subDoc || !subDoc.authorId) {
        return res.status(404).json({ awarded: false, error: 'Feedback submission not found.' });
      }
      const authorId = String(subDoc.authorId);
      const eventId = buildDeterministicContributionEventId({
        actionType: 'suggestion_approved',
        sourceId: body.submissionId,
      });
      const eventPath = `communityContributionEvents/${eventId}`;
      const statsPath = `communityContributionStats/${authorId}`;
      const userPath = `users/${authorId}`;

      const tx = await adminBeginTransaction();
      const docs = await adminBatchGetDocs([eventPath, statsPath, userPath], tx);
      if (docs.get(eventPath)) {
        return res.status(200).json({
          awarded: false,
          alreadyAwarded: true,
          skippedReason: 'Useful suggestion bonus was already awarded for this submission.',
        });
      }

      const existingStats = docs.get(statsPath) || null;
      const userProfile = docs.get(userPath) || null;
      const points = CONTRIBUTION_POINTS.suggestion_approved;
      const nextStats = applyPointsToStats(
        existingStats,
        authorId,
        userProfile,
        String(subDoc.authorName || 'Builder'),
        points,
        'suggestion_approved',
        nowIso,
        dayKey,
        monthKey,
        weekKey
      );

      const newEvent: ContributionEvent = {
        id: eventId,
        uid: authorId,
        displayName: nextStats.displayName,
        actionType: 'suggestion_approved',
        points,
        sourceCollection: 'feedbackSubmissions',
        sourceId: body.submissionId,
        label: `Useful Suggestion Bonus: "${String(subDoc.title || 'Feedback').slice(0, 75)}"`,
        dayKey,
        monthKey,
        weekKey,
        reversed: false,
        createdAt: nowIso,
      };

      const notifId = buildAutoFirestoreId();
      await adminCommitTransaction(tx, [
        {
          relativeDocPath: eventPath,
          data: newEvent as unknown as Record<string, unknown>,
          preconditionExists: false,
        },
        {
          relativeDocPath: statsPath,
          data: nextStats as unknown as Record<string, unknown>,
        },
        {
          relativeDocPath: subPath,
          data: { isUseful: true, bonusPointAwarded: true, updatedAt: nowIso },
          mergeFields: ['isUseful', 'bonusPointAwarded', 'updatedAt'],
        },
        {
          relativeDocPath: `userNotifications/${authorId}/items/${notifId}`,
          data: {
            id: notifId,
            uid: authorId,
            type: 'contribution_awarded',
            title: `+${points} Bonus Contribution Points!`,
            message: `A moderator marked your suggestion "${String(subDoc.title || 'Feedback').slice(0, 70)}" as useful (+${points} bonus points).`,
            actionUrl: `/community/contributors`,
            actionLabel: 'View Leaderboard',
            senderId: verifiedUser.uid,
            senderName: verifiedUser.displayName || 'Moderator',
            read: false,
            createdAt: nowIso,
          },
          preconditionExists: false,
        },
      ]);

      return res.status(200).json({
        awarded: true,
        pointsDelta: points,
        event: newEvent,
        stats: nextStats,
      });
    }

    // -------------------------------------------------------------
    // 5. ADMIN / MOD REVERSAL OF SPAM / INVALID CONTRIBUTION
    // -------------------------------------------------------------
    if (body.action === 'reverse_event') {
      const allowed = await isModeratorOrAdmin(verifiedUser);
      if (!allowed) {
        return res.status(403).json({ error: 'Only administrators or moderators can reverse contribution points.' });
      }
      const cleanReason = String(body.reason || '').trim();
      if (!body.eventId || cleanReason.length < 3) {
        return res.status(400).json({ error: 'Event ID and a reversal reason (min 3 characters) are required.' });
      }

      const eventPath = `communityContributionEvents/${body.eventId}`;
      const eventDoc = await adminGetDoc<ContributionEvent>(eventPath);
      if (!eventDoc) {
        return res.status(404).json({ error: 'Contribution event not found.' });
      }
      if (eventDoc.reversed) {
        return res.status(200).json({ reversed: false, skippedReason: 'Contribution event was already reversed.' });
      }

      const statsPath = `communityContributionStats/${eventDoc.uid}`;
      const tx = await adminBeginTransaction();
      const docs = await adminBatchGetDocs([eventPath, statsPath], tx);
      const freshEvent = docs.get(eventPath) as (ContributionEvent & Record<string, unknown>) | null;
      const statsDoc = docs.get(statsPath) as (CommunityContributionStats & Record<string, unknown>) | null;

      if (!freshEvent || freshEvent.reversed) {
        return res.status(200).json({ reversed: false, skippedReason: 'Contribution event was already reversed.' });
      }

      const writes: FirestoreTransactionWrite[] = [
        {
          relativeDocPath: eventPath,
          data: {
            reversed: true,
            reversedAt: nowIso,
            reversedBy: verifiedUser.uid,
            reversalReason: cleanReason,
          },
          mergeFields: ['reversed', 'reversedAt', 'reversedBy', 'reversalReason'],
        },
      ];

      if (statsDoc) {
        const pts = Math.max(0, Number(freshEvent.points || 0));
        const nextLifetime = Math.max(0, Number(statsDoc.lifetimePoints || 0) - pts);
        const nextMonthly =
          statsDoc.monthlyPeriodKey === freshEvent.monthKey
            ? Math.max(0, Number(statsDoc.monthlyPoints || 0) - pts)
            : Number(statsDoc.monthlyPoints || 0);
        const nextWeekly =
          statsDoc.weeklyPeriodKey === freshEvent.weekKey
            ? Math.max(0, Number(statsDoc.weeklyPoints || 0) - pts)
            : Number(statsDoc.weeklyPoints || 0);

        const statsUpdates: Record<string, unknown> = {
          lifetimePoints: nextLifetime,
          monthlyPoints: nextMonthly,
          weeklyPoints: nextWeekly,
          updatedAt: nowIso,
        };

        if (freshEvent.actionType === 'meaningful_reply') {
          statsUpdates.meaningfulRepliesCount = Math.max(
            0,
            Number(statsDoc.meaningfulRepliesCount || 0) - 1
          );
        } else if (freshEvent.actionType === 'showcase_published') {
          statsUpdates.approvedCreationsCount = Math.max(
            0,
            Number(statsDoc.approvedCreationsCount || 0) - 1
          );
        } else if (freshEvent.actionType === 'suggestion_submitted') {
          statsUpdates.suggestionsSubmittedCount = Math.max(
            0,
            Number(statsDoc.suggestionsSubmittedCount || 0) - 1
          );
        } else if (freshEvent.actionType === 'suggestion_approved') {
          statsUpdates.suggestionsAcceptedCount = Math.max(
            0,
            Number(statsDoc.suggestionsAcceptedCount || 0) - 1
          );
        }

        writes.push({
          relativeDocPath: statsPath,
          data: statsUpdates,
          mergeFields: Object.keys(statsUpdates),
        });
      }

      const auditId = buildAutoFirestoreId();
      writes.push({
        relativeDocPath: `adminAuditLogs/${auditId}`,
        data: {
          action: 'reverse_contribution',
          targetUid: freshEvent.uid,
          targetEmail: 'contributor',
          targetName: freshEvent.displayName || freshEvent.uid,
          adminUid: verifiedUser.uid,
          adminEmail: verifiedUser.email || 'admin',
          verifiedAgainstOfficialRecords: true,
          reason: `Reversed -${freshEvent.points} pts (${freshEvent.actionType}): ${cleanReason}`,
          createdAt: nowIso,
        },
        preconditionExists: false,
      });

      await adminCommitTransaction(tx, writes);
      return res.status(200).json({
        reversed: true,
        eventId: body.eventId,
        pointsDeducted: freshEvent.points,
      });
    }

    return res.status(400).json({ error: 'Unsupported contribution action.' });
  } catch (err) {
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 409) {
      return res.status(200).json({
        awarded: false,
        alreadyAwarded: true,
        skippedReason: 'Contribution reward already processed.',
      });
    }
    const message = err instanceof Error ? err.message : 'Failed to process contribution action.';
    return res.status(500).json({ error: message });
  }
}
