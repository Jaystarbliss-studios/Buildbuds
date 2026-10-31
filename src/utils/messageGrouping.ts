export const GROUPING_TIME_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export interface GroupableMessage {
  id: string;
  channelId: string;
  authorId: string;
  createdAtMillis: number;
}

/**
 * Determines whether `current` message should be visually grouped underneath `previous`
 * in Discord-style compact consecutive message layout.
 *
 * Rules:
 * 1. Must have a previous message in the stream.
 * 2. Both messages must belong to the same channel/sub-group stream (`channelId`).
 * 3. Both messages must be sent by the exact same user (`authorId`).
 * 4. The time elapsed between `previous` and `current` must be >= 0 and <= `maxGapMs` (default 5 minutes).
 */
export function shouldGroupWithPreviousMessage(
  previous: GroupableMessage | null | undefined,
  current: GroupableMessage,
  maxGapMs: number = GROUPING_TIME_WINDOW_MS
): boolean {
  if (!previous) return false;
  if (!previous.authorId || !current.authorId) return false;
  if (previous.channelId !== current.channelId) return false;
  if (previous.authorId !== current.authorId) return false;

  const deltaMs = current.createdAtMillis - previous.createdAtMillis;
  if (deltaMs < 0 || deltaMs > maxGapMs) {
    return false;
  }

  return true;
}

export interface GroupedMessageEntry<T extends GroupableMessage> {
  message: T;
  isGroupedWithPrevious: boolean;
  isFirstInGroup: boolean;
}

/**
 * Annotates an ordered list of messages with Discord-style consecutive grouping metadata.
 */
export function annotateMessageGrouping<T extends GroupableMessage>(
  messages: T[],
  maxGapMs: number = GROUPING_TIME_WINDOW_MS
): GroupedMessageEntry<T>[] {
  return messages.map((msg, idx) => {
    const prev = idx > 0 ? messages[idx - 1] : null;
    const isGrouped = shouldGroupWithPreviousMessage(prev, msg, maxGapMs);
    return {
      message: msg,
      isGroupedWithPrevious: isGrouped,
      isFirstInGroup: !isGrouped,
    };
  });
}

export interface RawPresenceRecord {
  uid: string;
  displayName: string;
  avatarColor: string;
  avatarUrl?: string;
  activeChannelId: string;
  isTyping: boolean;
  lastSeenMillis: number;
}

/**
 * Deduplicates online presence records by `uid`, keeping the freshest record per user,
 * and merges the current active user and any recently active message authors so the online
 * member count is accurate, non-duplicated, and resilient to heartbeat race conditions.
 */
export function computeAccurateOnlineMembers(
  presenceRecords: RawPresenceRecord[],
  currentUserRecord: RawPresenceRecord | null,
  recentMessageAuthors: RawPresenceRecord[] = []
): RawPresenceRecord[] {
  const byUid = new Map<string, RawPresenceRecord>();

  for (const rec of presenceRecords) {
    if (!rec.uid) continue;
    const existing = byUid.get(rec.uid);
    if (!existing || rec.lastSeenMillis >= existing.lastSeenMillis) {
      byUid.set(rec.uid, rec);
    }
  }

  for (const author of recentMessageAuthors) {
    if (!author.uid) continue;
    if (!byUid.has(author.uid)) {
      byUid.set(author.uid, author);
    }
  }

  if (currentUserRecord && currentUserRecord.uid) {
    const existingSelf = byUid.get(currentUserRecord.uid);
    byUid.set(currentUserRecord.uid, {
      ...currentUserRecord,
      isTyping: existingSelf?.isTyping || currentUserRecord.isTyping,
    });
  }

  return Array.from(byUid.values());
}

/**
 * Computes the accurate next `threadCount` when a reply is added (+1) or deleted (-1),
 * preventing stale component state from freezing the counter at 1 when a user posts multiple replies.
 */
export function computeNextThreadReplyCount(
  storedThreadCount: number | undefined,
  loadedRepliesCount: number,
  delta: 1 | -1
): number {
  const safeStored = Math.max(0, Number(storedThreadCount || 0));
  const safeLoaded = Math.max(0, Number(loadedRepliesCount || 0));
  if (delta === 1) {
    return Math.max(safeStored, safeLoaded) + 1;
  }
  const base = safeLoaded > 0 ? safeLoaded : safeStored;
  return Math.max(0, base - 1);
}

/**
 * Computes the effective total reply count displayed on a message badge in the channel stream,
 * combining subcollection thread replies (using live loaded count when available) and inline channel replies.
 */
export function computeEffectiveReplyCount(
  storedThreadCount: number | undefined,
  loadedThreadRepliesCount: number | undefined,
  inlineChannelRepliesCount: number = 0
): number {
  const threadPart =
    typeof loadedThreadRepliesCount === 'number'
      ? Math.max(loadedThreadRepliesCount, Number(storedThreadCount || 0))
      : Math.max(0, Number(storedThreadCount || 0));
  return threadPart + Math.max(0, inlineChannelRepliesCount);
}

/**
 * Evaluates a touch gesture on mobile viewports to determine whether to open or close
 * the left-hand channel navigation panel.
 */
export function evaluateHorizontalSwipeGesture(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  isSidebarOpen: boolean
): 'open-sidebar' | 'close-sidebar' | 'none' {
  const deltaX = endX - startX;
  const deltaY = endY - startY;

  // Must be predominantly horizontal
  if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY) * 1.3) {
    return 'none';
  }

  if (!isSidebarOpen && deltaX >= 50 && startX <= 180) {
    return 'open-sidebar';
  }

  if (isSidebarOpen && deltaX <= -50) {
    return 'close-sidebar';
  }

  return 'none';
}

