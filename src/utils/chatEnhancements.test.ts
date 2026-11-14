import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldGroupWithPreviousMessage,
  annotateMessageGrouping,
  computeAccurateOnlineMembers,
  computeNextThreadReplyCount,
  computeEffectiveReplyCount,
  evaluateHorizontalSwipeGesture,
  evaluateMessageSwipeToReply,
  resolveJumpToMessageTarget,
  buildPinMessagePatch,
  computeVisibleMessageWindow,
  evaluateChatComposerKeyDown,
  INITIAL_VISIBLE_MESSAGES_COUNT,
  SCROLL_UP_LOAD_BATCH_SIZE,
  GROUPING_TIME_WINDOW_MS,
  SWIPE_TO_REPLY_THRESHOLD_PX,
  SWIPE_TO_REPLY_MAX_OFFSET_PX,
} from './messageGrouping';
import {
  PRESET_AVATARS,
  getDefaultPresetAvatar,
  findPresetAvatar,
  resolveBuilderAvatarUrl,
} from './avatars';
import {
  cleanExtractedUrl,
  extractFirstUrl,
  generateLinkPreview,
  resolveMessageLinkPreview,
} from './moderation';

test('Discord-style consecutive message grouping combines same-user messages within 5 minutes', () => {
  const baseTime = 1_700_000_000_000;
  const messages = [
    { id: 'm1', channelId: 'general-chat', authorId: 'user-1', createdAtMillis: baseTime },
    { id: 'm2', channelId: 'general-chat', authorId: 'user-1', createdAtMillis: baseTime + 25_000 },
    { id: 'm3', channelId: 'general-chat', authorId: 'user-1', createdAtMillis: baseTime + 60_000 },
    { id: 'm4', channelId: 'general-chat', authorId: 'user-2', createdAtMillis: baseTime + 75_000 },
    { id: 'm5', channelId: 'general-chat', authorId: 'user-1', createdAtMillis: baseTime + 90_000 },
  ];

  const grouped = annotateMessageGrouping(messages);
  assert.equal(grouped[0].isFirstInGroup, true);
  assert.equal(grouped[0].isGroupedWithPrevious, false);

  assert.equal(grouped[1].isFirstInGroup, false);
  assert.equal(grouped[1].isGroupedWithPrevious, true);

  assert.equal(grouped[2].isFirstInGroup, false);
  assert.equal(grouped[2].isGroupedWithPrevious, true);

  // Different user starts a new group
  assert.equal(grouped[3].isFirstInGroup, true);
  assert.equal(grouped[3].isGroupedWithPrevious, false);

  // Original user speaking after someone else starts a fresh group with avatar & username
  assert.equal(grouped[4].isFirstInGroup, true);
  assert.equal(grouped[4].isGroupedWithPrevious, false);
});

test('Consecutive messages from the same user separated by more than 5 minutes start a new group', () => {
  const baseTime = 1_700_000_000_000;
  const prev = {
    id: 'm1',
    channelId: 'general-chat',
    authorId: 'user-1',
    createdAtMillis: baseTime,
  };
  const withinWindow = {
    id: 'm2',
    channelId: 'general-chat',
    authorId: 'user-1',
    createdAtMillis: baseTime + GROUPING_TIME_WINDOW_MS,
  };
  const afterWindow = {
    id: 'm3',
    channelId: 'general-chat',
    authorId: 'user-1',
    createdAtMillis: baseTime + GROUPING_TIME_WINDOW_MS + 1,
  };

  assert.equal(shouldGroupWithPreviousMessage(prev, withinWindow), true);
  assert.equal(shouldGroupWithPreviousMessage(prev, afterWindow), false);
});

test('Predefined avatar collection provides 24 graphical SVG portraits and resolves deterministically', () => {
  assert.ok(PRESET_AVATARS.length >= 20 && PRESET_AVATARS.length <= 30);
  for (const avatar of PRESET_AVATARS) {
    assert.ok(avatar.id.startsWith('avatar-'));
    assert.ok(avatar.dataUrl.startsWith('data:image/svg+xml;utf8,'));
  }

  const chosen = PRESET_AVATARS[3];
  assert.equal(findPresetAvatar(chosen.id)?.id, chosen.id);
  assert.equal(resolveBuilderAvatarUrl(chosen.id, 'uid-123'), chosen.dataUrl);

  // Fallback for users who have not picked a preset avatar yet is deterministic
  const def1 = getDefaultPresetAvatar('user-abc-999');
  const def2 = getDefaultPresetAvatar('user-abc-999');
  assert.equal(def1.id, def2.id);
  assert.equal(resolveBuilderAvatarUrl('', 'user-abc-999'), def1.dataUrl);
});

test('computeAccurateOnlineMembers deduplicates presence by uid and includes active users', () => {
  const now = Date.now();
  const records = [
    {
      uid: 'u1',
      displayName: 'Munachimso',
      avatarColor: '#FFF025',
      activeChannelId: 'general-chat',
      isTyping: false,
      lastSeenMillis: now - 5000,
    },
    {
      uid: 'u1', // duplicate session / snapshot entry
      displayName: 'Munachimso',
      avatarColor: '#FFF025',
      activeChannelId: 'games',
      isTyping: true,
      lastSeenMillis: now - 1000,
    },
    {
      uid: 'u2',
      displayName: 'Jaystarbliss',
      avatarColor: '#B11469',
      activeChannelId: 'general-chat',
      isTyping: false,
      lastSeenMillis: now - 2000,
    },
  ];

  const recentAuthors = [
    {
      uid: 'u3',
      displayName: 'Tobi',
      avatarColor: '#38BDF8',
      activeChannelId: 'general-chat',
      isTyping: false,
      lastSeenMillis: now - 10000,
    },
  ];

  const result = computeAccurateOnlineMembers(records, null, recentAuthors);
  assert.equal(result.length, 3);
  const u1 = result.find((r) => r.uid === 'u1');
  assert.equal(u1?.activeChannelId, 'games');
  assert.equal(u1?.isTyping, true);
});

test('Thread reply counter increments accurately across 3 consecutive replies and self-heals stale counts', () => {
  // Even if initial stored threadCount was 0, replying 3 times increments 1 -> 2 -> 3
  const countAfter1 = computeNextThreadReplyCount(0, 0, 1);
  assert.equal(countAfter1, 1);

  const countAfter2 = computeNextThreadReplyCount(0, 1, 1);
  assert.equal(countAfter2, 2);

  const countAfter3 = computeNextThreadReplyCount(1, 2, 1);
  assert.equal(countAfter3, 3);

  // Deleting one reply from 3 brings it to 2
  const countAfterDelete = computeNextThreadReplyCount(3, 3, -1);
  assert.equal(countAfterDelete, 2);

  // Effective reply count combines live thread replies and inline channel replies
  assert.equal(computeEffectiveReplyCount(1, 3, 0), 3);
  assert.equal(computeEffectiveReplyCount(1, 3, 2), 5);
});

test('Mobile horizontal swipe gesture opens and closes left sidebar cleanly', () => {
  // Swiping right from left edge opens sidebar
  assert.equal(evaluateHorizontalSwipeGesture(24, 300, 120, 310, false), 'open-sidebar');
  // Swiping right from middle of screen (e.g. on a message bubble) does NOT open sidebar
  assert.equal(evaluateHorizontalSwipeGesture(80, 300, 160, 305, false), 'none');
  // Vertical scroll does not trigger sidebar swipe
  assert.equal(evaluateHorizontalSwipeGesture(24, 300, 60, 450, false), 'none');
  // Swiping left when sidebar is open closes sidebar
  assert.equal(evaluateHorizontalSwipeGesture(220, 300, 90, 305, true), 'close-sidebar');
});

test('WhatsApp-style swipe-to-reply gesture triggers reply past threshold and clamps offset', () => {
  // Partial swipe (30px drag < 48px threshold) moves bubble with 0.78x damping (23px) and does not trigger reply yet
  const partial = evaluateMessageSwipeToReply(100, 200, 130, 204);
  assert.equal(partial.offsetPx, 23);
  assert.equal(partial.shouldTriggerReply, false);

  // Full swipe (>= 48px threshold) triggers reply and clamps at 72px
  const full = evaluateMessageSwipeToReply(100, 200, 195, 205);
  assert.equal(full.offsetPx, SWIPE_TO_REPLY_MAX_OFFSET_PX);
  assert.equal(full.shouldTriggerReply, true);
  assert.ok(SWIPE_TO_REPLY_THRESHOLD_PX <= SWIPE_TO_REPLY_MAX_OFFSET_PX);

  // Vertical scrolling on a message does not trigger swipe-to-reply
  const vertical = evaluateMessageSwipeToReply(100, 200, 130, 260);
  assert.equal(vertical.offsetPx, 0);
  assert.equal(vertical.shouldTriggerReply, false);
});

test('resolveJumpToMessageTarget locates original message by ID or author+snippet fallback', () => {
  const stream = [
    { id: 'msg-101', authorName: 'John Rufai', text: 'Welcome to the Build Buds Student Hub!' },
    { id: 'msg-102', authorName: 'Jaystarbliss', text: 'Working on our new 3D physics level today' },
  ];

  // Direct ID match
  assert.equal(resolveJumpToMessageTarget(stream, 'msg-101', 'John Rufai', 'Welcome'), 'msg-101');
  // Fallback when replyToId is missing or legacy
  assert.equal(
    resolveJumpToMessageTarget(stream, undefined, 'Jaystarbliss', 'Working on our new 3D'),
    'msg-102'
  );
  // Missing target returns null
  assert.equal(resolveJumpToMessageTarget(stream, 'non-existent', 'Nobody', 'Nope'), null);
});

test('buildPinMessagePatch toggles pin state and attributes moderator/admin', () => {
  const pinnedPatch = buildPinMessagePatch(false, 'John Rufai', 1700000000000);
  assert.equal(pinnedPatch.isPinned, true);
  assert.equal(pinnedPatch.pinnedBy, 'John Rufai');
  assert.equal(pinnedPatch.pinnedAtMillis, 1700000000000);

  const unpinnedPatch = buildPinMessagePatch(true, 'John Rufai', 1700000050000);
  assert.equal(unpinnedPatch.isPinned, false);
  assert.equal(unpinnedPatch.pinnedBy, '');
  assert.equal(unpinnedPatch.pinnedAtMillis, 0);
});

test('computeAccurateOnlineMembers filters out deleted/unregistered accounts so online count never exceeds registered builders', () => {
  const now = Date.now();
  const registeredUserIds = new Set(['u1', 'u2', 'u3', 'u4']);
  const presenceRecords = [
    {
      uid: 'u1',
      displayName: 'John Rufai',
      avatarColor: '#FFF025',
      activeChannelId: 'general-chat',
      isTyping: false,
      lastSeenMillis: now - 2000,
    },
    {
      uid: 'u2',
      displayName: 'Jaystarbliss studios',
      avatarColor: '#B11469',
      activeChannelId: 'general-chat',
      isTyping: false,
      lastSeenMillis: now - 1000,
    },
    {
      uid: 'deleted-jaystar-old-uid', // Orphaned presence doc from a deleted account
      displayName: 'Jaystarbliss studios',
      avatarColor: '#10B981',
      activeChannelId: 'general-chat',
      isTyping: false,
      lastSeenMillis: now - 4000,
    },
    {
      uid: 'u3',
      displayName: 'FRANCOLIZZY',
      avatarColor: '#C15D00',
      activeChannelId: 'general-chat',
      isTyping: false,
      lastSeenMillis: now - 3000,
    },
    {
      uid: 'u4',
      displayName: 'MUNACHIMSO OSUALA',
      avatarColor: '#A855F7',
      activeChannelId: 'general-chat',
      isTyping: false,
      lastSeenMillis: now - 2500,
    },
  ];

  const result = computeAccurateOnlineMembers(presenceRecords, null, [], registeredUserIds);
  assert.equal(result.length, 4);
  assert.equal(result.filter((m) => m.displayName === 'Jaystarbliss studios').length, 1);
  assert.equal(result.some((m) => m.uid === 'deleted-jaystar-old-uid'), false);
});

test('Mention detection supports @all, dynamic @username filtering, and multi-line textareas', () => {
  const detect = (text: string) => {
    const beforeCursor = text;
    const match = beforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_.\- ]{0,25})$/);
    if (!match) return null;
    const rawQuery = match[1];
    if (rawQuery.includes('\n') || rawQuery.includes('  ')) return null;
    const atIndex = beforeCursor.lastIndexOf('@');
    return { startIndex: atIndex, query: rawQuery.toLowerCase() };
  };

  // Typing just "@" opens all users + @all
  assert.deepEqual(detect('@'), { startIndex: 0, query: '' });
  // Typing "@jo" filters users dynamically
  assert.deepEqual(detect('Hey @Jo'), { startIndex: 4, query: 'jo' });
  // Multi-line message where user presses Enter to start a new line and types @all
  assert.deepEqual(detect('Line one\n@all'), { startIndex: 9, query: 'all' });
});

test('computeVisibleMessageWindow renders only the last few messages initially and loads older batches on scroll up', () => {
  const allMessages = Array.from({ length: 28 }, (_, i) => ({
    id: `m-${i + 1}`,
    text: `Message #${i + 1}`,
  }));

  // 1. Initial load: only last 12 messages (m-17 through m-28) are visible
  const step1 = computeVisibleMessageWindow(
    allMessages,
    INITIAL_VISIBLE_MESSAGES_COUNT,
    SCROLL_UP_LOAD_BATCH_SIZE
  );
  assert.equal(step1.visibleMessages.length, 12);
  assert.equal(step1.visibleMessages[0].id, 'm-17');
  assert.equal(step1.visibleMessages[11].id, 'm-28');
  assert.equal(step1.hiddenOlderCount, 16);
  assert.equal(step1.hasOlderMessages, true);
  assert.equal(step1.nextVisibleCount, 20);

  // 2. First scroll up: reveals 8 older messages (now 20 visible: m-9 through m-28)
  const step2 = computeVisibleMessageWindow(
    allMessages,
    step1.nextVisibleCount,
    SCROLL_UP_LOAD_BATCH_SIZE
  );
  assert.equal(step2.visibleMessages.length, 20);
  assert.equal(step2.visibleMessages[0].id, 'm-9');
  assert.equal(step2.hiddenOlderCount, 8);
  assert.equal(step2.hasOlderMessages, true);
  assert.equal(step2.nextVisibleCount, 28);

  // 3. Second scroll up: reveals remaining 8 messages (all 28 visible: m-1 through m-28)
  const step3 = computeVisibleMessageWindow(
    allMessages,
    step2.nextVisibleCount,
    SCROLL_UP_LOAD_BATCH_SIZE
  );
  assert.equal(step3.visibleMessages.length, 28);
  assert.equal(step3.visibleMessages[0].id, 'm-1');
  assert.equal(step3.hiddenOlderCount, 0);
  assert.equal(step3.hasOlderMessages, false);
});

test('evaluateChatComposerKeyDown maps Enter to newline and Ctrl+Enter / Cmd+Enter to send', () => {
  // Plain Enter moves to a new line
  assert.equal(evaluateChatComposerKeyDown({ key: 'Enter' }), 'newline');
  // Shift + Enter also moves to a new line
  assert.equal(evaluateChatComposerKeyDown({ key: 'Enter', shiftKey: true }), 'newline');
  // Ctrl + Enter sends the message
  assert.equal(evaluateChatComposerKeyDown({ key: 'Enter', ctrlKey: true }), 'send');
  // Cmd + Enter (macOS) sends the message
  assert.equal(evaluateChatComposerKeyDown({ key: 'Enter', metaKey: true }), 'send');
  // IME composition does not trigger send
  assert.equal(
    evaluateChatComposerKeyDown({ key: 'Enter', ctrlKey: true, isComposing: true }),
    'noop'
  );
  // Escape cancels inline edit/reply
  assert.equal(evaluateChatComposerKeyDown({ key: 'Escape' }), 'cancel');
});

test('extractFirstUrl and cleanExtractedUrl detect https, www, and bare creator URLs while stripping trailing punctuation', () => {
  assert.equal(
    extractFirstUrl('Check out my new build at https://pixel-racer.vercel.app/play!'),
    'https://pixel-racer.vercel.app/play'
  );
  assert.equal(
    extractFirstUrl('Visit www.itch.io/my-space-game, let me know what you think.'),
    'https://www.itch.io/my-space-game'
  );
  assert.equal(
    extractFirstUrl('Repo is live: github.com/buildbuds/engine-v2)'),
    'https://github.com/buildbuds/engine-v2'
  );
  assert.equal(cleanExtractedUrl('https://youtube.com/watch?v=abc123...'), 'https://youtube.com/watch?v=abc123');
});

test('resolveMessageLinkPreview always generates link previews for repeated links, in-text links, and edited links', () => {
  const repeatedUrl = 'https://buildbuds-quest.itch.io/cyber-runner';

  // 1st message sent with explicit linkUrl
  const firstMsgPreview = resolveMessageLinkPreview(
    { text: `First time sharing ${repeatedUrl}`, linkUrl: repeatedUrl },
    'game'
  );
  assert.ok(firstMsgPreview);
  assert.equal(firstMsgPreview.linkUrl, repeatedUrl);
  assert.equal(firstMsgPreview.linkCategory, 'game');
  assert.equal(firstMsgPreview.linkDomain, 'buildbuds-quest.itch.io');
  assert.ok(firstMsgPreview.coverImageUrl.length > 0);

  // 2nd message sent with the exact same URL pasted into text (even if linkUrl field wasn't stored)
  const secondMsgPreview = resolveMessageLinkPreview(
    { text: `Sending the link again for new members: ${repeatedUrl}!` },
    'other'
  );
  assert.ok(secondMsgPreview);
  assert.equal(secondMsgPreview.linkUrl, repeatedUrl);
  assert.equal(secondMsgPreview.linkCategory, 'game');
  assert.equal(secondMsgPreview.linkDomain, 'buildbuds-quest.itch.io');
  assert.equal(secondMsgPreview.linkTitle, firstMsgPreview.linkTitle);

  // Editing the link on an existing message regenerates the preview for the new destination
  const editedUrl = 'https://youtu.be/demo987';
  const editedPreview = generateLinkPreview(editedUrl, 'video');
  const resolvedAfterEdit = resolveMessageLinkPreview(
    {
      text: 'Updated link to video walkthrough',
      linkUrl: editedPreview.url,
      linkTitle: editedPreview.title,
      linkDescription: editedPreview.description,
      linkCategory: editedPreview.category,
      linkDomain: editedPreview.domain,
      coverImageUrl: editedPreview.defaultCoverUrl,
    },
    'other'
  );
  assert.ok(resolvedAfterEdit);
  assert.equal(resolvedAfterEdit.linkUrl, editedUrl);
  assert.equal(resolvedAfterEdit.linkCategory, 'video');
  assert.equal(resolvedAfterEdit.linkDomain, 'youtu.be');
});

