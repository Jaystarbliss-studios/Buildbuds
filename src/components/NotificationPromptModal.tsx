import React, { useState } from 'react';
import { Bell, Check, X, Sparkles } from 'lucide-react';
import {
  requestBrowserNotificationPermission,
  sendWelcomeDesktopNotification,
  markNotificationPromptDismissedThisSession,
  BUILDBUDS_LOGO_ICON,
} from '../utils/notifications.ts';

interface NotificationPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionGranted?: () => void;
}

export const NotificationPromptModal: React.FC<NotificationPromptModalProps> = ({
  isOpen,
  onClose,
  onPermissionGranted,
}) => {
  const [isRequesting, setIsRequesting] = useState(false);

  if (!isOpen) return null;

  const handleAccept = async () => {
    setIsRequesting(true);
    try {
      const perm = await requestBrowserNotificationPermission();
      if (perm === 'granted') {
        await sendWelcomeDesktopNotification();
        onPermissionGranted?.();
      }
    } finally {
      setIsRequesting(false);
      markNotificationPromptDismissedThisSession();
      onClose();
    }
  };

  const handleDecline = () => {
    markNotificationPromptDismissedThisSession();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="buildbuds-notif-modal-title"
    >
      <div className="w-full max-w-md rounded-3xl bg-[#12131c] text-white border-3 border-black brand-shadow overflow-hidden">
        {/* Top Accent Banner */}
        <div className="bg-gradient-to-r from-[#FFF025] via-[#FF7A00] to-[#B11469] px-5 py-3.5 border-b-3 border-black flex items-center justify-between">
          <div className="flex items-center gap-2 text-black font-black text-xs uppercase tracking-wider">
            <Bell className="w-4 h-4 stroke-[2.5]" />
            <span>Build Buds Push Notifications</span>
          </div>
          <button
            type="button"
            onClick={handleDecline}
            aria-label="Close notification prompt"
            className="w-7 h-7 rounded-lg bg-black/15 hover:bg-black/25 text-black flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FFF025] border-2 border-black brand-shadow-sm flex items-center justify-center shrink-0 p-2">
              <img
                src={BUILDBUDS_LOGO_ICON}
                alt="Build Buds"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="space-y-1.5">
              <h2
                id="buildbuds-notif-modal-title"
                className="font-chewy text-2xl text-white leading-tight"
              >
                Do you want to receive notifications from Build Buds?
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Press <span className="font-black text-[#FFF025]">Yes</span> to activate push
                notifications. Any new chat message, <span className="font-bold text-white">@mention</span>, or community update from Build Buds will pop up directly in your desktop or phone notification centre.
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5 flex items-center gap-3 text-xs text-slate-300">
            <Sparkles className="w-4 h-4 text-[#FFF025] shrink-0" />
            <span>
              Instant alerts for group chats, <strong className="text-white">@all</strong> tags, creation showcases, and new challenges.
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
            <button
              type="button"
              disabled={isRequesting}
              onClick={handleAccept}
              className="flex-1 py-3 px-5 rounded-2xl border-2 border-black bg-[#FFF025] hover:bg-[#ffe500] text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 brand-shadow-sm cursor-pointer transition-transform active:scale-95 disabled:opacity-60"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isRequesting ? 'Activating...' : 'Yes, Enable Notifications'}</span>
            </button>
            <button
              type="button"
              disabled={isRequesting}
              onClick={handleDecline}
              className="py-3 px-4 rounded-2xl border-2 border-white/15 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs sm:text-sm cursor-pointer transition-colors"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
