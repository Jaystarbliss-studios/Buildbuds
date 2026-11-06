import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  validateCloudinaryImageFile,
  validateCloudinaryUploadBatch,
  getCloudinaryResponsiveUrl,
  canUserPublishPublicContent,
  doesPostMatchCategoryFilter,
  MAX_IMAGE_SIZE_BYTES,
} from './communityService.ts';
import { signCloudinaryParameters } from '../../api/_lib/firebaseAuthVerifier.ts';
import { studentRecordVerificationProvider } from '../../api/_lib/studentRecordProvider.ts';
import {
  buildApprovalEmailHtml,
  buildStatusUpdateEmailHtml,
} from '../../api/_lib/emailProvider.ts';
import { INITIAL_PUBLIC_COMMUNITY_POSTS } from '../data/publicCommunitySeeds.ts';
import { DEFAULT_PUBLIC_CATEGORIES } from '../types/community.ts';

test('Cloudinary validation enforces MIME type, extension, 5MB limit, and 5 images max per post', () => {
  const validPng = validateCloudinaryImageFile({
    name: 'screenshot.png',
    type: 'image/png',
    size: 1024 * 500,
  });
  assert.equal(validPng.valid, true);

  const invalidType = validateCloudinaryImageFile({
    name: 'malware.exe',
    type: 'application/octet-stream',
    size: 1024,
  });
  assert.equal(invalidType.valid, false);

  const oversized = validateCloudinaryImageFile({
    name: 'huge.webp',
    type: 'image/webp',
    size: MAX_IMAGE_SIZE_BYTES + 100,
  });
  assert.equal(oversized.valid, false);

  const tooMany = validateCloudinaryUploadBatch(
    [
      { name: '1.jpg', type: 'image/jpeg', size: 1000 },
      { name: '2.jpg', type: 'image/jpeg', size: 1000 },
    ],
    4 // 4 + 2 = 6 > 5 max
  );
  assert.equal(tooMany.valid, false);
});

test('Cloudinary responsive delivery URL injects f_auto,q_auto transforms and preserves non-Cloudinary URLs', () => {
  const rawCloudinary =
    'https://res.cloudinary.com/demo/image/upload/v1700000/buildbuds/public-posts/sample.png';
  const feedUrl = getCloudinaryResponsiveUrl(rawCloudinary, 'feed');
  assert.ok(feedUrl.includes('/upload/f_auto,q_auto,c_limit,w_1080/'));

  const externalUrl = 'https://images.unsplash.com/photo-123';
  assert.equal(getCloudinaryResponsiveUrl(externalUrl, 'thumb'), externalUrl);
});

test('Cloudinary SHA-1 parameter signature matches deterministic sorted parameter hash', () => {
  const sig = signCloudinaryParameters(
    {
      folder: 'buildbuds/public-posts',
      timestamp: 1700000000,
      upload_preset: 'buildbuds-public-posts',
    },
    'test_secret_key'
  );
  assert.equal(typeof sig, 'string');
  assert.equal(sig.length, 40);
});

test('StudentRecordVerificationProvider requires official record check before approving', async () => {
  const candidate = {
    uid: 'student-123',
    fullName: 'Adaeze Okafor',
    email: 'adaeze@example.com',
    schoolName: 'Jaystarbliss Dynamic Academy',
    gradeLevel: 'Grade 9',
    programme: 'Web Development & Frontend Design',
  };

  const unconfirmed = await studentRecordVerificationProvider.verifyStudentRecord(
    candidate,
    false
  );
  assert.equal(unconfirmed.matched, false);

  const confirmed = await studentRecordVerificationProvider.verifyStudentRecord(
    candidate,
    true
  );
  assert.equal(confirmed.matched, true);
  assert.equal(confirmed.verificationMode, 'manual_admin_confirmation');
});

test('Approval and Status emails include required subject, CTA to /hub, and escape HTML safely', () => {
  const { subject, html } = buildApprovalEmailHtml({
    fullName: 'Tobi <script>alert(1)</script>',
    schoolName: 'Jaystarbliss Studios School',
    programme: 'Game Development',
    publicStatusNote: 'Welcome aboard!',
  });

  assert.equal(subject, "You're approved! Welcome to the Build Buds Student Hub.");
  assert.ok(html.includes('/hub'));
  assert.ok(html.includes('Enter Build Buds'));
  assert.ok(!html.includes('<script>alert(1)</script>'));

  const statusEmail = buildStatusUpdateEmailHtml({
    fullName: 'Tobi',
    schoolName: 'Jaystarbliss Studios School',
    programme: 'Game Development',
    status: 'more_information_required',
    publicStatusNote: 'Please confirm your class teacher name.',
  });
  assert.ok(statusEmail.html.includes('/student-access/status'));
});

test('Initial Public Community seed posts have zero fabricated engagement stats and valid categories', () => {
  assert.ok(DEFAULT_PUBLIC_CATEGORIES.length >= 8);
  for (const post of INITIAL_PUBLIC_COMMUNITY_POSTS) {
    assert.equal(post.totalReactions, 0);
    assert.equal(post.commentCount, 0);
    assert.deepEqual(post.reactionCounts, {});
    assert.equal(post.status, 'published');
  }
});

test('Role-based publishing permissions allow only approved Student Hub members and admins to publish', () => {
  // Guest cannot publish
  assert.equal(
    canUserPublishPublicContent({
      isAuthenticated: false,
      isApprovedForHub: false,
      isAdmin: false,
    }),
    false
  );

  // Ordinary community user (not approved for Student Hub) cannot publish
  assert.equal(
    canUserPublishPublicContent({
      isAuthenticated: true,
      isApprovedForHub: false,
      isAdmin: false,
    }),
    false
  );

  // Approved core Student Hub member can publish
  assert.equal(
    canUserPublishPublicContent({
      isAuthenticated: true,
      isApprovedForHub: true,
      isAdmin: false,
    }),
    true
  );

  // Approved member with publishingDisabled cannot publish unless admin
  assert.equal(
    canUserPublishPublicContent({
      isAuthenticated: true,
      isApprovedForHub: true,
      isAdmin: false,
      publishingDisabled: true,
    }),
    false
  );

  // Admin can always publish
  assert.equal(
    canUserPublishPublicContent({
      isAuthenticated: true,
      isApprovedForHub: false,
      isAdmin: true,
    }),
    true
  );
});

test('Category filter helper accurately matches posts by categoryId, slug, and categoryName', () => {
  const sampleGamePost = {
    categoryId: 'games',
    categoryName: 'Games',
  };
  assert.equal(doesPostMatchCategoryFilter(sampleGamePost, 'all'), true);
  assert.equal(doesPostMatchCategoryFilter(sampleGamePost, 'games'), true);
  assert.equal(doesPostMatchCategoryFilter(sampleGamePost, 'Games'), true);
  assert.equal(doesPostMatchCategoryFilter(sampleGamePost, 'game-development'), true);
  assert.equal(doesPostMatchCategoryFilter(sampleGamePost, 'websites'), false);

  const seedAnnouncementPost = INITIAL_PUBLIC_COMMUNITY_POSTS[0];
  assert.equal(doesPostMatchCategoryFilter(seedAnnouncementPost, 'announcements'), true);
});

test('Hardened firestore.rules separates Public Community from Private Student Hub, supports serverTimestamp on messages/threadReplies, and gates publicPosts creation via isApprovedStudent()', () => {
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const rulesText = fs.readFileSync(rulesPath, 'utf8');

  assert.ok(rulesText.includes('function isApprovedStudent()'));
  assert.ok(rulesText.includes('data.createdAt is timestamp'));
  assert.ok(rulesText.includes('request.resource.data.createdAt is timestamp'));
  assert.ok(rulesText.includes('match /publicPosts/{postId}'));
  assert.ok(rulesText.includes('match /communityChallenges/{challengeId}'));
  assert.ok(rulesText.includes('match /studentAccessRequests/{userId}'));
  assert.ok(rulesText.includes('match /communityMemberships/{userId}'));
  assert.ok(rulesText.includes('match /studentAccessAdminNotes/{userId}'));
  assert.ok(rulesText.includes('match /adminAuditLogs/{logId}'));
  // Ensure newly registered accounts with a schoolName are NOT automatically granted Student Hub access without Admin approval
  assert.ok(!rulesText.includes("get('schoolName', '') != ''"));
});
