import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { validateJoinForm, JoinFormData } from '../utils/communityLogic.ts';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  checkExistingBuilderProfile,
  registerBuilderProfile,
  BuilderProfile,
  User,
} from '../firebase.ts';

interface JoinModalProps {
  isOpen: boolean;
  initialMode?: 'join' | 'signin';
  onClose: () => void;
  onSuccess: (profile: BuilderProfile, user: User) => void;
  onAuthBusyChange?: (busy: boolean) => void;
}

function formatFriendlyError(err: unknown, fallback: string): string {
  const code = (err as { code?: string })?.code || '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Google window was closed before completing.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Email/Password authentication is not enabled in Firebase Console yet. Please use Google above.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'This email is already registered. Switch to the Sign In tab to sign in.';
  }
  if (
    code === 'auth/user-not-found' ||
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password'
  ) {
    return 'User not signed up or invalid password. Please sign up first if you do not have an account.';
  }
  if (err instanceof Error) {
    if (err.message.trim().startsWith('{')) {
      return fallback;
    }
    return err.message;
  }
  return fallback;
}

export const JoinModal: React.FC<JoinModalProps> = ({
  isOpen,
  initialMode = 'join',
  onClose,
  onSuccess,
  onAuthBusyChange,
}) => {
  const [mode, setMode] = useState<'join' | 'signin'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [redirectNotice, setRedirectNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<JoinFormData>({
    fullName: '',
    schoolName: '',
    gradeLevel: 'Grade 8',
    primaryInterest: 'Games & Simulations',
    agreedToValues: true,
  });

  const [selectedAvatarBg, setSelectedAvatarBg] = useState<string>('#FFF025');
  const [errors, setErrors] = useState<Partial<Record<keyof JoinFormData, string>>>({});
  const [createdProfile, setCreatedProfile] = useState<BuilderProfile | null>(null);

  if (!isOpen) return null;

  // SIGN IN with Google: ONLY allows users whose account is ALREADY signed up in the database
  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setRedirectNotice(null);
    setIsLoading(true);
    onAuthBusyChange?.(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const existingProfile = await checkExistingBuilderProfile(result.user);

      if (!existingProfile) {
        // User has NOT signed up in the database yet!
        const googleName = result.user.displayName || '';
        const googleEmail = result.user.email || '';

        // Immediately sign out so the unregistered Gmail cannot access the website
        await signOut(auth);

        if (googleName && !formData.fullName.trim()) {
          setFormData((prev) => ({ ...prev, fullName: googleName }));
        }
        if (googleEmail && !email.trim()) {
          setEmail(googleEmail);
        }

        // Redirect user to the Sign Up section
        setMode('join');
        setRedirectNotice(
          'User not signed up! Your Gmail is not in the database yet. We have redirected you to Sign Up — please sign up below first to access Build Buds.'
        );
        return;
      }

      setCreatedProfile(existingProfile);
      onSuccess(existingProfile, result.user);
    } catch (err: unknown) {
      try {
        await signOut(auth);
      } catch {
        // Ignore signOut error
      }
      setAuthError(formatFriendlyError(err, 'Could not sign in. Please make sure you have signed up first.'));
    } finally {
      onAuthBusyChange?.(false);
      setIsLoading(false);
    }
  };

  // SIGN UP with Google: Creates the user's Builder account in the database
  const handleGoogleSignUp = async () => {
    setAuthError(null);
    setRedirectNotice(null);

    if (!formData.agreedToValues) {
      setErrors({ agreedToValues: 'Please agree to the community guidelines to sign up.' });
      return;
    }

    setErrors({});
    setIsLoading(true);
    onAuthBusyChange?.(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const profile = await registerBuilderProfile(result.user, {
        displayName:
          formData.fullName.trim() ||
          result.user.displayName ||
          (result.user.email ? result.user.email.split('@')[0] : 'Builder'),
        schoolName: formData.schoolName.trim() || 'Build Buds Creator Club',
        gradeLevel: formData.gradeLevel || 'Grade 8',
        primaryInterest: formData.primaryInterest || 'Games & Simulations',
        avatarColor: selectedAvatarBg,
        acceptedGuidelines: formData.agreedToValues,
      });

      setCreatedProfile(profile);
      onSuccess(profile, result.user);
    } catch (err: unknown) {
      try {
        await signOut(auth);
      } catch {
        // Ignore signOut error
      }
      setAuthError(formatFriendlyError(err, 'Could not complete Google Sign Up. Please try again.'));
    } finally {
      onAuthBusyChange?.(false);
      setIsLoading(false);
    }
  };

  // SIGN UP with Email & Password: Creates the user's Builder account in the database
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setRedirectNotice(null);

    const result = validateJoinForm(formData);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setAuthError('Please enter a valid email address for your account.');
      return;
    }

    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      return;
    }

    setErrors({});
    setIsLoading(true);
    onAuthBusyChange?.(true);

    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: formData.fullName.trim() });

      const profile = await registerBuilderProfile(cred.user, {
        displayName: formData.fullName.trim(),
        schoolName: formData.schoolName.trim(),
        gradeLevel: formData.gradeLevel,
        primaryInterest: formData.primaryInterest,
        avatarColor: selectedAvatarBg,
        acceptedGuidelines: formData.agreedToValues,
      });

      setCreatedProfile(profile);
      onSuccess(profile, cred.user);
    } catch (err: unknown) {
      try {
        await signOut(auth);
      } catch {
        // Ignore
      }
      setAuthError(formatFriendlyError(err, 'Could not complete registration.'));
    } finally {
      onAuthBusyChange?.(false);
      setIsLoading(false);
    }
  };

  // SIGN IN with Email & Password: ONLY allows users whose account is ALREADY in the database
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setRedirectNotice(null);

    if (!email.trim() || !password) {
      setAuthError('Please enter your email address and password, or click Sign In with Google.');
      return;
    }

    setIsLoading(true);
    onAuthBusyChange?.(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const existingProfile = await checkExistingBuilderProfile(cred.user);

      if (!existingProfile) {
        await signOut(auth);
        setMode('join');
        setRedirectNotice(
          'User not signed up! Your account is not in the database yet. We have redirected you to Sign Up — please sign up below first.'
        );
        return;
      }

      setCreatedProfile(existingProfile);
      onSuccess(existingProfile, cred.user);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
        setMode('join');
        setRedirectNotice(
          'User not signed up! We could not find that account in the database. Please sign up below first.'
        );
      } else {
        setAuthError(formatFriendlyError(err, 'Invalid email or password.'));
      }
    } finally {
      onAuthBusyChange?.(false);
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative w-full max-w-lg bg-[#10101f] text-white rounded-3xl border-2 border-white/20 brand-shadow-yellow p-6 sm:p-8 my-8 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-5 right-5 p-1.5 rounded-lg border-2 border-white/20 bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Tab switcher: Sign Up vs Sign In */}
        {!createdProfile && (
          <div className="flex gap-2 mb-5 border-b-2 border-white/15 pb-3">
            <button
              type="button"
              onClick={() => {
                setMode('join');
                setAuthError(null);
              }}
              className={`px-4 py-1.5 rounded-xl text-xs font-black border-2 cursor-pointer transition-all ${
                mode === 'join'
                  ? 'bg-[#FFF025] text-black border-black brand-shadow-sm -translate-y-0.5'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
            >
              Sign Up (Create Account)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setAuthError(null);
                setRedirectNotice(null);
              }}
              className={`px-4 py-1.5 rounded-xl text-xs font-black border-2 cursor-pointer transition-all ${
                mode === 'signin'
                  ? 'bg-[#FFF025] text-black border-black brand-shadow-sm -translate-y-0.5'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
            >
              Sign In
            </button>
          </div>
        )}

        {createdProfile ? (
          <div className="text-center py-6 space-y-4">
            <div
              className="w-16 h-16 mx-auto rounded-3xl border-2 border-black flex items-center justify-center text-3xl brand-shadow"
              style={{ backgroundColor: createdProfile.avatarColor }}
            >
              🎉
            </div>
            <h3 id="join-modal-title" className="font-chewy text-3xl sm:text-4xl text-white">
              Welcome, {createdProfile.displayName}!
            </h3>
            <p className="text-sm text-white/80 font-medium leading-relaxed max-w-sm mx-auto">
              Your Build Buds account is active and stays signed in automatically across visits.
            </p>

            {/* Builder Card Preview */}
            <div className="p-4 rounded-2xl border-2 border-white/20 bg-black/60 text-white text-left max-w-xs mx-auto space-y-2">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full border border-white flex items-center justify-center font-bold text-black text-sm"
                  style={{ backgroundColor: createdProfile.avatarColor }}
                >
                  {createdProfile.displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{createdProfile.displayName}</div>
                  <div className="text-xs text-white/70">
                    {createdProfile.schoolName || 'Build Buds Creator Club'} •{' '}
                    {createdProfile.gradeLevel || 'Builder'}
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-white/20 flex justify-between text-xs font-mono">
                <span className="text-[#FFF025]">
                  {createdProfile.primaryInterest || 'Games & Simulations'}
                </span>
                <span className="text-emerald-400">● Online</span>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={onClose}
                className="w-full py-3.5 text-sm font-black text-black rounded-xl border-2 border-black brand-shadow cursor-pointer"
                style={{ backgroundColor: '#FFF025' }}
              >
                Enter the Community Hub
              </button>
            </div>
          </div>
        ) : (
          <div>
            {redirectNotice && (
              <div className="mb-4 p-3.5 rounded-xl bg-amber-500/20 border-2 border-[#FFF025] text-xs text-[#FFF025] font-bold flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#FFF025] shrink-0 mt-0.5" />
                <span>{redirectNotice}</span>
              </div>
            )}

            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {/* Google Action Button: Explicitly separated between Sign In (checks DB) and Sign Up (registers in DB) */}
            <div className="mb-5">
              <button
                type="button"
                disabled={isLoading}
                onClick={mode === 'signin' ? handleGoogleSignIn : handleGoogleSignUp}
                className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-gray-100 text-slate-900 font-black text-sm border-2 border-black brand-shadow flex items-center justify-center gap-3 cursor-pointer transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                  {mode === 'signin'
                    ? 'Sign In with Google (Existing Users Only)'
                    : 'Sign Up with Google (Create New Account)'}
                </span>
              </button>

              <div className="relative flex py-3 items-center">
                <div className="flex-grow border-t border-white/15" />
                <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-white/45 font-bold">
                  Or use Email & Password
                </span>
                <div className="flex-grow border-t border-white/15" />
              </div>
            </div>

            {mode === 'signin' ? (
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/90 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="builder@school.org"
                    className="w-full px-3.5 py-2.5 text-sm border-2 border-white/20 rounded-xl bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-[#FFF025]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/90 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 text-sm border-2 border-white/20 rounded-xl bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-[#FFF025]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 text-sm font-black text-black rounded-xl border-2 border-black brand-shadow transition-transform hover:-translate-y-0.5 active:translate-y-0.5 cursor-pointer disabled:opacity-60"
                    style={{ backgroundColor: '#FFF025' }}
                  >
                    {isLoading ? 'Signing in...' : 'Sign In with Email'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleEmailRegister} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/90 mb-1">
                      Builder Nickname *
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="e.g. Maya_Builds"
                      className="w-full px-3 py-2 text-sm border-2 border-white/20 rounded-xl bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-[#FFF025]"
                    />
                    {errors.fullName && (
                      <p className="text-[11px] font-bold text-[#FFF025] mt-1">{errors.fullName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/90 mb-1">
                      School or Club *
                    </label>
                    <input
                      type="text"
                      value={formData.schoolName}
                      onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                      placeholder="e.g. Westfield High"
                      className="w-full px-3 py-2 text-sm border-2 border-white/20 rounded-xl bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-[#FFF025]"
                    />
                    {errors.schoolName && (
                      <p className="text-[11px] font-bold text-[#FFF025] mt-1">{errors.schoolName}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/90 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3 py-2 text-sm border-2 border-white/20 rounded-xl bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-[#FFF025]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/90 mb-1">
                      Password (6+ chars) *
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-sm border-2 border-white/20 rounded-xl bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-[#FFF025]"
                    />
                  </div>
                </div>

                {/* Avatar Accent Color Picker */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/90 mb-1">
                    Choose Your Badge Accent
                  </label>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {[
                      { color: '#FFF025', name: 'Lemon Yellow' },
                      { color: '#B11469', name: 'Berry Pink' },
                      { color: '#C15D00', name: 'Burnt Orange' },
                    ].map((item) => (
                      <button
                        key={item.color}
                        type="button"
                        onClick={() => setSelectedAvatarBg(item.color)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border-2 border-black text-xs font-bold transition-all cursor-pointer ${
                          selectedAvatarBg === item.color ? 'ring-2 ring-white scale-105' : 'opacity-80'
                        }`}
                        style={{
                          backgroundColor: item.color,
                          color: item.color === '#FFF025' ? '#000000' : '#FFFFFF',
                        }}
                      >
                        <span className="w-2.5 h-2.5 rounded-full border border-black bg-white" />
                        <span>{item.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Values Agreement */}
                <div className="pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.agreedToValues}
                      onChange={(e) =>
                        setFormData({ ...formData, agreedToValues: e.target.checked })
                      }
                      className="mt-1 w-4 h-4 rounded border-2 border-white/40 bg-white/10 text-[#FFF025] focus:ring-0"
                    />
                    <span className="text-xs font-semibold text-white/85 leading-snug">
                      I agree to build boldly, treat fellow creators with kindness, and follow community safety guidelines.
                    </span>
                  </label>
                  {errors.agreedToValues && (
                    <p className="text-xs font-bold text-[#FFF025] mt-1">
                      {errors.agreedToValues}
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 text-sm font-black text-black rounded-xl border-2 border-black brand-shadow transition-transform hover:-translate-y-0.5 active:translate-y-0.5 cursor-pointer disabled:opacity-60"
                    style={{ backgroundColor: '#FFF025' }}
                  >
                    {isLoading ? 'Creating Account...' : 'Create Email Account & Open Hub'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
