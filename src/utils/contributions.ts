/**
 * Single source of truth for Build Buds "Builder Contributions" scoring rules,
 * meaningful reply quality checks, UTC rolling period keys, deterministic event IDs,
 * and leaderboard ranking helpers.
 */

import type { ContributionEventType, CommunityContributionStats } from '../types/community.ts';

export const CONTRIBUTION_POINTS: Record<ContributionEventType, number> = {
  meaningful_reply: 2,
  showcase_published: 5,
  suggestion_submitted: 1,
  suggestion_approved: 2,
};

export const MEANINGFUL_REPLY_MIN_CHARS = 20;
export const DAILY_REPLY_REWARD_CAP = 5;
export const SUGGESTION_MIN_TITLE_CHARS = 3;
export const SUGGESTION_MIN_EXPLANATION_CHARS = 20;

export function getUtcDayKey(dateInput: Date = new Date()): string {
  return dateInput.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function getUtcMonthKey(dateInput: Date = new Date()): string {
  return dateInput.toISOString().slice(0, 7); // YYYY-MM
}

/**
 * Computes ISO-8601 UTC week key (`YYYY-Www`) so weekly leaderboards reset consistently every Monday 00:00 UTC.
 */
export function getUtcWeekKey(dateInput: Date = new Date()): string {
  const d = new Date(
    Date.UTC(dateInput.getUTCFullYear(), dateInput.getUTCMonth(), dateInput.getUTCDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function normalizeContributionTextForSpamCheck(text: string): string {
  return String(text || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface MeaningfulReplyValidationResult {
  eligible: boolean;
  reason?: string;
  fingerprint: string;
}

/**
 * Evaluates whether a reply / comment qualifies as a meaningful peer contribution:
 * - Cannot reply to own message/post
 * - At least 20 trimmed characters
 * - Rejects copied parent text, repeated single characters, and pure repeated-word filler
 * - Rejects duplicate reply fingerprints sent by the same member on the same UTC day
 */
export function validateMeaningfulReplyEligibility(params: {
  replyText: string;
  parentText?: string;
  actorUid: string;
  parentAuthorUid?: string;
  dailyReplyRewardsCount?: number;
  recentReplyFingerprints?: string[];
}): MeaningfulReplyValidationResult {
  const {
    replyText,
    parentText = '',
    actorUid,
    parentAuthorUid,
    dailyReplyRewardsCount = 0,
    recentReplyFingerprints = [],
  } = params;

  const trimmed = String(replyText || '').trim();
  const normalized = normalizeContributionTextForSpamCheck(trimmed);

  if (!actorUid) {
    return { eligible: false, reason: 'Missing contributor ID.', fingerprint: normalized };
  }

  if (parentAuthorUid && parentAuthorUid === actorUid) {
    return {
      eligible: false,
      reason: 'Replies to your own post or message do not earn contribution points.',
      fingerprint: normalized,
    };
  }

  if (trimmed.length < MEANINGFUL_REPLY_MIN_CHARS) {
    return {
      eligible: false,
      reason: `Replies must be at least ${MEANINGFUL_REPLY_MIN_CHARS} characters to count as meaningful feedback.`,
      fingerprint: normalized,
    };
  }

  if (dailyReplyRewardsCount >= DAILY_REPLY_REWARD_CAP) {
    return {
      eligible: false,
      reason: `Daily limit of ${DAILY_REPLY_REWARD_CAP} reply rewards reached for today.`,
      fingerprint: normalized,
    };
  }

  // Reject pure character repetition like "aaaaaaaaaaaaaaaaaaaa" or "!!!!!!..."
  const uniqueChars = new Set(normalized.replace(/\s+/g, '').split(''));
  if (uniqueChars.size < 5) {
    return {
      eligible: false,
      reason: 'Repetitive characters do not qualify as a meaningful reply.',
      fingerprint: normalized,
    };
  }

  // Require multiple distinct words so repeated-word spam like "cool cool cool cool cool" does not earn points
  const words = normalized.split(' ').filter(Boolean);
  const uniqueWords = new Set(words);
  if (words.length < 4 || uniqueWords.size < 3) {
    return {
      eligible: false,
      reason: 'Reply should include a complete helpful sentence rather than repeated words.',
      fingerprint: normalized,
    };
  }

  // Reject copy-pasting the parent message verbatim
  const normalizedParent = normalizeContributionTextForSpamCheck(parentText);
  if (normalizedParent && normalized === normalizedParent) {
    return {
      eligible: false,
      reason: 'Copied parent text does not qualify for contribution points.',
      fingerprint: normalized,
    };
  }

  // Reject duplicate identical/near-identical replies submitted repeatedly in the same day
  if (normalized && recentReplyFingerprints.includes(normalized)) {
    return {
      eligible: false,
      reason: 'Duplicate reply content was already credited today.',
      fingerprint: normalized,
    };
  }

  return {
    eligible: true,
    fingerprint: normalized,
  };
}

/**
 * Validates that a Feature Suggestion / Feedback submission qualifies for submission credit.
 */
export function validateSuggestionContribution(params: {
  title: string;
  explanation: string;
}): { valid: boolean; reason?: string } {
  const titleLen = String(params.title || '').trim().length;
  const expLen = String(params.explanation || '').trim().length;
  if (titleLen < SUGGESTION_MIN_TITLE_CHARS) {
    return { valid: false, reason: 'Suggestion title is too short.' };
  }
  if (expLen < SUGGESTION_MIN_EXPLANATION_CHARS) {
    return {
      valid: false,
      reason: `Please provide at least ${SUGGESTION_MIN_EXPLANATION_CHARS} characters of detail so the team can review your suggestion.`,
    };
  }
  return { valid: true };
}

/**
 * Generates deterministic Firestore document IDs for contribution events so retries
 * and duplicate submissions can NEVER double-award points.
 */
export function buildDeterministicContributionEventId(params: {
  actionType: ContributionEventType;
  sourceKind?: 'hub_thread' | 'hub_message_reply' | 'public_comment' | 'public_post' | 'feedback';
  sourceId: string;
}): string {
  const safeId = String(params.sourceId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 120);

  switch (params.actionType) {
    case 'meaningful_reply':
      return `reply_${params.sourceKind || 'hub_thread'}_${safeId}`;
    case 'showcase_published':
      return `showcase_post_${safeId}`;
    case 'suggestion_submitted':
      return `suggestion_submit_${safeId}`;
    case 'suggestion_approved':
      return `suggestion_bonus_${safeId}`;
  }
}

export type LeaderboardTimeframe = 'all_time' | 'monthly' | 'weekly';

/**
 * Returns a contributor's effective points for the requested timeframe, automatically
 * returning 0 for weekly/monthly scores whose stored period key belongs to a past week/month.
 */
export function getContributorPointsForTimeframe(
  stats: Pick<
    CommunityContributionStats,
    'lifetimePoints' | 'monthlyPoints' | 'monthlyPeriodKey' | 'weeklyPoints' | 'weeklyPeriodKey'
  >,
  timeframe: LeaderboardTimeframe,
  nowDate: Date = new Date()
): number {
  if (timeframe === 'all_time') {
    return Math.max(0, Number(stats.lifetimePoints || 0));
  }
  if (timeframe === 'monthly') {
    return stats.monthlyPeriodKey === getUtcMonthKey(nowDate)
      ? Math.max(0, Number(stats.monthlyPoints || 0))
      : 0;
  }
  return stats.weeklyPeriodKey === getUtcWeekKey(nowDate)
    ? Math.max(0, Number(stats.weeklyPoints || 0))
    : 0;
}

export interface RankedContributorEntry {
  stats: CommunityContributionStats;
  points: number;
  rank: number;
}

/**
 * Sorts and assigns 1-based leaderboard ranks deterministically across All-Time, Monthly, and Weekly timeframes.
 */
export function rankContributorsForLeaderboard(
  list: CommunityContributionStats[],
  timeframe: LeaderboardTimeframe,
  nowDate: Date = new Date()
): RankedContributorEntry[] {
  const scored = list
    .map((stats) => ({
      stats,
      points: getContributorPointsForTimeframe(stats, timeframe, nowDate),
    }))
    .filter((entry) =>
      timeframe === 'all_time'
        ? entry.points > 0 ||
          entry.stats.approvedCreationsCount > 0 ||
          entry.stats.meaningfulRepliesCount > 0 ||
          entry.stats.suggestionsSubmittedCount > 0
        : entry.points > 0
    )
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.stats.approvedCreationsCount !== a.stats.approvedCreationsCount) {
        return b.stats.approvedCreationsCount - a.stats.approvedCreationsCount;
      }
      if (b.stats.meaningfulRepliesCount !== a.stats.meaningfulRepliesCount) {
        return b.stats.meaningfulRepliesCount - a.stats.meaningfulRepliesCount;
      }
      return (a.stats.displayName || '').localeCompare(b.stats.displayName || '');
    });

  return scored.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
  }));
}
