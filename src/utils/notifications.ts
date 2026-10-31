export interface NotificationPreferences {
  enabled: boolean;
  mutedChannels: string[];
  soundEnabled: boolean;
}

const PREFS_STORAGE_KEY = 'buildbuds_notification_prefs_v1';
const DEDUPE_STORAGE_PREFIX = 'buildbuds_notified_msg_';

export function loadNotificationPreferences(): NotificationPreferences {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) {
      return {
        enabled: false,
        mutedChannels: [],
        soundEnabled: true,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      enabled: Boolean(parsed.enabled),
      mutedChannels: Array.isArray(parsed.mutedChannels) ? parsed.mutedChannels : [],
      soundEnabled: parsed.soundEnabled !== false,
    };
  } catch {
    return {
      enabled: false,
      mutedChannels: [],
      soundEnabled: true,
    };
  }
}

export function saveNotificationPreferences(prefs: NotificationPreferences): void {
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota errors
  }
}

export type BrowserPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export function getBrowserNotificationPermission(): BrowserPermissionStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as BrowserPermissionStatus;
}

export async function registerBuildBudsServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return registration;
  } catch {
    return null;
  }
}

export async function requestBrowserNotificationPermission(): Promise<BrowserPermissionStatus> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      await registerBuildBudsServiceWorker();
    }
    return result as BrowserPermissionStatus;
  } catch {
    return Notification.permission as BrowserPermissionStatus;
  }
}

/**
 * Claims a message ID across browser tabs so only a single tab displays a notification
 * for a given incoming message.
 */
function claimMessageNotificationOnce(messageId: string): boolean {
  try {
    const key = `${DEDUPE_STORAGE_PREFIX}${messageId}`;
    const existing = localStorage.getItem(key);
    const now = Date.now();
    if (existing && now - Number(existing) < 5 * 60 * 1000) {
      return false;
    }
    localStorage.setItem(key, String(now));
    return true;
  } catch {
    return true;
  }
}

export interface IncomingMessageNotificationParams {
  messageId: string;
  channelId: string;
  channelName: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  text: string;
  currentUserId: string | null | undefined;
  activeStreamId: string;
  preferences: NotificationPreferences;
  onNavigateToChannel?: (channelId: string) => void;
}

/**
 * Evaluates whether a newly arrived message should trigger a browser notification
 * and dispatches it via Service Worker or native Notification API.
 */
export async function dispatchMessageBrowserNotification(
  params: IncomingMessageNotificationParams
): Promise<boolean> {
  const {
    messageId,
    channelId,
    channelName,
    authorId,
    authorName,
    authorAvatarUrl,
    text,
    currentUserId,
    activeStreamId,
    preferences,
    onNavigateToChannel,
  } = params;

  // 1. Must have notifications enabled in user preferences and granted in browser
  if (!preferences.enabled) return false;
  if (getBrowserNotificationPermission() !== 'granted') return false;

  // 2. Never notify for the user's own messages
  if (!currentUserId || authorId === currentUserId) return false;

  // 3. Respect muted channels
  const baseChannelId = channelId.split('__group__')[0];
  if (
    preferences.mutedChannels.includes(channelId) ||
    preferences.mutedChannels.includes(baseChannelId)
  ) {
    return false;
  }

  // 4. Do not notify if the user is actively viewing this exact channel in a focused tab
  const isTabFocusedAndVisible =
    typeof document !== 'undefined' &&
    document.visibilityState === 'visible' &&
    document.hasFocus();

  if (isTabFocusedAndVisible && activeStreamId === channelId) {
    return false;
  }

  // 5. Deduplicate across multiple open tabs
  if (!claimMessageNotificationOnce(messageId)) {
    return false;
  }

  const snippet = text.length > 110 ? `${text.slice(0, 107)}...` : text || 'Shared a creation link';
  const title = `${authorName} in #${channelName}`;
  const icon = authorAvatarUrl || '/assets/aistudio/images/aurora logo (1).png';

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(title, {
          body: snippet,
          icon,
          badge: '/assets/aistudio/images/aurora logo (1).png',
          tag: `buildbuds-msg-${messageId}`,
          data: { channelId: baseChannelId },
        });
        return true;
      }
    }

    const notification = new Notification(title, {
      body: snippet,
      icon,
      tag: `buildbuds-msg-${messageId}`,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      if (onNavigateToChannel) {
        onNavigateToChannel(baseChannelId);
      }
    };
    return true;
  } catch {
    return false;
  }
}
