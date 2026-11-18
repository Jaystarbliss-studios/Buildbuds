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

export interface FocusShortcutInput {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

/**
 * Returns true when the user presses Ctrl+K (or Cmd+K on macOS) without Shift/Alt
 * so the app focuses directly into the active chat or comment input box.
 */
export function isFocusComposerShortcut(input: FocusShortcutInput): boolean {
  if (!input.key) return false;
  if (input.shiftKey || input.altKey) return false;
  return Boolean((input.ctrlKey || input.metaKey) && input.key.toLowerCase() === 'k');
}

/**
 * Evaluates keyboard shortcuts inside chat, thread reply, edit, and comment textareas:
 * - `Shift+Enter`: returns `'newline'` so the textarea inserts a new line naturally.
 * - `Enter` (or `Ctrl+Enter` / `Cmd+Enter` on macOS): returns `'send'` so the message is sent immediately.
 * - `Escape`: returns `'cancel'`.
 */
export function evaluateChatComposerKeyDown(
  input: ComposerKeyDownInput
): ComposerKeyDownAction {
  if (input.isComposing) return 'noop';
  if (input.key === 'Escape') return 'cancel';
  if (input.key === 'Enter') {
    if (input.shiftKey) {
      return 'newline';
    }
    return 'send';
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

export interface MentionResolutionTarget {
  uid: string;
  displayName: string;
}

export interface ResolvedMentionTargets {
  mentionAll: boolean;
  mentionedUids: string[];
  mentionedNames: string[];
}

/**
 * Extracts all `@all` and `@Username` targets referenced inside text,
 * matching known directory display names case-insensitively and ignoring self.
 */
export function resolveMentionedTargets(
  text: string,
  users: MentionResolutionTarget[],
  excludeUid?: string | null
): ResolvedMentionTargets {
  if (!text || !text.includes('@')) {
    return { mentionAll: false, mentionedUids: [], mentionedNames: [] };
  }

  const lower = text.toLowerCase();
  const mentionAll = /(?:^|\s)@all(?:\b|\s|$|[!?,.:;])/i.test(lower);

  const uidSet = new Set<string>();
  const nameSet = new Set<string>();

  for (const user of users) {
    if (!user.uid || (excludeUid && user.uid === excludeUid)) continue;
    const cleanName = (user.displayName || '').trim();
    if (!cleanName) continue;
    const escaped = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tokenRegex = new RegExp(`(?:^|\\s)@${escaped}(?=\\b|\\s|$|[!?,.:;])`, 'i');
    if (tokenRegex.test(text)) {
      uidSet.add(user.uid);
      nameSet.add(cleanName);
    }
  }

  return {
    mentionAll,
    mentionedUids: Array.from(uidSet),
    mentionedNames: Array.from(nameSet),
  };
}

export interface ChannelActivitySummary {
  channelId: string;
  lastMessageAtMillis: number;
  lastMessageAuthorId: string;
  lastMentionedUids?: string[];
  lastMentionAll?: boolean;
}

/**
 * Computes unread & `@mention` badge state for a sidebar channel using lightweight
 * channel activity summaries and the user's persisted per-channel `lastSeenMillis` map.
 */
export function computeChannelUnreadState(
  channelId: string,
  activityMap: Record<string, ChannelActivitySummary | undefined>,
  lastSeenMap: Record<string, number | undefined>,
  currentUserUid?: string | null,
  activeChannelId?: string | null
): { hasUnread: boolean; hasMention: boolean } {
  if (activeChannelId && activeChannelId === channelId) {
    return { hasUnread: false, hasMention: false };
  }
  const activity = activityMap[channelId];
  if (!activity || !activity.lastMessageAtMillis) {
    return { hasUnread: false, hasMention: false };
  }
  if (currentUserUid && activity.lastMessageAuthorId === currentUserUid) {
    return { hasUnread: false, hasMention: false };
  }

  const lastSeen = Number(lastSeenMap[channelId] || 0);
  if (activity.lastMessageAtMillis <= lastSeen) {
    return { hasUnread: false, hasMention: false };
  }

  const isMentionedDirectly = Boolean(
    currentUserUid &&
      Array.isArray(activity.lastMentionedUids) &&
      activity.lastMentionedUids.includes(currentUserUid)
  );
  const hasMention = Boolean(activity.lastMentionAll || isMentionedDirectly);

  return {
    hasUnread: true,
    hasMention,
  };
}

export interface ReconcileChannelMessagesInput<
  T extends { id: string; channelId: string; createdAtMillis: number }
> {
  activeStreamId: string;
  liveMessages: T[];
  cachedMessages: T[];
  deletedMessageIds: ReadonlySet<string>;
  fromCache: boolean;
  isTruncated: boolean;
}

/**
 * Reconciles live Firestore channel messages with cached local messages without EVER
 * resurrecting deleted messages. Once a live non-truncated server snapshot arrives,
 * live server documents are 100% authoritative for `activeStreamId`.
 */
export function reconcileChannelMessagesAfterSnapshot<
  T extends { id: string; channelId: string; createdAtMillis: number }
>({
  activeStreamId,
  liveMessages,
  cachedMessages,
  deletedMessageIds,
  fromCache,
  isTruncated,
}: ReconcileChannelMessagesInput<T>): T[] {
  const byId = new Map<string, T>();

  const oldestLiveMillis = liveMessages.reduce(
    (min, item) => (item.createdAtMillis < min ? item.createdAtMillis : min),
    Infinity
  );

  cachedMessages.forEach((cached) => {
    if (cached.channelId !== activeStreamId) return;
    if (deletedMessageIds.has(cached.id)) return;
    if (!fromCache) {
      // Live authoritative snapshot covers the full channel: drop stale cached items missing from server
      if (!isTruncated) return;
      // If truncated at query limit, only preserve cached items strictly older than the live window
      if (oldestLiveMillis === Infinity || cached.createdAtMillis >= oldestLiveMillis) {
        return;
      }
    }
    byId.set(cached.id, cached);
  });

  liveMessages.forEach((msg) => {
    if (msg.channelId !== activeStreamId) return;
    if (deletedMessageIds.has(msg.id)) return;
    byId.set(msg.id, msg);
  });

  return Array.from(byId.values()).sort(
    (a, b) => a.createdAtMillis - b.createdAtMillis
  );
}

export interface ReconcileShowcaseMessagesInput<
  T extends { id: string; channelId: string; linkUrl?: string; text: string; createdAtMillis: number }
> {
  prevMessages: T[];
  liveLinkMessages: T[];
  deletedMessageIds: ReadonlySet<string>;
  fromCache: boolean;
  isTruncated: boolean;
  activeStreamId?: string;
}

/**
 * Reconciles Shared Links / Showcase items against live `linkUrl` query results so deleted
 * links vanish cleanly for every user instead of lingering in localStorage or React state.
 */
export function reconcileShowcaseMessages<
  T extends { id: string; channelId: string; linkUrl?: string; text: string; createdAtMillis: number }
>({
  prevMessages,
  liveLinkMessages,
  deletedMessageIds,
  fromCache,
  isTruncated,
}: ReconcileShowcaseMessagesInput<T>): T[] {
  const liveLinkIds = new Set(liveLinkMessages.map((m) => m.id));
  const byId = new Map<string, T>();

  const oldestLiveMillis = liveLinkMessages.reduce(
    (min, item) => (item.createdAtMillis < min ? item.createdAtMillis : min),
    Infinity
  );

  prevMessages.forEach((item) => {
    if (deletedMessageIds.has(item.id)) return;
    if (item.linkUrl) {
      if (!fromCache) {
        if (!isTruncated && !liveLinkIds.has(item.id)) return;
        if (
          isTruncated &&
          oldestLiveMillis !== Infinity &&
          item.createdAtMillis >= oldestLiveMillis &&
          !liveLinkIds.has(item.id)
        ) {
          return;
        }
      }
    }
    byId.set(item.id, item);
  });

  liveLinkMessages.forEach((item) => {
    if (!deletedMessageIds.has(item.id)) {
      byId.set(item.id, item);
    }
  });

  return Array.from(byId.values()).sort(
    (a, b) => b.createdAtMillis - a.createdAtMillis
  );
}

/**
 * Filters a specific channel's serialized localStorage cache by removing `deletedId`
 * without corrupting it with messages from another active stream.
 */
export function filterCachedChannelMessagesJson(
  rawJson: string | null,
  deletedId: string
): string {
  if (!rawJson) return '[]';
  try {
    const parsed = JSON.parse(rawJson);
    if (!Array.isArray(parsed)) return '[]';
    const filtered = parsed.filter(
      (item) => item && typeof item === 'object' && item.id !== deletedId
    );
    return JSON.stringify(filtered.slice(-60));
  } catch {
    return '[]';
  }
}

export interface HubDeepLinkTarget {
  channelId: string;
  streamId?: string;
  subGroupId?: string | null;
  messageId?: string;
  reportId?: string;
  openReports?: boolean;
}

/**
 * Parses `/hub?channel=...&stream=...&messageId=...&reportId=...&tab=reports` URLs
 * into structured Hub deep-link state for smooth navigation and scroll-to-message.
 */
export function parseHubDeepLinkParams(path: string): HubDeepLinkTarget | null {
  if (!path) return null;
  const cleanPath = path.split('?')[0];
  if (cleanPath !== '/hub') return null;

  const qIdx = path.indexOf('?');
  if (qIdx === -1) return null;

  const params = new URLSearchParams(path.slice(qIdx + 1));
  const rawStream = params.get('stream')?.trim() || '';
  const rawChannel = params.get('channel')?.trim() || '';
  const messageId = params.get('messageId')?.trim() || '';
  const reportId = params.get('reportId')?.trim() || '';
  const tab = params.get('tab')?.trim() || '';

  const effectiveStream = rawStream || rawChannel;
  const baseChannelId = (effectiveStream || 'general-chat').split('__group__')[0];
  const subGroupId =
    effectiveStream && effectiveStream.includes('__group__')
      ? effectiveStream.split('__group__')[1] || null
      : null;

  if (!rawChannel && !rawStream && !messageId && !reportId && tab !== 'reports') {
    return null;
  }

  return {
    channelId: baseChannelId,
    ...(effectiveStream ? { streamId: effectiveStream } : {}),
    subGroupId,
    ...(messageId ? { messageId } : {}),
    ...(reportId ? { reportId } : {}),
    ...(tab === 'reports' ? { openReports: true } : {}),
  };
}

/**
 * Resolves the startup route for installed PWA launches so `/` or empty paths
 * open straight at `/community` rather than the marketing homepage.
 */
export function resolveStandaloneInitialRoute(
  pathname: string,
  search: string,
  isStandalone: boolean
): string {
  const safePath = pathname || '/';
  const safeSearch = search || '';
  if (isStandalone && (safePath === '/' || safePath === '')) {
    return `/community${safeSearch}`;
  }
  return `${safePath}${safeSearch}`;
}

export interface InspectableReportLike {
  id?: string;
  messageId?: string;
  referencedMessageId?: string;
  channelId?: string;
  referencedChannelId?: string;
  streamId?: string;
  reportedUserId?: string;
  status?: string;
  createdAtMillis?: unknown;
  createdAt?: unknown;
}

/**
 * Extracts a numeric epoch-millisecond timestamp from a Firestore report document
 * supporting numeric `createdAtMillis`, Firestore `Timestamp` (`.toMillis()`),
 * `{ seconds }`, or ISO date strings.
 */
export function extractReportTimestampMillis(report: {
  createdAtMillis?: unknown;
  createdAt?: unknown;
}): number {
  if (typeof report.createdAtMillis === 'number' && Number.isFinite(report.createdAtMillis)) {
    return report.createdAtMillis;
  }
  const raw = report.createdAt;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (raw && typeof raw === 'object') {
    const withToMillis = raw as { toMillis?: () => number; seconds?: number };
    if (typeof withToMillis.toMillis === 'function') {
      try {
        const ms = withToMillis.toMillis();
        if (Number.isFinite(ms)) return ms;
      } catch {
        // Fallback below
      }
    }
    if (typeof withToMillis.seconds === 'number' && Number.isFinite(withToMillis.seconds)) {
      return withToMillis.seconds * 1000;
    }
  }
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

/**
 * Sorts moderation reports newest-first so newly flagged items always appear at the top
 * of Admin & Moderator queues regardless of query snapshot order.
 */
export function sortReportsNewestFirst<T extends { createdAtMillis?: unknown; createdAt?: unknown }>(
  reports: T[]
): T[] {
  return [...reports].sort(
    (a, b) => extractReportTimestampMillis(b) - extractReportTimestampMillis(a)
  );
}

/**
 * Resolves the underlying Firestore `/messages/{id}` document ID for either a direct
 * message report or a member report that attached an offending `referencedMessageId`.
 */
export function resolveReportInspectMessageId(report: {
  messageId?: string;
  referencedMessageId?: string;
}): string | null {
  const refId = (report.referencedMessageId || '').trim();
  if (
    refId &&
    !refId.startsWith('user-') &&
    !refId.startsWith('post:') &&
    !refId.startsWith('comment:')
  ) {
    return refId;
  }
  const msgId = (report.messageId || '').trim();
  if (
    msgId &&
    !msgId.startsWith('user-') &&
    !msgId.startsWith('post:') &&
    !msgId.startsWith('comment:')
  ) {
    return msgId;
  }
  return null;
}

/**
 * Resolves the reported user's UID from either `reportedUserId` or a `user-{uid}` report target.
 */
export function resolveReportTargetUserId(report: {
  reportedUserId?: string;
  messageId?: string;
}): string {
  const explicit = (report.reportedUserId || '').trim();
  if (explicit) return explicit;
  const msgId = (report.messageId || '').trim();
  if (msgId.startsWith('user-')) {
    return msgId.slice(5).trim();
  }
  return '';
}

/**
 * Counts currently open moderation reports keyed by reported user UID.
 */
export function groupOpenReportCountByUserId<
  T extends { status?: string; reportedUserId?: string; messageId?: string }
>(reports: T[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of reports) {
    if ((r.status || 'open') !== 'open') continue;
    const uid = resolveReportTargetUserId(r);
    if (!uid) continue;
    counts[uid] = (counts[uid] || 0) + 1;
  }
  return counts;
}

/**
 * Builds a deep-link URL to inspect a moderation report directly inside `/hub` or `/community/posts/...`.
 */
export function buildModerationReportJumpUrl(report: InspectableReportLike): string {
  const rawChannel = (report.referencedChannelId || report.channelId || '').trim();
  if (rawChannel.startsWith('publicPosts/')) {
    const postId = rawChannel.replace('publicPosts/', '');
    return report.id
      ? `/community/posts/${postId}?reportId=${encodeURIComponent(report.id)}`
      : `/community/posts/${postId}`;
  }
  const rawStream = (report.streamId || rawChannel || 'general-chat').trim();
  const baseCh = rawStream.split('__group__')[0] || 'general-chat';
  const inspectMsgId = resolveReportInspectMessageId(report);
  const qs = new URLSearchParams();
  qs.set('channel', baseCh);
  if (rawStream && rawStream !== baseCh) {
    qs.set('stream', rawStream);
  }
  if (inspectMsgId) {
    qs.set('messageId', inspectMsgId);
  }
  if (report.id) {
    qs.set('reportId', report.id);
  }
  return `/hub?${qs.toString()}`;
}

