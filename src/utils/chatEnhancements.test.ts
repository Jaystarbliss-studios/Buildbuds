import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldGroupWithPreviousMessage,
  annotateMessageGrouping,
  computeAccurateOnlineMembers,
  computeNextThreadReplyCount,
  computeEffectiveReplyCount,
  evaluateHorizontalSwipeGesture,
  GROUPING_TIME_WINDOW_MS,
} from './messageGrouping';
import {
  PRESET_AVATARS,
  getDefaultPresetAvatar,
  findPresetAvatar,
  resolveBuilderAvatarUrl,
} from './avatars';

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
  // Vertical scroll does not trigger sidebar swipe
  assert.equal(evaluateHorizontalSwipeGesture(24, 300, 60, 450, false), 'none');
  // Swiping left when sidebar is open closes sidebar
  assert.equal(evaluateHorizontalSwipeGesture(220, 300, 90, 305, true), 'close-sidebar');
});

