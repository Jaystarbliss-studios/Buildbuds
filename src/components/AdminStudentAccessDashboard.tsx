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
} from 'lucide-react';
import { BrandLogo } from './BrandLogo.tsx';
import {
  db,
  collection,
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
} from '../types/community.ts';
import {
  adminApproveStudentAccess,
  adminUpdateStudentAccessDecision,
  adminRetryStudentNotification,
  adminMigrateLegacyBuilderToStudent,
  adminRevokeStudentHubAccess,
} from '../utils/communityService.ts';
import { VerifiedAvatarFrame } from './MentionAndEmotes.tsx';
import { resolveBuilderAvatarUrl } from '../utils/avatars.ts';

interface AdminStudentAccessDashboardProps {
  currentUser: User | null;
  builderProfile: BuilderProfile | null;
  onNavigate: (path: string) => void;
}

export const AdminStudentAccessDashboard: React.FC<AdminStudentAccessDashboardProps> = ({
  currentUser,
  builderProfile,
  onNavigate,
}) => {
  const isAdmin = isSuperAdminUser(currentUser, builderProfile);

  const [activeTab, setActiveTab] = useState<'requests' | 'migration' | 'audit'>('requests');
  const [requests, setRequests] = useState<StudentAccessRequest[]>([]);
  const [adminNotesMap, setAdminNotesMap] = useState<Record<string, StudentAccessAdminNote>>({});
  const [membershipsMap, setMembershipsMap] = useState<Record<string, CommunityMembership>>({});
  const [allUsers, setAllUsers] = useState<BuilderProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  const [statusFilter, setStatusFilter] = useState<'all' | StudentAccessStatus>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  // Review form state for the selected applicant
  const [verifiedOfficialCheck, setVerifiedOfficialCheck] = useState(false);
  const [officialRecordRef, setOfficialRecordRef] = useState('');
  const [privateAdminNotes, setPrivateAdminNotes] = useState('');
  const [publicStatusNote, setPublicStatusNote] = useState('');
  const [confirmDecisionModal, setConfirmDecisionModal] = useState<
    null | 'approve' | 'more_information_required' | 'rejected' | 'suspended'
  >(null);

  const [isProcessing, setIsProcessing] = useState(false);
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
          (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
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

    return () => {
      unsubReqs();
      unsubNotes();
      unsubMemberships();
      unsubUsers();
      unsubAudits();
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

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] text-black flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl border-3 border-black bg-white p-8 text-center brand-shadow space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl border-2 border-black bg-rose-100 flex items-center justify-center">
            <Lock className="w-7 h-7 text-rose-700" />
          </div>
          <h1 className="font-chewy text-3xl text-black">Admin Access Required</h1>
          <p className="text-sm text-slate-700">
            This Student Verification Control Panel is restricted to authorised Jaystarbliss Studios
            administrators.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/community')}
            className="px-5 py-2.5 rounded-xl border-2 border-black bg-[#FFF025] text-black text-xs font-black brand-shadow-sm cursor-pointer"
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
        message: `Approved ${builder.displayName} for the Private Student Hub and posted welcome announcement in #general-chat and #announcements!`,
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
        message: `Removed ${builder.displayName} from the Private Student Hub. They can now only access the Public Community.`,
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

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const unapprovedRegisteredUsers = allUsers.filter((u) => {
    const m = membershipsMap[u.uid];
    return u.role !== 'admin' && u.role !== 'moderator' && m?.status !== 'approved';
  });

  return (
    <div className="min-h-screen bg-[#FFFDF5] text-black font-sans flex flex-col">
      {/* Admin Header */}
      <header className="bg-black text-white border-b-3 border-black sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate('/community')}
              className="cursor-pointer text-left"
            >
              <BrandLogo size="md" />
            </button>
            <div className="hidden sm:block pl-4 border-l border-white/20">
              <div className="text-[11px] font-black uppercase tracking-wider text-[#FFF025]">
                Jaystarbliss Studios Admin
              </div>
              <div className="font-chewy text-xl text-white">
                Student Verification & Access Control
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigate('/community')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 border-white/20 bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Public Community</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/hub')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-black bg-[#FFF025] text-xs font-black text-black cursor-pointer"
            >
              <span>Open Student Hub</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Mode Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-black text-xs sm:text-sm font-black cursor-pointer ${
                activeTab === 'requests'
                  ? 'bg-[#FFF025] text-black brand-shadow-sm'
                  : 'bg-white text-slate-800 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Verification Applications ({requests.length})</span>
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#B11469] text-white text-[11px]">
                  {pendingCount} Pending
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('migration')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-black text-xs sm:text-sm font-black cursor-pointer ${
                activeTab === 'migration'
                  ? 'bg-[#FFF025] text-black brand-shadow-sm'
                  : 'bg-white text-slate-800 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Manage All Accounts & Hub Access ({allUsers.length})</span>
              {unapprovedRegisteredUsers.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-300 text-black border border-black text-[11px]">
                  {unapprovedRegisteredUsers.length} Unapproved
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-black text-xs sm:text-sm font-black cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-[#FFF025] text-black brand-shadow-sm'
                  : 'bg-white text-slate-800 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Admin Audit Logs ({auditLogs.length})</span>
            </button>
          </div>
        </div>

        {feedbackBanner && (
          <div
            className={`p-4 rounded-2xl border-2 border-black text-xs sm:text-sm font-bold flex items-center justify-between ${
              feedbackBanner.type === 'success'
                ? 'bg-emerald-100 text-emerald-950'
                : 'bg-rose-100 text-rose-950'
            }`}
          >
            <span>{feedbackBanner.message}</span>
            <button
              type="button"
              onClick={() => setFeedbackBanner(null)}
              className="underline font-black ml-4 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Requests List */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 rounded-2xl border-2 border-black bg-white space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search student name, email, school..."
                    className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border-2 border-black bg-white"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
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
                      className={`px-2.5 py-1 rounded-lg border border-black text-[11px] font-black cursor-pointer ${
                        statusFilter === st.id
                          ? 'bg-black text-[#FFF025]'
                          : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5 max-h-[68vh] overflow-y-auto pr-1">
                {filteredRequests.length === 0 ? (
                  <div className="p-8 rounded-2xl border-2 border-black bg-white text-center text-xs text-slate-600 font-bold">
                    No student access requests match this filter.
                  </div>
                ) : (
                  filteredRequests.map((req) => {
                    const isSelected = req.uid === selectedUid;
                    return (
                      <div
                        key={req.uid}
                        onClick={() => setSelectedUid(req.uid)}
                        className={`p-4 rounded-2xl border-2 border-black cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#FFF025] brand-shadow-sm'
                            : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-black text-black">{req.fullName}</div>
                            <div className="text-xs text-slate-700 font-medium">{req.email}</div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-md border border-black text-[10px] font-black uppercase ${
                              req.status === 'approved'
                                ? 'bg-emerald-300 text-black'
                                : req.status === 'pending'
                                  ? 'bg-amber-200 text-black'
                                  : 'bg-rose-200 text-black'
                            }`}
                          >
                            {req.status}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-slate-800 font-semibold">
                          {req.schoolName} • {req.gradeLevel}
                        </div>
                        <div className="text-[11px] text-slate-600 truncate mt-0.5">
                          Programme: {req.programme}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Unapproved Registered Accounts Quick Queue */}
              {unapprovedRegisteredUsers.length > 0 && (
                <div className="p-4 rounded-2xl border-2 border-black bg-[#FFFDF5] space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-[#B11469]">
                      Unapproved Accounts ({unapprovedRegisteredUsers.length})
                    </span>
                    <span className="text-[10px] font-bold text-slate-600">
                      Hidden from Private Chat until approved
                    </span>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {unapprovedRegisteredUsers.map((u) => (
                      <div
                        key={u.uid}
                        className="p-3 rounded-xl border-2 border-black bg-white flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <VerifiedAvatarFrame
                            src={resolveBuilderAvatarUrl(u.avatarUrl, u.uid)}
                            alt={u.displayName}
                            isVerified={false}
                            sizeClass="w-8 h-8"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-black text-black truncate">
                              {u.displayName}
                            </div>
                            <div className="text-[10px] text-slate-600 truncate">
                              {u.schoolName || 'Public Member'}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleMigrateSingleUser(u)}
                          className="px-3 py-1.5 rounded-lg border-2 border-black bg-[#FFF025] hover:bg-[#ffe500] text-black text-[11px] font-black shrink-0 cursor-pointer"
                        >
                          Approve
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Detailed Official Verification Panel */}
            <div className="lg:col-span-7">
              {!selectedRequest ? (
                <div className="p-12 rounded-3xl border-3 border-black bg-white text-center brand-shadow space-y-2">
                  <ShieldCheck className="w-10 h-10 mx-auto text-[#B11469]" />
                  <div className="font-chewy text-2xl text-black">
                    Select an Application to Verify
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                    Click any student application on the left to cross-check their details against
                    official Jaystarbliss Studios student records and approve or reject access.
                  </p>
                </div>
              ) : (
                <div className="rounded-3xl border-3 border-black bg-white p-6 sm:p-8 brand-shadow space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-black pb-4">
                    <div>
                      <span className="text-[11px] font-black uppercase text-[#B11469]">
                        Applicant Verification File
                      </span>
                      <h2 className="font-chewy text-3xl text-black">
                        {selectedRequest.fullName}
                      </h2>
                      <p className="text-xs font-bold text-slate-600">
                        {selectedRequest.email} • UID: {selectedRequest.uid}
                      </p>
                    </div>

                    {/* Email Delivery Status Badge + Retry */}
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border-2 border-black bg-slate-100 text-xs font-black">
                        <Mail className="w-3.5 h-3.5" />
                        <span>
                          Email: {selectedRequest.emailNotificationStatus || 'idle'}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleRetryEmail(selectedRequest)}
                        className="inline-flex items-center gap-1 text-[11px] font-black text-[#B11469] underline cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Send / Retry Notification Email</span>
                      </button>
                    </div>
                  </div>

                  {/* Submitted Student Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border-2 border-black text-xs sm:text-sm">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-500 block">
                        School Name
                      </span>
                      <span className="font-bold text-black">{selectedRequest.schoolName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-500 block">
                        Class / Grade
                      </span>
                      <span className="font-bold text-black">{selectedRequest.gradeLevel}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-500 block">
                        Registered Jaystarbliss Programme
                      </span>
                      <span className="font-bold text-black">{selectedRequest.programme}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-500 block">
                        Student Reference / ID
                      </span>
                      <span className="font-bold text-black">
                        {selectedRequest.studentReference || 'None provided'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-500 block">
                        Accuracy Declaration Confirmed
                      </span>
                      <span className="font-bold text-emerald-700">
                        {selectedRequest.confirmedDeclaration ? 'Yes (Confirmed)' : 'No'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-500 block">
                        Submitted At
                      </span>
                      <span className="font-bold text-black">
                        {new Date(selectedRequest.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Official Record Verification Boundary Section */}
                  <div className="p-5 rounded-2xl bg-[#FFFDF5] border-2 border-black space-y-4">
                    <div className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#B11469]" />
                      <span>Step 1: Official Jaystarbliss Studios Record Check</span>
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-white border-2 border-black">
                      <input
                        type="checkbox"
                        checked={verifiedOfficialCheck}
                        onChange={(e) => setVerifiedOfficialCheck(e.target.checked)}
                        className="mt-0.5 w-5 h-5 accent-black"
                      />
                      <span className="text-xs sm:text-sm font-black text-black leading-snug">
                        I confirm that I have cross-checked this applicant against official
                        Jaystarbliss Studios student registration records and verified they are an
                        active student.
                      </span>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
                          Official Roster / Portal Reference ID (Optional)
                        </label>
                        <input
                          type="text"
                          value={officialRecordRef}
                          onChange={(e) => setOfficialRecordRef(e.target.value)}
                          placeholder="e.g. JBS-ROSTER-2026-88"
                          className="w-full px-3 py-2 text-xs font-semibold rounded-xl border-2 border-black bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
                          Private Admin Review Notes (Internal Only)
                        </label>
                        <input
                          type="text"
                          value={privateAdminNotes}
                          onChange={(e) => setPrivateAdminNotes(e.target.value)}
                          placeholder="Internal verification note (hidden from student)..."
                          className="w-full px-3 py-2 text-xs font-semibold rounded-xl border-2 border-black bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
                        Message to Student (Included in Status Page & Email)
                      </label>
                      <textarea
                        rows={2}
                        value={publicStatusNote}
                        onChange={(e) => setPublicStatusNote(e.target.value)}
                        placeholder="Optional message or instructions for the student..."
                        className="w-full px-3 py-2 text-xs font-semibold rounded-xl border-2 border-black bg-white"
                      />
                    </div>
                  </div>

                  {/* Decision Buttons & Confirmation Prompt */}
                  {confirmDecisionModal ? (
                    <div className="p-5 rounded-2xl bg-slate-900 text-white border-2 border-black space-y-4">
                      <div className="text-sm font-black text-[#FFF025]">
                        Confirm Decision: {confirmDecisionModal.toUpperCase()} for{' '}
                        {selectedRequest.fullName}?
                      </div>
                      <p className="text-xs text-white/85 leading-relaxed">
                        {confirmDecisionModal === 'approve'
                          ? `This will grant ${selectedRequest.fullName} access to the private Build Buds Student Hub, create their communityMemberships record, send an in-app notification, and dispatch the approval email to ${selectedRequest.email}.`
                          : `This will update ${selectedRequest.fullName}'s status to "${confirmDecisionModal}", block private Student Hub access, and notify them via email and in-app notification.`}
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={handleExecuteDecision}
                          className="px-5 py-2.5 rounded-xl border-2 border-black bg-[#FFF025] text-black text-xs font-black cursor-pointer"
                        >
                          {isProcessing ? 'Processing...' : 'Confirm & Send Notification'}
                        </button>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => setConfirmDecisionModal(null)}
                          className="px-4 py-2.5 rounded-xl bg-white/15 text-white text-xs font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setConfirmDecisionModal('approve')}
                        className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl border-2 border-black bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-black brand-shadow-sm cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve Student Access</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDecisionModal('more_information_required')
                        }
                        className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl border-2 border-black bg-[#FFF025] hover:bg-[#ffe500] text-black text-xs font-black cursor-pointer"
                      >
                        <Clock className="w-4 h-4" />
                        <span>Request More Info</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmDecisionModal('rejected')}
                        className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl border-2 border-black bg-rose-100 hover:bg-rose-200 text-rose-950 text-xs font-black cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmDecisionModal('suspended')}
                        className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl border-2 border-black bg-rose-600 hover:bg-rose-700 text-white text-xs font-black cursor-pointer"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        <span>Suspend Hub Access</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2 — MANAGE ALL ACCOUNTS & STUDENT HUB ACCESS */}
        {activeTab === 'migration' && (
          <div className="rounded-3xl border-3 border-black bg-white p-6 sm:p-8 brand-shadow space-y-6">
            <div>
              <h2 className="font-chewy text-2xl sm:text-3xl text-black">
                Manage All Registered Accounts &amp; Private Student Hub Access
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Only accounts with <strong>Approved Student Hub Access</strong> appear inside the
                Private Student Hub chat and receive the Verified Pro Avatar Ring + Gradient Name.
                Unapproved accounts can only use the Public Community until you approve them here.
              </p>
            </div>

            <div className="divide-y-2 divide-black/10">
              {allUsers.map((u) => {
                const membership = membershipsMap[u.uid];
                const isApproved =
                  membership?.status === 'approved' ||
                  u.role === 'admin' ||
                  u.role === 'moderator';
                return (
                  <div
                    key={u.uid}
                    className="py-4 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <VerifiedAvatarFrame
                        src={resolveBuilderAvatarUrl(u.avatarUrl, u.uid)}
                        alt={u.displayName}
                        isVerified={isApproved}
                        sizeClass="w-10 h-10"
                        ringPaddingClass="p-[2.5px]"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-black flex flex-wrap items-center gap-2">
                          <span
                            className={
                              isApproved ? 'verified-student-name-gradient' : 'text-black'
                            }
                          >
                            {u.displayName}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md border border-black text-[10px] font-black uppercase ${
                              isApproved
                                ? 'bg-emerald-300 text-black'
                                : 'bg-amber-200 text-black'
                            }`}
                          >
                            {isApproved ? 'Approved in Private Hub' : 'Public Community Only'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          School: {u.schoolName || 'Not specified'} • Grade:{' '}
                          {u.gradeLevel || 'Not specified'} • Role: {u.role}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {isApproved ? (
                        <>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-black bg-emerald-100 text-emerald-950 text-xs font-black">
                            <Check className="w-3.5 h-3.5" />
                            <span>Verified Hub Member</span>
                          </span>
                          {u.role !== 'admin' && (
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleRevokeSingleUser(u)}
                              className="px-3.5 py-1.5 rounded-xl border-2 border-black bg-rose-100 hover:bg-rose-600 hover:text-white text-rose-900 text-xs font-black transition-colors cursor-pointer"
                            >
                              Remove from Private Hub
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleMigrateSingleUser(u)}
                          className="px-4 py-2 rounded-xl border-2 border-black bg-[#FFF025] hover:bg-[#ffe500] text-black text-xs font-black brand-shadow-sm cursor-pointer"
                        >
                          Approve for Private Student Hub
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3 — ADMIN AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="rounded-3xl border-3 border-black bg-white p-6 sm:p-8 brand-shadow space-y-4">
            <h2 className="font-chewy text-2xl sm:text-3xl text-black">
              Student Verification Audit Trail
            </h2>
            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-600">No verification audit logs recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log, idx) => (
                  <div
                    key={log.id || idx}
                    className="p-4 rounded-2xl border-2 border-black bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-black text-black uppercase">
                        {log.action.replace(/_/g, ' ')} — {log.targetName} ({log.targetEmail})
                      </div>
                      <div className="text-slate-700">
                        Reason / Note: {log.reason || 'Standard review'}
                      </div>
                      <div className="text-slate-500">
                        Reviewed by: {log.adminEmail} • Official Record Checked:{' '}
                        {log.verifiedAgainstOfficialRecords ? 'Yes' : 'No'} • Email Status:{' '}
                        {log.emailDeliveryStatus || 'n/a'}
                      </div>
                    </div>
                    <div className="text-[11px] font-mono text-slate-600">
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
  );
};
