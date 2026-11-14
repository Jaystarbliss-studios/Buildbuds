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
 * Deduplicates online presence records by `uid`, filters out any stale/deleted accounts
 * not present in `validRegisteredUserIds` (when provided and non-empty), and merges the
 * current active user and any recently active message authors so the online member count
 * is fast, accurate, non-duplicated, and never exceeds the registered builder count.
 */
export function computeAccurateOnlineMembers(
  presenceRecords: RawPresenceRecord[],
  currentUserRecord: RawPresenceRecord | null,
  recentMessageAuthors: RawPresenceRecord[] = [],
  validRegisteredUserIds?: ReadonlySet<string>
): RawPresenceRecord[] {
  const hasRegistryFilter = Boolean(validRegisteredUserIds && validRegisteredUserIds.size > 0);
  const isAllowedUid = (uid: string): boolean => {
    if (!uid) return false;
    if (currentUserRecord && uid === currentUserRecord.uid) return true;
    if (!hasRegistryFilter) return true;
    return validRegisteredUserIds!.has(uid);
  };

  const byUid = new Map<string, RawPresenceRecord>();

  for (const rec of presenceRecords) {
    if (!isAllowedUid(rec.uid)) continue;
    const existing = byUid.get(rec.uid);
    if (!existing || rec.lastSeenMillis >= existing.lastSeenMillis) {
      byUid.set(rec.uid, rec);
    }
  }

  for (const author of recentMessageAuthors) {
    if (!isAllowedUid(author.uid)) continue;
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

  // Secondary guard: if a user recreated their account under the exact same displayName
  // and an older duplicate record still exists, keep only the current user's UID or the newest record
  const byNormalizedName = new Map<string, RawPresenceRecord>();
  for (const member of byUid.values()) {
    const normName = (member.displayName || '').trim().toLowerCase();
    if (!normName) {
      byNormalizedName.set(member.uid, member);
      continue;
    }
    const existing = byNormalizedName.get(normName);
    if (!existing) {
      byNormalizedName.set(normName, member);
      continue;
    }
    if (currentUserRecord && member.uid === currentUserRecord.uid) {
      byNormalizedName.set(normName, member);
    } else if (
      (!currentUserRecord || existing.uid !== currentUserRecord.uid) &&
      member.lastSeenMillis >= existing.lastSeenMillis
    ) {
      byNormalizedName.set(normName, member);
    }
  }

  return Array.from(byNormalizedName.values());
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
 * Only opens the sidebar when swiping right from the very left bezel edge (startX <= 28)
 * so swiping right on a message bubble triggers WhatsApp-style Swipe-to-Reply instead.
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

  if (!isSidebarOpen && deltaX >= 50 && startX <= 28) {
    return 'open-sidebar';
  }

  if (isSidebarOpen && deltaX <= -50) {
    return 'close-sidebar';
  }

  return 'none';
}

export const SWIPE_TO_REPLY_THRESHOLD_PX = 48;
export const SWIPE_TO_REPLY_MAX_OFFSET_PX = 72;

export interface MessageSwipeState {
  offsetPx: number;
  shouldTriggerReply: boolean;
  isSwipingHorizontally: boolean;
}

/**
 * Evaluates a touch drag gesture on an individual chat message bubble for WhatsApp-style
 * swipe-to-reply on mobile phones.
 */
export function evaluateMessageSwipeToReply(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number
): MessageSwipeState {
  // Ignore edge-bezel swipes reserved for opening the channel drawer
  if (startX <= 28) {
    return { offsetPx: 0, shouldTriggerReply: false, isSwipingHorizontally: false };
  }

  const deltaX = currentX - startX;
  const deltaY = currentY - startY;

  // Require rightward horizontal drag (like WhatsApp) where horizontal movement dominates vertical scroll
  if (deltaX <= 6 || Math.abs(deltaY) > Math.abs(deltaX) * 0.85) {
    return { offsetPx: 0, shouldTriggerReply: false, isSwipingHorizontally: false };
  }

  const clampedOffset = Math.min(SWIPE_TO_REPLY_MAX_OFFSET_PX, Math.round(deltaX * 0.78));
  return {
    offsetPx: clampedOffset,
    shouldTriggerReply: deltaX >= SWIPE_TO_REPLY_THRESHOLD_PX,
    isSwipingHorizontally: true,
  };
}

/**
 * Resolves the target message ID to scroll to when a user clicks a tagged/quoted reply banner
 * or a pinned message preview. Supports exact `replyToId` lookup with a fallback to matching
 * `replyToAuthor` + `replyToSnippet` for older messages.
 */
export function resolveJumpToMessageTarget<
  T extends { id: string; authorName: string; text: string }
>(
  messages: T[],
  replyToId?: string,
  replyToAuthor?: string,
  replyToSnippet?: string
): string | null {
  if (replyToId) {
    const exact = messages.find((m) => m.id === replyToId);
    if (exact) return exact.id;
  }

  if (replyToAuthor || replyToSnippet) {
    const normAuthor = (replyToAuthor || '').trim().toLowerCase();
    const normSnippet = (replyToSnippet || '').trim().toLowerCase();
    const fallback = messages.find((m) => {
      const authorMatches =
        !normAuthor || m.authorName.trim().toLowerCase() === normAuthor;
      const textMatches =
        !normSnippet ||
        m.text.trim().toLowerCase().startsWith(normSnippet.slice(0, 40)) ||
        normSnippet.startsWith(m.text.trim().toLowerCase().slice(0, 40));
      return authorMatches && textMatches;
    });
    if (fallback) return fallback.id;
  }

  return null;
}

/**
 * Builds the Firestore update fields when a moderator or admin pins or unpins a message.
 */
export function buildPinMessagePatch(
  currentlyPinned: boolean | undefined,
  actorDisplayName: string,
  nowMillis: number = Date.now()
): {
  isPinned: boolean;
  pinnedAtMillis: number;
  pinnedBy: string;
} {
  const nextPinned = !currentlyPinned;
  return {
    isPinned: nextPinned,
    pinnedAtMillis: nextPinned ? nowMillis : 0,
    pinnedBy: nextPinned ? (actorDisplayName.trim() || 'Moderator').slice(0, 60) : '',
  };
}

export const INITIAL_VISIBLE_MESSAGES_COUNT = 12;
export const SCROLL_UP_LOAD_BATCH_SIZE = 8;

export interface VisibleMessageWindow<T> {
  visibleMessages: T[];
  hiddenOlderCount: number;
  hasOlderMessages: boolean;
  nextVisibleCount: number;
}

/**
 * Slices a chronologically sorted message stream so only the most recent `visibleCount`
 * messages are rendered initially, and older messages are progressively revealed in batches
 * as the user scrolls up toward the top of the conversation.
 */
export function computeVisibleMessageWindow<T>(
  allMessages: T[],
  visibleCount: number = INITIAL_VISIBLE_MESSAGES_COUNT,
  batchSize: number = SCROLL_UP_LOAD_BATCH_SIZE
): VisibleMessageWindow<T> {
  const safeCount = Math.max(1, visibleCount);
  const total = allMessages.length;
  if (total <= safeCount) {
    return {
      visibleMessages: allMessages,
      hiddenOlderCount: 0,
      hasOlderMessages: false,
      nextVisibleCount: total,
    };
  }

  const startIndex = total - safeCount;
  const visibleMessages = allMessages.slice(startIndex);
  const hiddenOlderCount = startIndex;
  return {
    visibleMessages,
    hiddenOlderCount,
    hasOlderMessages: hiddenOlderCount > 0,
    nextVisibleCount: Math.min(total, safeCount + Math.max(1, batchSize)),
  };
}

export interface ComposerKeyDownInput {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  isComposing?: boolean;
}

export type ComposerKeyDownAction = 'send' | 'newline' | 'cancel' | 'noop';

/**
 * Evaluates keyboard shortcuts inside chat, thread reply, edit, and comment textareas:
 * - Plain `Enter` (or `Shift+Enter`): returns `'newline'` so the textarea inserts a new line naturally.
 * - `Ctrl+Enter` (or `Cmd+Enter` on macOS): returns `'send'` so the message is sent immediately.
 * - `Escape`: returns `'cancel'`.
 */
export function evaluateChatComposerKeyDown(
  input: ComposerKeyDownInput
): ComposerKeyDownAction {
  if (input.isComposing) return 'noop';
  if (input.key === 'Escape') return 'cancel';
  if (input.key === 'Enter') {
    if (input.ctrlKey || input.metaKey) {
      return 'send';
    }
    return 'newline';
  }
  return 'noop';
}

export const SCROLL_TO_BOTTOM_THRESHOLD_PX = 140;

/**
 * Returns true when the chat stream viewport has scrolled upward past `thresholdPx`
 * above the bottom so a floating Scroll-to-Bottom down arrow button should appear.
 */
export function shouldShowScrollToBottomButton(
  scrollHeight: number,
  scrollTop: number,
  clientHeight: number,
  thresholdPx: number = SCROLL_TO_BOTTOM_THRESHOLD_PX
): boolean {
  if (!Number.isFinite(scrollHeight) || !Number.isFinite(scrollTop) || !Number.isFinite(clientHeight)) {
    return false;
  }
  const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
  return distanceFromBottom > thresholdPx;
}

