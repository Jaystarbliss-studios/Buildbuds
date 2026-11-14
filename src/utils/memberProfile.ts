import { resolveBuilderAvatarUrl } from './avatars.ts';

export interface PublicMemberProfileSummary {
  uid: string;
  displayName: string;
  avatarUrl: string;
  avatarColor: string;
  role: 'member' | 'moderator' | 'admin';
  roleLabel: string;
  isVerifiedStudent: boolean;
  schoolName: string;
  gradeLevel: string;
  primaryInterest: string;
  createdAt?: string;
  status?: string;
  isOnline?: boolean;
  activeChannelName?: string;
}

export interface BuildMemberProfileInput {
  uid: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  role?: string | null;
  isVerifiedStudent?: boolean;
  schoolName?: string | null;
  gradeLevel?: string | null;
  primaryInterest?: string | null;
  createdAt?: string | null;
  status?: string | null;
  isApprovedStudent?: boolean;
  studentAccessStatus?: string | null;
  accountType?: string | null;
  isOnline?: boolean;
  activeChannelName?: string | null;
}

/**
 * Builds a sanitized public/general profile view for any community member.
 * Intentionally excludes private PII (such as email addresses or moderation notes).
 */
export function buildPublicMemberProfileSummary(
  input: BuildMemberProfileInput
): PublicMemberProfileSummary {
  const uid = String(input.uid || '').trim() || 'member';
  const rawRole = String(input.role || 'member').toLowerCase();
  const role: 'member' | 'moderator' | 'admin' =
    rawRole === 'admin' ? 'admin' : rawRole === 'moderator' ? 'moderator' : 'member';

  const isVerifiedStudent =
    role === 'admin' ||
    role === 'moderator' ||
    Boolean(input.isVerifiedStudent) ||
    input.isApprovedStudent === true ||
    input.studentAccessStatus === 'approved' ||
    input.accountType === 'student';

  const roleLabel =
    role === 'admin'
      ? 'Administrator'
      : role === 'moderator'
      ? 'Moderator'
      : isVerifiedStudent
      ? 'Verified Student Builder'
      : 'Community Member';

  const displayName = String(input.displayName || '').trim() || 'Builder';

  return {
    uid,
    displayName,
    avatarUrl: resolveBuilderAvatarUrl(input.avatarUrl || undefined, uid),
    avatarColor: String(input.avatarColor || '').trim() || '#FFF025',
    role,
    roleLabel,
    isVerifiedStudent,
    schoolName: String(input.schoolName || '').trim(),
    gradeLevel: String(input.gradeLevel || '').trim(),
    primaryInterest: String(input.primaryInterest || '').trim(),
    createdAt: input.createdAt ? String(input.createdAt) : undefined,
    status: input.status ? String(input.status) : undefined,
    isOnline: Boolean(input.isOnline),
    activeChannelName: input.activeChannelName ? String(input.activeChannelName) : undefined,
  };
}

export function formatMemberJoinDate(createdAt?: string): string {
  if (!createdAt) return 'Active Build Buds Member';
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) return 'Active Build Buds Member';
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  });
}
