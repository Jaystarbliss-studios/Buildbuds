import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Globe,
  Gamepad2,
  Code2,
  Save,
  Send,
  Image as ImageIcon,
} from 'lucide-react';
import { BuilderProfile } from '../firebase.ts';
import {
  CloudinaryMediaItem,
  PublicCategory,
  PublicPost,
  DEFAULT_PUBLIC_CATEGORIES,
} from '../types/community.ts';
import {
  validateCloudinaryUploadBatch,
  uploadImageToCloudinarySigned,
  deleteCloudinaryAsset,
  savePostDraftLocally,
  loadPostDraftLocally,
  savePublicPost,
  MAX_IMAGES_PER_POST,
  getCloudinaryResponsiveUrl,
} from '../utils/communityService.ts';
import { useTheme } from '../utils/themeContext.tsx';

interface PublicPostComposerProps {
  isOpen: boolean;
  onClose: () => void;
  authorProfile: BuilderProfile;
  categories: PublicCategory[];
  editingPost?: PublicPost | null;
  requireReview?: boolean;
  onSaved: (post: PublicPost) => void;
}

export const PublicPostComposer: React.FC<PublicPostComposerProps> = ({
  isOpen,
  onClose,
  authorProfile,
  categories,
  editingPost,
  requireReview = false,
  onSaved,
}) => {
  const { isDark } = useTheme();
  const activeCategories =
    categories.filter((c) => c.isActive).length > 0
      ? categories.filter((c) => c.isActive)
      : DEFAULT_PUBLIC_CATEGORIES;

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [categoryId, setCategoryId] = useState(activeCategories[0]?.id || 'project-showcases');
  const [tagsInput, setTagsInput] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [gameUrl, setGameUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [media, setMedia] = useState<CloudinaryMediaItem[]>([]);

  const [uploadingFiles, setUploadingFiles] = useState<
    Array<{ name: string; progress: number; error?: string }>
  >([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);
    setStatusBanner(null);

    if (editingPost) {
      setTitle(editingPost.title);
      setSummary(editingPost.summary);
      setBody(editingPost.body);
      setCategoryId(editingPost.categoryId);
      setTagsInput((editingPost.tags || []).join(', '));
      setWebsiteUrl(editingPost.websiteUrl || '');
      setGameUrl(editingPost.gameUrl || '');
      setGithubUrl(editingPost.githubUrl || '');
      setMedia(editingPost.media || []);
      return;
    }

    const savedDraft = loadPostDraftLocally(authorProfile.uid);
    if (savedDraft) {
      setTitle(savedDraft.title || '');
      setSummary(savedDraft.summary || '');
      setBody(savedDraft.body || '');
      setCategoryId(savedDraft.categoryId || activeCategories[0]?.id || 'project-showcases');
      setTagsInput(savedDraft.tagsInput || '');
      setWebsiteUrl(savedDraft.websiteUrl || '');
      setGameUrl(savedDraft.gameUrl || '');
      setGithubUrl(savedDraft.githubUrl || '');
      setMedia(savedDraft.media || []);
      if (savedDraft.title || savedDraft.body) {
        setStatusBanner('Restored your unsaved post draft automatically.');
      }
    } else {
      setTitle('');
      setSummary('');
      setBody('');
      setCategoryId(activeCategories[0]?.id || 'project-showcases');
      setTagsInput('');
      setWebsiteUrl('');
      setGameUrl('');
      setGithubUrl('');
      setMedia([]);
    }
  }, [isOpen, editingPost, authorProfile.uid]);

  // Auto-preserve draft locally whenever content changes so upload failures never lose user work
  useEffect(() => {
    if (!isOpen || editingPost) return;
    if (!title && !body && !summary && media.length === 0) return;
    savePostDraftLocally(authorProfile.uid, {
      title,
      summary,
      body,
      categoryId,
      tagsInput,
      websiteUrl,
      gameUrl,
      githubUrl,
      media,
      updatedAt: new Date().toISOString(),
    });
  }, [
    isOpen,
    editingPost,
    authorProfile.uid,
    title,
    summary,
    body,
    categoryId,
    tagsInput,
    websiteUrl,
    gameUrl,
    githubUrl,
    media,
  ]);

  if (!isOpen) return null;

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    e.target.value = '';
    setErrorMessage(null);

    const validation = validateCloudinaryUploadBatch(files, media.length);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid image files selected.');
      return;
    }

    setUploadingFiles(files.map((f) => ({ name: f.name, progress: 5 })));

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const uploadedItem = await uploadImageToCloudinarySigned(file, (pct) => {
          setUploadingFiles((prev) =>
            prev.map((item, idx) => (idx === i ? { ...item, progress: pct } : item))
          );
        });
        setMedia((prev) => [...prev, uploadedItem]);
        setUploadingFiles((prev) =>
          prev.map((item, idx) => (idx === i ? { ...item, progress: 100 } : item))
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed.';
        setUploadingFiles((prev) =>
          prev.map((item, idx) => (idx === i ? { ...item, error: msg } : item))
        );
        setErrorMessage(
          `${msg} — Your post text and draft have been preserved. You can publish without images or retry.`
        );
      }
    }

    setTimeout(() => {
      setUploadingFiles((prev) => prev.filter((item) => item.error));
    }, 1500);
  };

  const handleRemoveImage = async (index: number) => {
    const target = media[index];
    setMedia((prev) => prev.filter((_, idx) => idx !== index));
    if (target?.publicId) {
      await deleteCloudinaryAsset(target.publicId, editingPost?.id);
    }
  };

  const handleSubmit = async (desiredStatus: 'draft' | 'published') => {
    setErrorMessage(null);
    setStatusBanner(null);
    setIsSubmitting(true);

    try {
      const selectedCat =
        activeCategories.find((c) => c.id === categoryId) || activeCategories[0];
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const saved = await savePublicPost({
        existingPostId: editingPost?.id,
        title,
        summary,
        body,
        categoryId: selectedCat.id,
        categoryName: selectedCat.name,
        tags,
        media,
        websiteUrl,
        gameUrl,
        githubUrl,
        authorProfile,
        desiredStatus,
        requireReview,
      });

      onSaved(saved);
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not save post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="composer-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
    >
      <div
        className={`relative w-full max-w-2xl rounded-3xl border-3 border-black brand-shadow p-6 sm:p-8 my-6 max-h-[92vh] overflow-y-auto transition-colors ${
          isDark ? 'bg-[#121222] text-white' : 'bg-white text-black'
        }`}
      >
        <div
          className={`flex items-center justify-between gap-4 border-b-2 pb-4 mb-5 ${
            isDark ? 'border-white/15' : 'border-black/10'
          }`}
        >
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-lg border-2 border-black bg-[#FFF025] text-black text-[11px] font-black uppercase tracking-wider mb-1">
              {editingPost ? 'Edit Community Post' : 'Share With The Community'}
            </span>
            <h2 id="composer-modal-title" className="font-chewy text-2xl sm:text-3xl">
              {editingPost
                ? 'Update Your Post or Creation'
                : 'Publish a Creation, Update or Question'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close composer"
            className={`p-2 rounded-xl border-2 border-black cursor-pointer shrink-0 ${
              isDark
                ? 'bg-[#1b1b2f] hover:bg-[#FFF025] hover:text-black text-white'
                : 'bg-white hover:bg-[#FFF025] text-black'
            }`}
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {statusBanner && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border-2 border-emerald-700 text-xs font-bold text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{statusBanner}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border-2 border-rose-600 text-xs font-bold text-rose-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-black uppercase tracking-wider mb-1">
                Post / Project Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Solar Circuit Simulator v2 — Interactive Web Lab"
                className={`w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFF025] ${
                  isDark ? 'bg-[#1b1b2f] text-white' : 'bg-white text-black'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1">
                Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={`w-full px-3 py-2.5 text-sm font-bold rounded-xl border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFF025] ${
                  isDark ? 'bg-[#1b1b2f] text-white' : 'bg-white text-black'
                }`}
              >
                {activeCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.emoji} {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1">
              Short Summary (Shown in Feed Cards)
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              maxLength={200}
              placeholder="One or two sentences summarizing what you built or discovered..."
              className={`w-full px-3.5 py-2 text-sm rounded-xl border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFF025] ${
                isDark ? 'bg-[#1b1b2f] text-white' : 'bg-white text-black'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1">
              Full Story, Details, or Tutorial Steps *
            </label>
            <textarea
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Explain how your project works, what tools you used, what challenges you solved, or what feedback you're looking for..."
              className={`w-full px-3.5 py-2.5 text-sm rounded-xl border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFF025] leading-relaxed ${
                isDark ? 'bg-[#1b1b2f] text-white' : 'bg-white text-black'
              }`}
            />
          </div>

          {/* Project Links */}
          <div
            className={`p-4 rounded-2xl border-2 border-black space-y-3 ${
              isDark ? 'bg-[#1b1b2f]' : 'bg-slate-50'
            }`}
          >
            <div className="text-xs font-black uppercase tracking-wider">
              Optional Creation & Demo Links
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  className={`flex items-center gap-1 text-[11px] font-bold mb-1 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 text-[#B11469]" />
                  <span>Live Website URL</span>
                </label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://..."
                  className={`w-full px-2.5 py-1.5 text-xs rounded-lg border-2 border-black ${
                    isDark ? 'bg-[#121222] text-white' : 'bg-white text-black'
                  }`}
                />
              </div>

              <div>
                <label
                  className={`flex items-center gap-1 text-[11px] font-bold mb-1 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  <Gamepad2 className="w-3.5 h-3.5 text-[#C15D00]" />
                  <span>Playable Game Link</span>
                </label>
                <input
                  type="url"
                  value={gameUrl}
                  onChange={(e) => setGameUrl(e.target.value)}
                  placeholder="https://..."
                  className={`w-full px-2.5 py-1.5 text-xs rounded-lg border-2 border-black ${
                    isDark ? 'bg-[#121222] text-white' : 'bg-white text-black'
                  }`}
                />
              </div>

              <div>
                <label
                  className={`flex items-center gap-1 text-[11px] font-bold mb-1 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Code / GitHub Link</span>
                </label>
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/..."
                  className={`w-full px-2.5 py-1.5 text-xs rounded-lg border-2 border-black ${
                    isDark ? 'bg-[#121222] text-white' : 'bg-white text-black'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1">
              Topic Tags (Comma separated, up to 8)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. gamedev, typescript, robotics, scratch, webdesign"
              className={`w-full px-3.5 py-2 text-sm rounded-xl border-2 border-black ${
                isDark ? 'bg-[#1b1b2f] text-white' : 'bg-white text-black'
              }`}
            />
          </div>

          {/* Signed Cloudinary Image Uploader */}
          <div
            className={`p-4 rounded-2xl border-2 border-black space-y-3 ${
              isDark ? 'bg-[#1b1b2f]' : 'bg-[#FFFDF5]'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#B11469]" />
                  <span>Project Screenshots & Images ({media.length}/{MAX_IMAGES_PER_POST})</span>
                </div>
                <p
                  className={`text-[11px] mt-0.5 ${
                    isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  JPEG, PNG, WebP, or AVIF • Max 5 MB per image • Up to 5 images per post
                </p>
              </div>

              {media.length < MAX_IMAGES_PER_POST && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 border-black bg-[#FFF025] hover:bg-[#ffe500] text-black text-xs font-black cursor-pointer brand-shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Upload Images</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                multiple
                onChange={handleFilesSelected}
                className="hidden"
              />
            </div>

            {uploadingFiles.length > 0 && (
              <div className="space-y-2 pt-1">
                {uploadingFiles.map((uf, idx) => (
                  <div
                    key={`${uf.name}-${idx}`}
                    className={`p-2.5 rounded-xl border text-xs ${
                      isDark ? 'bg-[#121222] border-white/20' : 'bg-white border-black/20'
                    }`}
                  >
                    <div className="flex justify-between font-bold mb-1">
                      <span className="truncate max-w-xs">{uf.name}</span>
                      <span>{uf.error ? 'Failed' : `${uf.progress}%`}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          uf.error ? 'bg-rose-500' : 'bg-[#B11469]'
                        }`}
                        style={{ width: `${uf.progress}%` }}
                      />
                    </div>
                    {uf.error && (
                      <p className="text-[11px] text-rose-500 mt-1 font-bold">{uf.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {media.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {media.map((item, idx) => (
                  <div
                    key={item.publicId || idx}
                    className="relative group rounded-xl border-2 border-black overflow-hidden bg-slate-100 aspect-video"
                  >
                    <img
                      src={getCloudinaryResponsiveUrl(item.secureUrl, 'thumb')}
                      alt={`Upload preview ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      title="Remove image"
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 hover:bg-rose-600 text-white cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {idx === 0 && (
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-[#FFF025] border border-black text-[10px] font-black text-black">
                        Cover
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div
            className={`pt-3 flex flex-wrap items-center justify-between gap-3 border-t-2 ${
              isDark ? 'border-white/15' : 'border-black/10'
            }`}
          >
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('draft')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-black text-xs font-black cursor-pointer ${
                isDark
                  ? 'bg-[#1b1b2f] hover:bg-white/10 text-white'
                  : 'bg-white hover:bg-slate-100 text-black'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>Save as Draft</span>
            </button>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2.5 rounded-xl border-2 text-xs font-bold cursor-pointer ${
                  isDark
                    ? 'border-white/20 text-slate-200 hover:bg-white/10'
                    : 'border-black/20 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit('published')}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border-2 border-black bg-[#FFF025] hover:bg-[#ffe500] text-black text-sm font-black brand-shadow cursor-pointer transition-transform hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-60"
              >
                <Send className="w-4 h-4 stroke-[2.5]" />
                <span>
                  {isSubmitting
                    ? 'Publishing...'
                    : editingPost
                    ? 'Save Changes'
                    : requireReview && authorProfile.role !== 'admin'
                    ? 'Submit for Review'
                    : 'Publish Post'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
