export type StudentAccessStatus =
  | 'not_requested'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'more_information_required'
  | 'suspended';

export type EmailNotificationDeliveryStatus = 'idle' | 'sent' | 'failed' | 'skipped';

export interface StudentAccessRequest {
  uid: string;
  fullName: string;
  email: string;
  schoolName: string;
  gradeLevel: string;
  programme: string;
  studentReference?: string;
  confirmedDeclaration: boolean;
  status: StudentAccessStatus;
  verifiedAgainstOfficialRecords: boolean;
  reviewedBy?: string;
  reviewedByEmail?: string;
  reviewedAt?: string;
  publicStatusNote?: string;
  emailNotificationStatus?: EmailNotificationDeliveryStatus;
  emailNotificationError?: string;
  lastNotificationAttemptAt?: string;
  lastNotificationIdempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentAccessAdminNote {
  uid: string;
  privateNotes: string;
  officialRecordReference?: string;
  verificationSource?: 'manual_admin_check' | 'official_roster_match';
  updatedBy: string;
  updatedByEmail: string;
  updatedAt: string;
}

export interface CommunityMembership {
  uid: string;
  email?: string;
  displayName?: string;
  status: 'approved' | 'suspended' | 'revoked';
  approvedBy: string;
  approvedByEmail?: string;
  approvedAt: string;
  programme?: string;
  schoolName?: string;
  gradeLevel?: string;
  isLegacyMigrated?: boolean;
  updatedAt: string;
}

export interface AdminAuditLog {
  id?: string;
  action:
    | 'approve_student'
    | 'reject_student'
    | 'request_more_info'
    | 'suspend_student'
    | 'migrate_legacy_student'
    | 'moderate_post'
    | 'curate_showcase'
    | 'manage_challenge'
    | 'retry_notification';
  targetUid: string;
  targetEmail: string;
  targetName: string;
  adminUid: string;
  adminEmail: string;
  verifiedAgainstOfficialRecords: boolean;
  reason?: string;
  emailDeliveryStatus?: EmailNotificationDeliveryStatus;
  createdAt: string;
}

export interface UserNotificationItem {
  id: string;
  uid: string;
  type:
    | 'student_access_submitted'
    | 'student_access_approved'
    | 'student_access_rejected'
    | 'student_access_more_info'
    | 'student_access_suspended'
    | 'post_moderated'
    | 'curation_approved'
    | 'curation_rejected'
    | 'post_reaction'
    | 'post_comment'
    | 'general';
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  read: boolean;
  createdAt: string;
}

export interface CloudinaryMediaItem {
  secureUrl: string;
  publicId: string;
  ownerUid: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  createdAt: string;
  postId?: string;
}

export interface ShowcaseSubmission {
  id: string;
  sourceMessageId: string;
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
  status: 'pending' | 'approved' | 'rejected' | 'more_information_required';
  reviewedBy?: string;
  publicPostId?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PublicPostStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'hidden'
  | 'removed';

export type PublicReactionType = 'like' | 'rocket' | 'sparkle' | 'clap' | 'fire';

export interface PublicPost {
  id: string;
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
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorColor: string;
  authorRole?: 'member' | 'moderator' | 'admin';
  status: PublicPostStatus;
  isFeatured: boolean;
  reactionCounts: Record<string, number>;
  totalReactions: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicComment {
  id: string;
  postId: string;
  parentCommentId: string | null;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorColor: string;
  authorRole?: 'member' | 'moderator' | 'admin';
  text: string;
  isEdited?: boolean;
  status: 'active' | 'removed';
  reactionCounts?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface PublicReactionDoc {
  uid: string;
  postId: string;
  types: PublicReactionType[];
  updatedAt: string;
}

export interface PublicCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  emoji: string;
  order: number;
  isActive: boolean;
  updatedAt: string;
}

export interface PublicCommunityConfig {
  requireReviewForNewPosts: boolean;
  featuredPostId?: string;
  featuredBannerHeadline?: string;
  featuredBannerSubtext?: string;
  updatedBy: string;
  updatedAt: string;
}

export const DEFAULT_PUBLIC_CATEGORIES: PublicCategory[] = [
  {
    id: 'games',
    name: 'Games',
    slug: 'games',
    description: 'Playable games, interactive levels, and game dev experiments built by young creators.',
    emoji: '🎮',
    order: 1,
    isActive: true,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'websites',
    name: 'Websites',
    slug: 'websites',
    description: 'Web apps, interactive sites, and creative digital tools.',
    emoji: '🌐',
    order: 2,
    isActive: true,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'project-showcases',
    name: 'Project Showcases',
    slug: 'project-showcases',
    description: 'Complete project demos, screenshots, and behind-the-scenes build logs.',
    emoji: '🚀',
    order: 3,
    isActive: true,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'technology-discoveries',
    name: 'Technology Discoveries',
    slug: 'technology-discoveries',
    description: 'Cool coding techniques, hardware builds, and tech discoveries worth sharing.',
    emoji: '💡',
    order: 4,
    isActive: true,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tutorials-learning',
    name: 'Tutorials & Learning',
    slug: 'tutorials-learning',
    description: 'Step-by-step guides, tips, and learning breakthroughs.',
    emoji: '📘',
    order: 5,
    isActive: true,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'community-questions',
    name: 'Community Questions',
    slug: 'community-questions',
    description: 'Ask fellow builders for constructive feedback, ideas, or debugging help.',
    emoji: '❓',
    order: 6,
    isActive: true,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'announcements',
    name: 'Announcements',
    slug: 'announcements',
    description: 'Official updates, showcase highlights, and Jaystarbliss Studios news.',
    emoji: '📢',
    order: 7,
    isActive: true,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'creative-experiments',
    name: 'Creative Experiments',
    slug: 'creative-experiments',
    description: 'Digital art, animations, music code, and experimental prototypes.',
    emoji: '🎨',
    order: 8,
    isActive: true,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

export const JAYSTARBLISS_PROGRAMMES = [
  'Web Development & Frontend Design',
  'Game Development & Interactive Worlds',
  'Scratch & Block Coding Foundations',
  'Python & Creative Problem Solving',
  'Robotics, Electronics & Hardware Lab',
  'Digital Art, Animation & UI Design',
  'Build Buds School Creator Club',
  'Holiday Coding Bootcamp',
];

export type ChallengeLifecycleStatus = 'upcoming' | 'active' | 'completed';
export type ChallengePublishStatus = 'draft' | 'published' | 'archived';
export type ChallengeSkillLevel = 'All Levels' | 'Beginner' | 'Intermediate' | 'Advanced';

export interface ChallengeResourceLink {
  title: string;
  url: string;
}

export interface CommunityChallenge {
  id: string;
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
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export const CHALLENGE_CATEGORY_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'game-development', label: 'Game Development' },
  { id: 'website-creation', label: 'Website Creation' },
  { id: 'technology-experiments', label: 'Technology & Experiments' },
  { id: 'creative-tools', label: 'Creative Tools' },
  { id: 'digital-literacy', label: 'Digital Literacy' },
  { id: 'programming', label: 'Programming' },
  { id: 'video-multimedia', label: 'Video & Multimedia' },
  { id: 'general-creative', label: 'Creative Learning Activity' },
];

export const CHALLENGE_LEARNER_GROUPS = [
  'All Builders',
  'Ages 8–11 (Junior Builders)',
  'Ages 12–15 (Core Creators)',
  'Ages 15–18 (Advanced Lab)',
  'School Creator Clubs',
  'Jaystarbliss Bootcamp Learners',
];

export const PUBLIC_REACTION_OPTIONS: Array<{
  type: PublicReactionType;
  emoji: string;
  label: string;
}> = [
  { type: 'like', emoji: '👍', label: 'Helpful' },
  { type: 'rocket', emoji: '🚀', label: 'Launch' },
  { type: 'sparkle', emoji: '✨', label: 'Creative' },
  { type: 'clap', emoji: '👏', label: 'Bravo' },
  { type: 'fire', emoji: '🔥', label: 'Awesome' },
];
