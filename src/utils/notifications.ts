export interface NotificationPreferences {
  enabled: boolean;
  mutedChannels: string[];
  mutedChannelIds?: string[];
  explicitlyDisabled?: boolean;
}

const NOTIFICATION_PREFS_STORAGE_KEY = 'buildbuds_notification_prefs_v1';
const NOTIFICATION_PROMPT_DISMISSED_KEY = 'buildbuds_notif_prompt_dismissed_session';
export const BUILDBUDS_LOGO_ICON = '/assets/aistudio/images/aurora-logo.png';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  mutedChannels: [],
  mutedChannelIds: [],
  explicitlyDisabled: false,
};

/**
 * Load user's saved notification preferences from localStorage.
 * If browser Notification permission is already 'granted' and the user hasn't explicitly disabled
 * notifications, `enabled` is automatically true so desktop notifications work seamlessly.
 */
export const loadNotificationPreferences = (): NotificationPreferences => {
  const permissionGranted =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted';

  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_PREFS_STORAGE_KEY);
    if (!raw) {
      return {
        enabled: permissionGranted,
        mutedChannels: [],
        mutedChannelIds: [],
        explicitlyDisabled: false,
      };
    }
    const parsed = JSON.parse(raw);
    const explicitlyDisabled = Boolean(parsed?.explicitlyDisabled);
    const rawMuted = Array.isArray(parsed?.mutedChannels)
      ? parsed.mutedChannels
      : Array.isArray(parsed?.mutedChannelIds)
      ? parsed.mutedChannelIds
      : [];
    const muted = rawMuted.filter((id: unknown): id is string => typeof id === 'string');
    return {
      enabled: explicitlyDisabled ? false : Boolean(parsed?.enabled || permissionGranted),
      mutedChannels: muted,
      mutedChannelIds: muted,
      explicitlyDisabled,
    };
  } catch {
    return {
      enabled: permissionGranted,
      mutedChannels: [],
      mutedChannelIds: [],
      explicitlyDisabled: false,
    };
  }
};

/**
 * Persist notification preferences to localStorage.
 */
export const saveNotificationPreferences = (prefs: NotificationPreferences): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      NOTIFICATION_PREFS_STORAGE_KEY,
      JSON.stringify({
        ...prefs,
        explicitlyDisabled: !prefs.enabled,
      })
    );
  } catch {
    // Storage quota or privacy mode
  }
};

export const hasDismissedNotificationPromptThisSession = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(NOTIFICATION_PROMPT_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
};

export const markNotificationPromptDismissedThisSession = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(NOTIFICATION_PROMPT_DISMISSED_KEY, '1');
  } catch {
    // Ignore
  }
};

/**
 * Check if browser supports Web Notifications + Service Workers.
 */
export const isBrowserNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export type BrowserPermissionStatus = NotificationPermission | 'unsupported';

/**
 * Get current browser Notification permission state.
 */
export const getBrowserNotificationPermission = (): BrowserPermissionStatus => {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

/**
 * Register the Build Buds service worker (`/sw.js`) for background/system notifications.
 */
export const registerNotificationServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return registration;
  } catch {
    return null;
  }
};

export const registerBuildBudsServiceWorker = registerNotificationServiceWorker;

/**
 * Request browser notification permission and register service worker if granted.
 */
export const requestBrowserNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await registerNotificationServiceWorker();
      const currentPrefs = loadNotificationPreferences();
      saveNotificationPreferences({
        ...currentPrefs,
        enabled: true,
        explicitlyDisabled: false,
      });
    }
    return permission;
  } catch {
    return Notification.permission;
  }
};

/**
 * Low-level helper that sends a real OS / Desktop notification to the Chrome/PC notification centre.
 * Uses ServiceWorkerRegistration.showNotification AND falls back to `new Notification()` so it
 * reliably appears in the desktop notification tray.
 */
export const triggerSystemDesktopNotification = async (params: {
  title: string;
  body: string;
  tag: string;
  iconUrl?: string;
  channelId?: string;
  actionUrl?: string;
  onClick?: () => void;
}): Promise<boolean> => {
  if (!isBrowserNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  const icon = params.iconUrl || BUILDBUDS_LOGO_ICON;
  const truncatedBody =
    params.body.length > 140 ? `${params.body.slice(0, 137)}...` : params.body;

  // Prefer direct `new Notification()` when the page is open on desktop Chrome/Edge/Firefox
  // because it immediately pops a native toast in the OS notification centre and supports direct onclick,
  // and fallback to ServiceWorkerRegistration.showNotification if constructor is restricted (e.g. mobile Chrome).
  try {
    const notif = new Notification(params.title, {
      body: truncatedBody,
      icon,
      badge: BUILDBUDS_LOGO_ICON,
      tag: params.tag,
    });
    notif.onclick = () => {
      window.focus();
      notif.close();
      params.onClick?.();
    };
    return true;
  } catch {
    // Fallback to Service Worker registration (required on Android Chrome / standalone PWA)
    try {
      if ('serviceWorker' in navigator) {
        const registration =
          (await navigator.serviceWorker.getRegistration('/')) ||
          (await registerNotificationServiceWorker());
        if (registration && typeof registration.showNotification === 'function') {
          await registration.showNotification(params.title, {
            body: truncatedBody,
            icon,
            badge: BUILDBUDS_LOGO_ICON,
            tag: params.tag,
            data: {
              channelId: params.channelId || '',
              actionUrl: params.actionUrl || '/community',
            },
          });
          return true;
        }
      }
    } catch {
      // Ignore
    }
  }
  return false;
};

/**
 * Send an immediate confirmation notification when the user enables notifications.
 */
export const sendWelcomeDesktopNotification = async (): Promise<boolean> => {
  return triggerSystemDesktopNotification({
    title: 'Build Buds Notifications Enabled! 🚀',
    body: 'You will now receive live messages, @mentions, and community updates right in your notification centre.',
    tag: `buildbuds-welcome-${Date.now()}`,
    actionUrl: '/community',
  });
};

export interface DispatchMessageNotificationParams {
  messageId: string;
  channelId: string;
  channelName: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  text: string;
  currentUserId: string;
  currentUserDisplayName?: string;
  activeStreamId?: string;
  preferences: NotificationPreferences;
  onNavigateToChannel?: (channelId: string) => void;
}

/**
 * Dispatch a browser/system notification for a new incoming chat message.
 * Fires whenever a message is sent by another user (or if `@all` / `@username` is tagged)
 * so it pops up in the user's desktop/PC notification centre.
 */
export const dispatchMessageBrowserNotification = async (
  params: DispatchMessageNotificationParams
): Promise<boolean> => {
  const {
    messageId,
    channelId,
    channelName,
    authorId,
    authorName,
    authorAvatarUrl,
    text,
    currentUserId,
    currentUserDisplayName,
    preferences,
    onNavigateToChannel,
  } = params;

  if (!isBrowserNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;
  if (preferences.explicitlyDisabled) return false;

  // Never notify the sender of their own message
  if (authorId === currentUserId) return false;

  const baseChannelId = channelId.split('__group__')[0];
  const mutedList = preferences.mutedChannels || preferences.mutedChannelIds || [];
  if (mutedList.includes(baseChannelId)) {
    return false;
  }

  const lower = (text || '').toLowerCase();
  const isAllMention = /(?:^|\s)@all(?:\b|\s|$|[!?,.:;])/i.test(lower);
  const isUserMention =
    Boolean(currentUserDisplayName) &&
    lower.includes(`@${currentUserDisplayName!.trim().toLowerCase()}`);

  const title = isAllMention
    ? `📣 ${authorName} tagged @all in #${channelName}`
    : isUserMention
    ? `🔔 ${authorName} mentioned you in #${channelName}`
    : `${authorName} in #${channelName}`;

  const bodyText = text.trim() || 'Shared a new creation in Build Buds';

  return triggerSystemDesktopNotification({
    title,
    body: bodyText,
    tag: `buildbuds-msg-${messageId}`,
    iconUrl: authorAvatarUrl || BUILDBUDS_LOGO_ICON,
    channelId: baseChannelId,
    actionUrl: `/hub?channel=${encodeURIComponent(baseChannelId)}`,
    onClick: () => {
      onNavigateToChannel?.(baseChannelId);
    },
  });
};
