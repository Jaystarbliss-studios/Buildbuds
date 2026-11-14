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
} from 'lucide-react';
import {
  BuilderProfile,
  CommunityChannelConfig,
  CommunityGlobalSettings,
  CommunitySubGroup,
  UserAccountStatus,
} from '../firebase.ts';
import { StudentAccessRequest } from '../types/community.ts';
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
  | 'reports'
  | 'access'
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

  if (!isOpen) return null;

  const navItems: Array<{
    id: Exclude<AdminCenterTab, 'groups'>;
    label: string;
    mobileLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
    accent?: 'danger' | 'warn';
    visible: boolean;
  }> = [
    {
      id: 'reports',
      label: 'Reports',
      mobileLabel: 'Reports',
      icon: Flag,
      count: openReportsCount,
      accent: 'danger',
      visible: true,
    },
    {
      id: 'access',
      label: 'Access Review',
      mobileLabel: 'Access',
      icon: UserCheck,
      count: pendingHubRequestsCount,
      accent: 'warn',
      visible: isSuperAdmin,
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
      label: 'Members',
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
      className="fixed inset-0 z-[170] bg-black/75 backdrop-blur-sm flex items-center justify-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isSuperAdmin ? 'Admin Control Center' : 'Channel Moderator Center'}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full h-full sm:h-[min(88vh,740px)] sm:max-w-5xl sm:rounded-xl bg-[#111318] border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden text-white"
      >
        {/* Clean Top Header Bar */}
        <header className="px-4 sm:px-6 py-3.5 border-b border-white/10 bg-[#14171f] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldCheck className="w-4 h-4 text-white/80 shrink-0" />
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

          <div className="flex items-center gap-3 shrink-0">
            {isSuperAdmin && (
              <button
                type="button"
                onClick={onOpenFullAccessPortal}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Verification Portal</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Control Center"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Mobile Compact Tab Navigation (zero native browser scrollbar) */}
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
                className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  active
                    ? 'bg-white text-black font-semibold'
                    : 'text-white/65 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.mobileLabel}</span>
                {typeof item.count === 'number' && item.count > 0 && (
                  <span
                    className={`tabular-nums text-[11px] ${
                      active
                        ? 'text-black/75'
                        : item.accent === 'danger'
                          ? 'text-rose-400'
                          : item.accent === 'warn'
                            ? 'text-amber-300'
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
                        ? 'bg-white/[0.09] text-white'
                        : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          active ? 'text-white' : 'text-white/45'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {typeof item.count === 'number' && item.count > 0 && (
                      <span
                        className={`tabular-nums text-[11px] font-mono ${
                          item.accent === 'danger'
                            ? 'text-rose-400 font-semibold'
                            : item.accent === 'warn'
                              ? 'text-amber-300 font-semibold'
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

            {/* Quiet Workspace Summary */}
            <div className="pt-3 border-t border-white/10 px-2 space-y-2 text-[11px] text-white/45">
              <div className="flex items-center justify-between">
                <span>Open Reports</span>
                <span className="font-mono tabular-nums text-white/80">
                  {openReportsCount}
                </span>
              </div>
              {isSuperAdmin && (
                <>
                  <div className="flex items-center justify-between">
                    <span>Pending Access</span>
                    <span className="font-mono tabular-nums text-white/80">
                      {pendingHubRequestsCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total Accounts</span>
                    <span className="font-mono tabular-nums text-white/80">
                      {allPlatformUsers.length}
                    </span>
                  </div>
                </>
              )}
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={onOpenFullAccessPortal}
                  className="w-full pt-2 border-t border-white/10 text-left text-white/70 hover:text-white flex items-center justify-between cursor-pointer"
                >
                  <span>Full Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </aside>

          {/* Main Tab Content Viewport */}
          <div className="flex-1 min-w-0 overflow-y-auto hub-scroll p-4 sm:p-6">
            {/* ==============================================================
                TAB 1: FLAGGED REPORTS QUEUE (Strictly Reports — No Sub-Groups)
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

                  {/* Clean Segmented Status Filter */}
                  <div className="inline-flex items-center p-1 rounded-lg bg-[#161922] border border-white/10 self-start">
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
                            ? 'bg-white text-black font-semibold'
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
                  <div className="py-12 px-4 border border-white/10 rounded-lg bg-[#151820] text-center space-y-1.5">
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
                  <div className="divide-y divide-white/[0.08] border border-white/10 rounded-lg bg-[#151820]">
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
                          {/* Clean unboxed metadata line */}
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
                              className={`text-[11px] font-semibold uppercase tracking-wide shrink-0 ${
                                rep.status === 'open' ? 'text-rose-400' : 'text-emerald-400'
                              }`}
                            >
                              {rep.status === 'open' ? 'Open' : 'Resolved'}
                            </span>
                          </div>

                          {/* Flagged Content Preview */}
                          {resolvedSnippet ? (
                            <div className="px-3 py-2 rounded-md bg-[#0e1015] border border-white/[0.07] text-xs text-white/85 leading-relaxed whitespace-pre-wrap break-words">
                              {resolvedSnippet}
                            </div>
                          ) : (
                            <div className="px-3 py-2 rounded-md bg-[#0e1015] border border-white/[0.07] text-xs text-white/45 italic">
                              Message preview unavailable — use Jump to Message to view in channel.
                            </div>
                          )}

                          {/* Reason & Reporter */}
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

                          {/* Clean Actions */}
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
                                className="px-3 py-1.5 rounded-md bg-white text-black hover:bg-white/90 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
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
                TAB 2: STUDENT ACCESS REVIEW (Super Admin Only)
                ============================================================== */}
            {normalizedTab === 'access' && isSuperAdmin && (
              <div className="space-y-6 max-w-3xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                  <div>
                    <h3 className="text-base font-semibold text-white">Student Access Review</h3>
                    <p className="text-xs text-white/50 mt-0.5">
                      Rejected applicants stay hidden until they submit a fresh request.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenFullAccessPortal}
                    className="px-3 py-1.5 rounded-md border border-white/15 text-xs font-medium text-white/85 hover:bg-white/[0.08] transition-colors cursor-pointer inline-flex items-center gap-1.5 self-start whitespace-nowrap"
                  >
                    <span>Open Full Portal</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Pending Formal Requests */}
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <h4 className="font-semibold text-white/80">
                      Pending Applications
                    </h4>
                    <span className="font-mono tabular-nums text-white/45">
                      {activeAccessRequests.length}
                    </span>
                  </div>

                  {activeAccessRequests.length === 0 ? (
                    <div className="py-6 px-4 border border-white/10 rounded-lg bg-[#151820] text-center text-xs text-white/50">
                      No pending student Hub applications.
                    </div>
                  ) : (
                    <div className="divide-y divide-white/[0.08] border border-white/10 rounded-lg bg-[#151820]">
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
                              <span className="text-[11px] font-medium text-amber-300">
                                {req.status === 'more_information_required'
                                  ? 'Info Needed'
                                  : 'Pending'}
                              </span>
                            </div>
                            <div className="text-xs text-white/55 truncate">{req.email}</div>
                            <div className="text-xs text-white/65 truncate">
                              {req.schoolName} · {req.gradeLevel} · {req.programme}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={isProcessingHubAccess}
                              onClick={() => onApproveRequest(req)}
                              className="px-3.5 py-1.5 rounded-md bg-white text-black hover:bg-white/90 text-xs font-semibold cursor-pointer disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={isProcessingHubAccess}
                              onClick={() => onRejectRequest(req)}
                              className="px-3 py-1.5 rounded-md border border-white/15 text-rose-300 hover:bg-rose-500/15 text-xs font-medium cursor-pointer disabled:opacity-50"
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
                    <div className="py-6 px-4 border border-white/10 rounded-lg bg-[#151820] text-center text-xs text-white/50">
                      All registered public accounts have been reviewed.
                    </div>
                  ) : (
                    <div className="divide-y divide-white/[0.08] border border-white/10 rounded-lg bg-[#151820]">
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
                                {u.schoolName || 'Public Community Account'}
                                {u.gradeLevel ? ` · ${u.gradeLevel}` : ''}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={isProcessingHubAccess}
                              onClick={() => onApproveUserForHub(u)}
                              className="px-3 py-1.5 rounded-md bg-white text-black hover:bg-white/90 text-xs font-semibold cursor-pointer disabled:opacity-50"
                            >
                              Approve for Hub
                            </button>
                            <button
                              type="button"
                              disabled={isProcessingHubAccess}
                              onClick={() => onRevokeUserFromHub(u)}
                              className="px-3 py-1.5 rounded-md border border-white/15 text-rose-300 hover:bg-rose-500/15 text-xs font-medium cursor-pointer disabled:opacity-50"
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
                TAB 3: CHANNELS, PERMISSIONS & SUB-GROUPS
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
                      className="w-full sm:max-w-xs px-3 py-2 rounded-lg bg-[#151820] border border-white/15 text-xs font-medium text-white focus:outline-none focus:border-white/40"
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

                {/* Collapsible Create Channel Form */}
                {isSuperAdmin && showCreateChannelForm && (
                  <form
                    onSubmit={(e) => {
                      onCreateCustomChannel(e);
                      setShowCreateChannelForm(false);
                    }}
                    className="p-4 rounded-lg border border-white/15 bg-[#151820] space-y-3"
                  >
                    <div className="text-xs font-semibold text-white">Create Community Channel</div>
                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-2.5">
                      <input
                        type="text"
                        value={newChannelEmoji}
                        onChange={(e) => onChangeNewChannelEmoji(e.target.value)}
                        placeholder="Emoji"
                        className="px-3 py-2 rounded-md bg-[#0e1015] border border-white/15 text-xs text-white"
                      />
                      <input
                        type="text"
                        value={newChannelName}
                        onChange={(e) => onChangeNewChannelName(e.target.value)}
                        placeholder="Channel name (e.g. Pixel Art)"
                        required
                        className="sm:col-span-3 px-3 py-2 rounded-md bg-[#0e1015] border border-white/15 text-xs text-white"
                      />
                      <select
                        value={newChannelCategory}
                        onChange={(e) =>
                          onChangeNewChannelCategory(
                            e.target.value as 'INFORMATION' | 'CREATOR SHOWCASES' | 'SOCIAL'
                          )
                        }
                        className="sm:col-span-2 px-3 py-2 rounded-md bg-[#0e1015] border border-white/15 text-xs text-white"
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
                        className="flex-1 px-3 py-2 rounded-md bg-[#0e1015] border border-white/15 text-xs text-white"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-md bg-white text-black font-semibold text-xs cursor-pointer hover:bg-white/90 whitespace-nowrap"
                      >
                        Create Channel
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Channel Permissions */}
                  <section className="space-y-2.5">
                    <h4 className="text-xs font-semibold text-white/80">
                      Channel Permissions · #{activeTargetChannel?.name}
                    </h4>
                    <div className="border border-white/10 rounded-lg bg-[#151820] divide-y divide-white/[0.08]">
                      {[
                        {
                          key: 'isLocked' as const,
                          label: 'Lock Channel',
                          desc: 'Only admins and channel moderators can post',
                          dangerWhenOn: true,
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
                          dangerWhenOn: true,
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
                                  ? perm.dangerWhenOn
                                    ? 'bg-rose-500 text-white'
                                    : 'bg-white text-black'
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
                                  ? 'bg-white text-black font-semibold'
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

                  {/* Right Column: Sub-Groups + Channel Mods & Kicked Users */}
                  <div className="space-y-5">
                    {/* Sub-Groups inside active channel */}
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
                        <div className="py-5 px-3.5 border border-white/10 rounded-lg bg-[#151820] text-xs text-white/45">
                          No sub-groups in #{activeTargetChannel?.name} yet.
                        </div>
                      ) : (
                        <div className="border border-white/10 rounded-lg bg-[#151820] divide-y divide-white/[0.08]">
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
                                  className="p-1.5 rounded-md text-rose-400 hover:bg-rose-500/15 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    {/* Channel Filter for Mods / Access */}
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
                            className="w-full pl-7 pr-2.5 py-1 rounded-md bg-[#151820] border border-white/15 text-[11px] text-white focus:outline-none focus:border-white/40"
                          />
                        </div>
                      </div>

                      <div className="max-h-64 overflow-y-auto hub-scroll border border-white/10 rounded-lg bg-[#151820] divide-y divide-white/[0.08]">
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
                                          ? 'bg-white text-black font-semibold'
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
                                          ? 'bg-rose-500 text-white'
                                          : 'border border-white/15 text-white/65 hover:text-rose-300'
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
                TAB 4: PLATFORM MEMBERS & ROLES (Super Admin Only)
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

                {/* Collapsible Create Member Form */}
                {showCreateMemberForm && (
                  <form
                    onSubmit={(e) => {
                      onCreateMemberProfile(e);
                      setShowCreateMemberForm(false);
                    }}
                    className="p-4 rounded-lg border border-white/15 bg-[#151820] space-y-3"
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
                        className="px-3 py-2 rounded-md bg-[#0e1015] border border-white/15 text-xs text-white"
                      />
                      <input
                        type="text"
                        value={newMemberSchool}
                        onChange={(e) => onChangeNewMemberSchool(e.target.value)}
                        placeholder="School / Club"
                        className="px-3 py-2 rounded-md bg-[#0e1015] border border-white/15 text-xs text-white"
                      />
                      <input
                        type="text"
                        value={newMemberGrade}
                        onChange={(e) => onChangeNewMemberGrade(e.target.value)}
                        placeholder="Grade Level"
                        className="px-3 py-2 rounded-md bg-[#0e1015] border border-white/15 text-xs text-white"
                      />
                      <select
                        value={newMemberRole}
                        onChange={(e) =>
                          onChangeNewMemberRole(e.target.value as 'member' | 'moderator')
                        }
                        className="px-3 py-2 rounded-md bg-[#0e1015] border border-white/15 text-xs text-white"
                      >
                        <option value="member">Member</option>
                        <option value="moderator">Global Moderator</option>
                      </select>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-md bg-white text-black font-semibold text-xs cursor-pointer hover:bg-white/90"
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
                      className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#151820] border border-white/15 text-xs text-white focus:outline-none focus:border-white/40"
                    />
                  </div>

                  <div className="flex items-center gap-1 p-1 rounded-lg bg-[#151820] border border-white/10 overflow-x-auto no-scrollbar">
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
                            ? 'bg-white text-black font-semibold'
                            : 'text-white/60 hover:text-white'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dense Hairline-Divided Members Directory */}
                {filteredMembers.length === 0 ? (
                  <div className="py-10 text-center border border-white/10 rounded-lg bg-[#151820] text-xs text-white/50">
                    No members match the current search or filter.
                  </div>
                ) : (
                  <div className="border border-white/10 rounded-lg bg-[#151820] divide-y divide-white/[0.08]">
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
                              <div className="text-[11px] text-white/50 truncate flex items-center gap-1.5">
                                <span>{isUserApprovedInHub ? 'Hub Member' : 'Public Only'}</span>
                                <span aria-hidden="true">·</span>
                                <span className="truncate">{u.schoolName || 'Build Buds'}</span>
                                {st !== 'active' && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span
                                      className={
                                        st === 'banned' ? 'text-rose-400' : 'text-amber-300'
                                      }
                                    >
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
                                    ? 'bg-white text-black font-semibold'
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
                                      ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
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
                                      ? 'bg-amber-500/20 text-amber-300 font-semibold'
                                      : 'text-white/50 hover:text-amber-300'
                                  }`}
                                >
                                  Suspend
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onUpdateUserAccount(u, { status: 'banned' })}
                                  className={`px-2 py-1 border-l border-white/15 cursor-pointer ${
                                    st === 'banned'
                                      ? 'bg-rose-500/25 text-rose-300 font-semibold'
                                      : 'text-white/50 hover:text-rose-300'
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
                TAB 5: GLOBAL COMMUNITY RULES (Super Admin Only)
                ============================================================== */}
            {normalizedTab === 'global' && isSuperAdmin && (
              <div className="space-y-5 max-w-2xl">
                <div className="pb-4 border-b border-white/10">
                  <h3 className="text-base font-semibold text-white">Global Community Rules</h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    Baseline defaults applied across all Student Hub channels unless overridden.
                  </p>
                </div>

                <div className="border border-white/10 rounded-lg bg-[#151820] divide-y divide-white/[0.08]">
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
                                ? 'bg-white text-black font-semibold'
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
                          ? 'bg-rose-500 text-white'
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
                          ? 'bg-rose-500 text-white'
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
                          ? 'bg-white text-black'
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
