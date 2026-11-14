import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Mail,
  RefreshCw,
  ArrowLeft,
  Users,
  FileText,
  Lock,
  Check,
  BarChart3,
  Layers,
  GraduationCap,
  Flag,
  ExternalLink,
  Trash2,
  Star,
  Plus,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { BrandLogo } from './BrandLogo.tsx';
import {
  db,
  collection,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  BuilderProfile,
  User,
  isSuperAdminUser,
} from '../firebase.ts';
import {
  StudentAccessRequest,
  StudentAccessAdminNote,
  CommunityMembership,
  AdminAuditLog,
  StudentAccessStatus,
  PublicPost,
  DEFAULT_REGISTERED_SCHOOLS,
  SUPPORT_CONTACT_EMAIL,
  SUPPORT_WHATSAPP_DISPLAY,
  SUPPORT_WHATSAPP_URL,
} from '../types/community.ts';
import {
  adminApproveStudentAccess,
  adminUpdateStudentAccessDecision,
  adminRetryStudentNotification,
  adminMigrateLegacyBuilderToStudent,
  adminRevokeStudentHubAccess,
  subscribeToRegisteredSchools,
  moderatePublicPostStatus,
  adminToggleFeaturedPost,
  adminDeletePublicPostPermanently,
  adminAddRegisteredSchool,
  adminRemoveRegisteredSchool,
  ensureValidExternalHref,
  isPlaceholderSchoolName,
} from '../utils/communityService.ts';
import { VerifiedAvatarFrame } from './MentionAndEmotes.tsx';
import { resolveBuilderAvatarUrl } from '../utils/avatars.ts';

interface AdminStudentAccessDashboardProps {
  currentUser: User | null;
  builderProfile: BuilderProfile | null;
  onNavigate: (path: string) => void;
}

type AdminDashboardTab =
  | 'overview'
  | 'posts'
  | 'requests'
  | 'schools'
  | 'reports'
  | 'migration'
  | 'audit';

interface ModerationReportRecord {
  id: string;
  channelId?: string;
  channelName?: string;
  messageId?: string;
  messageSnippet?: string;
  reason?: string;
  reporterUid?: string;
  reporterName?: string;
  status?: 'open' | 'resolved' | string;
  createdAt?: unknown;
}

export const AdminStudentAccessDashboard: React.FC<AdminStudentAccessDashboardProps> = ({
  currentUser,
  builderProfile,
  onNavigate,
}) => {
  const isAdmin = isSuperAdminUser(currentUser, builderProfile);

  const [activeTab, setActiveTab] = useState<AdminDashboardTab>('overview');
  const [requests, setRequests] = useState<StudentAccessRequest[]>([]);
  const [adminNotesMap, setAdminNotesMap] = useState<Record<string, StudentAccessAdminNote>>({});
  const [membershipsMap, setMembershipsMap] = useState<Record<string, CommunityMembership>>({});
  const [allUsers, setAllUsers] = useState<BuilderProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [publicPosts, setPublicPosts] = useState<PublicPost[]>([]);
  const [registeredSchools, setRegisteredSchools] = useState<string[]>(DEFAULT_REGISTERED_SCHOOLS);
  const [moderationReports, setModerationReports] = useState<ModerationReportRecord[]>([]);

  // Verification filters
  const [statusFilter, setStatusFilter] = useState<'all' | StudentAccessStatus>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  // Posts filters
  const [postFilter, setPostFilter] = useState<
    'all' | 'pending_review' | 'published' | 'hidden' | 'removed'
  >('all');
  const [postSearch, setPostSearch] = useState('');

  // Schools state
  const [newSchoolInput, setNewSchoolInput] = useState('');

  // Reports filter
  const [reportFilter, setReportFilter] = useState<'open' | 'resolved' | 'all'>('open');

  // Members filter
  const [memberSearch, setMemberSearch] = useState('');
  const [memberFilter, setMemberFilter] = useState<'all' | 'approved' | 'public_only'>('all');

  // Review form state for the selected applicant
  const [verifiedOfficialCheck, setVerifiedOfficialCheck] = useState(false);
  const [officialRecordRef, setOfficialRecordRef] = useState('');
  const [privateAdminNotes, setPrivateAdminNotes] = useState('');
  const [publicStatusNote, setPublicStatusNote] = useState('');
  const [confirmDecisionModal, setConfirmDecisionModal] = useState<
    null | 'approve' | 'more_information_required' | 'rejected' | 'suspended'
  >(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!isAdmin) return;

    const unsubReqs = onSnapshot(
      collection(db, 'studentAccessRequests'),
      (snap) => {
        const list: StudentAccessRequest[] = [];
        snap.forEach((d) => list.push({ ...(d.data() as StudentAccessRequest), uid: d.id }));
        list.sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt).getTime() -
            new Date(a.updatedAt || a.createdAt).getTime()
        );
        setRequests(list);
      },
      () => {}
    );

    const unsubNotes = onSnapshot(
      collection(db, 'studentAccessAdminNotes'),
      (snap) => {
        const map: Record<string, StudentAccessAdminNote> = {};
        snap.forEach((d) => {
          map[d.id] = d.data() as StudentAccessAdminNote;
        });
        setAdminNotesMap(map);
      },
      () => {}
    );

    const unsubMemberships = onSnapshot(
      collection(db, 'communityMemberships'),
      (snap) => {
        const map: Record<string, CommunityMembership> = {};
        snap.forEach((d) => {
          map[d.id] = d.data() as CommunityMembership;
        });
        setMembershipsMap(map);
      },
      () => {}
    );

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const list: BuilderProfile[] = [];
        snap.forEach((d) => list.push({ ...(d.data() as BuilderProfile), uid: d.id }));
        setAllUsers(list);
      },
      () => {}
    );

    const unsubAudits = onSnapshot(
      query(collection(db, 'adminAuditLogs'), orderBy('createdAt', 'desc')),
      (snap) => {
        const list: AdminAuditLog[] = [];
        snap.forEach((d) => list.push({ ...(d.data() as AdminAuditLog), id: d.id }));
        setAuditLogs(list);
      },
      () => {}
    );

    const unsubPosts = onSnapshot(
      query(collection(db, 'publicPosts'), orderBy('createdAt', 'desc')),
      (snap) => {
        const list: PublicPost[] = [];
        snap.forEach((d) => list.push({ ...(d.data() as PublicPost), id: d.id }));
        setPublicPosts(list);
      },
      () => {}
    );

    const unsubSchools = subscribeToRegisteredSchools((schools) => {
      setRegisteredSchools(schools);
    });

    const unsubReports = onSnapshot(
      collection(db, 'reports'),
      (snap) => {
        const list: ModerationReportRecord[] = [];
        snap.forEach((d) =>
          list.push({ ...(d.data() as Omit<ModerationReportRecord, 'id'>), id: d.id })
        );
        setModerationReports(list);
      },
      () => {}
    );

    return () => {
      unsubReqs();
      unsubNotes();
      unsubMemberships();
      unsubUsers();
      unsubAudits();
      unsubPosts();
      unsubSchools();
      unsubReports();
    };
  }, [isAdmin]);

  const selectedRequest = useMemo(() => {
    if (!selectedUid) return null;
    return requests.find((r) => r.uid === selectedUid) || null;
  }, [requests, selectedUid]);

  // Populate review fields when selecting an applicant
  useEffect(() => {
    if (!selectedRequest) return;
    setVerifiedOfficialCheck(
      selectedRequest.verifiedAgainstOfficialRecords !== undefined
        ? Boolean(selectedRequest.verifiedAgainstOfficialRecords)
        : true
    );
    setPublicStatusNote(selectedRequest.publicStatusNote || '');
    const existingNote = adminNotesMap[selectedRequest.uid];
    setPrivateAdminNotes(existingNote?.privateNotes || '');
    setOfficialRecordRef(
      existingNote?.officialRecordReference || selectedRequest.studentReference || ''
    );
    setConfirmDecisionModal(null);
  }, [selectedRequest?.uid]);

  const resolveUserSchoolName = (u: BuilderProfile): string => {
    const candidates = [
      u.schoolName,
      membershipsMap[u.uid]?.schoolName,
      requests.find((r) => r.uid === u.uid)?.schoolName,
    ];
    for (const c of candidates) {
      if (c && !isPlaceholderSchoolName(c)) return c.trim();
    }
    return '';
  };

  const pendingRequestsCount = useMemo(
    () => requests.filter((r) => r.status === 'pending').length,
    [requests]
  );

  const unapprovedRegisteredUsers = useMemo(() => {
    return allUsers.filter((u) => {
      const m = membershipsMap[u.uid];
      const req = requests.find((r) => r.uid === u.uid);
      const isRejected =
        m?.status === 'revoked' ||
        u.studentAccessStatus === 'rejected' ||
        req?.status === 'rejected';
      return (
        u.role !== 'admin' &&
        u.role !== 'moderator' &&
        m?.status !== 'approved' &&
        !isRejected
      );
    });
  }, [allUsers, membershipsMap, requests]);

  const approvedStudentsCount = useMemo(() => {
    return allUsers.filter((u) => {
      const m = membershipsMap[u.uid];
      return m?.status === 'approved' || u.role === 'admin' || u.role === 'moderator';
    }).length;
  }, [allUsers, membershipsMap]);

  const pendingPosts = useMemo(
    () => publicPosts.filter((p) => p.status === 'pending_review'),
    [publicPosts]
  );
  const publishedPosts = useMemo(
    () => publicPosts.filter((p) => p.status === 'published'),
    [publicPosts]
  );
  const hiddenOrRemovedPosts = useMemo(
    () => publicPosts.filter((p) => p.status === 'hidden' || p.status === 'removed'),
    [publicPosts]
  );
  const openReports = useMemo(
    () => moderationReports.filter((r) => (r.status || 'open') === 'open'),
    [moderationReports]
  );

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const hay = [
          r.fullName,
          r.email,
          r.schoolName,
          r.gradeLevel,
          r.programme,
          r.studentReference || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [requests, statusFilter, searchQuery]);

  const filteredPosts = useMemo(() => {
    return publicPosts.filter((p) => {
      if (postFilter !== 'all' && p.status !== postFilter) return false;
      if (postSearch.trim()) {
        const q = postSearch.toLowerCase().trim();
        const authorSchool = membershipsMap[p.authorId]?.schoolName || '';
        const hay = `${p.title} ${p.authorName} ${p.categoryName} ${authorSchool}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [publicPosts, postFilter, postSearch, membershipsMap]);

  const filteredReports = useMemo(() => {
    return moderationReports.filter((r) => {
      const st = r.status || 'open';
      if (reportFilter !== 'all' && st !== reportFilter) return false;
      return true;
    });
  }, [moderationReports, reportFilter]);

  const filteredMembers = useMemo(() => {
    return allUsers.filter((u) => {
      const m = membershipsMap[u.uid];
      const isApproved =
        m?.status === 'approved' || u.role === 'admin' || u.role === 'moderator';
      if (memberFilter === 'approved' && !isApproved) return false;
      if (memberFilter === 'public_only' && isApproved) return false;
      if (memberSearch.trim()) {
        const q = memberSearch.toLowerCase().trim();
        const school = resolveUserSchoolName(u);
        const hay = `${u.displayName} ${school} ${u.role} ${u.gradeLevel || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allUsers, membershipsMap, requests, memberFilter, memberSearch]);

  // Recharts datasets (2-color palette: #FFF025 and #FFFFFF)
  const platformMetricsChartData = useMemo(
    () => [
      { name: 'Total Users', count: allUsers.length, primary: false },
      { name: 'Hub Students', count: approvedStudentsCount, primary: true },
      { name: 'Pending Access', count: pendingRequestsCount + unapprovedRegisteredUsers.length, primary: true },
      { name: 'Live Posts', count: publishedPosts.length, primary: false },
      { name: 'Pending Posts', count: pendingPosts.length, primary: true },
      { name: 'Revoked Posts', count: hiddenOrRemovedPosts.length, primary: false },
      { name: 'Open Reports', count: openReports.length, primary: true },
    ],
    [
      allUsers.length,
      approvedStudentsCount,
      pendingRequestsCount,
      unapprovedRegisteredUsers.length,
      publishedPosts.length,
      pendingPosts.length,
      hiddenOrRemovedPosts.length,
      openReports.length,
    ]
  );

  const schoolDistributionData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of registeredSchools) {
      counts[s] = 0;
    }
    allUsers.forEach((u) => {
      const raw = resolveUserSchoolName(u);
      if (raw) {
        counts[raw] = (counts[raw] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([school, students]) => ({
        name: school.length > 22 ? `${school.slice(0, 20)}…` : school,
        fullName: school,
        students,
      }))
      .sort((a, b) => b.students - a.students)
      .slice(0, 7);
  }, [registeredSchools, allUsers, membershipsMap, requests]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0D0F14] text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl border border-white/10 bg-[#13161E] p-8 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-lg border border-white/15 bg-white/5 flex items-center justify-center">
            <Lock className="w-6 h-6 text-[#FFF025]" />
          </div>
          <h1 className="text-lg font-bold text-white">Admin Access Required</h1>
          <p className="text-xs text-white/60 leading-relaxed">
            This generalized Admin Control Center is restricted to authorised Jaystarbliss Studios
            administrators.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/community')}
            className="px-5 py-2.5 rounded-lg bg-[#FFF025] text-black text-xs font-bold cursor-pointer"
          >
            Return to Public Community
          </button>
        </div>
      </div>
    );
  }

  const handleExecuteDecision = async () => {
    if (!selectedRequest || !confirmDecisionModal) return;
    setFeedbackBanner(null);
    setIsProcessing(true);

    try {
      if (confirmDecisionModal === 'approve') {
        if (!verifiedOfficialCheck) {
          throw new Error(
            'Please check the confirmation box verifying this student against official Jaystarbliss Studios student records first.'
          );
        }
        const res = await adminApproveStudentAccess({
          targetRequest: selectedRequest,
          verifiedAgainstOfficialRecords: true,
          privateAdminNotes,
          officialRecordReference: officialRecordRef,
          publicStatusNote:
            publicStatusNote.trim() ||
            'Approved! Your Jaystarbliss Studios student membership has been verified. Welcome to the Build Buds Student Hub!',
        });
        setFeedbackBanner({
          type: 'success',
          message: `Approved ${selectedRequest.fullName}! Email notification status: ${res.emailStatus}${
            res.emailError ? ` (${res.emailError})` : ''
          }`,
        });
      } else {
        const defaultNotes: Record<
          'more_information_required' | 'rejected' | 'suspended',
          string
        > = {
          more_information_required:
            'Please provide your full registered school name and Jaystarbliss Studios programme details so we can match your student record.',
          rejected:
            'We could not match the submitted details to an active Jaystarbliss Studios student registration. You can continue using the Public Community.',
          suspended:
            'Your access to the private Student Hub has been suspended by an administrator.',
        };

        const res = await adminUpdateStudentAccessDecision({
          targetRequest: selectedRequest,
          newStatus: confirmDecisionModal,
          publicStatusNote:
            publicStatusNote.trim() || defaultNotes[confirmDecisionModal],
          privateAdminNotes,
          officialRecordReference: officialRecordRef,
        });
        setFeedbackBanner({
          type: 'success',
          message: `Updated ${selectedRequest.fullName} to "${confirmDecisionModal}". Email status: ${res.emailStatus}`,
        });
      }
      setConfirmDecisionModal(null);
    } catch (err) {
      setFeedbackBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Action failed.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetryEmail = async (req: StudentAccessRequest) => {
    setFeedbackBanner(null);
    setIsProcessing(true);
    try {
      const res = await adminRetryStudentNotification(req);
      setFeedbackBanner({
        type: res.emailStatus === 'sent' ? 'success' : 'error',
        message:
          res.emailStatus === 'sent'
            ? `Email notification sent to ${req.email}!`
            : `Email delivery status: ${res.emailStatus} (${res.emailError || 'Check RESEND_API_KEY'})`,
      });
    } catch (err) {
      setFeedbackBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Retry failed.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMigrateSingleUser = async (builder: BuilderProfile) => {
    setFeedbackBanner(null);
    setIsProcessing(true);
    try {
      await adminMigrateLegacyBuilderToStudent(builder);
      setFeedbackBanner({
        type: 'success',
        message: `Approved ${builder.displayName} for the Private Student Hub and posted welcome announcement.`,
      });
    } catch (err) {
      setFeedbackBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Approval failed.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevokeSingleUser = async (builder: BuilderProfile) => {
    setFeedbackBanner(null);
    setIsProcessing(true);
    try {
      await adminRevokeStudentHubAccess(
        builder,
        'Removed from Private Student Hub by Administrator. Account restricted to Public Community.'
      );
      setFeedbackBanner({
        type: 'success',
        message: `Removed ${builder.displayName} from the Private Student Hub.`,
      });
    } catch (err) {
      setFeedbackBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Revoke failed.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePostAction = async (
    post: PublicPost,
    action: 'approve' | 'revoke' | 'remove' | 'feature' | 'delete'
  ) => {
    setFeedbackBanner(null);
    setBusyActionId(`${post.id}:${action}`);
    try {
      if (action === 'approve') {
        await moderatePublicPostStatus({
          post,
          newStatus: 'published',
          reason: 'Approved by Administrator in Admin Control Center',
        });
        setFeedbackBanner({
          type: 'success',
          message: `Approved and published "${post.title}".`,
        });
      } else if (action === 'revoke') {
        await moderatePublicPostStatus({
          post,
          newStatus: 'hidden',
          reason: 'Post visibility revoked/hidden by Administrator',
        });
        setFeedbackBanner({
          type: 'success',
          message: `Revoked "${post.title}" (hidden from public showcase).`,
        });
      } else if (action === 'remove') {
        await moderatePublicPostStatus({
          post,
          newStatus: 'removed',
          reason: 'Post removed by Administrator',
        });
        setFeedbackBanner({
          type: 'success',
          message: `Removed "${post.title}".`,
        });
      } else if (action === 'feature') {
        const nextFeatured = await adminToggleFeaturedPost(post);
        setFeedbackBanner({
          type: 'success',
          message: nextFeatured
            ? `Marked "${post.title}" as Featured.`
            : `Removed "${post.title}" from Featured.`,
        });
      } else if (action === 'delete') {
        await adminDeletePublicPostPermanently(post.id);
        setFeedbackBanner({
          type: 'success',
          message: `Permanently deleted "${post.title}".`,
        });
      }
    } catch (err) {
      setFeedbackBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to update post.',
      });
    } finally {
      setBusyActionId(null);
    }
  };

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolInput.trim()) return;
    setFeedbackBanner(null);
    setBusyActionId('add-school');
    try {
      await adminAddRegisteredSchool(newSchoolInput.trim(), registeredSchools);
      setFeedbackBanner({
        type: 'success',
        message: `Added "${newSchoolInput.trim()}" to the Registered Schools dropdown.`,
      });
      setNewSchoolInput('');
    } catch (err) {
      setFeedbackBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Could not add school.',
      });
    } finally {
      setBusyActionId(null);
    }
  };

  const handleRemoveSchool = async (schoolName: string) => {
    setFeedbackBanner(null);
    setBusyActionId(`remove-school:${schoolName}`);
    try {
      await adminRemoveRegisteredSchool(schoolName, registeredSchools);
      setFeedbackBanner({
        type: 'success',
        message: `Removed "${schoolName}" from the Registered Schools dropdown.`,
      });
    } catch (err) {
      setFeedbackBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Could not remove school.',
      });
    } finally {
      setBusyActionId(null);
    }
  };

  const handleToggleReportResolved = async (report: ModerationReportRecord) => {
    setFeedbackBanner(null);
    setBusyActionId(`report:${report.id}`);
    try {
      const nextStatus = (report.status || 'open') === 'open' ? 'resolved' : 'open';
      await updateDoc(doc(db, 'reports', report.id), {
        status: nextStatus,
      });
      setFeedbackBanner({
        type: 'success',
        message: `Report marked as ${nextStatus}.`,
      });
    } catch (err) {
      setFeedbackBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to update report.',
      });
    } finally {
      setBusyActionId(null);
    }
  };

  const navItems: Array<{
    id: AdminDashboardTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'overview', label: 'Overview & Analytics', icon: BarChart3 },
    {
      id: 'posts',
      label: 'Posts & Moderation',
      icon: Layers,
      badge: pendingPosts.length > 0 ? pendingPosts.length : undefined,
    },
    {
      id: 'requests',
      label: 'Student Verification',
      icon: ShieldCheck,
      badge:
        pendingRequestsCount + unapprovedRegisteredUsers.length > 0
          ? pendingRequestsCount + unapprovedRegisteredUsers.length
          : undefined,
    },
    {
      id: 'schools',
      label: 'Registered Schools',
      icon: GraduationCap,
      badge: registeredSchools.length,
    },
    {
      id: 'reports',
      label: 'Flagged Reports',
      icon: Flag,
      badge: openReports.length > 0 ? openReports.length : undefined,
    },
    {
      id: 'migration',
      label: 'Members & Hub Access',
      icon: Users,
      badge: allUsers.length,
    },
    {
      id: 'audit',
      label: 'Audit Logs',
      icon: FileText,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0D0F14] text-white font-sans flex flex-col">
      {/* Minimalistic 2-Color Admin Top Bar */}
      <header className="bg-[#13161E] border-b border-white/10 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              type="button"
              onClick={() => onNavigate('/community')}
              className="cursor-pointer text-left shrink-0"
            >
              <BrandLogo size="sm" />
            </button>
            <div className="pl-3.5 border-l border-white/10 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-tight truncate">
                  Admin Control Center
                </span>
                <span className="px-2 py-0.5 rounded bg-[#FFF025] text-black text-[10px] font-bold uppercase tracking-wider">
                  Unified Portal
                </span>
              </div>
              <p className="text-[11px] text-white/50 truncate hidden sm:block">
                Analytics, post moderation, student verification, registered schools, and access
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('/community')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-xs font-medium text-white cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Public Community</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/hub')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#FFF025] hover:bg-[#ffe500] text-xs font-bold text-black cursor-pointer transition-colors"
            >
              <span>Open Student Hub</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Navigation Rail */}
        <aside className="w-full lg:w-64 shrink-0 rounded-xl border border-white/10 bg-[#13161E] p-2.5 flex lg:flex-col gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors shrink-0 lg:w-full cursor-pointer ${
                  active
                    ? 'bg-[#FFF025] text-black font-bold'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums ${
                      active ? 'bg-black text-[#FFF025]' : 'bg-white/10 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Main Content Workspace */}
        <main className="flex-1 w-full min-w-0 space-y-6">
          {feedbackBanner && (
            <div className="p-3.5 rounded-lg border border-[#FFF025]/40 bg-[#13161E] text-xs text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FFF025] shrink-0" />
                <span>{feedbackBanner.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackBanner(null)}
                className="text-[11px] font-bold text-[#FFF025] hover:underline shrink-0 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* 1. OVERVIEW & ANALYTICS (Recharts + KPI Grid) */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-base font-bold text-white">Portal Overview &amp; Key Metrics</h1>
                <p className="text-xs text-white/55 mt-0.5">
                  Live telemetry across student verification, public creations, registered schools,
                  and moderation queues.
                </p>
              </div>

              {/* 6 KPI Cells */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  {
                    label: 'Total Accounts',
                    value: allUsers.length,
                    sub: `${approvedStudentsCount} verified Hub`,
                    highlight: false,
                    onClick: () => setActiveTab('migration'),
                  },
                  {
                    label: 'Pending Access',
                    value: pendingRequestsCount + unapprovedRegisteredUsers.length,
                    sub: `${pendingRequestsCount} formal requests`,
                    highlight: pendingRequestsCount + unapprovedRegisteredUsers.length > 0,
                    onClick: () => setActiveTab('requests'),
                  },
                  {
                    label: 'Published Posts',
                    value: publishedPosts.length,
                    sub: `${publicPosts.length} total submissions`,
                    highlight: false,
                    onClick: () => {
                      setPostFilter('published');
                      setActiveTab('posts');
                    },
                  },
                  {
                    label: 'Pending Posts',
                    value: pendingPosts.length,
                    sub: 'Awaiting mod review',
                    highlight: pendingPosts.length > 0,
                    onClick: () => {
                      setPostFilter('pending_review');
                      setActiveTab('posts');
                    },
                  },
                  {
                    label: 'Registered Schools',
                    value: registeredSchools.length,
                    sub: 'Active in dropdown',
                    highlight: false,
                    onClick: () => setActiveTab('schools'),
                  },
                  {
                    label: 'Open Reports',
                    value: openReports.length,
                    sub: `${moderationReports.length} total logged`,
                    highlight: openReports.length > 0,
                    onClick: () => setActiveTab('reports'),
                  },
                ].map((kpi) => (
                  <button
                    key={kpi.label}
                    type="button"
                    onClick={kpi.onClick}
                    className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      kpi.highlight
                        ? 'border-[#FFF025]/60 bg-[#13161E] hover:bg-white/[0.04]'
                        : 'border-white/10 bg-[#13161E] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="text-[11px] font-medium text-white/55 truncate">
                      {kpi.label}
                    </div>
                    <div
                      className={`text-2xl font-bold tabular-nums mt-1 ${
                        kpi.highlight ? 'text-[#FFF025]' : 'text-white'
                      }`}
                    >
                      {kpi.value}
                    </div>
                    <div className="text-[10px] text-white/40 mt-1 truncate">{kpi.sub}</div>
                  </button>
                ))}
              </div>

              {/* Recharts Visualizations (Strictly 2-Color Palette) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-white/10 bg-[#13161E] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                        Platform Activity &amp; Moderation Breakdown
                      </h2>
                      <p className="text-[11px] text-white/45">
                        Yellow bars indicate queues requiring administrator review
                      </p>
                    </div>
                  </div>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={platformMetricsChartData}
                        margin={{ top: 10, right: 12, left: -18, bottom: 0 }}
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
                          tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                          contentStyle={{
                            backgroundColor: '#0D0F14',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '8px',
                            fontSize: '11px',
                            color: '#FFFFFF',
                          }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {platformMetricsChartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.primary ? '#FFF025' : '#FFFFFF'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-white/10 bg-[#13161E] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                        Students by Registered School
                      </h2>
                      <p className="text-[11px] text-white/45">
                        Distribution of student accounts across partner schools
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('schools')}
                      className="text-[11px] font-bold text-[#FFF025] hover:underline cursor-pointer"
                    >
                      Configure Schools
                    </button>
                  </div>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={schoolDistributionData}
                        layout="vertical"
                        margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.07)"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          allowDecimals={false}
                          tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
                          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                          tickLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={130}
                          tick={{ fill: 'rgba(255,255,255,0.75)', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                          contentStyle={{
                            backgroundColor: '#0D0F14',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '8px',
                            fontSize: '11px',
                            color: '#FFFFFF',
                          }}
                        />
                        <Bar dataKey="students" fill="#FFF025" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. POSTS & SHOWCASE MODERATION */}
          {activeTab === 'posts' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-base font-bold text-white">
                    Public Showcase Posts &amp; Moderation
                  </h1>
                  <p className="text-xs text-white/55 mt-0.5">
                    Approve pending creations, revoke (hide) published posts, remove posts, or
                    verify project links.
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={postSearch}
                    onChange={(e) => setPostSearch(e.target.value)}
                    placeholder="Search title, student, school..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-white/15 bg-[#13161E] text-xs text-white placeholder:text-white/35 focus:outline-none focus:border-[#FFF025]"
                  />
                </div>
              </div>

              {/* Filter Bar */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'all', label: `All (${publicPosts.length})` },
                    { id: 'pending_review', label: `Pending Review (${pendingPosts.length})` },
                    { id: 'published', label: `Published (${publishedPosts.length})` },
                    {
                      id: 'hidden',
                      label: `Revoked / Hidden (${
                        publicPosts.filter((p) => p.status === 'hidden').length
                      })`,
                    },
                    {
                      id: 'removed',
                      label: `Removed (${
                        publicPosts.filter((p) => p.status === 'removed').length
                      })`,
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPostFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      postFilter === tab.id
                        ? 'bg-[#FFF025] text-black border-[#FFF025] font-bold'
                        : 'bg-[#13161E] text-white/70 border-white/10 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {filteredPosts.length === 0 ? (
                <div className="p-8 rounded-lg border border-white/10 bg-[#13161E] text-center text-xs text-white/50">
                  No posts match the current filter.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredPosts.map((post) => {
                    const thumb = post.media?.[0]?.secureUrl || '';
                    const gameHref = ensureValidExternalHref(post.gameUrl);
                    const websiteHref = ensureValidExternalHref(post.websiteUrl);
                    const sourceHref = ensureValidExternalHref(post.githubUrl);
                    return (
                      <div
                        key={post.id}
                        className="p-4 rounded-lg border border-white/10 bg-[#13161E] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={post.title}
                              className="w-16 h-12 rounded object-cover border border-white/10 shrink-0 bg-black"
                            />
                          ) : (
                            <div className="w-16 h-12 rounded border border-white/10 bg-white/5 flex items-center justify-center text-[10px] text-white/40 shrink-0">
                              No Img
                            </div>
                          )}
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-white truncate">
                                {post.title}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  post.status === 'pending_review'
                                    ? 'bg-[#FFF025] text-black'
                                    : post.status === 'published'
                                      ? 'bg-white/15 text-white'
                                      : 'bg-white/5 text-white/50 border border-white/10'
                                }`}
                              >
                                {post.status === 'hidden' ? 'revoked' : post.status}
                              </span>
                              {post.isFeatured && (
                                <span className="px-2 py-0.5 rounded bg-[#FFF025]/20 text-[#FFF025] text-[10px] font-bold">
                                  Featured
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-white/60 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span>By {post.authorName}</span>
                              {membershipsMap[post.authorId]?.schoolName &&
                                !isPlaceholderSchoolName(
                                  membershipsMap[post.authorId]?.schoolName
                                ) && (
                                  <span>• {membershipsMap[post.authorId]?.schoolName}</span>
                                )}
                              <span>• Category: {post.categoryName}</span>
                            </div>

                            {/* Verified Non-Broken Links Row */}
                            <div className="flex flex-wrap items-center gap-3 pt-1">
                              <button
                                type="button"
                                onClick={() => onNavigate(`/community/posts/${post.id}`)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#FFF025] hover:underline cursor-pointer"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Open Post Page</span>
                              </button>
                              {gameHref && (
                                <a
                                  href={gameHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-white/75 hover:text-white underline"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Game Link</span>
                                </a>
                              )}
                              {websiteHref && websiteHref !== gameHref && (
                                <a
                                  href={websiteHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-white/75 hover:text-white underline"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Website Link</span>
                                </a>
                              )}
                              {sourceHref && (
                                <a
                                  href={sourceHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-white/75 hover:text-white underline"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Source Code</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Moderation Actions */}
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          {post.status !== 'published' && (
                            <button
                              type="button"
                              disabled={busyActionId !== null}
                              onClick={() => handlePostAction(post, 'approve')}
                              className="px-2.5 py-1.5 rounded bg-[#FFF025] text-black text-xs font-bold hover:bg-[#ffe500] cursor-pointer"
                            >
                              Approve
                            </button>
                          )}
                          {post.status === 'published' && (
                            <button
                              type="button"
                              disabled={busyActionId !== null}
                              onClick={() => handlePostAction(post, 'revoke')}
                              className="px-2.5 py-1.5 rounded border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-medium cursor-pointer"
                            >
                              Revoke (Hide)
                            </button>
                          )}
                          {post.status !== 'removed' && (
                            <button
                              type="button"
                              disabled={busyActionId !== null}
                              onClick={() => handlePostAction(post, 'remove')}
                              className="px-2.5 py-1.5 rounded border border-white/15 bg-white/5 hover:bg-white/10 text-white/80 text-xs font-medium cursor-pointer"
                            >
                              Remove
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busyActionId !== null}
                            onClick={() => handlePostAction(post, 'feature')}
                            className={`px-2.5 py-1.5 rounded border text-xs font-medium inline-flex items-center gap-1 cursor-pointer ${
                              post.isFeatured
                                ? 'border-[#FFF025] text-[#FFF025] bg-[#FFF025]/10'
                                : 'border-white/15 text-white/70 hover:text-white'
                            }`}
                          >
                            <Star className="w-3 h-3" />
                            <span>{post.isFeatured ? 'Unfeature' : 'Feature'}</span>
                          </button>
                          <button
                            type="button"
                            disabled={busyActionId !== null}
                            onClick={() => handlePostAction(post, 'delete')}
                            title="Delete Permanently"
                            className="p-1.5 rounded border border-white/10 text-white/50 hover:text-white hover:border-white/30 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 3. STUDENT VERIFICATION & ACCESS REQUESTS */}
          {activeTab === 'requests' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Requests List */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 rounded-lg border border-white/10 bg-[#13161E] space-y-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search student name, email, school..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-white/15 bg-[#0D0F14] text-white placeholder:text-white/35 focus:outline-none focus:border-[#FFF025]"
                    />
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {(
                      [
                        { id: 'pending', label: 'Pending' },
                        { id: 'more_information_required', label: 'More Info' },
                        { id: 'approved', label: 'Approved' },
                        { id: 'rejected', label: 'Rejected' },
                        { id: 'suspended', label: 'Suspended' },
                        { id: 'all', label: 'All' },
                      ] as const
                    ).map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setStatusFilter(st.id)}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer ${
                          statusFilter === st.id
                            ? 'bg-[#FFF025] text-black font-bold'
                            : 'bg-white/5 text-white/65 hover:text-white'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {filteredRequests.length === 0 ? (
                    <div className="p-6 rounded-lg border border-white/10 bg-[#13161E] text-center text-xs text-white/50">
                      No student access requests match this filter.
                    </div>
                  ) : (
                    filteredRequests.map((req) => {
                      const isSelected = req.uid === selectedUid;
                      return (
                        <div
                          key={req.uid}
                          onClick={() => setSelectedUid(req.uid)}
                          className={`p-3.5 rounded-lg border cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-[#FFF025] bg-[#13161E]'
                              : 'border-white/10 bg-[#13161E] hover:border-white/25'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-xs font-bold text-white">{req.fullName}</div>
                              <div className="text-[11px] text-white/55">{req.email}</div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                req.status === 'pending'
                                  ? 'bg-[#FFF025] text-black'
                                  : req.status === 'approved'
                                    ? 'bg-white/15 text-white'
                                    : 'bg-white/5 text-white/50'
                              }`}
                            >
                              {req.status}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-white/80 font-medium">
                            {req.schoolName} • {req.gradeLevel}
                          </div>
                          <div className="text-[11px] text-white/50 truncate mt-0.5">
                            Programme: {req.programme}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Unapproved Registered Accounts Quick Queue */}
                {unapprovedRegisteredUsers.length > 0 && (
                  <div className="p-4 rounded-lg border border-white/10 bg-[#13161E] space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#FFF025]">
                        Unreviewed Sign-ups ({unapprovedRegisteredUsers.length})
                      </span>
                      <span className="text-[10px] text-white/45">
                        Public-only until approved
                      </span>
                    </div>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {unapprovedRegisteredUsers.map((u) => {
                        const school = resolveUserSchoolName(u);
                        return (
                          <div
                            key={u.uid}
                            className="p-2.5 rounded-lg border border-white/10 bg-[#0D0F14] flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <VerifiedAvatarFrame
                                src={resolveBuilderAvatarUrl(u.avatarUrl, u.uid)}
                                alt={u.displayName}
                                isVerified={false}
                                sizeClass="w-7 h-7"
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white truncate">
                                  {u.displayName}
                                </div>
                                <div className="text-[10px] text-white/55 truncate">
                                  {school || 'No registered school selected'}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleMigrateSingleUser(u)}
                                className="px-2.5 py-1 rounded bg-[#FFF025] text-black text-[11px] font-bold cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleRevokeSingleUser(u)}
                                className="px-2.5 py-1 rounded border border-white/15 text-white/70 hover:text-white text-[11px] font-medium cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Detailed Official Verification Panel */}
              <div className="lg:col-span-7">
                {!selectedRequest ? (
                  <div className="p-10 rounded-lg border border-white/10 bg-[#13161E] text-center space-y-2">
                    <ShieldCheck className="w-8 h-8 mx-auto text-[#FFF025]" />
                    <div className="text-sm font-bold text-white">
                      Select an Application to Verify
                    </div>
                    <p className="text-xs text-white/55 max-w-md mx-auto">
                      Click any student application on the left to cross-check their details against
                      official Jaystarbliss Studios student records and approve or reject access.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-white/10 bg-[#13161E] p-6 space-y-5">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#FFF025]">
                          Applicant Verification File
                        </span>
                        <h2 className="text-lg font-bold text-white mt-0.5">
                          {selectedRequest.fullName}
                        </h2>
                        <p className="text-xs text-white/55">
                          {selectedRequest.email} • UID: {selectedRequest.uid}
                        </p>
                      </div>

                      {/* Email Delivery Status Badge + Retry */}
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-white/15 bg-[#0D0F14] text-[11px] text-white/80">
                          <Mail className="w-3 h-3 text-[#FFF025]" />
                          <span>
                            Email: {selectedRequest.emailNotificationStatus || 'idle'}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleRetryEmail(selectedRequest)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FFF025] hover:underline cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Send / Retry Notification Email</span>
                        </button>
                      </div>
                    </div>

                    {/* Submitted Student Information */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-lg bg-[#0D0F14] border border-white/10 text-xs">
                      <div>
                        <span className="text-[10px] uppercase text-white/45 block">
                          Registered School Name
                        </span>
                        <span className="font-bold text-white mt-0.5 block">
                          {selectedRequest.schoolName}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-white/45 block">
                          Class / Grade
                        </span>
                        <span className="font-bold text-white mt-0.5 block">
                          {selectedRequest.gradeLevel}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-white/45 block">
                          Registered Jaystarbliss Programme
                        </span>
                        <span className="font-bold text-white mt-0.5 block">
                          {selectedRequest.programme}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-white/45 block">
                          Student Reference / ID
                        </span>
                        <span className="font-bold text-white mt-0.5 block">
                          {selectedRequest.studentReference || 'None provided'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-white/45 block">
                          Accuracy Declaration Confirmed
                        </span>
                        <span className="font-bold text-[#FFF025] mt-0.5 block">
                          {selectedRequest.confirmedDeclaration ? 'Yes (Confirmed)' : 'No'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-white/45 block">
                          Submitted At
                        </span>
                        <span className="font-bold text-white mt-0.5 block">
                          {new Date(selectedRequest.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Official Record Verification Boundary Section */}
                    <div className="p-4 rounded-lg bg-[#0D0F14] border border-white/10 space-y-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-[#FFF025]" />
                        <span>Official Jaystarbliss Studios Record Check</span>
                      </div>

                      <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg bg-[#13161E] border border-white/10">
                        <input
                          type="checkbox"
                          checked={verifiedOfficialCheck}
                          onChange={(e) => setVerifiedOfficialCheck(e.target.checked)}
                          className="mt-0.5 w-4 h-4 accent-[#FFF025]"
                        />
                        <span className="text-xs text-white/90 leading-snug">
                          I confirm that I have cross-checked this applicant against official
                          Jaystarbliss Studios student registration records and verified they are an
                          active student.
                        </span>
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase text-white/50 mb-1">
                            Official Roster Reference ID (Optional)
                          </label>
                          <input
                            type="text"
                            value={officialRecordRef}
                            onChange={(e) => setOfficialRecordRef(e.target.value)}
                            placeholder="e.g. JBS-ROSTER-2026-88"
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-white/15 bg-[#13161E] text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase text-white/50 mb-1">
                            Private Admin Notes (Internal Only)
                          </label>
                          <input
                            type="text"
                            value={privateAdminNotes}
                            onChange={(e) => setPrivateAdminNotes(e.target.value)}
                            placeholder="Internal verification note..."
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-white/15 bg-[#13161E] text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase text-white/50 mb-1">
                          Message to Student (Included in Status Page &amp; Email)
                        </label>
                        <textarea
                          rows={2}
                          value={publicStatusNote}
                          onChange={(e) => setPublicStatusNote(e.target.value)}
                          placeholder="Optional message or instructions for the student..."
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-white/15 bg-[#13161E] text-white"
                        />
                      </div>
                    </div>

                    {/* Decision Buttons & Confirmation Prompt */}
                    {confirmDecisionModal ? (
                      <div className="p-4 rounded-lg bg-[#0D0F14] border border-[#FFF025] space-y-3">
                        <div className="text-xs font-bold text-[#FFF025] uppercase">
                          Confirm Decision: {confirmDecisionModal.replace(/_/g, ' ')} for{' '}
                          {selectedRequest.fullName}?
                        </div>
                        <p className="text-xs text-white/75 leading-relaxed">
                          {confirmDecisionModal === 'approve'
                            ? `This will grant ${selectedRequest.fullName} access to the private Build Buds Student Hub, create their communityMemberships record, and dispatch the approval email to ${selectedRequest.email}.`
                            : `This will update ${selectedRequest.fullName}'s status to "${confirmDecisionModal}", restrict private Student Hub access, and notify them.`}
                        </p>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={handleExecuteDecision}
                            className="px-4 py-2 rounded-lg bg-[#FFF025] text-black text-xs font-bold cursor-pointer"
                          >
                            {isProcessing ? 'Processing...' : 'Confirm & Send Notification'}
                          </button>
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => setConfirmDecisionModal(null)}
                            className="px-3.5 py-2 rounded-lg border border-white/15 text-white text-xs font-medium cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmDecisionModal('approve')}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FFF025] hover:bg-[#ffe500] text-black text-xs font-bold cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve Student Access</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setConfirmDecisionModal('more_information_required')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-medium cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Request More Info</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setConfirmDecisionModal('rejected')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-white/80 text-xs font-medium cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setConfirmDecisionModal('suspended')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-white/60 text-xs font-medium cursor-pointer"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Suspend Hub Access</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. REGISTERED SCHOOLS CONFIGURATION */}
          {activeTab === 'schools' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-base font-bold text-white">
                  Registered Partner Schools Configuration
                </h1>
                <p className="text-xs text-white/55 mt-0.5">
                  Configure the official list of schools displayed in the student registration,
                  profile settings, and Private Student Hub access request dropdowns.
                </p>
              </div>

              <form
                onSubmit={handleAddSchool}
                className="p-4 rounded-lg border border-white/10 bg-[#13161E] flex flex-col sm:flex-row gap-2.5"
              >
                <input
                  type="text"
                  value={newSchoolInput}
                  onChange={(e) => setNewSchoolInput(e.target.value)}
                  placeholder="Enter official school or academy name to add to student dropdown..."
                  className="flex-1 px-3.5 py-2 rounded-lg border border-white/15 bg-[#0D0F14] text-xs text-white placeholder:text-white/35 focus:outline-none focus:border-[#FFF025]"
                />
                <button
                  type="submit"
                  disabled={!newSchoolInput.trim() || busyActionId === 'add-school'}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#FFF025] text-black text-xs font-bold hover:bg-[#ffe500] disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add School to Dropdown</span>
                </button>
              </form>

              <div className="rounded-lg border border-white/10 bg-[#13161E] divide-y divide-white/10">
                {registeredSchools.map((school, idx) => {
                  const studentCount = allUsers.filter(
                    (u) => resolveUserSchoolName(u).toLowerCase() === school.toLowerCase()
                  ).length;
                  return (
                    <div
                      key={school}
                      className="p-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[11px] font-bold text-white/60 tabular-nums shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{school}</div>
                          <div className="text-[11px] text-white/45 tabular-nums">
                            {studentCount} registered student{studentCount === 1 ? '' : 's'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={
                          registeredSchools.length <= 1 ||
                          busyActionId === `remove-school:${school}`
                        }
                        onClick={() => handleRemoveSchool(school)}
                        className="px-2.5 py-1 rounded border border-white/10 text-white/60 hover:text-white hover:border-white/30 text-[11px] font-medium disabled:opacity-30 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 rounded-lg border border-white/10 bg-[#13161E] text-xs text-white/65 space-y-1">
                <div className="font-bold text-white">
                  Student Support Notice Shown on Forms:
                </div>
                <p>
                  Students whose school is not listed in the dropdown are instructed to contact
                  support at{' '}
                  <a
                    href={`mailto:${SUPPORT_CONTACT_EMAIL}`}
                    className="text-[#FFF025] underline font-semibold"
                  >
                    {SUPPORT_CONTACT_EMAIL}
                  </a>{' '}
                  or{' '}
                  <a
                    href={SUPPORT_WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FFF025] underline font-semibold"
                  >
                    {SUPPORT_WHATSAPP_DISPLAY} on WhatsApp
                  </a>{' '}
                  for more details.
                </p>
              </div>
            </div>
          )}

          {/* 5. FLAGGED REPORTS */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-base font-bold text-white">Flagged Moderation Reports</h1>
                  <p className="text-xs text-white/55 mt-0.5">
                    Review messages and user reports flagged across all channels.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {(['open', 'resolved', 'all'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setReportFilter(f)}
                      className={`px-3 py-1 rounded text-xs font-medium capitalize cursor-pointer ${
                        reportFilter === f
                          ? 'bg-[#FFF025] text-black font-bold'
                          : 'bg-[#13161E] text-white/65 border border-white/10'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {filteredReports.length === 0 ? (
                <div className="p-8 rounded-lg border border-white/10 bg-[#13161E] text-center text-xs text-white/50">
                  No flagged reports in this view.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredReports.map((rep) => {
                    const isOpen = (rep.status || 'open') === 'open';
                    return (
                      <div
                        key={rep.id}
                        className="p-4 rounded-lg border border-white/10 bg-[#13161E] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">
                              #{rep.channelName || rep.channelId || 'general-chat'}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                isOpen
                                  ? 'bg-[#FFF025] text-black'
                                  : 'bg-white/10 text-white/60'
                              }`}
                            >
                              {isOpen ? 'Open' : 'Resolved'}
                            </span>
                          </div>
                          <p className="text-xs text-white/80">
                            {rep.reason ||
                              rep.messageSnippet ||
                              'Reported by community member for moderator review'}
                          </p>
                          {rep.reporterName && (
                            <p className="text-[11px] text-white/45">
                              Flagged by: {rep.reporterName}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => onNavigate('/hub')}
                            className="px-3 py-1.5 rounded border border-white/15 text-xs font-medium text-white hover:bg-white/5 cursor-pointer"
                          >
                            Open Hub Channel
                          </button>
                          <button
                            type="button"
                            disabled={busyActionId === `report:${rep.id}`}
                            onClick={() => handleToggleReportResolved(rep)}
                            className="px-3 py-1.5 rounded bg-[#FFF025] text-black text-xs font-bold cursor-pointer"
                          >
                            {isOpen ? 'Mark Resolved' : 'Reopen'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 6. MEMBERS & HUB ACCESS */}
          {activeTab === 'migration' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-base font-bold text-white">
                    Manage All Accounts &amp; Private Student Hub Access
                  </h1>
                  <p className="text-xs text-white/55 mt-0.5">
                    Grant or revoke Private Student Hub access and view each student&apos;s
                    verified school name.
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search member or school..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-white/15 bg-[#13161E] text-xs text-white placeholder:text-white/35 focus:outline-none focus:border-[#FFF025]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: 'all', label: `All Accounts (${allUsers.length})` },
                    { id: 'approved', label: `Approved Hub Students (${approvedStudentsCount})` },
                    {
                      id: 'public_only',
                      label: `Public Only (${allUsers.length - approvedStudentsCount})`,
                    },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setMemberFilter(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                      memberFilter === t.id
                        ? 'bg-[#FFF025] text-black border-[#FFF025] font-bold'
                        : 'bg-[#13161E] text-white/70 border-white/10 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="rounded-lg border border-white/10 bg-[#13161E] divide-y divide-white/10">
                {filteredMembers.map((u) => {
                  const membership = membershipsMap[u.uid];
                  const isApproved =
                    membership?.status === 'approved' ||
                    u.role === 'admin' ||
                    u.role === 'moderator';
                  const schoolName = resolveUserSchoolName(u);
                  return (
                    <div
                      key={u.uid}
                      className="p-3.5 flex flex-wrap items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <VerifiedAvatarFrame
                          src={resolveBuilderAvatarUrl(u.avatarUrl, u.uid)}
                          alt={u.displayName}
                          isVerified={isApproved}
                          sizeClass="w-9 h-9"
                          ringPaddingClass="p-[2px]"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold flex flex-wrap items-center gap-2">
                            <span className="text-white">{u.displayName}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                isApproved
                                  ? 'bg-[#FFF025] text-black'
                                  : 'bg-white/10 text-white/65'
                              }`}
                            >
                              {isApproved ? 'Verified Hub Student' : 'Public Only'}
                            </span>
                          </div>
                          <div className="text-[11px] text-white/55 mt-0.5">
                            School: <strong className="text-white/85">{schoolName || 'Not set'}</strong>{' '}
                            • Grade: {u.gradeLevel || 'Not set'} • Role: {u.role}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {isApproved ? (
                          <>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-white/15 bg-white/5 text-white/80 text-[11px] font-medium">
                              <Check className="w-3 h-3 text-[#FFF025]" />
                              <span>Hub Active</span>
                            </span>
                            {u.role !== 'admin' && (
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleRevokeSingleUser(u)}
                                className="px-3 py-1 rounded border border-white/15 hover:border-white/35 text-white/75 hover:text-white text-[11px] font-medium cursor-pointer"
                              >
                                Revoke Hub
                              </button>
                            )}
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleMigrateSingleUser(u)}
                            className="px-3.5 py-1.5 rounded bg-[#FFF025] hover:bg-[#ffe500] text-black text-xs font-bold cursor-pointer"
                          >
                            Approve for Student Hub
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 7. ADMIN AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div>
                <h1 className="text-base font-bold text-white">Administrator Audit Trail</h1>
                <p className="text-xs text-white/55 mt-0.5">
                  Chronological record of student verifications, post moderation, and school list
                  updates.
                </p>
              </div>
              {auditLogs.length === 0 ? (
                <div className="p-8 rounded-lg border border-white/10 bg-[#13161E] text-center text-xs text-white/50">
                  No audit logs recorded yet.
                </div>
              ) : (
                <div className="rounded-lg border border-white/10 bg-[#13161E] divide-y divide-white/10">
                  {auditLogs.map((log, idx) => (
                    <div
                      key={log.id || idx}
                      className="p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-white uppercase">
                          {log.action.replace(/_/g, ' ')} — {log.targetName}{' '}
                          {log.targetEmail ? `(${log.targetEmail})` : ''}
                        </div>
                        <div className="text-white/65">
                          Note: {log.reason || 'Standard administrator action'}
                        </div>
                        <div className="text-[11px] text-white/40">
                          By: {log.adminEmail} • Official Check:{' '}
                          {log.verifiedAgainstOfficialRecords ? 'Yes' : 'No'}
                        </div>
                      </div>
                      <div className="text-[11px] text-white/50 tabular-nums">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
