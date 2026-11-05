import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Send,
  RefreshCw,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo.tsx';
import {
  BuilderProfile,
  User,
} from '../firebase.ts';
import {
  StudentAccessRequest,
  StudentAccessStatus,
  JAYSTARBLISS_PROGRAMMES,
} from '../types/community.ts';
import { submitStudentAccessApplication } from '../utils/communityService.ts';

interface StudentAccessPageProps {
  currentUser: User | null;
  builderProfile: BuilderProfile | null;
  accessStatus: StudentAccessStatus;
  existingRequest: StudentAccessRequest | null;
  isApprovedForHub: boolean;
  viewMode: 'form' | 'status';
  onNavigate: (path: string) => void;
  onRequireAuth: (actionDescription: string) => void;
  onRequestSubmitted: (req: StudentAccessRequest) => void;
}

export const StudentAccessPage: React.FC<StudentAccessPageProps> = ({
  currentUser,
  builderProfile,
  accessStatus,
  existingRequest,
  isApprovedForHub,
  viewMode,
  onNavigate,
  onRequireAuth,
  onRequestSubmitted,
}) => {
  const [fullName, setFullName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('Grade 8 / JSS 2');
  const [programme, setProgramme] = useState(JAYSTARBLISS_PROGRAMMES[0]);
  const [studentReference, setStudentReference] = useState('');
  const [confirmedDeclaration, setConfirmedDeclaration] = useState(false);

  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (existingRequest) {
      setFullName(existingRequest.fullName || '');
      setSchoolName(existingRequest.schoolName || '');
      setGradeLevel(existingRequest.gradeLevel || 'Grade 8 / JSS 2');
      setProgramme(existingRequest.programme || JAYSTARBLISS_PROGRAMMES[0]);
      setStudentReference(existingRequest.studentReference || '');
      setConfirmedDeclaration(Boolean(existingRequest.confirmedDeclaration));
    } else if (builderProfile || currentUser) {
      setFullName(builderProfile?.displayName || currentUser?.displayName || '');
      setSchoolName(builderProfile?.schoolName || '');
      setGradeLevel(builderProfile?.gradeLevel || 'Grade 8 / JSS 2');
    }
  }, [existingRequest, builderProfile, currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currentUser) {
      onRequireAuth('submit your Jaystarbliss Studios student verification request');
      return;
    }

    setIsSubmitting(true);
    try {
      const saved = await submitStudentAccessApplication({
        fullName,
        schoolName,
        gradeLevel,
        programme,
        studentReference,
        confirmedDeclaration,
      });
      setIsEditingExisting(false);
      setSuccessMsg(
        'Your student verification application has been submitted! Our admin team will verify your details against official Jaystarbliss Studios student records.'
      );
      onRequestSubmitted(saved);
      onNavigate('/student-access/status');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not submit application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showStatusCard =
    isApprovedForHub ||
    (accessStatus !== 'not_requested' && !isEditingExisting) ||
    viewMode === 'status';

  return (
    <div className="min-h-screen bg-[#FFFDF5] text-black font-sans flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b-3 border-black sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => onNavigate('/community')}
            className="cursor-pointer text-left"
          >
            <BrandLogo size="md" />
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigate('/community')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 border-black bg-white hover:bg-slate-100 text-xs font-black text-black cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Public Community</span>
            </button>

            {isApprovedForHub && (
              <button
                type="button"
                onClick={() => onNavigate('/hub')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-black bg-[#FFF025] text-xs font-black text-black brand-shadow-sm cursor-pointer"
              >
                <span>Enter Student Hub</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Hero Banner */}
        <div className="rounded-3xl border-3 border-black bg-[#FFF025] p-6 sm:p-8 brand-shadow space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border-2 border-black bg-white text-xs font-black uppercase">
            <ShieldCheck className="w-4 h-4 text-[#B11469]" />
            <span>Jaystarbliss Studios Student Verification</span>
          </div>
          <h1 className="font-chewy text-3xl sm:text-4xl text-black leading-tight">
            Build Buds Private Student Hub Access
          </h1>
          <p className="text-sm sm:text-base text-black/85 font-semibold leading-relaxed">
            The real-time Build Buds Student Hub is an exclusive, safe workspace reserved for
            students registered under Jaystarbliss Studios. Verify your student membership below to
            unlock live channels, project rooms, and mentor collaboration.
          </p>
        </div>

        {!currentUser ? (
          /* Signed-Out Prompt */
          <div className="rounded-3xl border-3 border-black bg-white p-8 text-center brand-shadow space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl border-2 border-black bg-[#FFF025] flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-black" />
            </div>
            <h2 className="font-chewy text-2xl sm:text-3xl text-black">
              Sign in with Google to verify your student status
            </h2>
            <p className="text-sm text-slate-700 max-w-md mx-auto leading-relaxed">
              First, connect your Google account so we can link your student verification request to
              your email address and notify you as soon as you are approved.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() =>
                  onRequireAuth('request access to the Jaystarbliss Studios Student Hub')
                }
                className="px-6 py-3.5 rounded-2xl border-2 border-black bg-[#FFF025] hover:bg-[#ffe500] text-black font-black text-sm brand-shadow cursor-pointer"
              >
                Continue with Google
              </button>
            </div>
          </div>
        ) : showStatusCard && existingRequest ? (
          /* Status View Card */
          <div className="rounded-3xl border-3 border-black bg-white p-6 sm:p-8 brand-shadow space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-black pb-4">
              <div>
                <div className="text-xs font-black uppercase text-slate-500">
                  Student Verification Status
                </div>
                <h2 className="font-chewy text-2xl sm:text-3xl text-black mt-0.5">
                  {existingRequest.fullName}
                </h2>
              </div>

              {isApprovedForHub || existingRequest.status === 'approved' ? (
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl border-2 border-black bg-emerald-400 text-black text-xs font-black uppercase">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approved Student</span>
                </span>
              ) : existingRequest.status === 'pending' ? (
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl border-2 border-black bg-[#FFF025] text-black text-xs font-black uppercase">
                  <Clock className="w-4 h-4" />
                  <span>Pending Admin Review</span>
                </span>
              ) : existingRequest.status === 'more_information_required' ? (
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl border-2 border-black bg-amber-300 text-black text-xs font-black uppercase">
                  <AlertTriangle className="w-4 h-4" />
                  <span>More Info Required</span>
                </span>
              ) : existingRequest.status === 'suspended' ? (
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl border-2 border-black bg-rose-600 text-white text-xs font-black uppercase">
                  <XCircle className="w-4 h-4" />
                  <span>Access Suspended</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl border-2 border-black bg-rose-100 text-rose-900 text-xs font-black uppercase">
                  <XCircle className="w-4 h-4" />
                  <span>Not Approved</span>
                </span>
              )}
            </div>

            {successMsg && (
              <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-700 text-xs sm:text-sm font-bold text-emerald-950">
                {successMsg}
              </div>
            )}

            {/* Status Note from Admin */}
            <div className="p-5 rounded-2xl bg-[#FFFDF5] border-2 border-black space-y-2">
              <div className="text-xs font-black uppercase text-[#B11469]">
                Verification Update
              </div>
              <p className="text-sm font-semibold text-black leading-relaxed">
                {existingRequest.publicStatusNote ||
                  (existingRequest.status === 'pending'
                    ? 'Your application is in the verification queue. An administrator will check your details against official Jaystarbliss Studios student records and notify you by email and in-app notification.'
                    : 'Please review your application details below.')}
              </p>
            </div>

            {/* Submitted Details Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm bg-slate-50 p-5 rounded-2xl border-2 border-black/15">
              <div>
                <span className="font-black text-slate-500 uppercase text-[11px] block">
                  Authenticated Email
                </span>
                <span className="font-bold text-black">{existingRequest.email}</span>
              </div>
              <div>
                <span className="font-black text-slate-500 uppercase text-[11px] block">
                  School Name
                </span>
                <span className="font-bold text-black">{existingRequest.schoolName}</span>
              </div>
              <div>
                <span className="font-black text-slate-500 uppercase text-[11px] block">
                  Class / Grade
                </span>
                <span className="font-bold text-black">{existingRequest.gradeLevel}</span>
              </div>
              <div>
                <span className="font-black text-slate-500 uppercase text-[11px] block">
                  Registered Programme
                </span>
                <span className="font-bold text-black">{existingRequest.programme}</span>
              </div>
              {existingRequest.studentReference && (
                <div className="sm:col-span-2">
                  <span className="font-black text-slate-500 uppercase text-[11px] block">
                    Student Reference / ID
                  </span>
                  <span className="font-bold text-black">{existingRequest.studentReference}</span>
                </div>
              )}
            </div>

            {/* Action Buttons based on Status */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => onNavigate('/community')}
                className="px-4 py-2.5 rounded-xl border-2 border-black bg-white hover:bg-slate-100 text-xs font-black text-black cursor-pointer"
              >
                &larr; Explore Public Community
              </button>

              {isApprovedForHub || existingRequest.status === 'approved' ? (
                <button
                  type="button"
                  onClick={() => onNavigate('/hub')}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border-2 border-black bg-[#FFF025] hover:bg-[#ffe500] text-black text-sm font-black brand-shadow cursor-pointer"
                >
                  <span>Enter Build Buds Student Hub</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              ) : (
                (existingRequest.status === 'more_information_required' ||
                  existingRequest.status === 'rejected') && (
                  <button
                    type="button"
                    onClick={() => setIsEditingExisting(true)}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-black bg-[#FFF025] hover:bg-[#ffe500] text-black text-xs sm:text-sm font-black brand-shadow-sm cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Update & Resubmit Application</span>
                  </button>
                )
              )}
            </div>
          </div>
        ) : (
          /* Student Verification Application Form */
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border-3 border-black bg-white p-6 sm:p-8 brand-shadow space-y-5"
          >
            <div className="border-b-2 border-black/10 pb-4">
              <h2 className="font-chewy text-2xl sm:text-3xl text-black">
                {isEditingExisting
                  ? 'Update Your Student Verification Request'
                  : 'Student Verification Application'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Complete the fields below using your official Jaystarbliss Studios student
                registration information.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border-2 border-rose-600 text-xs font-bold text-rose-800">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                  Student Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full registered name"
                  className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border-2 border-black bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#FFF025]"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                  Authenticated Google Email (Read-Only)
                </label>
                <input
                  type="email"
                  readOnly
                  value={currentUser.email || ''}
                  className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border-2 border-black/30 bg-slate-100 text-slate-700 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                  School Name *
                </label>
                <input
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="e.g. Jaystarbliss Dynamic Academy"
                  className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border-2 border-black bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#FFF025]"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                  Current Class / Grade *
                </label>
                <input
                  type="text"
                  required
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  placeholder="e.g. Grade 8 / JSS 2 / SSS 1"
                  className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border-2 border-black bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#FFF025]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                  Registered Jaystarbliss Studios Programme *
                </label>
                <select
                  value={programme}
                  onChange={(e) => setProgramme(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-bold rounded-xl border-2 border-black bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#FFF025]"
                >
                  {JAYSTARBLISS_PROGRAMMES.map((prog) => (
                    <option key={prog} value={prog}>
                      {prog}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                  Student Registration / Reference Number (Optional)
                </label>
                <input
                  type="text"
                  value={studentReference}
                  onChange={(e) => setStudentReference(e.target.value)}
                  placeholder="e.g. JBS-2026-042"
                  className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border-2 border-black bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#FFF025]"
                />
              </div>
            </div>

            {/* Accuracy Declaration */}
            <div className="p-4 rounded-2xl bg-[#FFFDF5] border-2 border-black">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmedDeclaration}
                  onChange={(e) => setConfirmedDeclaration(e.target.checked)}
                  className="mt-1 w-5 h-5 accent-black rounded border-2 border-black shrink-0"
                />
                <span className="text-xs sm:text-sm font-bold text-black leading-snug">
                  I confirm that the details provided above are accurate and belong to an active
                  student registered under Jaystarbliss Studios. I understand that an administrator
                  will verify this information against official student records before granting
                  access to the private Student Hub.
                </span>
              </label>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              {isEditingExisting ? (
                <button
                  type="button"
                  onClick={() => setIsEditingExisting(false)}
                  className="px-4 py-2.5 rounded-xl border-2 border-black bg-white text-xs font-black cursor-pointer"
                >
                  Cancel Edit
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate('/community')}
                  className="px-4 py-2.5 rounded-xl border-2 border-black bg-white text-xs font-black cursor-pointer"
                >
                  Back to Public Community
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border-2 border-black bg-[#FFF025] hover:bg-[#ffe500] text-black text-sm font-black brand-shadow cursor-pointer transition-transform hover:-translate-y-0.5 disabled:opacity-60"
              >
                <Send className="w-4 h-4 stroke-[2.5]" />
                <span>
                  {isSubmitting
                    ? 'Submitting Request...'
                    : 'Submit Student Verification Request'}
                </span>
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
};
