import React, { useEffect, useState } from 'react';
import {
  X,
  GraduationCap,
  Sparkles,
  Calendar,
  BookOpen,
  ShieldCheck,
  AtSign,
  FolderGit2,
  FileText,
  Pencil,
  UserPlus,
  UserCheck,
  Users,
  Flag,
} from 'lucide-react';
import { db, doc, getDoc, type BuilderProfile } from '../firebase.ts';
import { getCreatorFollowerCount } from '../utils/communityService.ts';
import {
  buildPublicMemberProfileSummary,
  formatMemberJoinDate,
  type PublicMemberProfileSummary,
} from '../utils/memberProfile.ts';
import { VerifiedAvatarFrame } from './MentionAndEmotes.tsx';

interface MemberProfileModalProps {
  member: PublicMemberProfileSummary | null;
  onClose: () => void;
  currentUserUid?: string | null;
  sharedCreationsCount?: number;
  publicPostsCount?: number;
  onMentionMember?: (displayName: string) => void;
  onEditOwnProfile?: () => void;
  isFollowing?: boolean;
  onToggleFollow?: (creatorUid: string, creatorName: string, currentlyFollowing: boolean) => Promise<void> | void;
  onReportMember?: (member: PublicMemberProfileSummary) => void;
  variant?: 'dark' | 'light';
}

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({
  member,
  onClose,
  currentUserUid,
  sharedCreationsCount,
  publicPostsCount,
  onMentionMember,
  onEditOwnProfile,
  isFollowing = false,
  onToggleFollow,
  onReportMember,
  variant = 'dark',
}) => {
  const [fetchedProfile, setFetchedProfile] = useState<BuilderProfile | null>(null);
  const [fetchedMembershipSchool, setFetchedMembershipSchool] = useState<string>('');
  const [fetchedMembershipGrade, setFetchedMembershipGrade] = useState<string>('');
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [isFollowBusy, setIsFollowBusy] = useState(false);

  useEffect(() => {
    setFetchedProfile(null);
    setFetchedMembershipSchool('');
    setFetchedMembershipGrade('');
    setFollowerCount(null);
    if (!member?.uid) return;
    if (member.uid.startsWith('seed-') || member.uid.startsWith('team-')) {
      return;
    }

    let cancelled = false;
    setIsLoadingDetails(true);

    Promise.all([
      getDoc(doc(db, 'users', member.uid)),
      getDoc(doc(db, 'communityMemberships', member.uid)).catch(() => null),
      getCreatorFollowerCount(member.uid),
    ])
      .then(([snap, memSnap, followers]) => {
        if (cancelled) return;
        if (snap.exists()) {
          setFetchedProfile(snap.data() as BuilderProfile);
        }
        if (memSnap && memSnap.exists()) {
          const memData = memSnap.data() as { schoolName?: string; gradeLevel?: string };
          if (memData.schoolName) setFetchedMembershipSchool(memData.schoolName);
          if (memData.gradeLevel) setFetchedMembershipGrade(memData.gradeLevel);
        }
        setFollowerCount(followers);
      })
      .catch(() => {
        // Non-blocking fallback to already-known summary data
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDetails(false);
      });

    return () => {
      cancelled = true;
    };
  }, [member?.uid]);

  useEffect(() => {
    if (!member) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [member, onClose]);

  if (!member) return null;

  const pickRealSchool = (...candidates: Array<string | undefined | null>): string => {
    for (const c of candidates) {
      const clean = String(c || '').trim();
      const lower = clean.toLowerCase();
      if (
        clean &&
        lower !== 'not specified' &&
        lower !== 'build buds' &&
        lower !== 'build buds community' &&
        lower !== 'build buds network' &&
        lower !== 'school or academy' &&
        lower !== 'school or club' &&
        lower !== 'public member'
      ) {
        return clean;
      }
    }
    return String(fetchedProfile?.schoolName || member.schoolName || '').trim();
  };

  const mergedProfile = buildPublicMemberProfileSummary({
    uid: member.uid,
    displayName: fetchedProfile?.displayName || member.displayName,
    avatarUrl: fetchedProfile?.avatarUrl || member.avatarUrl,
    avatarColor: fetchedProfile?.avatarColor || member.avatarColor,
    role: fetchedProfile?.role || member.role,
    isVerifiedStudent: member.isVerifiedStudent,
    isApprovedStudent: fetchedProfile?.isApprovedStudent,
    studentAccessStatus: fetchedProfile?.studentAccessStatus,
    accountType: fetchedProfile?.accountType,
    schoolName: pickRealSchool(
      fetchedMembershipSchool,
      fetchedProfile?.schoolName,
      member.schoolName
    ),
    gradeLevel:
      fetchedProfile?.gradeLevel || fetchedMembershipGrade || member.gradeLevel,
    primaryInterest: fetchedProfile?.primaryInterest || member.primaryInterest,
    createdAt: fetchedProfile?.createdAt || member.createdAt,
    status: fetchedProfile?.status || member.status,
    isOnline: member.isOnline,
    activeChannelName: member.activeChannelName,
  });

  const isDark = variant === 'dark';
  const isSelf = Boolean(currentUserUid && currentUserUid === mergedProfile.uid);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-profile-title"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl transition-all ${
          isDark
            ? 'bg-[#141621] border border-white/15 text-white'
            : 'bg-white border-3 border-black text-black brand-shadow'
        }`}
      >
        {/* Top Accent Banner */}
        <div
          className="h-20 relative border-b border-black/20"
          style={{
            background: `linear-gradient(135deg, ${mergedProfile.avatarColor || '#FFF025'} 0%, #B11469 100%)`,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close member profile"
            className="absolute top-3 right-3 p-1.5 rounded-xl bg-black/60 hover:bg-black text-white cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Avatar + Primary Identity */}
        <div className="px-5 pb-5">
          <div className="-mt-10 flex items-end justify-between gap-3 mb-3">
            <VerifiedAvatarFrame
              src={mergedProfile.avatarUrl}
              alt={mergedProfile.displayName}
              isVerified={mergedProfile.isVerifiedStudent}
              sizeClass="w-20 h-20"
              ringPaddingClass="p-[3px]"
              gapClassName={`p-[3px] ${isDark ? 'bg-[#141621]' : 'bg-white'}`}
            >
              {typeof member.isOnline === 'boolean' && (
                <span
                  title={mergedProfile.isOnline ? 'Online Now' : 'Offline'}
                  className={`absolute bottom-1 right-1 w-4 h-4 rounded-full ring-2 ${
                    isDark ? 'ring-[#141621]' : 'ring-white'
                  } ${mergedProfile.isOnline ? 'bg-emerald-400' : 'bg-slate-400'}`}
                />
              )}
            </VerifiedAvatarFrame>

            <div className="flex flex-wrap items-center justify-end gap-1.5 pb-1">
              {mergedProfile.role === 'admin' && (
                <span className="px-2.5 py-0.5 rounded-lg bg-[#FFF025] text-black border border-black text-[10px] font-black uppercase">
                  Admin
                </span>
              )}
              {mergedProfile.role === 'moderator' && (
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-400 text-black border border-black text-[10px] font-black uppercase">
                  Moderator
                </span>
              )}
              {mergedProfile.isVerifiedStudent && mergedProfile.role === 'member' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#FFF025]/20 text-[#FFF025] border border-[#FFF025]/40 text-[10px] font-black uppercase">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Verified Student</span>
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h2
                id="member-profile-title"
                className={`text-xl font-black tracking-tight ${
                  mergedProfile.isVerifiedStudent
                    ? isDark
                      ? 'verified-student-name-gradient-dark'
                      : 'verified-student-name-gradient'
                    : ''
                }`}
              >
                {mergedProfile.displayName}
              </h2>
              {isSelf && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isDark ? 'bg-white/10 text-white/75' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  You
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className={isDark ? 'text-white/65' : 'text-slate-600'}>
                {mergedProfile.roleLabel}
              </span>
              {typeof member.isOnline === 'boolean' && (
                <>
                  <span className="opacity-40">•</span>
                  <span
                    className={`font-semibold ${
                      mergedProfile.isOnline
                        ? 'text-emerald-400'
                        : isDark
                        ? 'text-white/45'
                        : 'text-slate-500'
                    }`}
                  >
                    {mergedProfile.isOnline
                      ? mergedProfile.activeChannelName
                        ? `Online in #${mergedProfile.activeChannelName}`
                        : 'Online now'
                      : 'Offline'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* General Information Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
            <div
              className={`p-3 rounded-2xl border ${
                isDark
                  ? 'bg-white/[0.04] border-white/10'
                  : 'bg-slate-50 border-black/15'
              }`}
            >
              <div
                className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1 ${
                  isDark ? 'text-white/50' : 'text-slate-500'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 text-[#FFF025]" />
                <span>School / Academy</span>
              </div>
              <div className="text-xs font-bold truncate">
                {mergedProfile.schoolName ||
                  (isLoadingDetails ? 'Loading...' : 'Build Buds Community')}
              </div>
            </div>

            <div
              className={`p-3 rounded-2xl border ${
                isDark
                  ? 'bg-white/[0.04] border-white/10'
                  : 'bg-slate-50 border-black/15'
              }`}
            >
              <div
                className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1 ${
                  isDark ? 'text-white/50' : 'text-slate-500'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                <span>Grade / Track</span>
              </div>
              <div className="text-xs font-bold truncate">
                {mergedProfile.gradeLevel ||
                  (isLoadingDetails ? 'Loading...' : 'Young Creator')}
              </div>
            </div>

            <div
              className={`p-3 rounded-2xl border ${
                isDark
                  ? 'bg-white/[0.04] border-white/10'
                  : 'bg-slate-50 border-black/15'
              }`}
            >
              <div
                className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1 ${
                  isDark ? 'text-white/50' : 'text-slate-500'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#B11469]" />
                <span>Primary Interest</span>
              </div>
              <div className="text-xs font-bold truncate">
                {mergedProfile.primaryInterest || 'Creative Projects'}
              </div>
            </div>

            <div
              className={`p-3 rounded-2xl border ${
                isDark
                  ? 'bg-white/[0.04] border-white/10'
                  : 'bg-slate-50 border-black/15'
              }`}
            >
              <div
                className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1 ${
                  isDark ? 'text-white/50' : 'text-slate-500'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Member Since</span>
              </div>
              <div className="text-xs font-bold truncate">
                {formatMemberJoinDate(mergedProfile.createdAt)}
              </div>
            </div>
          </div>

          {/* Activity Stats (if supplied) */}
          {(typeof sharedCreationsCount === 'number' ||
            typeof publicPostsCount === 'number' ||
            followerCount !== null) && (
            <div
              className={`p-3 rounded-2xl border mb-4 flex items-center justify-around gap-3 ${
                isDark
                  ? 'bg-[#FFF025]/[0.06] border-[#FFF025]/25'
                  : 'bg-[#FFFDF5] border-black/20'
              }`}
            >
              {followerCount !== null && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-base font-black tabular-nums">
                    <Users className="w-4 h-4 text-sky-400" />
                    <span>{followerCount}</span>
                  </div>
                  <div
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      isDark ? 'text-white/60' : 'text-slate-600'
                    }`}
                  >
                    Followers
                  </div>
                </div>
              )}

              {typeof sharedCreationsCount === 'number' && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-base font-black tabular-nums">
                    <FolderGit2 className="w-4 h-4 text-[#FFF025]" />
                    <span>{sharedCreationsCount}</span>
                  </div>
                  <div
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      isDark ? 'text-white/60' : 'text-slate-600'
                    }`}
                  >
                    Shared Links
                  </div>
                </div>
              )}

              {typeof publicPostsCount === 'number' && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-base font-black tabular-nums">
                    <FileText className="w-4 h-4 text-[#B11469]" />
                    <span>{publicPostsCount}</span>
                  </div>
                  <div
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      isDark ? 'text-white/60' : 'text-slate-600'
                    }`}
                  >
                    Community Posts
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            {isSelf && onEditOwnProfile && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditOwnProfile();
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                  isDark
                    ? 'bg-white/10 hover:bg-white/15 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 border border-black text-black'
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit My Profile</span>
              </button>
            )}

            {onToggleFollow &&
              !isSelf &&
              !mergedProfile.uid.startsWith('seed-') &&
              !mergedProfile.uid.startsWith('team-') && (
                <button
                  type="button"
                  disabled={isFollowBusy}
                  onClick={async () => {
                    setIsFollowBusy(true);
                    try {
                      await onToggleFollow(mergedProfile.uid, mergedProfile.displayName, isFollowing);
                      setFollowerCount((prev) =>
                        typeof prev === 'number' ? Math.max(0, prev + (isFollowing ? -1 : 1)) : prev
                      );
                    } finally {
                      setIsFollowBusy(false);
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-black cursor-pointer transition-all disabled:opacity-60 ${
                    isFollowing
                      ? isDark
                        ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/30'
                        : 'bg-emerald-100 border-black text-emerald-900 hover:bg-emerald-200'
                      : 'bg-[#B11469] hover:bg-[#931057] border-black text-white'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Follow Creator</span>
                    </>
                  )}
                </button>
              )}

            {onMentionMember && !isSelf && (
              <button
                type="button"
                onClick={() => {
                  onMentionMember(mergedProfile.displayName);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FFF025] hover:bg-[#ffe500] text-black border border-black text-xs font-black cursor-pointer transition-transform active:scale-95"
              >
                <AtSign className="w-3.5 h-3.5" />
                <span>@Mention</span>
              </button>
            )}

            {onReportMember && !isSelf && (
              <button
                type="button"
                onClick={() => {
                  onReportMember(mergedProfile);
                  onClose();
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                  isDark
                    ? 'bg-white/5 hover:bg-rose-500/20 text-white/65 hover:text-rose-300'
                    : 'bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 border border-black/15'
                }`}
                title="Flag member for moderator review"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Flag User</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                isDark
                  ? 'bg-white/10 hover:bg-white/15 text-white'
                  : 'bg-black text-white hover:bg-slate-800'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
