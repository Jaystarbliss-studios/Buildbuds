import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  MessageSquarePlus,
  CheckCircle2,
  AlertCircle,
  Upload,
  Trash2,
  Sparkles,
  Clock,
  Award,
} from 'lucide-react';
import { BuilderProfile } from '../firebase.ts';
import {
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_STATUS_LABELS,
  FeedbackCategory,
  FeedbackStatus,
  FeedbackSubmission,
} from '../types/community.ts';
import {
  submitFeedbackSuggestion,
  subscribeToMyFeedbackSubmissions,
  uploadImageToCloudinarySigned,
  validateCloudinaryUploadBatch,
} from '../utils/communityService.ts';
import { SUGGESTION_MIN_EXPLANATION_CHARS, SUGGESTION_MIN_TITLE_CHARS } from '../utils/contributions.ts';

interface FeedbackCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  authorProfile: BuilderProfile | null;
  onOpenAuthModal?: (mode: 'signin' | 'signup') => void;
  variant?: 'dark' | 'light';
}

const STATUS_BADGE_CLASSES: Record<FeedbackStatus, { dark: string; light: string }> = {
  received: {
    dark: 'bg-slate-800 text-slate-200 border-slate-600',
    light: 'bg-slate-100 text-slate-800 border-slate-300',
  },
  under_review: {
    dark: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
    light: 'bg-amber-50 text-amber-800 border-amber-300',
  },
  accepted: {
    dark: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
    light: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  },
  planned: {
    dark: 'bg-sky-500/15 text-sky-300 border-sky-500/35',
    light: 'bg-sky-50 text-sky-800 border-sky-300',
  },
  in_progress: {
    dark: 'bg-[#FFF025]/15 text-[#FFF025] border-[#FFF025]/40',
    light: 'bg-[#FFF025]/40 text-black border-black/30',
  },
  completed: {
    dark: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50',
    light: 'bg-emerald-100 text-emerald-900 border-emerald-500',
  },
  declined: {
    dark: 'bg-rose-500/15 text-rose-300 border-rose-500/35',
    light: 'bg-rose-50 text-rose-800 border-rose-300',
  },
};

export const FeedbackCenterModal: React.FC<FeedbackCenterModalProps> = ({
  isOpen,
  onClose,
  authorProfile,
  onOpenAuthModal,
  variant = 'dark',
}) => {
  const isDark = variant === 'dark';
  const [activeTab, setActiveTab] = useState<'submit' | 'mine'>('submit');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<FeedbackCategory>('feature_request');
  const [explanation, setExplanation] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentPublicId, setAttachmentPublicId] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [mySubmissions, setMySubmissions] = useState<FeedbackSubmission[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen || !authorProfile?.uid) {
      setMySubmissions([]);
      return;
    }
    const unsub = subscribeToMyFeedbackSubmissions(authorProfile.uid, setMySubmissions);
    return () => unsub();
  }, [isOpen, authorProfile?.uid]);

  if (!isOpen) return null;

  const handleSelectAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErrorMsg(null);
    const check = validateCloudinaryUploadBatch([file], 0);
    if (!check.valid) {
      setErrorMsg(check.error || 'Please choose a valid image under 5 MB.');
      return;
    }
    setIsUploadingImage(true);
    try {
      const uploaded = await uploadImageToCloudinarySigned(file);
      setAttachmentUrl(uploaded.secureUrl);
      setAttachmentPublicId(uploaded.publicId);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Screenshot upload could not complete. You can still submit without an image.'
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!authorProfile) {
      if (onOpenAuthModal) onOpenAuthModal('signin');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitFeedbackSuggestion({
        title,
        explanation,
        category,
        attachmentUrl,
        attachmentPublicId,
        authorProfile,
      });

      setTitle('');
      setExplanation('');
      setAttachmentUrl('');
      setAttachmentPublicId('');
      setCategory('feature_request');
      setSuccessMsg(
        result.pointsAwarded > 0
          ? `Suggestion received! You earned +${result.pointsAwarded} contribution point.`
          : 'Suggestion received! Our moderators will review it privately.'
      );
      setActiveTab('mine');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit suggestion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-center-title"
      className="fixed inset-0 z-[85] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm overflow-y-auto"
    >
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isDark
            ? 'bg-[#13151d] border-white/15 text-white'
            : 'bg-white border-black/15 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between gap-3 ${
            isDark ? 'border-white/10 bg-[#171923]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#FFF025] text-black flex items-center justify-center shrink-0">
              <MessageSquarePlus className="w-4 h-4 stroke-[2.25]" />
            </div>
            <div className="min-w-0">
              <h2 id="feedback-center-title" className="text-base font-bold truncate">
                Feature Suggestions &amp; Feedback Centre
              </h2>
              <p className={`text-xs truncate ${isDark ? 'text-white/55' : 'text-slate-500'}`}>
                Private between you and the Build Buds team — help improve the platform.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Feedback Centre"
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              isDark
                ? 'hover:bg-white/10 text-white/70 hover:text-white'
                : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          className={`px-5 pt-3 border-b flex items-center gap-2 ${
            isDark ? 'border-white/10 bg-[#13151d]' : 'border-slate-200 bg-white'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('submit');
              setErrorMsg(null);
            }}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'submit'
                ? 'border-[#FFF025] text-[#FFF025]'
                : isDark
                  ? 'border-transparent text-white/55 hover:text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
            } ${activeTab === 'submit' && !isDark ? '!text-black' : ''}`}
          >
            Submit Suggestion
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('mine');
              setErrorMsg(null);
            }}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'mine'
                ? 'border-[#FFF025] text-[#FFF025]'
                : isDark
                  ? 'border-transparent text-white/55 hover:text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
            } ${activeTab === 'mine' && !isDark ? '!text-black' : ''}`}
          >
            <span>My Submissions</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] tabular-nums ${
                isDark ? 'bg-white/10 text-white/80' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {mySubmissions.length}
            </span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs font-medium text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span className={!isDark ? 'text-rose-800' : ''}>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs font-medium text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span className={!isDark ? 'text-emerald-800' : ''}>{successMsg}</span>
            </div>
          )}

          {!authorProfile ? (
            <div
              className={`p-6 rounded-xl border text-center space-y-3 ${
                isDark ? 'bg-[#191c26] border-white/10' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <p className="text-sm font-semibold">
                Sign in with your Build Buds account to send a suggestion or view your feedback history.
              </p>
              {onOpenAuthModal && (
                <button
                  type="button"
                  onClick={() => onOpenAuthModal('signin')}
                  className="px-4 py-2 rounded-lg bg-[#FFF025] text-black text-xs font-bold cursor-pointer"
                >
                  Sign In
                </button>
              )}
            </div>
          ) : activeTab === 'submit' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                  isDark
                    ? 'bg-[#191c26] border-white/10 text-white/75'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <Sparkles className="w-4 h-4 text-[#FFF025] shrink-0 mt-0.5" />
                <div>
                  Valid suggestions earn <strong className={isDark ? 'text-white' : 'text-slate-900'}>+1 pt</strong> toward Community Contributors. Helpful ideas accepted by moderators earn a{' '}
                  <strong className={isDark ? 'text-white' : 'text-slate-900'}>+2 bonus pt</strong> reward.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-7">
                  <label
                    htmlFor="feedback-title-input"
                    className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${
                      isDark ? 'text-white/70' : 'text-slate-600'
                    }`}
                  >
                    Title *
                  </label>
                  <input
                    id="feedback-title-input"
                    type="text"
                    required
                    minLength={SUGGESTION_MIN_TITLE_CHARS}
                    maxLength={160}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Concise summary of your suggestion or issue..."
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-[#FFF025] ${
                      isDark
                        ? 'bg-[#0e1016] border-white/15 text-white placeholder-white/35'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                <div className="sm:col-span-5">
                  <label
                    htmlFor="feedback-category-select"
                    className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${
                      isDark ? 'text-white/70' : 'text-slate-600'
                    }`}
                  >
                    Category *
                  </label>
                  <select
                    id="feedback-category-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-[#FFF025] ${
                      isDark
                        ? 'bg-[#0e1016] border-white/15 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    {(Object.keys(FEEDBACK_CATEGORY_LABELS) as FeedbackCategory[]).map((cat) => (
                      <option key={cat} value={cat}>
                        {FEEDBACK_CATEGORY_LABELS[cat]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="feedback-explanation-input"
                    className={`block text-[11px] font-bold uppercase tracking-wider ${
                      isDark ? 'text-white/70' : 'text-slate-600'
                    }`}
                  >
                    Detailed Explanation *
                  </label>
                  <span
                    className={`text-[10px] tabular-nums ${
                      explanation.trim().length < SUGGESTION_MIN_EXPLANATION_CHARS
                        ? 'text-amber-400'
                        : isDark
                          ? 'text-white/45'
                          : 'text-slate-400'
                    }`}
                  >
                    {explanation.trim().length}/{SUGGESTION_MIN_EXPLANATION_CHARS}+ chars
                  </span>
                </div>
                <textarea
                  id="feedback-explanation-input"
                  required
                  minLength={SUGGESTION_MIN_EXPLANATION_CHARS}
                  maxLength={5000}
                  rows={5}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Describe the problem you ran into, steps to reproduce a bug, or how this feature would help students build together..."
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs leading-relaxed focus:outline-none focus:border-[#FFF025] resize-y ${
                    isDark
                      ? 'bg-[#0e1016] border-white/15 text-white placeholder-white/35'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              <div>
                <label
                  className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-white/70' : 'text-slate-600'
                  }`}
                >
                  Optional Screenshot / Reference Image
                </label>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    disabled={isUploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                      isDark
                        ? 'bg-white/5 hover:bg-white/10 border-white/15 text-white'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingImage ? 'Uploading...' : 'Attach Screenshot'}</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    onChange={handleSelectAttachment}
                    className="hidden"
                  />

                  {attachmentUrl && (
                    <div className="flex items-center gap-2">
                      <img
                        src={attachmentUrl}
                        alt="Attached feedback screenshot"
                        className="w-12 h-9 rounded-md object-cover border border-white/20"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setAttachmentUrl('');
                          setAttachmentPublicId('');
                        }}
                        aria-label="Remove attached screenshot"
                        className="p-1.5 rounded-md text-rose-400 hover:bg-rose-500/15 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                    isDark
                      ? 'bg-white/5 hover:bg-white/10 text-white/75'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingImage}
                  className="px-5 py-2 rounded-xl bg-[#FFF025] hover:bg-[#ffe500] text-black text-xs font-black cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Suggestion'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {mySubmissions.length === 0 ? (
                <div
                  className={`p-8 rounded-xl border text-center space-y-2 ${
                    isDark ? 'bg-[#191c26] border-white/10' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <Clock
                    className={`w-7 h-7 mx-auto ${isDark ? 'text-white/35' : 'text-slate-400'}`}
                  />
                  <p className="text-sm font-semibold">No submissions yet</p>
                  <p className={`text-xs ${isDark ? 'text-white/55' : 'text-slate-500'}`}>
                    Share a feature idea or bug report to track its status here privately.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('submit')}
                    className="mt-2 px-4 py-1.5 rounded-lg bg-[#FFF025] text-black text-xs font-bold cursor-pointer"
                  >
                    Write a Suggestion
                  </button>
                </div>
              ) : (
                mySubmissions.map((item) => {
                  const statusClasses =
                    STATUS_BADGE_CLASSES[item.status]?.[isDark ? 'dark' : 'light'] ||
                    STATUS_BADGE_CLASSES.received[isDark ? 'dark' : 'light'];

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border space-y-2.5 ${
                        isDark
                          ? 'bg-[#191c26] border-white/10'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${statusClasses}`}
                            >
                              {FEEDBACK_STATUS_LABELS[item.status] || item.status}
                            </span>
                            <span
                              className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                                isDark
                                  ? 'bg-white/5 text-white/65'
                                  : 'bg-white border border-slate-200 text-slate-600'
                              }`}
                            >
                              {FEEDBACK_CATEGORY_LABELS[item.category]}
                            </span>
                            {item.isUseful && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/35">
                                <Award className="w-3 h-3" />
                                <span>Useful (+2 Bonus)</span>
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold mt-1.5">{item.title}</h3>
                        </div>
                        <span
                          className={`text-[11px] shrink-0 ${
                            isDark ? 'text-white/45' : 'text-slate-400'
                          }`}
                        >
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <p
                        className={`text-xs leading-relaxed whitespace-pre-wrap ${
                          isDark ? 'text-white/75' : 'text-slate-700'
                        }`}
                      >
                        {item.explanation}
                      </p>

                      {item.attachmentUrl && (
                        <a
                          href={item.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block"
                        >
                          <img
                            src={item.attachmentUrl}
                            alt={`Attachment for ${item.title}`}
                            className="max-h-36 rounded-lg border border-white/15 object-cover"
                          />
                        </a>
                      )}

                      {item.moderatorResponse && (
                        <div
                          className={`p-3 rounded-lg border text-xs ${
                            isDark
                              ? 'bg-[#0e1016] border-[#FFF025]/30 text-white/85'
                              : 'bg-white border-amber-300 text-slate-800'
                          }`}
                        >
                          <div className="text-[10px] font-bold uppercase tracking-wider text-[#FFF025] mb-1">
                            Moderator Response
                          </div>
                          <p className="leading-relaxed">{item.moderatorResponse}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
