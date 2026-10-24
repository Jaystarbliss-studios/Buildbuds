import React, { useState } from 'react';
import { X, Check, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { validateJoinForm, JoinFormData } from '../utils/communityLogic.ts';

interface JoinModalProps {
  isOpen: boolean;
  initialMode?: 'join' | 'signin';
  onClose: () => void;
  onSuccess: (data: JoinFormData) => void;
}

export const JoinModal: React.FC<JoinModalProps> = ({
  isOpen,
  initialMode = 'join',
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'join' | 'signin'>(initialMode);
  const [signInIdentifier, setSignInIdentifier] = useState('');
  const [signInError, setSignInError] = useState('');
  const [formData, setFormData] = useState<JoinFormData>({
    fullName: '',
    schoolName: '',
    gradeLevel: 'Grade 8',
    primaryInterest: 'Games & Simulations',
    agreedToValues: false,
  });

  const [selectedAvatarBg, setSelectedAvatarBg] = useState<string>('#FFF025');
  const [errors, setErrors] = useState<Partial<Record<keyof JoinFormData, string>>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateJoinForm(formData);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    setIsSubmitted(true);
    onSuccess(formData);
  };

  const handleSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInIdentifier.trim()) {
      setSignInError('Please enter your builder username or school code.');
      return;
    }
    setFormData({
      fullName: signInIdentifier.trim(),
      schoolName: 'Build Buds Network',
      gradeLevel: 'Student Builder',
      primaryInterest: 'All Creations',
      agreedToValues: true,
    });
    setIsSubmitted(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl border-2 border-black brand-shadow-lg p-6 sm:p-8 my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-5 right-5 p-1.5 rounded-lg border-2 border-black bg-white hover:bg-black/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Tab switcher: Join vs Sign In */}
        {!isSubmitted && (
          <div className="flex gap-2 mb-6 border-b-2 border-black/10 pb-2">
            <button
              type="button"
              onClick={() => setMode('join')}
              className={`px-4 py-1.5 rounded-xl text-xs font-black border-2 border-black cursor-pointer transition-all ${
                mode === 'join' ? 'bg-[#FFF025] brand-shadow-sm -translate-y-0.5' : 'bg-white hover:bg-black/5'
              }`}
            >
              New Builder Registration
            </button>
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`px-4 py-1.5 rounded-xl text-xs font-black border-2 border-black cursor-pointer transition-all ${
                mode === 'signin' ? 'bg-[#FFF025] brand-shadow-sm -translate-y-0.5' : 'bg-white hover:bg-black/5'
              }`}
            >
              Sign In
            </button>
          </div>
        )}

        {isSubmitted ? (
          <div className="text-center py-6 space-y-4">
            <div
              className="w-16 h-16 mx-auto rounded-3xl border-2 border-black flex items-center justify-center text-3xl brand-shadow"
              style={{ backgroundColor: selectedAvatarBg }}
            >
              🎉
            </div>
            <h3 id="join-modal-title" className="font-chewy text-3xl sm:text-4xl text-black">
              Welcome to Build Buds, {formData.fullName}!
            </h3>
            <p className="text-sm text-black/80 font-medium leading-relaxed max-w-sm mx-auto">
              You are now part of our cross-school creator community representing <span className="font-bold text-black">{formData.schoolName}</span>.
            </p>

            {/* Builder Card Preview */}
            <div className="p-4 rounded-2xl border-2 border-black bg-black text-white text-left max-w-xs mx-auto space-y-2">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full border border-white flex items-center justify-center font-bold text-black text-sm"
                  style={{ backgroundColor: selectedAvatarBg }}
                >
                  {formData.fullName.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{formData.fullName}</div>
                  <div className="text-xs text-white/70">{formData.schoolName} • {formData.gradeLevel}</div>
                </div>
              </div>
              <div className="pt-2 border-t border-white/20 flex justify-between text-xs font-mono">
                <span className="text-[#FFF025]">{formData.primaryInterest}</span>
                <span className="text-white/60">Ready to Build</span>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={onClose}
                className="w-full py-3 text-sm font-black text-black rounded-xl border-2 border-black brand-shadow cursor-pointer"
                style={{ backgroundColor: '#FFF025' }}
              >
                Jump into the Community
              </button>
            </div>
          </div>
        ) : mode === 'signin' ? (
          <div>
            <div className="mb-6">
              <span
                className="inline-block px-3 py-1 rounded-md border border-black text-xs font-black uppercase mb-2"
                style={{ backgroundColor: '#FFF025' }}
              >
                Builder Access
              </span>
              <h3 id="join-modal-title" className="font-chewy text-3xl sm:text-4xl text-black">
                Sign In to Build Buds
              </h3>
              <p className="text-xs text-black/75 font-medium mt-1">
                Enter your builder username or student invite code to access your community stream.
              </p>
            </div>

            <form onSubmit={handleSignInSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                  Builder Handle or Email *
                </label>
                <input
                  type="text"
                  value={signInIdentifier}
                  onChange={(e) => setSignInIdentifier(e.target.value)}
                  placeholder="e.g. maya_builder or student@school.org"
                  className="w-full px-3.5 py-2.5 text-sm border-2 border-black rounded-xl bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#B11469]"
                />
                {signInError && (
                  <p className="text-xs font-bold text-[#B11469] mt-1">{signInError}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                  Password or School Passcode
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 text-sm border-2 border-black rounded-xl bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#B11469]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 text-sm font-black text-black rounded-xl border-2 border-black brand-shadow transition-transform hover:-translate-y-0.5 active:translate-y-0.5 cursor-pointer"
                  style={{ backgroundColor: '#FFF025' }}
                >
                  Sign In to Community
                </button>
              </div>

              <div className="text-center text-xs text-black/70 pt-2">
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => setMode('join')}
                  className="font-bold underline text-[#B11469] cursor-pointer"
                >
                  Register here
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <span
                className="inline-block px-3 py-1 rounded-md border border-black text-xs font-black uppercase mb-2"
                style={{ backgroundColor: '#FFF025' }}
              >
                Student Registration
              </span>
              <h3 id="join-modal-title" className="font-chewy text-3xl sm:text-4xl text-black">
                Join Build Buds
              </h3>
              <p className="text-xs text-black/75 font-medium mt-1">
                Create your builder identity to share projects, join discussions, and tackle challenges.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                  Builder Name or Nickname *
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Maya, Jordan K., or NeoBuilder"
                  className="w-full px-3.5 py-2.5 text-sm border-2 border-black rounded-xl bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#B11469]"
                />
                {errors.fullName && (
                  <p className="text-xs font-bold text-[#B11469] mt-1">{errors.fullName}</p>
                )}
              </div>

              {/* School Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                  School or Learning Community *
                </label>
                <input
                  type="text"
                  value={formData.schoolName}
                  onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  placeholder="e.g. Westfield Middle School or Home Schoolers Group"
                  className="w-full px-3.5 py-2.5 text-sm border-2 border-black rounded-xl bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#B11469]"
                />
                {errors.schoolName && (
                  <p className="text-xs font-bold text-[#B11469] mt-1">{errors.schoolName}</p>
                )}
              </div>

              {/* Grade & Primary Interest */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                    Grade Level
                  </label>
                  <select
                    value={formData.gradeLevel}
                    onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm border-2 border-black rounded-xl bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#B11469]"
                  >
                    <option value="Grade 5-6">Grade 5-6</option>
                    <option value="Grade 7">Grade 7</option>
                    <option value="Grade 8">Grade 8</option>
                    <option value="Grade 9">Grade 9</option>
                    <option value="Grade 10-12">Grade 10-12</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                    Favorite Thing to Build
                  </label>
                  <select
                    value={formData.primaryInterest}
                    onChange={(e) => setFormData({ ...formData, primaryInterest: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm border-2 border-black rounded-xl bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#B11469]"
                  >
                    <option value="Games & Simulations">Games & Simulations</option>
                    <option value="Websites & Portfolios">Websites & Portfolios</option>
                    <option value="Creative Tools & Art">Creative Tools & Art</option>
                    <option value="Science & Experiments">Science & Experiments</option>
                  </select>
                </div>
              </div>

              {/* Avatar Accent Color Picker */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                  Choose Your Badge Accent
                </label>
                <div className="flex items-center gap-3">
                  {[
                    { color: '#FFF025', name: 'Lemon Yellow' },
                    { color: '#B11469', name: 'Berry Pink' },
                    { color: '#C15D00', name: 'Burnt Orange' },
                  ].map((item) => (
                    <button
                      key={item.color}
                      type="button"
                      onClick={() => setSelectedAvatarBg(item.color)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 border-black text-xs font-bold transition-all cursor-pointer ${
                        selectedAvatarBg === item.color ? 'ring-2 ring-black brand-shadow-sm scale-105' : 'opacity-80'
                      }`}
                      style={{ backgroundColor: item.color, color: item.color === '#FFF025' ? '#000000' : '#FFFFFF' }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full border border-black bg-white" />
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Values Agreement */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.agreedToValues}
                    onChange={(e) => setFormData({ ...formData, agreedToValues: e.target.checked })}
                    className="mt-1 w-4 h-4 rounded border-2 border-black text-[#B11469] focus:ring-black"
                  />
                  <span className="text-xs font-semibold text-black leading-snug">
                    I agree to build boldly, treat fellow creators with kindness, and follow community safety rules.
                  </span>
                </label>
                {errors.agreedToValues && (
                  <p className="text-xs font-bold text-[#B11469] mt-1">{errors.agreedToValues}</p>
                )}
              </div>

              {/* Submit CTA */}
              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-3.5 text-sm font-black text-black rounded-xl border-2 border-black brand-shadow transition-transform hover:-translate-y-0.5 active:translate-y-0.5 cursor-pointer"
                  style={{ backgroundColor: '#FFF025' }}
                >
                  Complete Registration & Join
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
