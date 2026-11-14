import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  X,
  Flag,
  UserCheck,
  Hash,
  Users,
  SlidersHorizontal,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  ArrowUpRight,
  Check,
  RotateCcw,
  Lock,
  BarChart3,
  FileText,
  GraduationCap,
  Star,
  EyeOff,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  db,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  BuilderProfile,
  CommunityChannelConfig,
  CommunityGlobalSettings,
  CommunitySubGroup,
  UserAccountStatus,
} from '../firebase.ts';
import {
  StudentAccessRequest,
  PublicPost,
  DEFAULT_REGISTERED_SCHOOLS,
  SUPPORT_CONTACT_EMAIL,
  SUPPORT_WHATSAPP_DISPLAY,
  SUPPORT_WHATSAPP_URL,
} from '../types/community.ts';
import {
  subscribeToRegisteredSchools,
  adminAddRegisteredSchool,
  adminRemoveRegisteredSchool,
  moderatePublicPostStatus,
  adminToggleFeaturedPost,
  adminDeletePublicPostPermanently,
  ensureValidExternalHref,
  normalizeRegisteredSchoolsList,
  isPlaceholderSchoolName,
} from '../utils/communityService.ts';
import { VerifiedAvatarFrame } from './MentionAndEmotes.tsx';

export interface AdminReportRecord {
  id: string;
  messageId: string;
  channelId: string;
  reporterId: string;
  reporterName?: string;
  reportedUserId?: string;
  reportedUserName?: string;
  messageSnippet?: string;
  reason: string;
  status: 'open' | 'resolved';
  createdAtMillis: number;
}

export interface AdminChannelSummary {
  id: string;
  name: string;
  category: string;
  emoji: string;
  description: string;
}

export interface AdminMessageLookup {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  text: string;
  linkTitle?: string;
  linkUrl?: string;
}

export type AdminCenterTab =
  | 'overview'
  | 'posts'
  | 'access'
  | 'schools'
  | 'reports'
  | 'channels'
  | 'users'
  | 'global'
  | 'groups';

interface AdminControlCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: AdminCenterTab;
  onChangeTab: (tab: Exclude<AdminCenterTab, 'groups'>) => void;
  isSuperAdmin: boolean;
  isGlobalModerator: boolean;
  moderatedChannelIds: string[];
  currentUserUid?: string;

  // Reports
  reports: AdminReportRecord[];
  openReportsCount: number;
  onResolveReport: (reportId: string, nextStatus?: 'resolved' | 'open') => void;
  onJumpToReportedMessage: (
    channelId: string,
    messageId: string,
    authorName?: string,
    snippet?: string
  ) => void;
  knownMessages: AdminMessageLookup[];

  // Access requests (Super Admin)
  activeAccessRequests: StudentAccessRequest[];
  unapprovedPlatformUsers: BuilderProfile[];
  pendingHubRequestsCount: number;
  isProcessingHubAccess: boolean;
  onApproveRequest: (req: StudentAccessRequest) => void;
  onRejectRequest: (req: StudentAccessRequest) => void;
  onApproveUserForHub: (user: BuilderProfile) => void;
  onRevokeUserFromHub: (user: BuilderProfile) => void;
  onOpenFullAccessPortal: () => void;

  // Channels & Sub-groups
  allChannels: AdminChannelSummary[];
  channelConfigs: Record<string, CommunityChannelConfig>;
  selectedChannelId: string;
  onSelectChannelId: (channelId: string) => void;
  onSaveChannelConfig: (
    channelId: string,
    patch: Partial<CommunityChannelConfig>
  ) => void;
  channelSubGroups: CommunitySubGroup[];
  onOpenCreateGroupModal: (channelId: string) => void;
  onManageSubGroup: (channelId: string, groupId: string) => void;
  onDeleteSubGroup: (group: CommunitySubGroup) => void;

  // Create custom channel
  newChannelName: string;
  onChangeNewChannelName: (val: string) => void;
  newChannelCategory: 'INFORMATION' | 'CREATOR SHOWCASES' | 'SOCIAL';
  onChangeNewChannelCategory: (
    val: 'INFORMATION' | 'CREATOR SHOWCASES' | 'SOCIAL'
  ) => void;
  newChannelEmoji: string;
  onChangeNewChannelEmoji: (val: string) => void;
  newChannelDesc: string;
  onChangeNewChannelDesc: (val: string) => void;
  onCreateCustomChannel: (e: React.FormEvent) => void;

  // Members
  allPlatformUsers: BuilderProfile[];
  registeredUsers: BuilderProfile[];
  approvedHubMemberIds: Set<string>;
  getLiveUserAvatarUrl: (uid: string, rawAvatarUrl?: string) => string;
  onUpdateUserAccount: (
    targetUser: BuilderProfile,
    patch: { status?: UserAccountStatus; role?: 'member' | 'moderator' | 'admin' }
  ) => void;
  onInspectMemberProfile: (user: BuilderProfile) => void;
  memberSearchQuery: string;
  onChangeMemberSearchQuery: (val: string) => void;
  newMemberName: string;
  onChangeNewMemberName: (val: string) => void;
  newMemberSchool: string;
  onChangeNewMemberSchool: (val: string) => void;
  newMemberGrade: string;
  onChangeNewMemberGrade: (val: string) => void;
  newMemberRole: 'member' | 'moderator';
  onChangeNewMemberRole: (val: 'member' | 'moderator') => void;
  onCreateMemberProfile: (e: React.FormEvent) => void;

  // Global Rules
  globalSettings: CommunityGlobalSettings;
  onUpdateGlobalSettings: (patch: Partial<CommunityGlobalSettings>) => void;
}

function formatReportTimestamp(millis: number): string {
  if (!millis) return 'Recently';
  try {
    return new Date(millis).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Recently';
  }
}

function navigateSpa(path: string, onCloseModal?: () => void) {
  onCloseModal?.();
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export const AdminControlCenterModal: React.FC<AdminControlCenterModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  onChangeTab,
  isSuperAdmin,
  isGlobalModerator,
  moderatedChannelIds,
  currentUserUid,
  reports,
  openReportsCount,
  onResolveReport,
  onJumpToReportedMessage,
  knownMessages,
  activeAccessRequests,
  unapprovedPlatformUsers,
  pendingHubRequestsCount,
  isProcessingHubAccess,
  onApproveRequest,
  onRejectRequest,
  onApproveUserForHub,
  onRevokeUserFromHub,
  onOpenFullAccessPortal,
  allChannels,
  channelConfigs,
  selectedChannelId,
  onSelectChannelId,
  onSaveChannelConfig,
  channelSubGroups,
  onOpenCreateGroupModal,
  onManageSubGroup,
  onDeleteSubGroup,
  newChannelName,
  onChangeNewChannelName,
  newChannelCategory,
  onChangeNewChannelCategory,
  newChannelEmoji,
  onChangeNewChannelEmoji,
  newChannelDesc,
  onChangeNewChannelDesc,
  onCreateCustomChannel,
  allPlatformUsers,
  registeredUsers,
  approvedHubMemberIds,
  getLiveUserAvatarUrl,
  onUpdateUserAccount,
  onInspectMemberProfile,
  memberSearchQuery,
  onChangeMemberSearchQuery,
  newMemberName,
  onChangeNewMemberName,
  newMemberSchool,
  onChangeNewMemberSchool,
  newMemberGrade,
  onChangeNewMemberGrade,
  newMemberRole,
  onChangeNewMemberRole,
  onCreateMemberProfile,
  globalSettings,
  onUpdateGlobalSettings,
}) => {
  const [reportFilter, setReportFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [memberFilter, setMemberFilter] = useState<
    'all' | 'hub' | 'public' | 'mods' | 'restricted'
  >('all');
  const [showCreateChannelForm, setShowCreateChannelForm] = useState(false);
  const [showCreateMemberForm, setShowCreateMemberForm] = useState(false);
  const [channelModSearch, setChannelModSearch] = useState('');

  // Public Posts & Moderation state
  const [publicPosts, setPublicPosts] = useState<PublicPost[]>([]);
  const [postFilter, setPostFilter] = useState<
    'all' | 'pending_review' | 'published' | 'hidden' | 'removed'
  >('all');
  const [postSearchQuery, setPostSearchQuery] = useState('');
  const [busyPostId, setBusyPostId] = useState<string | null>(null);
  const [adminFeedback, setAdminFeedback] = useState<string | null>(null);

  // Registered Schools Configuration state
  const [registeredSchools, setRegisteredSchools] = useState<string[]>(
    DEFAULT_REGISTERED_SCHOOLS
  );
  const [newSchoolInput, setNewSchoolInput] = useState('');
  const [isSavingSchool, setIsSavingSchool] = useState(false);

  const normalizedTab: Exclude<AdminCenterTab, 'groups'> =
    activeTab === 'groups' ? 'reports' : activeTab;

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Real-time subscription to publicPosts and registeredSchools when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const unsubSchools = subscribeToRegisteredSchools((schools) => {
      setRegisteredSchools(schools);
    });

    const postsQ = query(
      collection(db, 'publicPosts'),
      orderBy('createdAt', 'desc'),
      limit(60)
    );
    const unsubPosts = onSnapshot(
      postsQ,
      (snap) => {
        const list: PublicPost[] = [];
        snap.forEach((d) => {
          list.push({ ...(d.data() as PublicPost), id: d.id });
        });
        setPublicPosts(list);
      },
      () => {}
    );

    return () => {
      unsubSchools();
      unsubPosts();
    };
  }, [isOpen]);

  const userLookup = useMemo(() => {
    const map = new Map<string, BuilderProfile>();
    allPlatformUsers.forEach((u) => map.set(u.uid, u));
    return map;
  }, [allPlatformUsers]);

  const messageLookup = useMemo(() => {
    const map = new Map<string, AdminMessageLookup>();
    knownMessages.forEach((m) => map.set(m.id, m));
    return map;
  }, [knownMessages]);

  const moderatedChannels = useMemo(() => {
    return allChannels.filter(
      (ch) =>
        isSuperAdmin ||
        isGlobalModerator ||
        (currentUserUid && channelConfigs[ch.id]?.moderatorIds?.includes(currentUserUid))
    );
  }, [allChannels, isSuperAdmin, isGlobalModerator, currentUserUid, channelConfigs]);

  const activeTargetChannel =
    allChannels.find((c) => c.id === selectedChannelId) ||
    moderatedChannels[0] ||
    allChannels[0];

  const activeTargetConfig: CommunityChannelConfig =
    (activeTargetChannel && channelConfigs[activeTargetChannel.id]) || {
      id: activeTargetChannel?.id || 'general-chat',
      name: activeTargetChannel?.name || 'General Chat',
      category: 'SOCIAL',
      emoji: activeTargetChannel?.emoji || '💬',
      description: activeTargetChannel?.description || '',
      isLocked: false,
      banLinks: false,
      enableLinkPreviews: true,
      cooldownSeconds: -1,
      allowMemberMessages: true,
      allowMemberGroups: true,
      allowMemberInvites: true,
      moderatorIds: [],
      kickedUserIds: [],
    };

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (reportFilter === 'open') return r.status === 'open';
      if (reportFilter === 'resolved') return r.status === 'resolved';
      return true;
    });
  }, [reports, reportFilter]);

  const resolvedReportsCount = useMemo(
    () => reports.filter((r) => r.status === 'resolved').length,
    [reports]
  );

  // Post moderation counts & filtering
  const pendingPostsCount = useMemo(
    () => publicPosts.filter((p) => p.status === 'pending_review').length,
    [publicPosts]
  );
  const publishedPostsCount = useMemo(
    () => publicPosts.filter((p) => !p.status || p.status === 'published').length,
    [publicPosts]
  );
  const hiddenOrRevokedPostsCount = useMemo(
    () => publicPosts.filter((p) => p.status === 'hidden' || p.status === 'removed').length,
    [publicPosts]
  );

  const filteredPosts = useMemo(() => {
    const q = postSearchQuery.trim().toLowerCase();
    return publicPosts.filter((p) => {
      const effectiveStatus = p.status || 'published';
      if (postFilter !== 'all' && effectiveStatus !== postFilter) return false;
      if (q) {
        const hay = `${p.title} ${p.authorName} ${p.categoryName} ${p.summary || ''} ${p.gameUrl || ''} ${p.websiteUrl || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [publicPosts, postFilter, postSearchQuery]);

  const filteredMembers = useMemo(() => {
    const q = memberSearchQuery.trim().toLowerCase();
    return allPlatformUsers.filter((u) => {
      const isHubMember =
        u.role === 'admin' ||
        u.role === 'moderator' ||
        approvedHubMemberIds.has(u.uid);
      const st = u.status || 'active';

      if (memberFilter === 'hub' && !isHubMember) return false;
      if (memberFilter === 'public' && isHubMember) return false;
      if (memberFilter === 'mods' && u.role !== 'moderator' && u.role !== 'admin') return false;
      if (memberFilter === 'restricted' && st === 'active') return false;

      if (q) {
        const hay = `${u.displayName} ${u.schoolName || ''} ${u.gradeLevel || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allPlatformUsers, approvedHubMemberIds, memberFilter, memberSearchQuery]);

  const filteredChannelUsers = useMemo(() => {
    const q = channelModSearch.trim().toLowerCase();
    if (!q) return registeredUsers;
    return registeredUsers.filter((u) => u.displayName.toLowerCase().includes(q));
  }, [registeredUsers, channelModSearch]);

  // All registered schools merged with any real schools present on members
  const allSchoolOptions = useMemo(() => {
    return normalizeRegisteredSchoolsList(
      registeredSchools,
      allPlatformUsers.map((u) => u.schoolName)
    );
  }, [registeredSchools, allPlatformUsers]);

  // Student count per school
  const schoolStudentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allPlatformUsers.forEach((u) => {
      if (u.schoolName && !isPlaceholderSchoolName(u.schoolName)) {
        const key = u.schoolName.trim().toLowerCase();
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [allPlatformUsers]);

  // Recharts Data Series (Strictly 2-color palette: #FFF025 and #FFFFFF)
  const platformMetricsChartData = useMemo(() => {
    const verifiedCount = registeredUsers.length;
    const publicOnlyCount = Math.max(0, allPlatformUsers.length - verifiedCount);
    return [
      { name: 'Hub Members', count: verifiedCount },
      { name: 'Public Only', count: publicOnlyCount },
      { name: 'Pending Access', count: pendingHubRequestsCount },
      { name: 'Live Posts', count: publishedPostsCount },
      { name: 'Pending Posts', count: pendingPostsCount },
      { name: 'Open Reports', count: openReportsCount },
    ];
  }, [
    registeredUsers.length,
    allPlatformUsers.length,
    pendingHubRequestsCount,
    publishedPostsCount,
    pendingPostsCount,
    openReportsCount,
  ]);

  const schoolDistributionChartData = useMemo(() => {
    return registeredSchools.slice(0, 6).map((school) => {
      const shortName =
        school.length > 18 ? `${school.slice(0, 16).trim()}…` : school;
      return {
        name: shortName,
        fullName: school,
        students: schoolStudentCounts[school.trim().toLowerCase()] || 0,
      };
    });
  }, [registeredSchools, schoolStudentCounts]);

  const handleModeratePost = async (
    post: PublicPost,
    newStatus: 'published' | 'hidden' | 'removed'
  ) => {
    setBusyPostId(post.id);
    setAdminFeedback(null);
    try {
      await moderatePublicPostStatus({
        post,
        newStatus,
        reason:
          newStatus === 'published'
            ? 'Approved by Administrator in Admin Control Center'
            : newStatus === 'hidden'
              ? 'Post visibility revoked/hidden by Administrator'
              : 'Post removed by Administrator',
      });
      setAdminFeedback(
        newStatus === 'published'
          ? `Approved & published "${post.title}".`
          : newStatus === 'hidden'
            ? `Revoked public visibility for "${post.title}".`
            : `Removed "${post.title}".`
      );
    } catch (err) {
      setAdminFeedback(err instanceof Error ? err.message : 'Post action failed.');
    } finally {
      setBusyPostId(null);
    }
  };

  const handleToggleFeatured = async (post: PublicPost) => {
    setBusyPostId(post.id);
    setAdminFeedback(null);
    try {
      const nextFeatured = await adminToggleFeaturedPost(post);
      setAdminFeedback(
        nextFeatured
          ? `Featured "${post.title}" on the community showcase.`
          : `Removed featured badge from "${post.title}".`
      );
    } catch (err) {
      setAdminFeedback(err instanceof Error ? err.message : 'Could not update featured state.');
    } finally {
      setBusyPostId(null);
    }
  };

  const handlePermanentDeletePost = async (post: PublicPost) => {
    setBusyPostId(post.id);
    setAdminFeedback(null);
    try {
      await adminDeletePublicPostPermanently(post.id);
      setAdminFeedback(`Permanently deleted "${post.title}".`);
    } catch (err) {
      setAdminFeedback(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setBusyPostId(null);
    }
  };

  const handleAddSchoolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolInput.trim()) return;
    setIsSavingSchool(true);
    setAdminFeedback(null);
    try {
      const updated = await adminAddRegisteredSchool(newSchoolInput, registeredSchools);
      setRegisteredSchools(updated);
      setNewSchoolInput('');
      setAdminFeedback(`Added "${newSchoolInput.trim()}" to the student school dropdown.`);
    } catch (err) {
      setAdminFeedback(err instanceof Error ? err.message : 'Could not add school.');
    } finally {
      setIsSavingSchool(false);
    }
  };

  const handleRemoveSchoolClick = async (schoolName: string) => {
    setIsSavingSchool(true);
    setAdminFeedback(null);
    try {
      const updated = await adminRemoveRegisteredSchool(schoolName, registeredSchools);
      setRegisteredSchools(updated);
      setAdminFeedback(`Removed "${schoolName}" from the student school dropdown.`);
    } catch (err) {
      setAdminFeedback(err instanceof Error ? err.message : 'Could not remove school.');
    } finally {
      setIsSavingSchool(false);
    }
  };

  if (!isOpen) return null;

  const navItems: Array<{
    id: Exclude<AdminCenterTab, 'groups'>;
    label: string;
    mobileLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
    highlightCount?: boolean;
    visible: boolean;
  }> = [
    {
      id: 'overview',
      label: 'Overview & Analytics',
      mobileLabel: 'Overview',
      icon: BarChart3,
      visible: isSuperAdmin || isGlobalModerator,
    },
    {
      id: 'posts',
      label: 'Posts & Moderation',
      mobileLabel: 'Posts',
      icon: FileText,
      count: pendingPostsCount > 0 ? pendingPostsCount : publicPosts.length,
      highlightCount: pendingPostsCount > 0,
      visible: isSuperAdmin || isGlobalModerator,
    },
    {
      id: 'access',
      label: 'Student Access',
      mobileLabel: 'Access',
      icon: UserCheck,
      count: pendingHubRequestsCount,
      highlightCount: pendingHubRequestsCount > 0,
      visible: isSuperAdmin,
    },
    {
      id: 'schools',
      label: 'Registered Schools',
      mobileLabel: 'Schools',
      icon: GraduationCap,
      count: registeredSchools.length,
      visible: isSuperAdmin,
    },
    {
      id: 'reports',
      label: 'Flagged Reports',
      mobileLabel: 'Reports',
      icon: Flag,
      count: openReportsCount,
      highlightCount: openReportsCount > 0,
      visible: true,
    },
    {
      id: 'channels',
      label: 'Channels & Groups',
      mobileLabel: 'Channels',
      icon: Hash,
      visible: true,
    },
    {
      id: 'users',
      label: 'Members & Roles',
      mobileLabel: 'Members',
      icon: Users,
      count: allPlatformUsers.length,
      visible: isSuperAdmin,
    },
    {
      id: 'global',
      label: 'Global Rules',
      mobileLabel: 'Rules',
      icon: SlidersHorizontal,
      visible: isSuperAdmin,
    },
  ];

  const visibleNavItems = navItems.filter((item) => item.visible);

  const roleSummary = isSuperAdmin
    ? 'Super Admin'
    : isGlobalModerator
      ? 'Global Moderator'
      : `Channel Moderator · ${moderatedChannelIds.length} channel${
          moderatedChannelIds.length === 1 ? '' : 's'
        }`;

  return (
    <div
      className="fixed inset-0 z-[170] bg-black/80 backdrop-blur-sm flex items-center justify-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isSuperAdmin ? 'Admin Control Center' : 'Channel Moderator Center'}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full h-full sm:h-[min(90vh,780px)] sm:max-w-6xl sm:rounded-xl bg-[#0d0f14] border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden text-white"
      >
        {/* Minimalist 2-Color Top Header Bar */}
        <header className="px-4 sm:px-6 py-3.5 border-b border-white/10 bg-[#13161e] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldCheck className="w-4 h-4 text-[#FFF025] shrink-0" />
            <h2 className="text-sm font-semibold text-white truncate">
              {isSuperAdmin ? 'Admin Control Center' : 'Channel Moderator Center'}
            </h2>
            <span className="hidden sm:inline text-white/25" aria-hidden="true">
              ·
            </span>
            <span className="hidden sm:inline text-xs text-white/50 truncate">
              {roleSummary}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => navigateSpa('/community', onClose)}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-white/15 text-xs text-white/75 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <span>Public Community</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            {isSuperAdmin && (
              <button
                type="button"
                onClick={onOpenFullAccessPortal}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-white/15 text-xs text-white/75 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Full Page View</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Control Center"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Mobile Compact Tab Navigation */}
        <nav
          aria-label="Admin navigation"
          className="md:hidden border-b border-white/10 bg-[#0d0f14] px-3 py-2 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0"
        >
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = normalizedTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeTab(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  active
                    ? 'bg-[#FFF025] text-black font-semibold'
                    : 'text-white/65 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.mobileLabel}</span>
                {typeof item.count === 'number' && item.count > 0 && (
                  <span
                    className={`tabular-nums text-[11px] font-mono ${
                      active
                        ? 'text-black/80 font-semibold'
                        : item.highlightCount
                          ? 'text-[#FFF025] font-semibold'
                          : 'text-white/45'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Desktop Split Layout: Left Navigation Rail + Spacious Main Content */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          <aside className="hidden md:flex w-56 shrink-0 flex-col justify-between border-r border-white/10 bg-[#0d0f14] p-3">
            <nav aria-label="Admin sections" className="space-y-1">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const active = normalizedTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onChangeTab(item.id)}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-[#FFF025] text-black font-semibold'
                        : 'text-white/65 hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          active ? 'text-black' : 'text-white/50'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {typeof item.count === 'number' && item.count > 0 && (
                      <span
                        className={`tabular-nums text-[11px] font-mono ${
                          active
                            ? 'text-black font-semibold'
                            : item.highlightCount
                              ? 'text-[#FFF025] font-semibold'
                              : 'text-white/45'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Quiet 2-Color Workspace Summary */}
            <div className="pt-3 border-t border-white/10 px-2 space-y-2 text-[11px] text-white/50">
              <div className="flex items-center justify-between">
                <span>Open Reports</span>
                <span className="font-mono tabular-nums text-white">
                  {openReportsCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Pending Posts</span>
                <span className="font-mono tabular-nums text-white">
                  {pendingPostsCount}
                </span>
              </div>
              {isSuperAdmin && (
                <>
                  <div className="flex items-center justify-between">
                    <span>Pending Access</span>
                    <span className="font-mono tabular-nums text-white">
                      {pendingHubRequestsCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Schools Listed</span>
                    <span className="font-mono tabular-nums text-white">
                      {registeredSchools.length}
                    </span>
                  </div>
                </>
              )}
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={onOpenFullAccessPortal}
                  className="w-full pt-2 border-t border-white/10 text-left text-white/75 hover:text-[#FFF025] flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span>Full Page Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </aside>

          {/* Main Tab Content Viewport */}
          <div className="flex-1 min-w-0 overflow-y-auto hub-scroll p-4 sm:p-6 space-y-5">
            {adminFeedback && (
              <div className="px-4 py-2.5 rounded-lg border border-white/15 bg-[#13161e] flex items-center justify-between gap-3 text-xs text-white">
                <span>{adminFeedback}</span>
                <button
                  type="button"
                  onClick={() => setAdminFeedback(null)}
                  className="text-white/60 hover:text-white font-medium cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* ==============================================================
                TAB 0: OVERVIEW & RECHARTS ANALYTICS (Minimalist 2-Color)
                ============================================================== */}
            {normalizedTab === 'overview' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      Portal Overview &amp; Analytics
                    </h3>
                    <p className="text-xs text-white/50 mt-0.5">
                      Real-time metrics for student verification, public creations, registered schools, and moderation.
                    </p>
                  </div>
                </div>

                {/* 6-Cell Hairline KPI Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border border-white/10 rounded-lg bg-[#13161e] divide-y sm:divide-y-0 sm:divide-x divide-white/10">
                  <button
                    type="button"
                    onClick={() => isSuperAdmin && onChangeTab('users')}
                    className="p-3.5 text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <div className="text-[11px] text-white/50">Total Members</div>
                    <div className="text-xl font-semibold text-white font-mono tabular-nums mt-1">
                      {allPlatformUsers.length}
                    </div>
                    <div className="text-[11px] text-white/45 font-mono tabular-nums mt-0.5">
                      {registeredUsers.length} in Hub
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => isSuperAdmin && onChangeTab('access')}
                    className="p-3.5 text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <div className="text-[11px] text-white/50">Pending Access</div>
                    <div className="text-xl font-semibold text-[#FFF025] font-mono tabular-nums mt-1">
                      {pendingHubRequestsCount}
                    </div>
                    <div className="text-[11px] text-white/45 font-mono tabular-nums mt-0.5">
                      {activeAccessRequests.length} formal reqs
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPostFilter('published');
                      onChangeTab('posts');
                    }}
                    className="p-3.5 text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <div className="text-[11px] text-white/50">Published Posts</div>
                    <div className="text-xl font-semibold text-white font-mono tabular-nums mt-1">
                      {publishedPostsCount}
                    </div>
                    <div className="text-[11px] text-white/45 font-mono tabular-nums mt-0.5">
                      {publicPosts.length} total
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPostFilter('pending_review');
                      onChangeTab('posts');
                    }}
                    className="p-3.5 text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <div className="text-[11px] text-white/50">Awaiting Review</div>
                    <div className="text-xl font-semibold text-[#FFF025] font-mono tabular-nums mt-1">
                      {pendingPostsCount}
                    </div>
                    <div className="text-[11px] text-white/45 font-mono tabular-nums mt-0.5">
                      {hiddenOrRevokedPostsCount} hidden/revoked
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onChangeTab('reports')}
                    className="p-3.5 text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <div className="text-[11px] text-white/50">Open Reports</div>
                    <div className="text-xl font-semibold text-white font-mono tabular-nums mt-1">
                      {openReportsCount}
                    </div>
                    <div className="text-[11px] text-white/45 font-mono tabular-nums mt-0.5">
                      {resolvedReportsCount} resolved
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => isSuperAdmin && onChangeTab('schools')}
                    className="p-3.5 text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <div className="text-[11px] text-white/50">Registered Schools</div>
                    <div className="text-xl font-semibold text-white font-mono tabular-nums mt-1">
                      {registeredSchools.length}
                    </div>
                    <div className="text-[11px] text-white/45 mt-0.5">
                      Active in dropdown
                    </div>
                  </button>
                </div>

                {/* Recharts Analytics Grid (Strictly 2 Colors: #FFF025 & #FFFFFF) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="p-4 rounded-lg border border-white/10 bg-[#13161e] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-white">
                          Platform Activity &amp; Moderation Breakdown
                        </h4>
                        <p className="text-[11px] text-white/45">
                          Live counts across members, posts, and moderation queues
                        </p>
                      </div>
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#FFF025]" />
                    </div>
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={platformMetricsChartData}
                          margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.07)"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="name"
                            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
                            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                            tickLine={false}
                          />
                          <YAxis
                            allowDecimals={false}
                            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                            contentStyle={{
                              backgroundColor: '#0d0f14',
                              border: '1px solid rgba(255,255,255,0.15)',
                              borderRadius: '8px',
                              fontSize: '12px',
                              color: '#ffffff',
                            }}
                          />
                          <Bar
                            dataKey="count"
                            name="Total"
                            fill="#FFF025"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={38}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border border-white/10 bg-[#13161e] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-white">
                          Students by Registered School
                        </h4>
                        <p className="text-[11px] text-white/45">
                          Builder distribution across configured partner schools
                        </p>
                      </div>
                      <span className="w-2.5 h-2.5 rounded-sm bg-white" />
                    </div>
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={schoolDistributionChartData}
                          margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.07)"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="name"
                            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
                            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                            tickLine={false}
                          />
                          <YAxis
                            allowDecimals={false}
                            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                            contentStyle={{
                              backgroundColor: '#0d0f14',
                              border: '1px solid rgba(255,255,255,0.15)',
                              borderRadius: '8px',
                              fontSize: '12px',
                              color: '#ffffff',
                            }}
                          />
                          <Bar
                            dataKey="students"
                            name="Members"
                            fill="#FFFFFF"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={38}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Quick Direct Navigation Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={() => onChangeTab('posts')}
                    className="p-3.5 rounded-lg border border-white/10 bg-[#13161e] hover:border-white/25 text-left transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white">Moderate Posts</div>
                      <div className="text-[11px] text-white/50 mt-0.5">
                        Approve, revoke, or remove creations
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[#FFF025] shrink-0" />
                  </button>

                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => onChangeTab('access')}
                      className="p-3.5 rounded-lg border border-white/10 bg-[#13161e] hover:border-white/25 text-left transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-semibold text-white">Student Verification</div>
                        <div className="text-[11px] text-white/50 mt-0.5">
                          Approve or reject Hub access
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-[#FFF025] shrink-0" />
                    </button>
                  )}

                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => onChangeTab('schools')}
                      className="p-3.5 rounded-lg border border-white/10 bg-[#13161e] hover:border-white/25 text-left transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-semibold text-white">Manage Schools</div>
                        <div className="text-[11px] text-white/50 mt-0.5">
                          Configure student school dropdown
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-[#FFF025] shrink-0" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onChangeTab('reports')}
                    className="p-3.5 rounded-lg border border-white/10 bg-[#13161e] hover:border-white/25 text-left transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white">Flagged Reports</div>
                      <div className="text-[11px] text-white/50 mt-0.5">
                        Review reported messages &amp; users
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[#FFF025] shrink-0" />
                  </button>
                </div>
              </div>
            )}

            {/* ==============================================================
                TAB 1: POSTS & CREATIONS MODERATION (Approve, Revoke, Remove)
                ============================================================== */}
            {normalizedTab === 'posts' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      Posts &amp; Showcase Moderation{' '}
                      <span className="font-mono tabular-nums text-white/45 font-normal">
                        ({publicPosts.length})
                      </span>
                    </h3>
                    <p className="text-xs text-white/50 mt-0.5">
                      Approve pending student submissions, revoke published visibility, or remove posts.
                    </p>
                  </div>

                  <div className="flex items-center gap-1 p-1 rounded-lg bg-[#13161e] border border-white/10 overflow-x-auto no-scrollbar self-start">
                    {[
                      { id: 'all' as const, label: 'All', count: publicPosts.length },
                      {
                        id: 'pending_review' as const,
                        label: 'Pending',
                        count: pendingPostsCount,
                      },
                      {
                        id: 'published' as const,
                        label: 'Published',
                        count: publishedPostsCount,
                      },
                      {
                        id: 'hidden' as const,
                        label: 'Revoked',
                        count: publicPosts.filter((p) => p.status === 'hidden').length,
                      },
                      {
                        id: 'removed' as const,
                        label: 'Removed',
                        count: publicPosts.filter((p) => p.status === 'removed').length,
                      },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPostFilter(opt.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                          postFilter === opt.id
                            ? 'bg-[#FFF025] text-black font-semibold'
                            : 'text-white/60 hover:text-white'
                        }`}
                      >
                        <span>{opt.label}</span>
                        <span className="font-mono tabular-nums opacity-75">{opt.count}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Posts */}
                <div className="relative max-w-md">
                  <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={postSearchQuery}
                    onChange={(e) => setPostSearchQuery(e.target.value)}
                    placeholder="Search posts by title, creator, category, or link..."
                    className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#13161e] border border-white/15 text-xs text-white focus:outline-none focus:border-white/40"
                  />
                </div>

                {filteredPosts.length === 0 ? (
                  <div className="py-12 px-4 border border-white/10 rounded-lg bg-[#13161e] text-center text-xs text-white/50">
                    No posts match the selected status filter.
                  </div>
                ) : (
                  <div className="border border-white/10 rounded-lg bg-[#13161e] divide-y divide-white/[0.08]">
                    {filteredPosts.map((post) => {
                      const st = post.status || 'published';
                      const isBusy = busyPostId === post.id;
                      const safeGameHref = ensureValidExternalHref(post.gameUrl);
                      const safeWebHref = ensureValidExternalHref(post.websiteUrl);
                      const safeGitHref = ensureValidExternalHref(post.githubUrl);
                      const thumbUrl = post.media?.[0]?.secureUrl || '';

                      return (
                        <div
                          key={post.id}
                          className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            {thumbUrl ? (
                              <img
                                src={thumbUrl}
                                alt={post.title}
                                className="w-14 h-14 rounded-lg object-cover border border-white/10 shrink-0 bg-black/40"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-lg border border-white/10 bg-[#0d0f14] flex items-center justify-center text-xs font-mono text-white/40 shrink-0">
                                IMG
                              </div>
                            )}

                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigateSpa(`/community/posts/${post.id}`, onClose)
                                  }
                                  className="text-sm font-semibold text-white hover:text-[#FFF025] transition-colors text-left truncate cursor-pointer"
                                >
                                  {post.title}
                                </button>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                                    st === 'pending_review'
                                      ? 'bg-[#FFF025] text-black font-semibold'
                                      : st === 'published'
                                        ? 'border border-white/20 text-white/85'
                                        : 'border border-white/15 text-white/45'
                                  }`}
                                >
                                  {st === 'pending_review'
                                    ? 'Pending Review'
                                    : st === 'published'
                                      ? 'Published'
                                      : st === 'hidden'
                                        ? 'Revoked / Hidden'
                                        : 'Removed'}
                                </span>
                                {post.isFeatured && (
                                  <span className="px-1.5 py-0.5 rounded bg-white/10 text-[#FFF025] text-[10px] font-semibold">
                                    Featured
                                  </span>
                                )}
                              </div>

                              <div className="text-xs text-white/55 flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span>By @{post.authorName}</span>
                                <span>·</span>
                                <span>{post.categoryName || post.categoryId}</span>
                                <span>·</span>
                                <span className="font-mono tabular-nums">
                                  {post.totalReactions || 0} reactions · {post.commentCount || 0}{' '}
                                  comments
                                </span>
                              </div>

                              {/* Verified Working Links Row */}
                              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigateSpa(`/community/posts/${post.id}`, onClose)
                                  }
                                  className="text-white/75 hover:text-[#FFF025] inline-flex items-center gap-1 underline cursor-pointer"
                                >
                                  <span>View Post</span>
                                  <ArrowUpRight className="w-3 h-3" />
                                </button>

                                {safeGameHref && (
                                  <a
                                    href={safeGameHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#FFF025] hover:underline inline-flex items-center gap-1 font-mono"
                                  >
                                    <span>Game Link</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}

                                {safeWebHref && safeWebHref !== safeGameHref && (
                                  <a
                                    href={safeWebHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-white/80 hover:text-white hover:underline inline-flex items-center gap-1 font-mono"
                                  >
                                    <span>Website Link</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}

                                {safeGitHref && (
                                  <a
                                    href={safeGitHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-white/70 hover:text-white hover:underline inline-flex items-center gap-1 font-mono"
                                  >
                                    <span>Source Code</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Moderation Controls: Approve, Revoke/Hide, Remove, Feature */}
                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            {st !== 'published' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleModeratePost(post, 'published')}
                                className="px-3 py-1.5 rounded-md bg-[#FFF025] text-black hover:bg-[#ffe500] text-xs font-semibold cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                            )}

                            {st === 'published' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleModeratePost(post, 'hidden')}
                                className="px-3 py-1.5 rounded-md border border-white/15 text-xs font-medium text-white/80 hover:text-white hover:bg-white/[0.08] cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                              >
                                <EyeOff className="w-3.5 h-3.5" />
                                <span>Revoke</span>
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleToggleFeatured(post)}
                              className={`px-2.5 py-1.5 rounded-md border text-xs font-medium cursor-pointer disabled:opacity-50 inline-flex items-center gap-1 ${
                                post.isFeatured
                                  ? 'border-[#FFF025] text-[#FFF025]'
                                  : 'border-white/15 text-white/65 hover:text-white'
                              }`}
                            >
                              <Star className="w-3.5 h-3.5" />
                              <span>{post.isFeatured ? 'Featured' : 'Feature'}</span>
                            </button>

                            {st !== 'removed' ? (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleModeratePost(post, 'removed')}
                                className="px-2.5 py-1.5 rounded-md border border-white/15 text-xs font-medium text-white/65 hover:text-white hover:bg-white/[0.08] cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handlePermanentDeletePost(post)}
                                className="px-2.5 py-1.5 rounded-md bg-white text-black text-xs font-semibold cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Forever</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ==============================================================
                TAB 2: STUDENT ACCESS REVIEW (Super Admin Only)
                ============================================================== */}
            {normalizedTab === 'access' && isSuperAdmin && (
              <div className="space-y-6 max-w-4xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                  <div>
                    <h3 className="text-base font-semibold text-white">Student Access Review</h3>
                    <p className="text-xs text-white/50 mt-0.5">
                      Verify student Hub applications. Rejected applicants disappear until they submit a new request.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenFullAccessPortal}
                    className="px-3 py-1.5 rounded-md border border-white/15 text-xs font-medium text-white/85 hover:bg-white/[0.08] transition-colors cursor-pointer inline-flex items-center gap-1.5 self-start whitespace-nowrap"
                  >
                    <span>Open Detailed Verification View</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Pending Formal Requests */}
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <h4 className="font-semibold text-white/80">
                      Pending Verification Applications
                    </h4>
                    <span className="font-mono tabular-nums text-white/45">
                      {activeAccessRequests.length}
                    </span>
                  </div>

                  {activeAccessRequests.length === 0 ? (
                    <div className="py-6 px-4 border border-white/10 rounded-lg bg-[#13161e] text-center text-xs text-white/50">
                      No pending student Hub applications.
                    </div>
                  ) : (
                    <div className="divide-y divide-white/[0.08] border border-white/10 rounded-lg bg-[#13161e]">
                      {activeAccessRequests.map((req) => (
                        <div
                          key={req.uid}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white truncate">
                                {req.fullName}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-[#FFF025] text-black text-[10px] font-semibold uppercase">
                                {req.status === 'more_information_required'
                                  ? 'Info Needed'
                                  : 'Pending'}
                              </span>
                            </div>
                            <div className="text-xs text-white/55 truncate">{req.email}</div>
                            <div className="text-xs text-white/70 truncate">
                              {req.schoolName} · {req.gradeLevel} · {req.programme}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={isProcessingHubAccess}
                              onClick={() => onApproveRequest(req)}
                              className="px-3.5 py-1.5 rounded-md bg-[#FFF025] text-black hover:bg-[#ffe500] text-xs font-semibold cursor-pointer disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={isProcessingHubAccess}
                              onClick={() => onRejectRequest(req)}
                              className="px-3 py-1.5 rounded-md border border-white/15 text-white/75 hover:text-white hover:bg-white/[0.08] text-xs font-medium cursor-pointer disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Unreviewed Public Accounts */}
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <h4 className="font-semibold text-white/80">
                      Unreviewed Public Accounts
                    </h4>
                    <span className="font-mono tabular-nums text-white/45">
                      {unapprovedPlatformUsers.length}
                    </span>
                  </div>

                  {unapprovedPlatformUsers.length === 0 ? (
                    <div className="py-6 px-4 border border-white/10 rounded-lg bg-[#13161e] text-center text-xs text-white/50">
                      All registered public accounts have been reviewed.
                    </div>
                  ) : (
                    <div className="divide-y divide-white/[0.08] border border-white/10 rounded-lg bg-[#13161e]">
                      {unapprovedPlatformUsers.map((u) => (
                        <div
                          key={u.uid}
                          className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <VerifiedAvatarFrame
                              src={getLiveUserAvatarUrl(u.uid, u.avatarUrl)}
                              alt={u.displayName}
                              isVerified={false}
                              sizeClass="w-8 h-8"
                            />
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => onInspectMemberProfile(u)}
                                className="text-sm font-medium text-white hover:underline truncate block text-left cursor-pointer"
                              >
                                {u.displayName}
                              </button>
                              <div className="text-xs text-white/50 truncate">
                                {u.schoolName || 'No school selected yet'}
                                {u.gradeLevel ? ` · ${u.gradeLevel}` : ''}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={isProcessingHubAccess}
                              onClick={() => onApproveUserForHub(u)}
                              className="px-3 py-1.5 rounded-md bg-[#FFF025] text-black hover:bg-[#ffe500] text-xs font-semibold cursor-pointer disabled:opacity-50"
                            >
                              Approve for Hub
                            </button>
                            <button
                              type="button"
                              disabled={isProcessingHubAccess}
                              onClick={() => onRevokeUserFromHub(u)}
                              className="px-3 py-1.5 rounded-md border border-white/15 text-white/75 hover:text-white hover:bg-white/[0.08] text-xs font-medium cursor-pointer disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* ==============================================================
                TAB 3: REGISTERED SCHOOLS CONFIGURATION (Super Admin Only)
                ============================================================== */}
            {normalizedTab === 'schools' && isSuperAdmin && (
              <div className="space-y-5 max-w-3xl">
                <div className="pb-4 border-b border-white/10">
                  <h3 className="text-base font-semibold text-white">
                    Registered Schools Dropdown Configuration
                  </h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    Schools added here immediately appear in the dropdown list when students request Private Hub access or update their profile.
                  </p>
                </div>

                {/* Add New Registered School Form */}
                <form
                  onSubmit={handleAddSchoolSubmit}
                  className="p-4 rounded-lg border border-white/10 bg-[#13161e] flex flex-col sm:flex-row gap-2.5"
                >
                  <input
                    type="text"
                    value={newSchoolInput}
                    onChange={(e) => setNewSchoolInput(e.target.value)}
                    placeholder="Enter partner school or academy name (e.g. Graceville College)..."
                    required
                    className="flex-1 px-3.5 py-2 rounded-md bg-[#0d0f14] border border-white/15 text-xs text-white focus:outline-none focus:border-[#FFF025]"
                  />
                  <button
                    type="submit"
                    disabled={isSavingSchool}
                    className="px-4 py-2 rounded-md bg-[#FFF025] text-black hover:bg-[#ffe500] text-xs font-semibold cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isSavingSchool ? 'Saving...' : 'Add School to Dropdown'}</span>
                  </button>
                </form>

                {/* Configured Schools List */}
                <div className="border border-white/10 rounded-lg bg-[#13161e] divide-y divide-white/[0.08]">
                  {registeredSchools.map((school) => {
                    const count = schoolStudentCounts[school.trim().toLowerCase()] || 0;
                    return (
                      <div
                        key={school}
                        className="px-4 py-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-medium text-white truncate">
                            {school}
                          </div>
                          <div className="text-[11px] text-white/45 font-mono tabular-nums">
                            {count} registered member{count === 1 ? '' : 's'}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isSavingSchool || registeredSchools.length <= 1}
                          onClick={() => handleRemoveSchoolClick(school)}
                          className="px-2.5 py-1 rounded-md border border-white/15 text-xs text-white/65 hover:text-white hover:bg-white/[0.08] cursor-pointer disabled:opacity-40 inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Support Contact Verification Info */}
                <div className="p-4 rounded-lg border border-white/10 bg-[#13161e] space-y-1.5 text-xs">
                  <div className="font-semibold text-white">
                    Student Support Notice (Displayed Below School Dropdowns)
                  </div>
                  <p className="text-white/60 leading-relaxed">
                    When a student checks the dropdown and does not see their school listed, they are instructed to contact support at{' '}
                    <a
                      href={`mailto:${SUPPORT_CONTACT_EMAIL}`}
                      className="text-[#FFF025] underline"
                    >
                      {SUPPORT_CONTACT_EMAIL}
                    </a>{' '}
                    or{' '}
                    <a
                      href={SUPPORT_WHATSAPP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#FFF025] underline"
                    >
                      {SUPPORT_WHATSAPP_DISPLAY} on WhatsApp
                    </a>{' '}
                    for verification and school onboarding.
                  </p>
                </div>
              </div>
            )}

            {/* ==============================================================
                TAB 4: FLAGGED REPORTS QUEUE
                ============================================================== */}
            {normalizedTab === 'reports' && (
              <div className="space-y-5 max-w-3xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                  <div>
                    <h3 className="text-base font-semibold text-white">Flagged Reports</h3>
                    <p className="text-xs text-white/50 mt-0.5">
                      Review flagged chat messages and member profiles across channels.
                    </p>
                  </div>

                  <div className="inline-flex items-center p-1 rounded-lg bg-[#13161e] border border-white/10 self-start">
                    {[
                      { id: 'open' as const, label: 'Open', count: openReportsCount },
                      {
                        id: 'resolved' as const,
                        label: 'Resolved',
                        count: resolvedReportsCount,
                      },
                      { id: 'all' as const, label: 'All', count: reports.length },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setReportFilter(opt.id)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                          reportFilter === opt.id
                            ? 'bg-[#FFF025] text-black font-semibold'
                            : 'text-white/60 hover:text-white'
                        }`}
                      >
                        <span>{opt.label}</span>
                        <span className="tabular-nums opacity-75">{opt.count}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {filteredReports.length === 0 ? (
                  <div className="py-12 px-4 border border-white/10 rounded-lg bg-[#13161e] text-center space-y-1.5">
                    <div className="text-sm font-medium text-white/80">
                      {reportFilter === 'open'
                        ? 'No open moderation reports'
                        : reportFilter === 'resolved'
                          ? 'No resolved reports yet'
                          : 'No reports have been submitted'}
                    </div>
                    <p className="text-xs text-white/45">
                      When students flag a message or member profile, it appears here immediately.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.08] border border-white/10 rounded-lg bg-[#13161e]">
                    {filteredReports.map((rep) => {
                      const isUserReport = rep.messageId.startsWith('user-');
                      const targetUid = isUserReport
                        ? rep.reportedUserId || rep.messageId.replace(/^user-/, '')
                        : rep.reportedUserId;
                      const matchedMsg = !isUserReport
                        ? messageLookup.get(rep.messageId)
                        : undefined;
                      const matchedTargetUser = targetUid
                        ? userLookup.get(targetUid)
                        : undefined;
                      const matchedReporter = rep.reporterId
                        ? userLookup.get(rep.reporterId)
                        : undefined;

                      const resolvedTargetName =
                        rep.reportedUserName ||
                        matchedMsg?.authorName ||
                        matchedTargetUser?.displayName ||
                        '';
                      const resolvedReporterName =
                        rep.reporterName || matchedReporter?.displayName || '';
                      const resolvedSnippet =
                        rep.messageSnippet ||
                        matchedMsg?.text ||
                        matchedMsg?.linkTitle ||
                        matchedMsg?.linkUrl ||
                        '';

                      return (
                        <div key={rep.id} className="p-4 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex flex-wrap items-center gap-2 min-w-0 text-white/60">
                              <span className="font-medium text-white">
                                {isUserReport ? 'Flagged Member' : 'Flagged Message'}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono text-white/75">
                                #{rep.channelId}
                              </span>
                              {resolvedTargetName && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  {matchedTargetUser ? (
                                    <button
                                      type="button"
                                      onClick={() => onInspectMemberProfile(matchedTargetUser)}
                                      className="text-white/90 hover:underline font-medium cursor-pointer"
                                    >
                                      @{resolvedTargetName}
                                    </button>
                                  ) : (
                                    <span className="text-white/90 font-medium">
                                      @{resolvedTargetName}
                                    </span>
                                  )}
                                </>
                              )}
                              <span aria-hidden="true">·</span>
                              <span className="tabular-nums text-white/45">
                                {formatReportTimestamp(rep.createdAtMillis)}
                              </span>
                            </div>

                            <span
                              className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                                rep.status === 'open'
                                  ? 'bg-[#FFF025] text-black font-semibold'
                                  : 'border border-white/15 text-white/60'
                              }`}
                            >
                              {rep.status === 'open' ? 'Open' : 'Resolved'}
                            </span>
                          </div>

                          {resolvedSnippet ? (
                            <div className="px-3 py-2 rounded-md bg-[#0d0f14] border border-white/[0.07] text-xs text-white/85 leading-relaxed whitespace-pre-wrap break-words">
                              {resolvedSnippet}
                            </div>
                          ) : (
                            <div className="px-3 py-2 rounded-md bg-[#0d0f14] border border-white/[0.07] text-xs text-white/45 italic">
                              Message preview unavailable — use Jump to Message to view in channel.
                            </div>
                          )}

                          <div className="text-xs text-white/65">
                            <span>{rep.reason}</span>
                            {resolvedReporterName && (
                              <>
                                {' '}
                                <span className="text-white/35">·</span>{' '}
                                <span className="text-white/50">
                                  Flagged by {resolvedReporterName}
                                </span>
                              </>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            {!isUserReport && rep.messageId && (
                              <button
                                type="button"
                                onClick={() => {
                                  onJumpToReportedMessage(
                                    rep.channelId,
                                    rep.messageId,
                                    resolvedTargetName,
                                    resolvedSnippet
                                  );
                                }}
                                className="px-3 py-1.5 rounded-md border border-white/15 text-xs font-medium text-white/85 hover:bg-white/[0.08] transition-colors cursor-pointer"
                              >
                                Jump to Message
                              </button>
                            )}

                            {matchedTargetUser && (
                              <button
                                type="button"
                                onClick={() => onInspectMemberProfile(matchedTargetUser)}
                                className="px-3 py-1.5 rounded-md border border-white/15 text-xs font-medium text-white/75 hover:bg-white/[0.08] transition-colors cursor-pointer"
                              >
                                View Profile
                              </button>
                            )}

                            {rep.status === 'open' ? (
                              <button
                                type="button"
                                onClick={() => onResolveReport(rep.id, 'resolved')}
                                className="px-3 py-1.5 rounded-md bg-[#FFF025] text-black hover:bg-[#ffe500] text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Mark Resolved</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onResolveReport(rep.id, 'open')}
                                className="px-3 py-1.5 rounded-md border border-white/15 text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Reopen</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ==============================================================
                TAB 5: CHANNELS, PERMISSIONS & SUB-GROUPS
                ============================================================== */}
            {normalizedTab === 'channels' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor="admin-target-channel"
                      className="block text-[11px] font-medium text-white/50 mb-1"
                    >
                      Managing Channel
                    </label>
                    <select
                      id="admin-target-channel"
                      value={activeTargetChannel?.id || selectedChannelId}
                      onChange={(e) => onSelectChannelId(e.target.value)}
                      className="w-full sm:max-w-xs px-3 py-2 rounded-lg bg-[#13161e] border border-white/15 text-xs font-medium text-white focus:outline-none focus:border-white/40"
                    >
                      {moderatedChannels.map((ch) => (
                        <option key={ch.id} value={ch.id}>
                          {ch.emoji} #{ch.name} · {ch.category}
                        </option>
                      ))}
                    </select>
                  </div>

                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowCreateChannelForm((prev) => !prev)}
                      className="px-3 py-2 rounded-lg border border-white/15 text-xs font-medium text-white hover:bg-white/[0.07] transition-colors cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-end whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{showCreateChannelForm ? 'Cancel' : 'New Channel'}</span>
                    </button>
                  )}
                </div>

                {isSuperAdmin && showCreateChannelForm && (
                  <form
                    onSubmit={(e) => {
                      onCreateCustomChannel(e);
                      setShowCreateChannelForm(false);
                    }}
                    className="p-4 rounded-lg border border-white/15 bg-[#13161e] space-y-3"
                  >
                    <div className="text-xs font-semibold text-white">Create Community Channel</div>
                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-2.5">
                      <input
                        type="text"
                        value={newChannelEmoji}
                        onChange={(e) => onChangeNewChannelEmoji(e.target.value)}
                        placeholder="Emoji"
                        className="px-3 py-2 rounded-md bg-[#0d0f14] border border-white/15 text-xs text-white"
                      />
                      <input
                        type="text"
                        value={newChannelName}
                        onChange={(e) => onChangeNewChannelName(e.target.value)}
                        placeholder="Channel name (e.g. Pixel Art)"
                        required
                        className="sm:col-span-3 px-3 py-2 rounded-md bg-[#0d0f14] border border-white/15 text-xs text-white"
                      />
                      <select
                        value={newChannelCategory}
                        onChange={(e) =>
                          onChangeNewChannelCategory(
                            e.target.value as 'INFORMATION' | 'CREATOR SHOWCASES' | 'SOCIAL'
                          )
                        }
                        className="sm:col-span-2 px-3 py-2 rounded-md bg-[#0d0f14] border border-white/15 text-xs text-white"
                      >
                        <option value="SOCIAL">SOCIAL</option>
                        <option value="CREATOR SHOWCASES">CREATOR SHOWCASES</option>
                        <option value="INFORMATION">INFORMATION</option>
                      </select>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        type="text"
                        value={newChannelDesc}
                        onChange={(e) => onChangeNewChannelDesc(e.target.value)}
                        placeholder="Short channel description..."
                        className="flex-1 px-3 py-2 rounded-md bg-[#0d0f14] border border-white/15 text-xs text-white"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-md bg-[#FFF025] text-black font-semibold text-xs cursor-pointer hover:bg-[#ffe500] whitespace-nowrap"
                      >
                        Create Channel
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <section className="space-y-2.5">
                    <h4 className="text-xs font-semibold text-white/80">
                      Channel Permissions · #{activeTargetChannel?.name}
                    </h4>
                    <div className="border border-white/10 rounded-lg bg-[#13161e] divide-y divide-white/[0.08]">
                      {[
                        {
                          key: 'isLocked' as const,
                          label: 'Lock Channel',
                          desc: 'Only admins and channel moderators can post',
                        },
                        {
                          key: 'allowMemberMessages' as const,
                          label: 'Member Messages',
                          desc: 'Allow regular verified students to send chat',
                        },
                        {
                          key: 'allowMemberGroups' as const,
                          label: 'Create Sub-Groups',
                          desc: 'Allow members to start rooms inside this channel',
                        },
                        {
                          key: 'allowMemberInvites' as const,
                          label: 'Group Invites',
                          desc: 'Allow members to invite peers to sub-groups',
                        },
                        {
                          key: 'banLinks' as const,
                          label: 'Ban Links',
                          desc: 'Prevent member URLs from posting here',
                        },
                        {
                          key: 'enableLinkPreviews' as const,
                          label: 'Link Previews',
                          desc: 'Show preview cards for shared creation URLs',
                        },
                      ].map((perm) => {
                        const val = Boolean(activeTargetConfig[perm.key]);
                        return (
                          <div
                            key={perm.key}
                            className="px-3.5 py-3 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-white">{perm.label}</div>
                              <div className="text-[11px] text-white/45">{perm.desc}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                activeTargetChannel &&
                                onSaveChannelConfig(activeTargetChannel.id, {
                                  [perm.key]: !val,
                                })
                              }
                              className={`px-3 py-1 rounded-md text-[11px] font-semibold cursor-pointer shrink-0 transition-colors ${
                                val
                                  ? 'bg-[#FFF025] text-black'
                                  : 'border border-white/15 text-white/60 hover:text-white'
                              }`}
                            >
                              {val ? 'On' : 'Off'}
                            </button>
                          </div>
                        );
                      })}

                      <div className="p-3.5 space-y-2">
                        <div className="text-xs font-medium text-white">Channel Cooldown</div>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { val: -1, label: 'Default' },
                            { val: 0, label: 'Off' },
                            { val: 3, label: '3s' },
                            { val: 5, label: '5s' },
                            { val: 10, label: '10s' },
                            { val: 30, label: '30s' },
                          ].map((opt) => (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() =>
                                activeTargetChannel &&
                                onSaveChannelConfig(activeTargetChannel.id, {
                                  cooldownSeconds: opt.val,
                                })
                              }
                              className={`px-2.5 py-1 rounded-md text-[11px] font-mono tabular-nums cursor-pointer transition-colors ${
                                activeTargetConfig.cooldownSeconds === opt.val
                                  ? 'bg-[#FFF025] text-black font-semibold'
                                  : 'border border-white/15 text-white/65 hover:text-white'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>

                  <div className="space-y-5">
                    <section className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-white/80">
                          Sub-Groups in #{activeTargetChannel?.name}{' '}
                          <span className="font-mono tabular-nums text-white/45">
                            ({channelSubGroups.length})
                          </span>
                        </h4>
                        <button
                          type="button"
                          onClick={() =>
                            activeTargetChannel &&
                            onOpenCreateGroupModal(activeTargetChannel.id)
                          }
                          className="px-2.5 py-1 rounded-md border border-white/15 text-[11px] font-medium text-white/85 hover:bg-white/[0.08] cursor-pointer"
                        >
                          + New Group
                        </button>
                      </div>

                      {channelSubGroups.length === 0 ? (
                        <div className="py-5 px-3.5 border border-white/10 rounded-lg bg-[#13161e] text-xs text-white/45">
                          No sub-groups in #{activeTargetChannel?.name} yet.
                        </div>
                      ) : (
                        <div className="border border-white/10 rounded-lg bg-[#13161e] divide-y divide-white/[0.08]">
                          {channelSubGroups.map((grp) => (
                            <div
                              key={grp.id}
                              className="px-3.5 py-2.5 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-medium text-white flex items-center gap-1.5 truncate">
                                  {grp.isPrivate && (
                                    <Lock className="w-3 h-3 text-white/50 shrink-0" />
                                  )}
                                  <span className="truncate">{grp.name}</span>
                                </div>
                                <div className="text-[11px] text-white/45 tabular-nums">
                                  {grp.memberIds.length} member
                                  {grp.memberIds.length === 1 ? '' : 's'}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    activeTargetChannel &&
                                    onManageSubGroup(activeTargetChannel.id, grp.id)
                                  }
                                  className="px-2.5 py-1 rounded-md border border-white/15 text-[11px] text-white/80 hover:bg-white/[0.08] cursor-pointer"
                                >
                                  Members
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteSubGroup(grp)}
                                  aria-label={`Delete ${grp.name}`}
                                  className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/[0.08] cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-semibold text-white/80">
                          Moderators &amp; Access
                        </h4>
                        <div className="relative w-40">
                          <Search className="w-3 h-3 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={channelModSearch}
                            onChange={(e) => setChannelModSearch(e.target.value)}
                            placeholder="Filter users..."
                            className="w-full pl-7 pr-2.5 py-1 rounded-md bg-[#13161e] border border-white/15 text-[11px] text-white focus:outline-none focus:border-white/40"
                          />
                        </div>
                      </div>

                      <div className="max-h-64 overflow-y-auto hub-scroll border border-white/10 rounded-lg bg-[#13161e] divide-y divide-white/[0.08]">
                        {filteredChannelUsers.length === 0 ? (
                          <div className="p-4 text-center text-xs text-white/45">
                            No matching verified members.
                          </div>
                        ) : (
                          filteredChannelUsers.map((u) => {
                            const isChannelMod = activeTargetConfig.moderatorIds.includes(
                              u.uid
                            );
                            const isKicked = activeTargetConfig.kickedUserIds.includes(
                              u.uid
                            );
                            return (
                              <div
                                key={u.uid}
                                className="px-3.5 py-2.5 flex items-center justify-between gap-2"
                              >
                                <span className="text-xs font-medium text-white truncate">
                                  {u.displayName}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isSuperAdmin && u.role !== 'admin' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!activeTargetChannel) return;
                                        const nextMods = isChannelMod
                                          ? activeTargetConfig.moderatorIds.filter(
                                              (id) => id !== u.uid
                                            )
                                          : [...activeTargetConfig.moderatorIds, u.uid];
                                        onSaveChannelConfig(activeTargetChannel.id, {
                                          moderatorIds: nextMods,
                                        });
                                      }}
                                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
                                        isChannelMod
                                          ? 'bg-[#FFF025] text-black font-semibold'
                                          : 'border border-white/15 text-white/70 hover:text-white'
                                      }`}
                                    >
                                      {isChannelMod ? 'Mod' : 'Assign Mod'}
                                    </button>
                                  )}
                                  {u.role !== 'admin' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!activeTargetChannel) return;
                                        const nextKicked = isKicked
                                          ? activeTargetConfig.kickedUserIds.filter(
                                              (id) => id !== u.uid
                                            )
                                          : [...activeTargetConfig.kickedUserIds, u.uid];
                                        onSaveChannelConfig(activeTargetChannel.id, {
                                          kickedUserIds: nextKicked,
                                        });
                                      }}
                                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
                                        isKicked
                                          ? 'bg-white text-black font-semibold'
                                          : 'border border-white/15 text-white/65 hover:text-white'
                                      }`}
                                    >
                                      {isKicked ? 'Restore' : 'Kick'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            )}

            {/* ==============================================================
                TAB 6: PLATFORM MEMBERS & ROLES (Super Admin Only)
                ============================================================== */}
            {normalizedTab === 'users' && isSuperAdmin && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      Members{' '}
                      <span className="font-mono tabular-nums text-white/45 font-normal">
                        ({allPlatformUsers.length})
                      </span>
                    </h3>
                    <p className="text-xs text-white/50 mt-0.5">
                      Manage student Hub access, global moderator roles, and account standing.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateMemberForm((prev) => !prev)}
                    className="px-3 py-1.5 rounded-lg border border-white/15 text-xs font-medium text-white hover:bg-white/[0.08] cursor-pointer inline-flex items-center gap-1.5 self-start whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showCreateMemberForm ? 'Cancel' : 'Add Member'}</span>
                  </button>
                </div>

                {/* Collapsible Create Member Form (uses Registered Schools dropdown) */}
                {showCreateMemberForm && (
                  <form
                    onSubmit={(e) => {
                      onCreateMemberProfile(e);
                      setShowCreateMemberForm(false);
                    }}
                    className="p-4 rounded-lg border border-white/15 bg-[#13161e] space-y-3"
                  >
                    <div className="text-xs font-semibold text-white">
                      Provision Approved Student Member
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      <input
                        type="text"
                        value={newMemberName}
                        onChange={(e) => onChangeNewMemberName(e.target.value)}
                        placeholder="Nickname *"
                        required
                        className="px-3 py-2 rounded-md bg-[#0d0f14] border border-white/15 text-xs text-white"
                      />
                      <select
                        value={newMemberSchool}
                        onChange={(e) => onChangeNewMemberSchool(e.target.value)}
                        className="px-3 py-2 rounded-md bg-[#0d0f14] border border-white/15 text-xs text-white"
                      >
                        <option value="">Select Registered School...</option>
                        {allSchoolOptions.map((school) => (
                          <option key={school} value={school}>
                            {school}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={newMemberGrade}
                        onChange={(e) => onChangeNewMemberGrade(e.target.value)}
                        placeholder="Grade Level"
                        className="px-3 py-2 rounded-md bg-[#0d0f14] border border-white/15 text-xs text-white"
                      />
                      <select
                        value={newMemberRole}
                        onChange={(e) =>
                          onChangeNewMemberRole(e.target.value as 'member' | 'moderator')
                        }
                        className="px-3 py-2 rounded-md bg-[#0d0f14] border border-white/15 text-xs text-white"
                      >
                        <option value="member">Member</option>
                        <option value="moderator">Global Moderator</option>
                      </select>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-md bg-[#FFF025] text-black font-semibold text-xs cursor-pointer hover:bg-[#ffe500]"
                      >
                        Create Member
                      </button>
                    </div>
                  </form>
                )}

                {/* Search + Filter Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={memberSearchQuery}
                      onChange={(e) => onChangeMemberSearchQuery(e.target.value)}
                      placeholder="Search by name, school, or grade..."
                      className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#13161e] border border-white/15 text-xs text-white focus:outline-none focus:border-white/40"
                    />
                  </div>

                  <div className="flex items-center gap-1 p-1 rounded-lg bg-[#13161e] border border-white/10 overflow-x-auto no-scrollbar">
                    {[
                      { id: 'all' as const, label: 'All' },
                      { id: 'hub' as const, label: 'Hub' },
                      { id: 'public' as const, label: 'Public' },
                      { id: 'mods' as const, label: 'Mods' },
                      { id: 'restricted' as const, label: 'Restricted' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setMemberFilter(f.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer ${
                          memberFilter === f.id
                            ? 'bg-[#FFF025] text-black font-semibold'
                            : 'text-white/60 hover:text-white'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hairline-Divided Members Directory */}
                {filteredMembers.length === 0 ? (
                  <div className="py-10 text-center border border-white/10 rounded-lg bg-[#13161e] text-xs text-white/50">
                    No members match the current search or filter.
                  </div>
                ) : (
                  <div className="border border-white/10 rounded-lg bg-[#13161e] divide-y divide-white/[0.08]">
                    {filteredMembers.map((u) => {
                      const st = u.status || 'active';
                      const isUserApprovedInHub =
                        u.role === 'admin' ||
                        u.role === 'moderator' ||
                        approvedHubMemberIds.has(u.uid);

                      return (
                        <div
                          key={u.uid}
                          className="px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <VerifiedAvatarFrame
                              src={getLiveUserAvatarUrl(u.uid, u.avatarUrl)}
                              alt={u.displayName}
                              isVerified={isUserApprovedInHub}
                              sizeClass="w-8 h-8"
                              ringPaddingClass="p-[1.5px]"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => onInspectMemberProfile(u)}
                                  className="text-xs sm:text-sm font-medium text-white hover:underline truncate cursor-pointer"
                                >
                                  {u.displayName}
                                </button>
                                <span className="text-[11px] text-white/45 capitalize shrink-0">
                                  {u.role}
                                </span>
                              </div>
                              <div className="text-[11px] text-white/55 truncate flex items-center gap-1.5">
                                <span>{isUserApprovedInHub ? 'Hub Member' : 'Public Only'}</span>
                                <span aria-hidden="true">·</span>
                                <span className="truncate">
                                  {u.schoolName && !isPlaceholderSchoolName(u.schoolName)
                                    ? u.schoolName
                                    : 'No school set'}
                                </span>
                                {st !== 'active' && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="text-[#FFF025] font-medium">
                                      {st === 'banned' ? 'Banned' : 'Suspended'}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {u.role !== 'admin' && (
                            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateUserAccount(u, {
                                    role: u.role === 'moderator' ? 'member' : 'moderator',
                                  })
                                }
                                className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
                                  u.role === 'moderator'
                                    ? 'bg-[#FFF025] text-black font-semibold'
                                    : 'border border-white/15 text-white/75 hover:bg-white/[0.08]'
                                }`}
                              >
                                {u.role === 'moderator' ? 'Global Mod' : 'Make Mod'}
                              </button>

                              <button
                                type="button"
                                disabled={isProcessingHubAccess}
                                onClick={() =>
                                  isUserApprovedInHub
                                    ? onRevokeUserFromHub(u)
                                    : onApproveUserForHub(u)
                                }
                                className="px-2.5 py-1 rounded-md border border-white/15 text-[11px] font-medium text-white/80 hover:bg-white/[0.08] cursor-pointer disabled:opacity-50"
                              >
                                {isUserApprovedInHub ? 'Remove Hub' : 'Grant Hub'}
                              </button>

                              <div className="inline-flex items-center rounded-md border border-white/15 overflow-hidden text-[11px]">
                                <button
                                  type="button"
                                  onClick={() => onUpdateUserAccount(u, { status: 'active' })}
                                  className={`px-2 py-1 cursor-pointer ${
                                    st === 'active'
                                      ? 'bg-white text-black font-semibold'
                                      : 'text-white/50 hover:text-white'
                                  }`}
                                >
                                  Active
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateUserAccount(u, { status: 'suspended' })
                                  }
                                  className={`px-2 py-1 border-l border-white/15 cursor-pointer ${
                                    st === 'suspended'
                                      ? 'bg-[#FFF025] text-black font-semibold'
                                      : 'text-white/50 hover:text-white'
                                  }`}
                                >
                                  Suspend
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onUpdateUserAccount(u, { status: 'banned' })}
                                  className={`px-2 py-1 border-l border-white/15 cursor-pointer ${
                                    st === 'banned'
                                      ? 'bg-[#FFF025] text-black font-semibold'
                                      : 'text-white/50 hover:text-white'
                                  }`}
                                >
                                  Ban
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ==============================================================
                TAB 7: GLOBAL COMMUNITY RULES (Super Admin Only)
                ============================================================== */}
            {normalizedTab === 'global' && isSuperAdmin && (
              <div className="space-y-5 max-w-2xl">
                <div className="pb-4 border-b border-white/10">
                  <h3 className="text-base font-semibold text-white">Global Community Rules</h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    Baseline defaults applied across all Student Hub channels unless overridden.
                  </p>
                </div>

                <div className="border border-white/10 rounded-lg bg-[#13161e] divide-y divide-white/[0.08]">
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-medium text-white">Slow-Mode Cooldown</div>
                      <div className="text-[11px] text-white/50 mt-0.5">
                        Minimum wait time between messages per member
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[0, 3, 5, 10, 15, 30, 60].map((sec) => {
                        const isActive =
                          (sec === 0 && globalSettings.disableCooldown) ||
                          (!globalSettings.disableCooldown &&
                            globalSettings.cooldownSeconds === sec);
                        return (
                          <button
                            key={sec}
                            type="button"
                            onClick={() =>
                              onUpdateGlobalSettings({
                                cooldownSeconds: sec,
                                disableCooldown: sec === 0,
                              })
                            }
                            className={`px-2.5 py-1 rounded-md text-xs font-mono tabular-nums cursor-pointer ${
                              isActive
                                ? 'bg-[#FFF025] text-black font-semibold'
                                : 'border border-white/15 text-white/65 hover:text-white'
                            }`}
                          >
                            {sec === 0 ? 'Off' : `${sec}s`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-medium text-white">Lock All Channels</div>
                      <div className="text-[11px] text-white/50 mt-0.5">
                        Restricts sending messages to admins and moderators only
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateGlobalSettings({
                          globalChatLocked: !globalSettings.globalChatLocked,
                        })
                      }
                      className={`px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer shrink-0 ${
                        globalSettings.globalChatLocked
                          ? 'bg-[#FFF025] text-black'
                          : 'border border-white/15 text-white/80 hover:bg-white/[0.08]'
                      }`}
                    >
                      {globalSettings.globalChatLocked ? 'Locked' : 'Unlocked'}
                    </button>
                  </div>

                  <div className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-medium text-white">External Links</div>
                      <div className="text-[11px] text-white/50 mt-0.5">
                        Allow or restrict members from sharing creation URLs
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateGlobalSettings({
                          banLinks: !globalSettings.banLinks,
                        })
                      }
                      className={`px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer shrink-0 ${
                        globalSettings.banLinks
                          ? 'bg-[#FFF025] text-black'
                          : 'border border-white/15 text-white/80 hover:bg-white/[0.08]'
                      }`}
                    >
                      {globalSettings.banLinks ? 'Banned' : 'Allowed'}
                    </button>
                  </div>

                  <div className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-medium text-white">Link Previews</div>
                      <div className="text-[11px] text-white/50 mt-0.5">
                        Render preview cards and covers beneath shared project URLs
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateGlobalSettings({
                          enableLinkPreviews: !globalSettings.enableLinkPreviews,
                        })
                      }
                      className={`px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer shrink-0 ${
                        globalSettings.enableLinkPreviews
                          ? 'bg-[#FFF025] text-black'
                          : 'border border-white/15 text-white/70 hover:bg-white/[0.08]'
                      }`}
                    >
                      {globalSettings.enableLinkPreviews ? 'On' : 'Off'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
