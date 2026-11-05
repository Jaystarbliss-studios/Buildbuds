import React, { useState, useEffect } from 'react';
import { X, AlertCircle, ShieldCheck, User as UserIcon } from 'lucide-react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  ensurePublicUserProfile,
  BuilderProfile,
  User,
} from '../firebase.ts';
import { useTheme } from '../utils/themeContext.tsx';

interface PublicAuthModalProps {
  isOpen: boolean;
  initialMode?: 'signin' | 'join';
  actionDescription?: string;
  onClose: () => void;
  onSuccess: (profile: BuilderProfile, user: User) => void;
}

export const PublicAuthModal: React.FC<PublicAuthModalProps> = ({
  isOpen,
  initialMode = 'signin',
  actionDescription = 'explore creations, react, comment, and save your favourite builds',
  onClose,
  onSuccess,
}) => {
  const { isDark } = useTheme();
  const [mode, setMode] = useState<'signin' | 'join'>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleGoogleContinue = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const customName = displayName.trim();
      if (customName && !result.user.displayName) {
        try {
          await updateProfile(result.user, { displayName: customName });
        } catch {
          // Non-fatal
        }
      }
      const profile = await ensurePublicUserProfile(
        result.user,
        customName ? { displayName: customName } : undefined
      );
      onSuccess(profile, result.user);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setError('Google sign-in window was closed before completing. Click below to try again.');
      } else if (code === 'auth/popup-blocked') {
        setError('Your browser blocked the sign-in popup. Please allow popups for this site and try again.');
      } else {
        setError(
          err instanceof Error ? err.message : 'Could not sign in with Google. Please try again.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'signin') {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const profile = await ensurePublicUserProfile(cred.user);
        onSuccess(profile, cred.user);
      } else {
        const cleanName = displayName.trim();
        if (!cleanName) {
          setError('Please enter your name above first.');
          setIsLoading(false);
          return;
        }
        try {
          const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          await updateProfile(cred.user, { displayName: cleanName });
          const profile = await ensurePublicUserProfile(cred.user, {
            displayName: cleanName,
          });
          onSuccess(profile, cred.user);
        } catch (signupErr: unknown) {
          const signupCode = (signupErr as { code?: string })?.code || '';
          if (signupCode === 'auth/email-already-in-use') {
            // Existing account — sign them in directly instead of failing
            const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
            const profile = await ensurePublicUserProfile(cred.user, {
              displayName: cleanName,
            });
            onSuccess(profile, cred.user);
            return;
          }
          throw signupErr;
        }
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        setError(
          'We could not sign in with that email and password. If you originally joined with Google, please click "Continue with Google" above.'
        );
      } else {
        setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="public-auth-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
    >
      <div
        className={`relative w-full max-w-md rounded-3xl border-3 p-6 sm:p-8 transition-colors ${
          isDark
            ? 'bg-[#10121e] text-white border-white/25 shadow-2xl'
            : 'bg-white text-black border-black brand-shadow'
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sign in dialog"
          className={`absolute top-4 right-4 p-2 rounded-xl border-2 transition-colors cursor-pointer ${
            isDark
              ? 'border-white/20 bg-white/10 hover:bg-[#FFF025] hover:text-black text-white'
              : 'border-black bg-white hover:bg-[#FFF025] text-black'
          }`}
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Mode Switch Tabs */}
        <div className="inline-flex items-center gap-1.5 p-1 rounded-2xl border-2 border-black bg-slate-100 dark:bg-white/10 dark:border-white/20 mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('join');
              setError(null);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              mode === 'join'
                ? 'bg-[#FFF025] text-black border border-black'
                : isDark
                  ? 'text-white/75 hover:text-white'
                  : 'text-slate-700 hover:text-black'
            }`}
          >
            Join Build Buds
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError(null);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              mode === 'signin'
                ? 'bg-[#FFF025] text-black border border-black'
                : isDark
                  ? 'text-white/75 hover:text-white'
                  : 'text-slate-700 hover:text-black'
            }`}
          >
            Sign In
          </button>
        </div>

        <h2
          id="public-auth-title"
          className={`font-chewy text-3xl leading-tight ${isDark ? 'text-white' : 'text-black'}`}
        >
          {mode === 'join' ? 'Join Build Buds Community' : 'Welcome Back to Build Buds'}
        </h2>
        <p
          className={`text-sm font-medium mt-1.5 leading-relaxed ${
            isDark ? 'text-white/75' : 'text-slate-700'
          }`}
        >
          {mode === 'join'
            ? 'Enter your name and connect with Google to create or access your Build Buds community account.'
            : `Sign in to your Build Buds account to ${actionDescription}.`}
        </p>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-600 text-xs font-bold text-rose-800 dark:text-rose-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-5 space-y-4">
          {/* Name Field for Join Build Buds flow */}
          {mode === 'join' && (
            <div>
              <label
                htmlFor="join-builder-name"
                className={`block text-xs font-black uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-[#FFF025]' : 'text-slate-800'
                }`}
              >
                1. Your Name or Builder Nickname
              </label>
              <div className="relative">
                <UserIcon
                  className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                    isDark ? 'text-white/50' : 'text-slate-400'
                  }`}
                />
                <input
                  id="join-builder-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Maya Builds or Alex R."
                  className={`w-full pl-10 pr-3.5 py-2.5 text-sm font-semibold rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-[#FFF025] ${
                    isDark
                      ? 'bg-[#090a10] border-white/25 text-white placeholder:text-white/40'
                      : 'bg-white border-black text-black placeholder:text-slate-400'
                  }`}
                />
              </div>
              <p className={`text-[11px] mt-1 ${isDark ? 'text-white/55' : 'text-slate-500'}`}>
                If you leave this blank, we will use your Google profile name automatically.
              </p>
            </div>
          )}

          {/* Primary Google Authentication Button */}
          <div>
            {mode === 'join' && (
              <span
                className={`block text-xs font-black uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-[#FFF025]' : 'text-slate-800'
                }`}
              >
                2. Authenticate with Google
              </span>
            )}
            <button
              type="button"
              disabled={isLoading}
              onClick={handleGoogleContinue}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#FFF025] hover:bg-[#ffe500] text-black font-black text-sm border-2 border-black brand-shadow flex items-center justify-center gap-3 cursor-pointer transition-transform hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-60"
            >
              <svg
                className="w-5 h-5 bg-white p-0.5 rounded-full border border-black shrink-0"
                viewBox="0 0 24 24"
              >
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>
                {isLoading
                  ? 'Connecting with Google...'
                  : mode === 'join'
                    ? 'Continue with Google & Explore Community'
                    : 'Sign In with Google'}
              </span>
            </button>
          </div>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => setShowEmailForm(!showEmailForm)}
              className={`text-xs font-bold underline cursor-pointer ${
                isDark
                  ? 'text-white/70 hover:text-[#FFF025]'
                  : 'text-slate-600 hover:text-[#B11469]'
              }`}
            >
              {showEmailForm ? 'Hide email & password option' : 'Or use email & password'}
            </button>
          </div>

          {showEmailForm && (
            <form
              onSubmit={handleEmailAuth}
              className={`pt-3 space-y-3 border-t-2 ${
                isDark ? 'border-white/15' : 'border-black/10'
              }`}
            >
              <div>
                <label
                  className={`block text-xs font-black uppercase mb-1 ${
                    isDark ? 'text-white/85' : 'text-slate-800'
                  }`}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={`w-full px-3 py-2 text-sm rounded-xl border-2 ${
                    isDark
                      ? 'border-white/25 bg-[#090a10] text-white'
                      : 'border-black bg-white text-black'
                  }`}
                />
              </div>

              <div>
                <label
                  className={`block text-xs font-black uppercase mb-1 ${
                    isDark ? 'text-white/85' : 'text-slate-800'
                  }`}
                >
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full px-3 py-2 text-sm rounded-xl border-2 ${
                    isDark
                      ? 'border-white/25 bg-[#090a10] text-white'
                      : 'border-black bg-white text-black'
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-2.5 rounded-xl font-bold text-xs border-2 cursor-pointer ${
                  isDark
                    ? 'bg-white text-black border-white hover:bg-[#FFF025]'
                    : 'bg-black text-white border-black hover:bg-slate-900'
                }`}
              >
                {isLoading
                  ? 'Please wait...'
                  : mode === 'signin'
                    ? 'Sign In with Email'
                    : 'Continue with Email'}
              </button>
            </form>
          )}
        </div>

        <div
          className={`mt-6 pt-4 border-t-2 flex items-start gap-2.5 text-xs ${
            isDark ? 'border-white/15 text-white/70' : 'border-black/10 text-slate-600'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-[#B11469] shrink-0 mt-0.5" />
          <div>
            <span className={`font-bold ${isDark ? 'text-white' : 'text-black'}`}>
              Build Buds Community Account:
            </span>{' '}
            Allows you to explore creations, react, comment, and save bookmarks. Private Student
            Hub channels are reserved for verified Jaystarbliss Studios students.
          </div>
        </div>
      </div>
    </div>
  );
};
