import React, { useState } from 'react';
import { Download, Smartphone, Monitor, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../utils/usePWAInstall.ts';

interface PWAInstallButtonProps {
  onLaunchAppMode?: () => void;
  variant?: 'header' | 'mobile' | 'hub';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  onLaunchAppMode,
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Hide install button if already running as an installed standalone PWA
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        onLaunchAppMode?.();
      }
      return;
    }
    setShowGuideModal(true);
  };

  const buttonClasses =
    variant === 'mobile'
      ? 'w-full py-2.5 px-4 text-sm font-black text-white bg-[#B11469] hover:bg-[#c91878] rounded-xl border-2 border-black brand-shadow flex items-center justify-center gap-2 cursor-pointer'
      : variant === 'hub'
        ? 'w-full py-2 px-3 text-xs font-black text-black bg-[#FFF025] hover:bg-[#ffe500] rounded-xl border border-black flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95'
        : 'inline-flex items-center gap-2 px-3.5 py-2 text-xs font-black text-white bg-[#B11469] hover:bg-[#c91878] rounded-xl border-2 border-black brand-shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0.5 cursor-pointer';

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className={buttonClasses}
        title="Download Build Buds Web App"
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>{isIOS ? 'Install on iOS' : 'Download App'}</span>
      </button>

      {showGuideModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
        >
          <div className="relative w-full max-w-md rounded-3xl bg-[#10101f] border-2 border-white/20 p-6 text-white shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              aria-label="Close install guide"
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <img
                src="/pwa-192x192.png"
                alt="Build Buds App"
                className="w-12 h-12 rounded-2xl border-2 border-[#FFF025] object-cover shrink-0"
              />
              <div>
                <h3 id="pwa-install-title" className="font-chewy text-2xl text-[#FFF025] tracking-wide">
                  Download Build Buds App
                </h3>
                <p className="text-xs text-white/70">
                  Fast standalone web app • Direct sign-in to your account
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5 text-xs text-white/85">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>First-Time Launch:</strong> Opens directly to the dedicated Sign In / Sign Up screen (skips the marketing website).
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Subsequent Launches:</strong> Automatically signs you straight into your Build Buds Community Hub account.
                </span>
              </div>
            </div>

            {isIOS ? (
              <div className="p-4 rounded-2xl bg-[#18192c] border border-[#FFF025]/40 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-black text-[#FFF025] uppercase tracking-wider">
                  <Smartphone className="w-4 h-4" />
                  <span>Install on iPhone / iPad</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-white/85 leading-relaxed">
                  <li>
                    Tap the <strong>Share</strong> button in your Safari toolbar.
                  </li>
                  <li>
                    Scroll down and tap <strong>Add to Home Screen</strong>.
                  </li>
                  <li>
                    Launch <strong>Build Buds</strong> from your Home Screen!
                  </li>
                </ol>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#18192c] border border-white/15 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-black text-[#FFF025] uppercase tracking-wider">
                  <Monitor className="w-4 h-4" />
                  <span>Install on Desktop or Android</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-white/85 leading-relaxed">
                  <li>
                    Click the <strong>Install Build Buds</strong> icon in your browser&apos;s address bar (or open the browser menu <strong>⋮ → Install app / Add to Home screen</strong>).
                  </li>
                  <li>
                    Or click <strong>Launch Web App Mode Now</strong> below to open the dedicated app experience immediately.
                  </li>
                </ol>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              {onLaunchAppMode && (
                <button
                  type="button"
                  onClick={() => {
                    setShowGuideModal(false);
                    onLaunchAppMode();
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#FFF025] hover:bg-[#ffe500] text-black font-black text-xs border-2 border-black brand-shadow flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Monitor className="w-4 h-4" />
                  <span>Launch Web App Mode Now</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-black border-2 border-black shadow-lg">
      <span className="h-2 w-2 rounded-full bg-black animate-pulse" />
      <span>Offline Mode — Cached app data is active</span>
    </div>
  );
};
