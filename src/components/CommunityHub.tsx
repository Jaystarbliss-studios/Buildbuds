import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  Send,
  Plus,
  Reply,
  MessageSquare,
  ExternalLink,
  Flag,
  Trash2,
  ShieldCheck,
  Image as ImageIcon,
  Link as LinkIcon,
  X,
  LogOut,
  LogIn,
  Sparkles,
  Gamepad2,
  Globe,
  Video,
  BookOpen,
  Megaphone,
  FileText,
  Lightbulb,
  HelpCircle,
  Moon,
  LayoutGrid,
  List,
  CheckCircle2,
  AlertTriangle,
  Users,
  Settings,
  Lock,
  Unlock,
  Ban,
  UserPlus,
  UserMinus,
  ShieldAlert,
  FolderPlus,
  Crown,
  Bell,
  BellOff,
  Sparkle,
  Camera,
  Pencil,
  Check,
  Menu,
  MoreHorizontal,
} from 'lucide-react';
import {
  db,
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  where,
  limit,
  onSnapshot,
  serverTimestamp,
  BuilderProfile,
  CommunityGlobalSettings,
  CommunityChannelConfig,
  CommunitySubGroup,
  UserAccountStatus,
  ADMIN_EMAIL,
  AVATAR_COLORS,
  checkExistingBuilderProfile,
  ensureBuilderProfile,
  handleFirestoreError,
  OperationType,
  User,
} from '../firebase.ts';
import {
  filterProfanity,
  extractFirstUrl,
  generateLinkPreview,
  compressCoverImage,
  CreationCategory,
} from '../utils/moderation.ts';
import {
  PRESET_AVATARS,
  findPresetAvatar,
  getDefaultPresetAvatar,
  resolveBuilderAvatarUrl,
} from '../utils/avatars.ts';
import {
  annotateMessageGrouping,
  computeAccurateOnlineMembers,
  computeNextThreadReplyCount,
  computeEffectiveReplyCount,
  evaluateHorizontalSwipeGesture,
  RawPresenceRecord,
} from '../utils/messageGrouping.ts';
import {
  NotificationPreferences,
  BrowserPermissionStatus,
  loadNotificationPreferences,
  saveNotificationPreferences,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  registerBuildBudsServiceWorker,
  dispatchMessageBrowserNotification,
} from '../utils/notifications.ts';
import { PWAInstallButton } from './PWAInstallButton.tsx';

export interface ChannelItem {
  id: string;
  name: string;
  category: 'INFORMATION' | 'CREATOR SHOWCASES' | 'SOCIAL';
  icon: React.ReactNode;
  emoji: string;
  description: string;
  defaultCreationCategory?: CreationCategory;
  isCustom?: boolean;
}

export const DEFAULT_COMMUNITY_CHANNELS: ChannelItem[] = [
  // INFORMATION
  {
    id: 'news',
    name: 'News',
    category: 'INFORMATION',
    emoji: '📢',
    icon: <Megaphone className="w-4 h-4 text-rose-400" />,
    description: 'Official Build Buds announcements, school spotlights, and creator milestones.',
  },
  {
    id: 'updates',
    name: 'Updates',
    category: 'INFORMATION',
    emoji: '📝',
    icon: <FileText className="w-4 h-4 text-amber-300" />,
    description: 'Platform changelog, new features, and upcoming creative challenges.',
  },
  {
    id: 'guidelines',
    name: 'Guidelines',
    category: 'INFORMATION',
    emoji: '🛡️',
    icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
    description: 'Community safety rules, respectful feedback etiquette, and moderation standards.',
  },

  // CREATOR SHOWCASES
  {
    id: 'games',
    name: 'Games',
    category: 'CREATOR SHOWCASES',
    emoji: '🎮',
    icon: <Gamepad2 className="w-4 h-4 text-[#FFF025]" />,
    description: 'Upload links to your playable games, upload custom game covers, and request playtesters!',
    defaultCreationCategory: 'game',
  },
  {
    id: 'websites',
    name: 'Websites',
    category: 'CREATOR SHOWCASES',
    emoji: '🌐',
    icon: <Globe className="w-4 h-4 text-sky-400" />,
    description: 'Share links to websites, portfolios, and web apps you built with live OpenGraph previews.',
    defaultCreationCategory: 'website',
  },
  {
    id: 'videos',
    name: 'Videos',
    category: 'CREATOR SHOWCASES',
    emoji: '🎬',
    icon: <Video className="w-4 h-4 text-[#B11469]" />,
    description: 'Post links to videos, devlogs, animations, and speed-builds you have created.',
    defaultCreationCategory: 'video',
  },
  {
    id: 'novels',
    name: 'Novels',
    category: 'CREATOR SHOWCASES',
    emoji: '📚',
    icon: <BookOpen className="w-4 h-4 text-emerald-400" />,
    description: 'Share links to novels, interactive fiction, lore chapters, and stories you wrote.',
    defaultCreationCategory: 'novel',
  },

  // SOCIAL
  {
    id: 'general-chat',
    name: 'General Chat',
    category: 'SOCIAL',
    emoji: '💬',
    icon: <MessageSquare className="w-4 h-4 text-white" />,
    description: 'Hang out with fellow young builders, chat in real time, reply to messages, and share ideas.',
  },
  {
    id: 'recommendations',
    name: 'Recommendations',
    category: 'SOCIAL',
    emoji: '💡',
    icon: <Lightbulb className="w-4 h-4 text-[#FFF025]" />,
    description: 'Recommend cool dev tools, game engines, tutorials, books, and inspiration.',
  },
  {
    id: 'off-topic',
    name: 'Off-topic',
    category: 'SOCIAL',
    emoji: '🌙',
    icon: <Moon className="w-4 h-4 text-amber-400" />,
    description: 'Casual cosmic lounge for school life, music, hobbies, and everyday conversation.',
  },
  {
    id: 'help',
    name: 'Help',
    category: 'SOCIAL',
    emoji: '❓',
    icon: <HelpCircle className="w-4 h-4 text-rose-400" />,
    description: 'Stuck on a bug or design problem? Ask the community and debug together!',
  },
];

export interface HubMessage {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorColor: string;
  authorRole?: 'member' | 'moderator' | 'admin';
  text: string;
  hadProfanity?: boolean;
  isEdited?: boolean;
  replyToId?: string;
  replyToAuthor?: string;
  replyToColor?: string;
  replyToSnippet?: string;
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  linkCategory?: CreationCategory;
  linkDomain?: string;
  coverImageUrl?: string;
  reactions?: Record<string, number>;
  threadCount: number;
  createdAtMillis: number;
  timeLabel: string;
}

interface ThreadReplyItem {
  id: string;
  messageId: string;
  authorId: string;
  authorName: string;
  authorColor: string;
  text: string;
  isEdited?: boolean;
  createdAtMillis: number;
  timeLabel: string;
}

interface PresenceItem {
  uid: string;
  displayName: string;
  avatarColor: string;
  avatarUrl?: string;
  activeChannelId: string;
  isTyping: boolean;
  lastSeenMillis: number;
}

interface ReportItem {
  id: string;
  messageId: string;
  channelId: string;
  reporterId: string;
  reason: string;
  status: 'open' | 'resolved';
  createdAtMillis: number;
}

const QUICK_EMOJIS = ['👍', '👎', '❤️', '🔥', '🚀', '😭'];

const DEFAULT_GLOBAL_SETTINGS: CommunityGlobalSettings = {
  cooldownSeconds: 3,
  disableCooldown: false,
  banLinks: false,
  enableLinkPreviews: true,
  globalChatLocked: false,
  updatedBy: 'system',
};

function buildDefaultChannelConfig(ch: ChannelItem): CommunityChannelConfig {
  return {
    id: ch.id,
    name: ch.name,
    category: ch.category,
    emoji: ch.emoji,
    description: ch.description,
    ...(ch.defaultCreationCategory ? { defaultCreationCategory: ch.defaultCreationCategory } : {}),
    isCustom: Boolean(ch.isCustom),
    isLocked: false,
    banLinks: false,
    enableLinkPreviews: true,
    cooldownSeconds: -1,
    allowMemberMessages: true,
    allowMemberGroups: true,
    allowMemberInvites: true,
    moderatorIds: [],
    kickedUserIds: [],
  };
}

interface CommunityHubProps {
  currentUser: User | null;
  builderProfile: BuilderProfile | null;
  onBackToLanding: () => void;
  onOpenAuthModal: (mode: 'join' | 'signin') => void;
  onProfileUpdated: (profile: BuilderProfile) => void;
  initialChannelId?: string;
  isStandaloneApp?: boolean;
}

export const CommunityHub: React.FC<CommunityHubProps> = ({
  currentUser,
  builderProfile,
  onBackToLanding,
  onOpenAuthModal,
  onProfileUpdated,
  initialChannelId = 'general-chat',
  isStandaloneApp = false,
}) => {
  const [activeChannelId, setActiveChannelId] = useState<string>(initialChannelId);
  const [activeSubGroupId, setActiveSubGroupId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'chat' | 'showcase'>('chat');
  const [showcaseFilter, setShowcaseFilter] = useState<'all' | CreationCategory>('all');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Real-time Firestore state (100% real data, zero seed/demo users)
  const [firestoreMessages, setFirestoreMessages] = useState<HubMessage[]>([]);
  const [allShowcaseMessages, setAllShowcaseMessages] = useState<HubMessage[]>([]);
  const [onlineMembers, setOnlineMembers] = useState<PresenceItem[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<BuilderProfile[]>([]);
  const [globalSettings, setGlobalSettings] = useState<CommunityGlobalSettings>(DEFAULT_GLOBAL_SETTINGS);
  const [channelConfigs, setChannelConfigs] = useState<Record<string, CommunityChannelConfig>>({});
  const [channelSubGroups, setChannelSubGroups] = useState<CommunitySubGroup[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);

  // Drawers & Modals
  const [showMembersDrawer, setShowMembersDrawer] = useState(false);
  const [showAdminDrawer, setShowAdminDrawer] = useState(false);
  const [adminTab, setAdminTab] = useState<'global' | 'channels' | 'users' | 'groups'>('global');
  const [selectedAdminChannelId, setSelectedAdminChannelId] = useState<string>(initialChannelId);

  // Create Sub-Group Modal state
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupPrivate, setNewGroupPrivate] = useState(false);
  const [newGroupInitialMembers, setNewGroupInitialMembers] = useState<string[]>([]);

  // Manage Sub-Group Members Modal state
  const [showManageGroupModal, setShowManageGroupModal] = useState(false);

  // Admin Create New Channel Form state
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelCategory, setNewChannelCategory] = useState<'INFORMATION' | 'CREATOR SHOWCASES' | 'SOCIAL'>('SOCIAL');
  const [newChannelEmoji, setNewChannelEmoji] = useState('✨');
  const [newChannelDesc, setNewChannelDesc] = useState('');

  // Admin Create Member Profile Form state
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberSchool, setNewMemberSchool] = useState('');
  const [newMemberGrade, setNewMemberGrade] = useState('Grade 8');
  const [newMemberRole, setNewMemberRole] = useState<'member' | 'moderator'>('member');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // Composer state
  const [messageText, setMessageText] = useState('');
  const [replyingTo, setReplyingTo] = useState<HubMessage | null>(null);
  const [showAttachmentDrawer, setShowAttachmentDrawer] = useState(false);
  const [linkUrlInput, setLinkUrlInput] = useState('');
  const [linkTitleInput, setLinkTitleInput] = useState('');
  const [linkDescInput, setLinkDescInput] = useState('');
  const [linkCategoryInput, setLinkCategoryInput] = useState<CreationCategory>('game');
  const [customCoverDataUrl, setCustomCoverDataUrl] = useState<string>('');
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [composerNotice, setComposerNotice] = useState<string | null>(null);

  // Inline Message Edit & Action Menu state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState<string>('');
  const [isSavingMessageEdit, setIsSavingMessageEdit] = useState<boolean>(false);
  const [activeActionMessageId, setActiveActionMessageId] = useState<string | null>(null);

  // Inline Thread Reply Edit state
  const [editingThreadReplyId, setEditingThreadReplyId] = useState<string | null>(null);
  const [editingThreadReplyText, setEditingThreadReplyText] = useState<string>('');
  const [liveThreadCountsByMessageId, setLiveThreadCountsByMessageId] = useState<Record<string, number>>({});

  // Slow-mode cooldown timer
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Thread drawer state
  const [activeThreadMessage, setActiveThreadMessage] = useState<HubMessage | null>(null);
  const [threadReplies, setThreadReplies] = useState<ThreadReplyItem[]>([]);
  const [threadInput, setThreadInput] = useState('');

  // Guidelines modal
  const [showGuidelinesPrompt, setShowGuidelinesPrompt] = useState(false);

  // Account & Profile Settings Modal state (Avatar, Nickname, School, Notifications)
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<'profile' | 'notifications'>('profile');
  const [selectedPresetAvatarId, setSelectedPresetAvatarId] = useState<string>('');
  const [selectedAccentColor, setSelectedAccentColor] = useState<string>('#FFF025');
  const [editProfileName, setEditProfileName] = useState<string>('');
  const [editProfileSchool, setEditProfileSchool] = useState<string>('');
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  // Browser Push Notification Preferences Modal state
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(() =>
    loadNotificationPreferences()
  );
  const [browserPermission, setBrowserPermission] = useState<BrowserPermissionStatus>(() =>
    getBrowserNotificationPermission()
  );
  const [notificationStatusBanner, setNotificationStatusBanner] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const touchSwipeRef = useRef<{ startX: number; startY: number } | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const isCurrentlyTypingRef = useRef<boolean>(false);
  const lastTypingWriteMillisRef = useRef<number>(0);
  const initialMessagesSnapshotSeenRef = useRef<boolean>(false);
  const initialPresenceSnapshotSeenRef = useRef<boolean>(false);
  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  const activeStreamIdRef = useRef<string>(initialChannelId);
  const notificationPrefsRef = useRef<NotificationPreferences>(notificationPrefs);
  const presenceLocalMetaRef = useRef<
    Map<
      string,
      {
        uid: string;
        displayName: string;
        avatarColor: string;
        avatarUrl?: string;
        activeChannelId: string;
        rawIsTyping: boolean;
        serverLastSeenMillis: number;
        localReceivedMillis: number;
        localTypingReceivedMillis: number;
      }
    >
  >(new Map());

  // Role & Permission Evaluation
  const isSuperAdmin =
    Boolean(currentUser?.email && currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) ||
    builderProfile?.role === 'admin';

  const isGlobalModerator = isSuperAdmin || builderProfile?.role === 'moderator';

  // Combine built-in channels with any custom channels created by Super Admin
  const customChannelItems: ChannelItem[] = (Object.values(channelConfigs) as CommunityChannelConfig[])
    .filter((cfg) => cfg.isCustom && !DEFAULT_COMMUNITY_CHANNELS.some((d) => d.id === cfg.id))
    .map((cfg) => ({
      id: cfg.id,
      name: cfg.name,
      category: cfg.category,
      emoji: cfg.emoji || '💬',
      icon: <MessageSquare className="w-4 h-4 text-[#FFF025]" />,
      description: cfg.description,
      defaultCreationCategory: cfg.defaultCreationCategory,
      isCustom: true,
    }));

  const allChannels: ChannelItem[] = [...DEFAULT_COMMUNITY_CHANNELS, ...customChannelItems].map((ch) => {
    const cfg = channelConfigs[ch.id];
    if (!cfg) return ch;
    return {
      ...ch,
      name: cfg.name || ch.name,
      description: cfg.description || ch.description,
      emoji: cfg.emoji || ch.emoji,
    };
  });

  const activeChannel = allChannels.find((c) => c.id === activeChannelId) || allChannels[0];
  const activeChannelConfig: CommunityChannelConfig =
    channelConfigs[activeChannelId] || buildDefaultChannelConfig(activeChannel);

  const isCurrentChannelModerator =
    isGlobalModerator ||
    Boolean(currentUser && activeChannelConfig.moderatorIds.includes(currentUser.uid));

  const userStatus: UserAccountStatus = isSuperAdmin
    ? 'active'
    : builderProfile?.status || 'active';

  const isKickedFromActiveChannel =
    !isSuperAdmin &&
    Boolean(currentUser && activeChannelConfig.kickedUserIds.includes(currentUser.uid));

  // Active sub-group object if viewing a sub-group inside the channel
  const activeSubGroup = activeSubGroupId
    ? channelSubGroups.find((g) => g.id === activeSubGroupId) || null
    : null;

  // Target stream ID for messages: either the main channel ID or `${activeChannelId}__group__${activeSubGroup.id}`
  const activeStreamId = activeSubGroup
    ? `${activeChannelId}__group__${activeSubGroup.id}`
    : activeChannelId;

  // Effective channel rules (combining global settings + per-channel overrides)
  const effectiveChatLocked =
    globalSettings.globalChatLocked || activeChannelConfig.isLocked;
  const effectiveBanLinks =
    globalSettings.banLinks || activeChannelConfig.banLinks;
  const effectiveEnableLinkPreviews =
    globalSettings.enableLinkPreviews && activeChannelConfig.enableLinkPreviews;
  const effectiveCooldownSeconds = globalSettings.disableCooldown
    ? 0
    : activeChannelConfig.cooldownSeconds >= 0
      ? activeChannelConfig.cooldownSeconds
      : globalSettings.cooldownSeconds;

  const canUserSendMessageInChannel =
    isSuperAdmin ||
    isCurrentChannelModerator ||
    (!effectiveChatLocked &&
      activeChannelConfig.allowMemberMessages &&
      userStatus === 'active' &&
      !isKickedFromActiveChannel);

  const canUserCreateSubGroup =
    isSuperAdmin ||
    isCurrentChannelModerator ||
    (activeChannelConfig.allowMemberGroups &&
      userStatus === 'active' &&
      !isKickedFromActiveChannel);

  const canUserInviteToSubGroup =
    isSuperAdmin ||
    isCurrentChannelModerator ||
    Boolean(activeSubGroup && currentUser && activeSubGroup.createdBy === currentUser.uid) ||
    (activeChannelConfig.allowMemberInvites &&
      userStatus === 'active' &&
      !isKickedFromActiveChannel);

  // Keep refs synced for notification callbacks & Service Worker messages
  useEffect(() => {
    activeStreamIdRef.current = activeStreamId;
  }, [activeStreamId]);

  useEffect(() => {
    notificationPrefsRef.current = notificationPrefs;
    saveNotificationPreferences(notificationPrefs);
  }, [notificationPrefs]);

  // Register Service Worker if notifications are already granted & listen for notification click events
  useEffect(() => {
    setBrowserPermission(getBrowserNotificationPermission());
    if (getBrowserNotificationPermission() === 'granted') {
      registerBuildBudsServiceWorker();
    }

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'BUILDBUDS_NOTIFICATION_CLICK' && event.data.channelId) {
        const targetId = String(event.data.channelId).split('__group__')[0];
        setActiveChannelId(targetId);
        setActiveSubGroupId(null);
        setViewMode('chat');
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }
    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, []);

  // Sync initial avatar & profile fields when builderProfile loads or changes
  useEffect(() => {
    if (!builderProfile) return;
    const matched = findPresetAvatar(builderProfile.avatarUrl);
    if (matched) {
      setSelectedPresetAvatarId(matched.id);
    } else {
      setSelectedPresetAvatarId(getDefaultPresetAvatar(builderProfile.uid).id);
    }
    setSelectedAccentColor(builderProfile.avatarColor || '#FFF025');
    setEditProfileName(builderProfile.displayName || '');
    setEditProfileSchool(builderProfile.schoolName || '');
  }, [
    builderProfile?.uid,
    builderProfile?.avatarUrl,
    builderProfile?.avatarColor,
    builderProfile?.displayName,
    builderProfile?.schoolName,
  ]);

  // Reset active sub-group when changing channel
  useEffect(() => {
    setActiveSubGroupId(null);
    setSelectedAdminChannelId(activeChannelId);
    if (activeChannel.defaultCreationCategory) {
      setLinkCategoryInput(activeChannel.defaultCreationCategory);
    }
  }, [activeChannelId, activeChannel.defaultCreationCategory]);

  // Cooldown countdown tick
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownRemaining]);

  // Real-time listener on current user's profile document so role/status changes apply immediately
  useEffect(() => {
    if (!currentUser) return;
    const userRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          onProfileUpdated(snap.data() as BuilderProfile);
        }
      },
      () => {}
    );
    return () => unsubscribe();
  }, [currentUser]);

  // Real-time listener for Global Community Settings (`/community_settings/global`)
  useEffect(() => {
    const settingsRef = doc(db, 'community_settings', 'global');
    const unsubscribe = onSnapshot(
      settingsRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setGlobalSettings({
            cooldownSeconds: typeof data.cooldownSeconds === 'number' ? data.cooldownSeconds : 3,
            disableCooldown: Boolean(data.disableCooldown),
            banLinks: Boolean(data.banLinks),
            enableLinkPreviews: data.enableLinkPreviews !== false,
            globalChatLocked: Boolean(data.globalChatLocked),
            updatedBy: data.updatedBy || 'admin',
          });
        }
      },
      () => {}
    );
    return () => unsubscribe();
  }, []);

  // Real-time listener for Channel Configs & Custom Channels (`/community_channels`)
  useEffect(() => {
    const q = query(collection(db, 'community_channels'), limit(100));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const map: Record<string, CommunityChannelConfig> = {};
        snapshot.docs.forEach((docSnap) => {
          const d = docSnap.data();
          map[docSnap.id] = {
            id: d.id || docSnap.id,
            name: d.name || docSnap.id,
            category: d.category || 'SOCIAL',
            emoji: d.emoji || '💬',
            description: d.description || '',
            defaultCreationCategory: d.defaultCreationCategory,
            isCustom: Boolean(d.isCustom),
            isLocked: Boolean(d.isLocked),
            banLinks: Boolean(d.banLinks),
            enableLinkPreviews: d.enableLinkPreviews !== false,
            cooldownSeconds: typeof d.cooldownSeconds === 'number' ? d.cooldownSeconds : -1,
            allowMemberMessages: d.allowMemberMessages !== false,
            allowMemberGroups: d.allowMemberGroups !== false,
            allowMemberInvites: d.allowMemberInvites !== false,
            moderatorIds: Array.isArray(d.moderatorIds) ? d.moderatorIds : [],
            kickedUserIds: Array.isArray(d.kickedUserIds) ? d.kickedUserIds : [],
          };
        });
        setChannelConfigs(map);
      },
      () => {}
    );
    return () => unsubscribe();
  }, []);

  // Real-time listener for Sub-Groups inside the active channel (`/community_groups`)
  useEffect(() => {
    const q = query(
      collection(db, 'community_groups'),
      where('channelId', '==', activeChannelId),
      limit(50)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const groups: CommunitySubGroup[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: d.id || docSnap.id,
            channelId: d.channelId,
            name: d.name,
            description: d.description || '',
            isPrivate: Boolean(d.isPrivate),
            createdBy: d.createdBy,
            memberIds: Array.isArray(d.memberIds) ? d.memberIds : [],
          };
        });
        setChannelSubGroups(groups);
      },
      () => {}
    );
    return () => unsubscribe();
  }, [activeChannelId]);

  // Real-time listener for All Registered Users (`/users`)
  useEffect(() => {
    const q = query(collection(db, 'users'), limit(100));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const users: BuilderProfile[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            uid: d.uid || docSnap.id,
            displayName: d.displayName || 'Builder',
            schoolName: d.schoolName || '',
            gradeLevel: d.gradeLevel || '',
            primaryInterest: d.primaryInterest || '',
            avatarUrl: d.avatarUrl || '',
            avatarColor: d.avatarColor || '#FFF025',
            role: d.role || 'member',
            status: d.status || 'active',
            acceptedGuidelines: Boolean(d.acceptedGuidelines),
          };
        });
        setRegisteredUsers(users);
      },
      () => {}
    );
    return () => unsubscribe();
  }, []);

  // Real-time listener for Messages in the active channel or sub-group (`activeStreamId`)
  useEffect(() => {
    const q = query(
      collection(db, 'messages'),
      where('channelId', '==', activeStreamId),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: HubMessage[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const createdMillis = data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now();
          const dateObj = new Date(createdMillis);
          const hours = String(dateObj.getHours()).padStart(2, '0');
          const mins = String(dateObj.getMinutes()).padStart(2, '0');

          return {
            id: docSnap.id,
            channelId: data.channelId,
            authorId: data.authorId,
            authorName: data.authorName,
            authorAvatar: data.authorAvatar || '',
            authorColor: data.authorColor || '#FFF025',
            authorRole: data.authorRole || 'member',
            text: data.text || '',
            hadProfanity: Boolean(data.hadProfanity),
            isEdited: Boolean(data.isEdited),
            replyToId: data.replyToId,
            replyToAuthor: data.replyToAuthor,
            replyToColor: data.replyToColor,
            replyToSnippet: data.replyToSnippet,
            linkUrl: data.linkUrl,
            linkTitle: data.linkTitle,
            linkDescription: data.linkDescription,
            linkCategory: data.linkCategory,
            linkDomain: data.linkDomain,
            coverImageUrl: data.coverImageUrl,
            reactions: data.reactions || {},
            threadCount: Number(data.threadCount || 0),
            createdAtMillis: createdMillis,
            timeLabel: `${hours}:${mins}`,
          };
        });

        loaded.sort((a, b) => a.createdAtMillis - b.createdAtMillis);
        setFirestoreMessages(loaded);
      },
      (error) => {
        console.error('Error listening to channel messages:', error);
      }
    );

    return () => unsubscribe();
  }, [activeStreamId]);

  // Real-time listener for Showcase Creations when viewing Showcase mode
  useEffect(() => {
    if (viewMode !== 'showcase') return;
    const q = query(collection(db, 'messages'), limit(100));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: HubMessage[] = [];
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data.linkUrl) return;
          const createdMillis = data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now();
          const dateObj = new Date(createdMillis);
          items.push({
            id: docSnap.id,
            channelId: data.channelId,
            authorId: data.authorId,
            authorName: data.authorName,
            authorAvatar: data.authorAvatar || '',
            authorColor: data.authorColor || '#FFF025',
            authorRole: data.authorRole || 'member',
            text: data.text || '',
            linkUrl: data.linkUrl,
            linkTitle: data.linkTitle,
            linkDescription: data.linkDescription,
            linkCategory: data.linkCategory,
            linkDomain: data.linkDomain,
            coverImageUrl: data.coverImageUrl,
            reactions: data.reactions || {},
            threadCount: Number(data.threadCount || 0),
            createdAtMillis: createdMillis,
            timeLabel: `${String(dateObj.getHours()).padStart(2, '0')}:${String(
              dateObj.getMinutes()
            ).padStart(2, '0')}`,
          });
        });
        items.sort((a, b) => b.createdAtMillis - a.createdAtMillis);
        setAllShowcaseMessages(items);
      },
      () => {}
    );
    return () => unsubscribe();
  }, [viewMode]);

  // Real-time listener for incoming messages across all channels to power Browser Push Notifications
  useEffect(() => {
    if (!currentUser) return;
    initialMessagesSnapshotSeenRef.current = false;
    knownMessageIdsRef.current.clear();

    const q = query(collection(db, 'messages'), limit(100));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!initialMessagesSnapshotSeenRef.current) {
          snapshot.docs.forEach((docSnap) => {
            knownMessageIdsRef.current.add(docSnap.id);
          });
          initialMessagesSnapshotSeenRef.current = true;
          return;
        }

        snapshot.docChanges().forEach((change) => {
          if (change.type !== 'added') return;
          const docId = change.doc.id;
          if (knownMessageIdsRef.current.has(docId)) return;
          knownMessageIdsRef.current.add(docId);

          const data = change.doc.data();
          const createdMillis = data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now();
          // Only notify for genuinely recent messages (within last 60 seconds)
          if (Date.now() - createdMillis > 60000) return;

          const baseChannelId = String(data.channelId || 'general-chat').split('__group__')[0];
          const chObj = DEFAULT_COMMUNITY_CHANNELS.find((c) => c.id === baseChannelId);
          const channelName = chObj?.name || baseChannelId;

          dispatchMessageBrowserNotification({
            messageId: docId,
            channelId: String(data.channelId || 'general-chat'),
            channelName,
            authorId: String(data.authorId || ''),
            authorName: String(data.authorName || 'Builder'),
            authorAvatarUrl: resolveBuilderAvatarUrl(data.authorAvatar, String(data.authorId || 'builder')),
            text: String(data.text || ''),
            currentUserId: currentUser.uid,
            activeStreamId: activeStreamIdRef.current,
            preferences: notificationPrefsRef.current,
            onNavigateToChannel: (targetChannelId) => {
              setActiveChannelId(targetChannelId);
              setActiveSubGroupId(null);
              setViewMode('chat');
            },
          });
        });
      },
      () => {}
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Helper to recompute active online members & typing state quickly (25s window, 10s heartbeat)
  // without inflating initial load with stale historical documents
  const syncOnlineMembersFromMeta = () => {
    const localNow = Date.now();
    let maxServerMillis = 0;
    presenceLocalMetaRef.current.forEach((entry) => {
      if (entry.serverLastSeenMillis > maxServerMillis) {
        maxServerMillis = entry.serverLastSeenMillis;
      }
    });
    const referenceServerNow = Math.max(localNow, maxServerMillis);

    const items: PresenceItem[] = [];
    presenceLocalMetaRef.current.forEach((entry) => {
      const serverAge = Math.max(0, referenceServerNow - entry.serverLastSeenMillis);
      const directClockAge = Math.abs(localNow - entry.serverLastSeenMillis);
      const hasLiveLocalUpdate =
        entry.localReceivedMillis > 0 && localNow - entry.localReceivedMillis < 25000;

      // Consider a user online ONLY if their server heartbeat is within the last 25 seconds
      // OR we received a live real-time heartbeat update from them within the last 25 seconds
      const isOnline = serverAge < 25000 || directClockAge < 25000 || hasLiveLocalUpdate;
      if (!isOnline) return;

      // Consider a user actively typing if rawIsTyping is true AND either:
      // - we received the typing update within the last 7 seconds on our local clock, OR
      // - their server timestamp is within 10 seconds of referenceServerNow
      const isTypingActive =
        entry.rawIsTyping &&
        ((entry.localTypingReceivedMillis > 0 &&
          localNow - entry.localTypingReceivedMillis < 7000) ||
          serverAge < 10000);

      items.push({
        uid: entry.uid,
        displayName: entry.displayName || 'Builder',
        avatarColor: entry.avatarColor || '#FFF025',
        avatarUrl: entry.avatarUrl,
        activeChannelId: entry.activeChannelId || 'general-chat',
        isTyping: isTypingActive,
        lastSeenMillis: entry.serverLastSeenMillis,
      });
    });

    setOnlineMembers(items);
  };

  // Real-time listener for Online Presence (`/presence`) + fast 1-second local expiry ticker
  useEffect(() => {
    initialPresenceSnapshotSeenRef.current = false;
    const q = query(collection(db, 'presence'), limit(100));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const localNow = Date.now();
        const isInitialLoad = !initialPresenceSnapshotSeenRef.current;
        const currentDocIds = new Set<string>();

        // Track docChanges so ONLY live real-time updates (after initial load) get a fresh localReceivedMillis
        const changedIds = new Set<string>();
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'removed') {
            presenceLocalMetaRef.current.delete(change.doc.id);
          } else if (!isInitialLoad) {
            changedIds.add(change.doc.id);
          }
        });

        snapshot.docs.forEach((docSnap) => {
          const d = docSnap.data();
          const uid = d.uid || docSnap.id;
          currentDocIds.add(docSnap.id);

          const prev = presenceLocalMetaRef.current.get(docSnap.id);
          const serverLastSeenMillis = d.lastSeen?.toMillis ? d.lastSeen.toMillis() : 0;
          const rawIsTyping = Boolean(d.isTyping);
          const wasLiveModified = changedIds.has(docSnap.id);

          presenceLocalMetaRef.current.set(docSnap.id, {
            uid,
            displayName: d.displayName || 'Builder',
            avatarColor: d.avatarColor || '#FFF025',
            avatarUrl: d.avatarUrl || '',
            activeChannelId: d.activeChannelId || 'general-chat',
            rawIsTyping,
            serverLastSeenMillis,
            localReceivedMillis: wasLiveModified ? localNow : prev?.localReceivedMillis ?? 0,
            localTypingReceivedMillis:
              rawIsTyping && wasLiveModified
                ? localNow
                : rawIsTyping
                  ? prev?.localTypingReceivedMillis ?? 0
                  : 0,
          });
        });

        initialPresenceSnapshotSeenRef.current = true;

        // Clean up any docs no longer in snapshot
        Array.from(presenceLocalMetaRef.current.keys()).forEach((id) => {
          if (!currentDocIds.has(id)) {
            presenceLocalMetaRef.current.delete(id);
          }
        });

        syncOnlineMembersFromMeta();
      },
      () => {}
    );

    const expiryTicker = window.setInterval(syncOnlineMembersFromMeta, 1000);
    return () => {
      unsubscribe();
      window.clearInterval(expiryTicker);
    };
  }, []);

  // Real-time listener for Moderation Reports (for Super Admin / Global Moderators)
  useEffect(() => {
    if (!isGlobalModerator) return;
    const q = query(collection(db, 'reports'), limit(50));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: ReportItem[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            messageId: d.messageId,
            channelId: d.channelId,
            reporterId: d.reporterId,
            reason: d.reason,
            status: d.status || 'open',
            createdAtMillis: d.createdAt?.toMillis ? d.createdAt.toMillis() : Date.now(),
          };
        });
        list.sort((a, b) => b.createdAtMillis - a.createdAtMillis);
        setReports(list);
      },
      () => {}
    );
    return () => unsubscribe();
  }, [isGlobalModerator]);

  // Update current user's presence heartbeat when signed in.
  // NOTE: Do NOT call deleteDoc(presenceRef) inside beforeunload because on page refresh or
  // multi-tab navigation, the unloading tab's deleteDoc races with the newly loaded tab's setDoc
  // and wipes out the user's online presence document! Only deleteDoc on explicit Sign Out.
  useEffect(() => {
    if (!currentUser || !builderProfile || userStatus === 'banned') return;

    const uid = currentUser.uid;
    const displayName = (builderProfile.displayName || 'Builder').slice(0, 60);
    const avatarColor = (builderProfile.avatarColor || '#FFF025').slice(0, 30);
    const avatarUrl = (
      builderProfile.avatarUrl || getDefaultPresetAvatar(uid).id
    ).slice(0, 4000);
    const channelId = (activeStreamId || 'general-chat').slice(0, 128);
    const presenceRef = doc(db, 'presence', uid);

    const updateHeartbeat = async (overrideTyping?: boolean) => {
      const typingFlag =
        typeof overrideTyping === 'boolean' ? overrideTyping : isCurrentlyTypingRef.current;
      try {
        await setDoc(presenceRef, {
          uid,
          displayName,
          avatarColor,
          avatarUrl,
          activeChannelId: channelId,
          isTyping: typingFlag,
          lastSeen: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Presence heartbeat write warning:', err);
      }
    };

    updateHeartbeat();
    const fastWarmupTimer = window.setTimeout(() => updateHeartbeat(), 1500);
    const interval = window.setInterval(() => updateHeartbeat(), 10000);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        updateHeartbeat();
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      window.clearTimeout(fastWarmupTimer);
      window.clearInterval(interval);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [
    currentUser?.uid,
    builderProfile?.displayName,
    builderProfile?.avatarColor,
    builderProfile?.avatarUrl,
    activeStreamId,
    userStatus,
  ]);

  // Keep activeThreadMessage synced with live firestoreMessages updates
  useEffect(() => {
    if (!activeThreadMessage) return;
    const latest = firestoreMessages.find((m) => m.id === activeThreadMessage.id);
    if (latest && (latest.threadCount !== activeThreadMessage.threadCount || latest.text !== activeThreadMessage.text)) {
      setActiveThreadMessage(latest);
    }
  }, [firestoreMessages, activeThreadMessage?.id]);

  // Automatically sync & self-heal thread reply counts for messages in the active channel
  // so any message where multiple replies were posted always shows the exact total reply count.
  const threadedMessageIdsKey = firestoreMessages
    .filter((m) => m.threadCount > 0)
    .slice(-15)
    .map((m) => `${m.id}:${m.threadCount}`)
    .join(',');

  useEffect(() => {
    const threadedMessages = firestoreMessages.filter((m) => m.threadCount > 0).slice(-15);
    if (threadedMessages.length === 0) return;

    const unsubscribes = threadedMessages.map((msg) => {
      const q = query(collection(db, 'messages', msg.id, 'threadReplies'), limit(100));
      return onSnapshot(
        q,
        (snap) => {
          const actualCount = snap.size;
          setLiveThreadCountsByMessageId((prev) =>
            prev[msg.id] === actualCount ? prev : { ...prev, [msg.id]: actualCount }
          );

          // Self-heal parent message document if stored threadCount got out of sync (e.g. stuck at 1 when 3 replies exist)
          if (currentUser && userStatus === 'active' && actualCount > 0 && actualCount !== msg.threadCount) {
            updateDoc(doc(db, 'messages', msg.id), {
              threadCount: actualCount,
              updatedAt: serverTimestamp(),
            }).catch(() => {});
          }
        },
        () => {}
      );
    });

    return () => {
      unsubscribes.forEach((u) => u());
    };
  }, [threadedMessageIdsKey, currentUser?.uid, userStatus]);

  // Subscribe to thread replies when a message thread is open
  useEffect(() => {
    if (!activeThreadMessage) {
      setThreadReplies([]);
      setEditingThreadReplyId(null);
      return;
    }

    const targetMessageId = activeThreadMessage.id;
    const q = query(
      collection(db, 'messages', targetMessageId, 'threadReplies'),
      limit(100)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const replies: ThreadReplyItem[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          const millis = d.createdAt?.toMillis ? d.createdAt.toMillis() : Date.now();
          const dt = new Date(millis);
          const timeLabel = `${String(dt.getHours()).padStart(2, '0')}:${String(
            dt.getMinutes()
          ).padStart(2, '0')}`;
          return {
            id: docSnap.id,
            messageId: d.messageId,
            authorId: d.authorId,
            authorName: d.authorName,
            authorColor: d.authorColor || '#FFF025',
            text: d.text,
            isEdited: Boolean(d.isEdited),
            createdAtMillis: millis,
            timeLabel,
          };
        });
        replies.sort((a, b) => a.createdAtMillis - b.createdAtMillis);
        setThreadReplies(replies);
        setLiveThreadCountsByMessageId((prev) => ({
          ...prev,
          [targetMessageId]: replies.length,
        }));

        // Ensure parent message threadCount matches actual subcollection count
        if (
          currentUser &&
          userStatus === 'active' &&
          replies.length !== activeThreadMessage.threadCount
        ) {
          updateDoc(doc(db, 'messages', targetMessageId), {
            threadCount: replies.length,
            updatedAt: serverTimestamp(),
          }).catch(() => {});
        }
      },
      (err) => console.error('Thread listener error:', err)
    );

    return () => unsubscribe();
  }, [activeThreadMessage?.id]);

  // Auto-scroll to bottom when messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [firestoreMessages.length, activeStreamId]);

  // Helper to broadcast typing status cleanly
  const writeTypingPresence = (isTypingNow: boolean) => {
    if (!currentUser || !builderProfile || userStatus !== 'active') return;
    isCurrentlyTypingRef.current = isTypingNow;
    lastTypingWriteMillisRef.current = Date.now();
    const presenceRef = doc(db, 'presence', currentUser.uid);
    setDoc(presenceRef, {
      uid: currentUser.uid,
      displayName: (builderProfile.displayName || 'Builder').slice(0, 60),
      avatarColor: (builderProfile.avatarColor || '#FFF025').slice(0, 30),
      avatarUrl: (builderProfile.avatarUrl || getDefaultPresetAvatar(currentUser.uid).id).slice(0, 4000),
      activeChannelId: activeStreamId.slice(0, 128),
      isTyping: isTypingNow,
      lastSeen: serverTimestamp(),
    }).catch(() => {});
  };

  // Save user's Account & Profile Settings (character avatar, badge color, nickname, school)
  const handleSaveSelectedAvatar = async () => {
    if (!currentUser || !builderProfile || !selectedPresetAvatarId) return;
    setIsSavingAvatar(true);
    const cleanedName = filterProfanity(
      editProfileName.trim() || builderProfile.displayName || 'Builder'
    ).filteredText.slice(0, 60);
    const cleanedSchool = filterProfanity(
      editProfileSchool.trim() || builderProfile.schoolName || 'Build Buds Community'
    ).filteredText.slice(0, 100);

    try {
      const updated = await ensureBuilderProfile(currentUser, {
        displayName: cleanedName,
        schoolName: cleanedSchool,
        avatarUrl: selectedPresetAvatarId,
        avatarColor: selectedAccentColor,
      });
      onProfileUpdated(updated);

      // Immediately sync updated profile to live presence document
      await setDoc(doc(db, 'presence', currentUser.uid), {
        uid: currentUser.uid,
        displayName: (updated.displayName || 'Builder').slice(0, 60),
        avatarColor: (updated.avatarColor || '#FFF025').slice(0, 30),
        avatarUrl: selectedPresetAvatarId.slice(0, 4000),
        activeChannelId: activeStreamId.slice(0, 128),
        isTyping: isCurrentlyTypingRef.current,
        lastSeen: serverTimestamp(),
      }).catch(() => {});

      setShowAvatarModal(false);
      setComposerNotice('Your profile settings and character avatar have been saved!');
      window.setTimeout(() => setComposerNotice(null), 3500);
    } catch (err) {
      console.error('Failed to save profile settings:', err);
      setComposerError('Could not save profile changes. Please try again.');
    } finally {
      setIsSavingAvatar(false);
    }
  };

  // Toggle Browser Push Notifications
  const handleToggleBrowserNotifications = async () => {
    setNotificationStatusBanner(null);
    const currentPerm = getBrowserNotificationPermission();
    setBrowserPermission(currentPerm);

    if (currentPerm === 'unsupported') {
      setNotificationStatusBanner('Your current browser does not support Web Notifications.');
      return;
    }

    if (!notificationPrefs.enabled) {
      if (currentPerm !== 'granted') {
        const requested = await requestBrowserNotificationPermission();
        setBrowserPermission(requested);
        if (requested !== 'granted') {
          setNotificationStatusBanner(
            requested === 'denied'
              ? 'Browser notifications are blocked. Click the lock/tune icon next to the URL bar in your browser to allow notifications for this site.'
              : 'Notification permission request was dismissed.'
          );
          return;
        }
      } else {
        await registerBuildBudsServiceWorker();
      }
      setNotificationPrefs((prev) => ({ ...prev, enabled: true }));
      setNotificationStatusBanner('Browser notifications enabled! You will be notified of new messages when in another tab or channel.');
    } else {
      setNotificationPrefs((prev) => ({ ...prev, enabled: false }));
      setNotificationStatusBanner('Browser notifications paused.');
    }
  };

  // Send a test browser notification so the user can verify it works immediately
  const handleSendTestNotification = async () => {
    const perm = await requestBrowserNotificationPermission();
    setBrowserPermission(perm);
    if (perm !== 'granted') {
      setNotificationStatusBanner('Please allow browser notifications first to send a test alert.');
      return;
    }
    const avatarUrl = resolveBuilderAvatarUrl(
      builderProfile?.avatarUrl,
      currentUser?.uid || 'builder'
    );
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && 'showNotification' in reg) {
          await reg.showNotification('Build Buds Community Hub', {
            body: `Notifications are active for #${activeChannel.name}!`,
            icon: avatarUrl,
            tag: `buildbuds-test-${Date.now()}`,
          });
          setNotificationStatusBanner('Sent a test notification to your browser!');
          return;
        }
      }
      new Notification('Build Buds Community Hub', {
        body: `Notifications are active for #${activeChannel.name}!`,
        icon: avatarUrl,
      });
      setNotificationStatusBanner('Sent a test notification to your browser!');
    } catch {
      setNotificationStatusBanner('Could not display test notification in this browser context.');
    }
  };

  // Handle typing indicator broadcast
  const handleInputChange = (val: string) => {
    setMessageText(val);
    setComposerError(null);

    const detectedUrl = extractFirstUrl(val);
    if (detectedUrl && !linkUrlInput && effectiveEnableLinkPreviews && !effectiveBanLinks) {
      const preview = generateLinkPreview(detectedUrl, activeChannel.defaultCreationCategory);
      setLinkUrlInput(preview.url);
      setLinkTitleInput(preview.title);
      setLinkDescInput(preview.description);
      setLinkCategoryInput(preview.category);
    }

    if (currentUser && builderProfile && userStatus === 'active') {
      const hasText = val.trim().length > 0;
      const now = Date.now();

      if (hasText) {
        // Broadcast immediately when starting to type, and refresh every 2s while continuing to type
        if (!isCurrentlyTypingRef.current || now - lastTypingWriteMillisRef.current > 2000) {
          writeTypingPresence(true);
        }

        if (typingTimeoutRef.current) {
          window.clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = window.setTimeout(() => {
          writeTypingPresence(false);
        }, 4500);
      } else {
        if (typingTimeoutRef.current) {
          window.clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
        if (isCurrentlyTypingRef.current) {
          writeTypingPresence(false);
        }
      }
    }
  };

  // Handle cover image file upload
  const handleCoverFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingImage(true);
    setComposerError(null);
    try {
      const compressedDataUrl = await compressCoverImage(file);
      setCustomCoverDataUrl(compressedDataUrl);
      setShowAttachmentDrawer(true);
    } catch (err) {
      setComposerError(err instanceof Error ? err.message : 'Could not process image.');
    } finally {
      setIsCompressingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Accept community guidelines
  const handleAcceptGuidelines = async () => {
    if (!currentUser || !builderProfile) return;
    try {
      const updated = await ensureBuilderProfile(currentUser, { acceptedGuidelines: true });
      onProfileUpdated(updated);
      setShowGuidelinesPrompt(false);
      setComposerNotice('Community Guidelines accepted! You can now chat and share creations.');
      window.setTimeout(() => setComposerNotice(null), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  // Send message or creation showcase to Firestore
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setComposerError(null);

    if (!currentUser || !builderProfile) {
      onOpenAuthModal('signin');
      return;
    }

    if (userStatus === 'banned') {
      setComposerError('Your account has been banned from the community chat.');
      return;
    }

    if (userStatus === 'suspended') {
      setComposerError('Your account is currently suspended (Read-Only Mode). You cannot send messages.');
      return;
    }

    if (isKickedFromActiveChannel) {
      setComposerError('You have been removed from this channel by a moderator.');
      return;
    }

    if (!canUserSendMessageInChannel) {
      setComposerError('This channel is currently locked or restricted to moderators only.');
      return;
    }

    if (!builderProfile.acceptedGuidelines) {
      setShowGuidelinesPrompt(true);
      return;
    }

    if (!isSuperAdmin && !isCurrentChannelModerator && cooldownRemaining > 0) {
      setComposerError(`Slow mode active: please wait ${cooldownRemaining}s before sending another message.`);
      return;
    }

    const rawText = messageText.trim();
    const hasAttachment = Boolean(linkUrlInput.trim() || customCoverDataUrl);

    if (!rawText && !hasAttachment) {
      return;
    }

    // Check if links are banned for non-moderators
    const detectedUrlInText = extractFirstUrl(rawText);
    if (effectiveBanLinks && !isSuperAdmin && !isCurrentChannelModerator) {
      if (detectedUrlInText || linkUrlInput.trim()) {
        setComposerError('Links are currently disabled in this channel by an administrator/moderator.');
        return;
      }
    }

    const { filteredText, hadProfanity } = filterProfanity(
      rawText || (linkTitleInput ? `Shared a ${linkCategoryInput}: ${linkTitleInput}` : 'Shared a project creation!')
    );

    const effectiveRole: 'member' | 'moderator' | 'admin' = isSuperAdmin
      ? 'admin'
      : isCurrentChannelModerator
        ? 'moderator'
        : builderProfile.role || 'member';

    const chosenAvatarId =
      builderProfile.avatarUrl || getDefaultPresetAvatar(currentUser.uid).id;

    const payload: Record<string, unknown> = {
      channelId: activeStreamId.slice(0, 128),
      authorId: currentUser.uid,
      authorName: builderProfile.displayName.slice(0, 60),
      authorAvatar: chosenAvatarId.slice(0, 4000),
      authorColor: builderProfile.avatarColor.slice(0, 30),
      authorRole: effectiveRole,
      text: filteredText.slice(0, 2000),
      hadProfanity,
      reactions: {},
      threadCount: 0,
      createdAt: serverTimestamp(),
    };

    if (replyingTo) {
      payload.replyToId = replyingTo.id.slice(0, 128);
      payload.replyToAuthor = replyingTo.authorName.slice(0, 60);
      payload.replyToColor = replyingTo.authorColor.slice(0, 30);
      payload.replyToSnippet = replyingTo.text.slice(0, 120);
    }

    if ((linkUrlInput.trim() || customCoverDataUrl) && (!effectiveBanLinks || isSuperAdmin || isCurrentChannelModerator)) {
      const preview = generateLinkPreview(
        linkUrlInput.trim() || 'https://buildbuds.community/project',
        linkCategoryInput,
        linkTitleInput,
        linkDescInput
      );
      payload.linkUrl = preview.url;
      payload.linkTitle = filterProfanity(preview.title).filteredText.slice(0, 160);
      payload.linkDescription = filterProfanity(preview.description).filteredText.slice(0, 600);
      payload.linkCategory = preview.category;
      payload.linkDomain = preview.domain;
      payload.coverImageUrl = (customCoverDataUrl || preview.defaultCoverUrl).slice(0, 350000);
    }

    try {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (isCurrentlyTypingRef.current) {
        writeTypingPresence(false);
      }

      await addDoc(collection(db, 'messages'), payload);

      setMessageText('');
      setReplyingTo(null);
      setLinkUrlInput('');
      setLinkTitleInput('');
      setLinkDescInput('');
      setCustomCoverDataUrl('');
      setShowAttachmentDrawer(false);

      if (!isSuperAdmin && !isCurrentChannelModerator && effectiveCooldownSeconds > 0) {
        setCooldownRemaining(effectiveCooldownSeconds);
      }

      if (hadProfanity) {
        setComposerNotice('Heads up: Some words were masked with *** by the Community Safety Filter.');
        window.setTimeout(() => setComposerNotice(null), 4000);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
    }
  };

  // Toggle emoji reaction on a message
  const handleToggleReaction = async (msg: HubMessage, emoji: string) => {
    if (!currentUser) {
      onOpenAuthModal('signin');
      return;
    }
    if (userStatus === 'suspended' || userStatus === 'banned') {
      setComposerError('Suspended or banned accounts cannot add reactions.');
      return;
    }

    const currentReactions = { ...(msg.reactions || {}) };
    currentReactions[emoji] = (currentReactions[emoji] || 0) + 1;

    try {
      await updateDoc(doc(db, 'messages', msg.id), {
        reactions: currentReactions,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `messages/${msg.id}`);
    }
  };

  // Post a reply inside the Thread Drawer
  const handleSendThreadReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThreadMessage || !threadInput.trim()) return;

    if (!currentUser || !builderProfile) {
      onOpenAuthModal('signin');
      return;
    }

    if (userStatus === 'suspended' || userStatus === 'banned') {
      setComposerError('Your account is in read-only mode and cannot post thread replies.');
      return;
    }

    const { filteredText } = filterProfanity(threadInput.trim());
    const liveParent = firestoreMessages.find((m) => m.id === activeThreadMessage.id);
    const nextThreadCount = computeNextThreadReplyCount(
      liveParent?.threadCount ?? activeThreadMessage.threadCount,
      threadReplies.length,
      1
    );

    try {
      await addDoc(collection(db, 'messages', activeThreadMessage.id, 'threadReplies'), {
        messageId: activeThreadMessage.id,
        authorId: currentUser.uid,
        authorName: builderProfile.displayName.slice(0, 60),
        authorColor: builderProfile.avatarColor.slice(0, 30),
        text: filteredText.slice(0, 1500),
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'messages', activeThreadMessage.id), {
        threadCount: nextThreadCount,
        updatedAt: serverTimestamp(),
      });

      setLiveThreadCountsByMessageId((prev) => ({
        ...prev,
        [activeThreadMessage.id]: nextThreadCount,
      }));
      setActiveThreadMessage((prev) =>
        prev ? { ...prev, threadCount: nextThreadCount } : null
      );
      setThreadInput('');
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `messages/${activeThreadMessage.id}/threadReplies`
      );
    }
  };

  // Start editing a channel message (Author only)
  const handleStartEditMessage = (msg: HubMessage) => {
    if (!currentUser || currentUser.uid !== msg.authorId) return;
    setEditingMessageId(msg.id);
    setEditingMessageText(msg.text);
    setActiveActionMessageId(null);
  };

  // Save edited channel message
  const handleSaveEditMessage = async (msg: HubMessage) => {
    if (!currentUser || currentUser.uid !== msg.authorId) return;
    const raw = editingMessageText.trim();
    if (!raw) return;
    if (raw === msg.text) {
      setEditingMessageId(null);
      return;
    }

    setIsSavingMessageEdit(true);
    const { filteredText, hadProfanity } = filterProfanity(raw);
    try {
      await updateDoc(doc(db, 'messages', msg.id), {
        text: filteredText.slice(0, 2000),
        hadProfanity,
        isEdited: true,
        updatedAt: serverTimestamp(),
      });
      setEditingMessageId(null);
      setEditingMessageText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `messages/${msg.id}`);
    } finally {
      setIsSavingMessageEdit(false);
    }
  };

  // Start editing a thread reply (Author only)
  const handleStartEditThreadReply = (reply: ThreadReplyItem) => {
    if (!currentUser || currentUser.uid !== reply.authorId) return;
    setEditingThreadReplyId(reply.id);
    setEditingThreadReplyText(reply.text);
  };

  // Save edited thread reply
  const handleSaveEditThreadReply = async (reply: ThreadReplyItem) => {
    if (!activeThreadMessage || !currentUser || currentUser.uid !== reply.authorId) return;
    const raw = editingThreadReplyText.trim();
    if (!raw) return;
    if (raw === reply.text) {
      setEditingThreadReplyId(null);
      return;
    }

    const { filteredText } = filterProfanity(raw);
    try {
      await updateDoc(doc(db, 'messages', activeThreadMessage.id, 'threadReplies', reply.id), {
        text: filteredText.slice(0, 1500),
        isEdited: true,
        updatedAt: serverTimestamp(),
      });
      setEditingThreadReplyId(null);
      setEditingThreadReplyText('');
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `messages/${activeThreadMessage.id}/threadReplies/${reply.id}`
      );
    }
  };

  // Delete a thread reply (Author, Super Admin, or Global Moderator)
  const handleDeleteThreadReply = async (reply: ThreadReplyItem) => {
    if (!activeThreadMessage || !currentUser) return;
    const liveParent = firestoreMessages.find((m) => m.id === activeThreadMessage.id);
    const nextThreadCount = computeNextThreadReplyCount(
      liveParent?.threadCount ?? activeThreadMessage.threadCount,
      threadReplies.length,
      -1
    );

    try {
      await deleteDoc(doc(db, 'messages', activeThreadMessage.id, 'threadReplies', reply.id));
      await updateDoc(doc(db, 'messages', activeThreadMessage.id), {
        threadCount: nextThreadCount,
        updatedAt: serverTimestamp(),
      }).catch(() => {});

      setLiveThreadCountsByMessageId((prev) => ({
        ...prev,
        [activeThreadMessage.id]: nextThreadCount,
      }));
      setActiveThreadMessage((prev) =>
        prev ? { ...prev, threadCount: nextThreadCount } : null
      );
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        `messages/${activeThreadMessage.id}/threadReplies/${reply.id}`
      );
    }
  };

  // Report a message
  const handleReportMessage = async (msg: HubMessage) => {
    if (!currentUser) {
      onOpenAuthModal('signin');
      return;
    }
    try {
      await addDoc(collection(db, 'reports'), {
        messageId: msg.id,
        channelId: msg.channelId.slice(0, 128),
        reporterId: currentUser.uid,
        reason: 'Reported by community member for moderator review',
        status: 'open',
        createdAt: serverTimestamp(),
      });
      setActiveActionMessageId(null);
      setComposerNotice(`Message by ${msg.authorName} has been flagged for moderator review.`);
      window.setTimeout(() => setComposerNotice(null), 4000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reports');
    }
  };

  // Delete a message (Author, Super Admin, Global Moderator, or Channel Moderator)
  const handleDeleteMessage = async (msg: HubMessage) => {
    try {
      await deleteDoc(doc(db, 'messages', msg.id));
      if (activeThreadMessage?.id === msg.id) {
        setActiveThreadMessage(null);
      }
      if (replyingTo?.id === msg.id) {
        setReplyingTo(null);
      }
      if (editingMessageId === msg.id) {
        setEditingMessageId(null);
      }
      setActiveActionMessageId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `messages/${msg.id}`);
    }
  };

  // Quick Google Sign-In directly inside the Hub (only allows already-registered database users)
  const handleQuickGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const profile = await checkExistingBuilderProfile(result.user);
      if (!profile) {
        await signOut(auth);
        onOpenAuthModal('join');
        return;
      }
      onProfileUpdated(profile);
    } catch (err) {
      console.error('Google Sign-In error:', err);
      onOpenAuthModal('signin');
    }
  };

  // ============================================================================
  // ADMIN & CHANNEL MODERATOR ACTIONS
  // ============================================================================

  // Save Global Settings (Super Admin only)
  const handleUpdateGlobalSettings = async (patch: Partial<CommunityGlobalSettings>) => {
    if (!currentUser || !isSuperAdmin) return;
    const next: CommunityGlobalSettings = {
      ...globalSettings,
      ...patch,
      updatedBy: currentUser.uid,
    };
    try {
      await setDoc(doc(db, 'community_settings', 'global'), {
        cooldownSeconds: next.cooldownSeconds,
        disableCooldown: next.disableCooldown,
        banLinks: next.banLinks,
        enableLinkPreviews: next.enableLinkPreviews,
        globalChatLocked: next.globalChatLocked,
        updatedBy: currentUser.uid,
        updatedAt: serverTimestamp(),
      });
      setComposerNotice('Global community settings updated.');
      window.setTimeout(() => setComposerNotice(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'community_settings/global');
    }
  };

  // Save Channel Config (Super Admin or appointed Channel Moderator)
  const handleSaveChannelConfig = async (
    channelId: string,
    patch: Partial<CommunityChannelConfig>
  ) => {
    if (!currentUser) return;
    const baseChannel =
      allChannels.find((c) => c.id === channelId) || DEFAULT_COMMUNITY_CHANNELS[0];
    const currentCfg = channelConfigs[channelId] || buildDefaultChannelConfig(baseChannel);
    const merged: CommunityChannelConfig = {
      ...currentCfg,
      ...patch,
      id: channelId,
    };

    const payload: Record<string, unknown> = {
      id: merged.id,
      name: merged.name.slice(0, 60),
      category: merged.category,
      emoji: (merged.emoji || '💬').slice(0, 16),
      description: (merged.description || 'Community channel').slice(0, 300),
      isCustom: Boolean(merged.isCustom),
      isLocked: Boolean(merged.isLocked),
      banLinks: Boolean(merged.banLinks),
      enableLinkPreviews: merged.enableLinkPreviews !== false,
      cooldownSeconds: Number(merged.cooldownSeconds ?? -1),
      allowMemberMessages: merged.allowMemberMessages !== false,
      allowMemberGroups: merged.allowMemberGroups !== false,
      allowMemberInvites: merged.allowMemberInvites !== false,
      moderatorIds: merged.moderatorIds.slice(0, 50),
      kickedUserIds: merged.kickedUserIds.slice(0, 200),
      updatedAt: serverTimestamp(),
    };
    if (merged.defaultCreationCategory) {
      payload.defaultCreationCategory = merged.defaultCreationCategory;
    }

    try {
      if (channelConfigs[channelId] && !isSuperAdmin) {
        // Channel Moderator updating allowed fields on an existing channel doc
        await updateDoc(doc(db, 'community_channels', channelId), {
          name: payload.name,
          description: payload.description,
          isLocked: payload.isLocked,
          banLinks: payload.banLinks,
          enableLinkPreviews: payload.enableLinkPreviews,
          cooldownSeconds: payload.cooldownSeconds,
          allowMemberMessages: payload.allowMemberMessages,
          allowMemberGroups: payload.allowMemberGroups,
          allowMemberInvites: payload.allowMemberInvites,
          kickedUserIds: payload.kickedUserIds,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(db, 'community_channels', channelId), payload);
      }
      setComposerNotice(`Updated settings for #${merged.name}.`);
      window.setTimeout(() => setComposerNotice(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `community_channels/${channelId}`);
    }
  };

  // Super Admin: Create a brand new custom channel
  const handleCreateCustomChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !isSuperAdmin || !newChannelName.trim()) return;

    const slug = newChannelName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);

    if (!slug) return;

    try {
      await setDoc(doc(db, 'community_channels', slug), {
        id: slug,
        name: newChannelName.trim().slice(0, 60),
        category: newChannelCategory,
        emoji: (newChannelEmoji.trim() || '✨').slice(0, 16),
        description: (newChannelDesc.trim() || `Discussion channel for ${newChannelName.trim()}`).slice(0, 300),
        isCustom: true,
        isLocked: false,
        banLinks: false,
        enableLinkPreviews: true,
        cooldownSeconds: -1,
        allowMemberMessages: true,
        allowMemberGroups: true,
        allowMemberInvites: true,
        moderatorIds: [],
        kickedUserIds: [],
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNewChannelName('');
      setNewChannelDesc('');
      setSelectedAdminChannelId(slug);
      setActiveChannelId(slug);
      setComposerNotice(`Channel #${slug} created!`);
      window.setTimeout(() => setComposerNotice(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `community_channels/${slug}`);
    }
  };

  // Super Admin: Update User Status (active | suspended | banned) or Global Role (member | moderator)
  const handleUpdateUserAccount = async (
    targetUser: BuilderProfile,
    patch: { status?: UserAccountStatus; role?: 'member' | 'moderator' | 'admin' }
  ) => {
    if (!currentUser || !isSuperAdmin) return;
    try {
      await updateDoc(doc(db, 'users', targetUser.uid), {
        ...(patch.role ? { role: patch.role } : {}),
        ...(patch.status ? { status: patch.status } : {}),
        updatedAt: serverTimestamp(),
      });
      setComposerNotice(`Updated account for ${targetUser.displayName}.`);
      window.setTimeout(() => setComposerNotice(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${targetUser.uid}`);
    }
  };

  // Super Admin: Provision/Create a new Member Profile document
  const handleAdminCreateMemberProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !isSuperAdmin || !newMemberName.trim()) return;

    const generatedUid = `member-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const color = AVATAR_COLORS[registeredUsers.length % AVATAR_COLORS.length];

    try {
      await setDoc(doc(db, 'users', generatedUid), {
        uid: generatedUid,
        displayName: newMemberName.trim().slice(0, 60),
        schoolName: (newMemberSchool.trim() || 'Build Buds Network').slice(0, 100),
        gradeLevel: newMemberGrade.slice(0, 40),
        primaryInterest: 'All Creations',
        avatarUrl: '',
        avatarColor: color,
        role: newMemberRole,
        status: 'active',
        acceptedGuidelines: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNewMemberName('');
      setNewMemberSchool('');
      setComposerNotice(`Created member profile for ${newMemberName.trim()}.`);
      window.setTimeout(() => setComposerNotice(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${generatedUid}`);
    }
  };

  // Create a Sub-Group / Private Room inside the active channel
  const handleCreateSubGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !canUserCreateSubGroup || !newGroupName.trim()) return;

    const groupId = `grp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const uniqueMembers = Array.from(new Set([currentUser.uid, ...newGroupInitialMembers])).slice(
      0,
      100
    );

    try {
      await setDoc(doc(db, 'community_groups', groupId), {
        id: groupId,
        channelId: activeChannelId,
        name: newGroupName.trim().slice(0, 60),
        description: (newGroupDesc.trim() || `Sub-group inside #${activeChannel.name}`).slice(0, 300),
        isPrivate: newGroupPrivate,
        createdBy: currentUser.uid,
        memberIds: uniqueMembers,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNewGroupName('');
      setNewGroupDesc('');
      setNewGroupPrivate(false);
      setNewGroupInitialMembers([]);
      setShowCreateGroupModal(false);
      setActiveSubGroupId(groupId);
      setComposerNotice(`Sub-group "${newGroupName.trim()}" created inside #${activeChannel.name}!`);
      window.setTimeout(() => setComposerNotice(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `community_groups/${groupId}`);
    }
  };

  // Add or Remove a member from a Sub-Group
  const handleToggleSubGroupMember = async (group: CommunitySubGroup, targetUid: string) => {
    if (!currentUser) return;
    const isCurrentlyMember = group.memberIds.includes(targetUid);
    const canRemove =
      isSuperAdmin || isCurrentChannelModerator || group.createdBy === currentUser.uid;

    if (isCurrentlyMember && !canRemove) return;
    if (!isCurrentlyMember && !canUserInviteToSubGroup) return;

    const nextMembers = isCurrentlyMember
      ? group.memberIds.filter((id) => id !== targetUid)
      : [...group.memberIds, targetUid].slice(0, 100);

    try {
      await updateDoc(doc(db, 'community_groups', group.id), {
        memberIds: nextMembers,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `community_groups/${group.id}`);
    }
  };

  // Delete a Sub-Group
  const handleDeleteSubGroup = async (group: CommunitySubGroup) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, 'community_groups', group.id));
      if (activeSubGroupId === group.id) {
        setActiveSubGroupId(null);
      }
      setShowManageGroupModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `community_groups/${group.id}`);
    }
  };

  // Resolve a flagged message report
  const handleResolveReport = async (reportId: string) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), {
        status: 'resolved',
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reports/${reportId}`);
    }
  };

  // Filter accessible sub-groups in the current channel
  const visibleSubGroups = channelSubGroups.filter(
    (g) =>
      !g.isPrivate ||
      isSuperAdmin ||
      isCurrentChannelModerator ||
      (currentUser && g.memberIds.includes(currentUser.uid))
  );

  // Filter Showcase Creations (real Firestore creations only)
  const filteredCreations =
    showcaseFilter === 'all'
      ? allShowcaseMessages
      : allShowcaseMessages.filter((m) => m.linkCategory === showcaseFilter);

  // Dynamically resolve any user's latest graphical avatar URL from live `registeredUsers` first,
  // falling back to stored message/presence avatar or deterministic preset portrait.
  const registeredUserMap = React.useMemo(() => {
    const map = new Map<string, BuilderProfile>();
    registeredUsers.forEach((u) => map.set(u.uid, u));
    if (currentUser && builderProfile) {
      map.set(currentUser.uid, builderProfile);
    }
    return map;
  }, [registeredUsers, currentUser, builderProfile]);

  const getLiveUserAvatarUrl = (uid: string, fallbackAvatar?: string): string => {
    const liveProfile = registeredUserMap.get(uid);
    return resolveBuilderAvatarUrl(liveProfile?.avatarUrl || fallbackAvatar, uid);
  };

  const getLiveUserDisplayName = (uid: string, fallbackName: string): string => {
    const liveProfile = registeredUserMap.get(uid);
    return liveProfile?.displayName || fallbackName || 'Builder';
  };

  const getLiveUserColor = (uid: string, fallbackColor: string): string => {
    const liveProfile = registeredUserMap.get(uid);
    return liveProfile?.avatarColor || fallbackColor || '#FFF025';
  };

  // Deduplicate and merge active online members:
  // 1) All active `/presence` documents (within 25s window)
  // 2) Any user who sent a message in the last 25 seconds (protects against any heartbeat lag)
  // 3) Current signed-in user
  // 4) Strict filter against `registeredUserMap` so deleted/unregistered accounts NEVER inflate the online count
  const effectiveOnlineMembers: PresenceItem[] = React.useMemo(() => {
    const now = Date.now();
    const validRegisteredIds = new Set<string>();
    registeredUserMap.forEach((profile, uid) => {
      if (profile.status !== 'banned') {
        validRegisteredIds.add(uid);
      }
    });

    const recentMessageAuthors: RawPresenceRecord[] = [];
    firestoreMessages.forEach((m) => {
      if (now - m.createdAtMillis < 25000 && m.authorId !== currentUser?.uid) {
        recentMessageAuthors.push({
          uid: m.authorId,
          displayName: getLiveUserDisplayName(m.authorId, m.authorName),
          avatarColor: getLiveUserColor(m.authorId, m.authorColor),
          avatarUrl: getLiveUserAvatarUrl(m.authorId, m.authorAvatar),
          activeChannelId: m.channelId,
          isTyping: false,
          lastSeenMillis: m.createdAtMillis,
        });
      }
    });

    const selfRecord: RawPresenceRecord | null =
      currentUser && builderProfile && userStatus !== 'banned'
        ? {
            uid: currentUser.uid,
            displayName: builderProfile.displayName || 'Builder',
            avatarColor: builderProfile.avatarColor || '#FFF025',
            avatarUrl: getLiveUserAvatarUrl(currentUser.uid, builderProfile.avatarUrl),
            activeChannelId: activeStreamId,
            isTyping: isCurrentlyTypingRef.current,
            lastSeenMillis: now,
          }
        : null;

    return computeAccurateOnlineMembers(
      onlineMembers,
      selfRecord,
      recentMessageAuthors,
      validRegisteredIds
    );
  }, [
    onlineMembers,
    firestoreMessages,
    currentUser,
    builderProfile,
    userStatus,
    activeStreamId,
    registeredUserMap,
  ]);

  // Exact real online count across the community + count in current channel
  const liveOnlineCount = effectiveOnlineMembers.length;
  const activeChannelOnlineCount = effectiveOnlineMembers.filter(
    (m) => m.activeChannelId === activeStreamId || m.activeChannelId.startsWith(activeChannelId)
  ).length;

  // Annotate messages with Discord-style consecutive grouping metadata
  const groupedMessages = React.useMemo(
    () => annotateMessageGrouping(firestoreMessages),
    [firestoreMessages]
  );

  // Typing users in current stream (excluding self)
  const typingUsersInChannel = effectiveOnlineMembers.filter(
    (p) => p.activeChannelId === activeStreamId && p.isTyping && p.uid !== currentUser?.uid
  );

  // Map of inline channel replies (messages that used replyToId) per parent message ID
  const inlineRepliesByParentId = React.useMemo(() => {
    const map: Record<string, HubMessage[]> = {};
    firestoreMessages.forEach((m) => {
      if (m.replyToId) {
        if (!map[m.replyToId]) {
          map[m.replyToId] = [];
        }
        map[m.replyToId].push(m);
      }
    });
    return map;
  }, [firestoreMessages]);

  const getMessageEffectiveReplyCount = (msg: HubMessage): number => {
    const inlineCount = inlineRepliesByParentId[msg.id]?.length || 0;
    const liveSubcollectionCount = liveThreadCountsByMessageId[msg.id];
    return computeEffectiveReplyCount(msg.threadCount, liveSubcollectionCount, inlineCount);
  };

  // Open unified Account & Profile Settings modal
  const handleOpenProfileSettings = (initialTab: 'profile' | 'notifications' = 'profile') => {
    if (!currentUser || !builderProfile) {
      onOpenAuthModal('signin');
      return;
    }
    setEditProfileName(builderProfile.displayName || '');
    setEditProfileSchool(builderProfile.schoolName || '');
    setSelectedAccentColor(builderProfile.avatarColor || '#FFF025');
    const matchedPreset = findPresetAvatar(builderProfile.avatarUrl);
    setSelectedPresetAvatarId(
      matchedPreset ? matchedPreset.id : getDefaultPresetAvatar(currentUser.uid).id
    );
    setBrowserPermission(getBrowserNotificationPermission());
    setNotificationStatusBanner(null);
    setProfileModalTab(initialTab);
    setShowAvatarModal(true);
  };

  // Mobile horizontal touch swipe handlers (swipe right from left to open sidebar, swipe left to close)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchSwipeRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchSwipeRef.current || e.changedTouches.length !== 1) return;
    const touch = e.changedTouches[0];
    const { startX, startY } = touchSwipeRef.current;
    touchSwipeRef.current = null;

    const action = evaluateHorizontalSwipeGesture(
      startX,
      startY,
      touch.clientX,
      touch.clientY,
      mobileSidebarOpen
    );

    if (action === 'open-sidebar') {
      setMobileSidebarOpen(true);
    } else if (action === 'close-sidebar') {
      setMobileSidebarOpen(false);
    }
  };

  // Clean Sign Out helper that immediately removes presence document so online count updates instantaneously
  const handleSignOutFromHub = async () => {
    if (currentUser) {
      isCurrentlyTypingRef.current = false;
      presenceLocalMetaRef.current.delete(currentUser.uid);
      try {
        await deleteDoc(doc(db, 'presence', currentUser.uid));
      } catch {
        // Ignore
      }
    }
    setShowAvatarModal(false);
    await signOut(auth);
  };

  // Leaving the Hub to return to the public website also removes active chat presence immediately
  const handleBackToWebsiteFromHub = () => {
    if (currentUser) {
      isCurrentlyTypingRef.current = false;
      presenceLocalMetaRef.current.delete(currentUser.uid);
      deleteDoc(doc(db, 'presence', currentUser.uid)).catch(() => {});
    }
    onBackToLanding();
  };

  // Selected channel config inside the Admin/Mod Drawer
  const adminTargetChannel =
    allChannels.find((c) => c.id === selectedAdminChannelId) || activeChannel;
  const adminTargetConfig: CommunityChannelConfig =
    channelConfigs[selectedAdminChannelId] || buildDefaultChannelConfig(adminTargetChannel);

  // ============================================================================
  // BANNED USER FULL-SCREEN INTERCEPT
  // ============================================================================
  if (userStatus === 'banned') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090a0d] text-white p-6">
        <div className="max-w-md w-full rounded-3xl bg-[#14161f] border-2 border-rose-500/40 p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
            <Ban className="w-8 h-8" />
          </div>
          <h2 className="font-chewy text-3xl text-white">Chat Access Restricted</h2>
          <p className="text-sm text-white/75 leading-relaxed">
            Your account (<span className="font-bold text-white">{builderProfile?.displayName}</span>) has been banned from the Build Buds Community Chat by the community administrator.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={onBackToLanding}
              className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white cursor-pointer"
            >
              Return to Website
            </button>
            <button
              onClick={() => signOut(auth)}
              className="flex-1 py-3 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-xs font-black text-white cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-50 flex flex-col bg-[#0e0f12] text-[#e3e5e8] font-sans select-none overflow-hidden"
    >
      {/* CLEAN, UNCLUTTERED MOBILE-FIRST TOP BAR */}
      <header className="h-14 shrink-0 bg-[#141519] border-b border-white/10 px-2.5 sm:px-4 flex items-center justify-between gap-2 z-20">
        {/* Left: Mobile Channels Drawer Toggle + Back to Website + Active Channel Name */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
          {/* Mobile Left-Sidebar Drawer Button */}
          <button
            type="button"
            onClick={() => setMobileSidebarOpen((prev) => !prev)}
            title="Open Channels Panel (or swipe right from left edge)"
            aria-label="Toggle Channels Panel"
            className="lg:hidden p-2 rounded-xl bg-white/8 hover:bg-white/15 text-white border border-white/10 transition-colors cursor-pointer shrink-0"
          >
            <Menu className="w-4 h-4" />
          </button>

          {!isStandaloneApp && (
            <button
              type="button"
              onClick={handleBackToWebsiteFromHub}
              title="Back to Build Buds Website"
              aria-label="Back to Website"
              className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden md:inline text-xs font-bold text-white/80">Website</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/10 flex items-center justify-center text-white/70 font-bold text-xs sm:text-sm shrink-0">
              #
            </span>
            <span className="text-sm sm:text-base shrink-0">{activeChannel.emoji}</span>
            <h1 className="font-bold text-white text-sm sm:text-base truncate">
              {viewMode === 'showcase' ? 'Shared Creations' : activeChannel.name}
            </h1>
            {activeSubGroup && viewMode === 'chat' && (
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md bg-[#FFF025]/20 border border-[#FFF025]/40 text-[#FFF025] text-xs font-bold truncate max-w-[140px]">
                / 👥 {activeSubGroup.name}
              </span>
            )}
            {effectiveChatLocked && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold shrink-0">
                <Lock className="w-2.5 h-2.5" />
                <span className="hidden sm:inline">Locked</span>
              </span>
            )}
            <span className="hidden xl:inline-block text-xs text-white/45 truncate max-w-md ml-2 pl-3 border-l border-white/10">
              {activeSubGroup ? activeSubGroup.description : activeChannel.description}
            </span>
          </div>
        </div>

        {/* Right: Only Essential Controls — Admin/Mod (if applicable), Live Online Pill, and User Account Icon */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Super Admin OR Channel Moderator Control Center Button */}
          {(isSuperAdmin || isCurrentChannelModerator) && (
            <button
              type="button"
              onClick={() => {
                setSelectedAdminChannelId(activeChannelId);
                setAdminTab(isSuperAdmin ? 'global' : 'channels');
                setActiveThreadMessage(null);
                setShowMembersDrawer(false);
                setShowAdminDrawer((prev) => !prev);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-black border cursor-pointer transition-all ${
                showAdminDrawer
                  ? 'bg-[#FFF025] text-black border-black'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 text-[#FFF025] border-[#FFF025]/40'
              }`}
              title={isSuperAdmin ? 'Open Super Admin Control Center' : 'Open Channel Moderator Controls'}
              aria-label={isSuperAdmin ? 'Admin Panel' : 'Channel Mod'}
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isSuperAdmin ? 'Admin Panel' : 'Channel Mod'}</span>
            </button>
          )}

          {/* Real Online Counter Pill (Click to view Online & Registered Members) */}
          <button
            type="button"
            onClick={() => {
              setShowAdminDrawer(false);
              setActiveThreadMessage(null);
              setShowMembersDrawer((prev) => !prev);
            }}
            title={`${liveOnlineCount} total online in community • ${activeChannelOnlineCount} in #${activeChannel.name}`}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border text-xs font-bold tabular-nums cursor-pointer transition-colors ${
              showMembersDrawer
                ? 'bg-emerald-500 text-black border-emerald-300 font-black'
                : 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/50'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                showMembersDrawer ? 'bg-black' : 'bg-emerald-400 animate-pulse'
              }`}
            />
            <span>{liveOnlineCount} online</span>
          </button>

          {/* Account Icon -> Opens User Profile Settings Modal */}
          {currentUser && builderProfile ? (
            <button
              type="button"
              onClick={() => handleOpenProfileSettings('profile')}
              title="Account & Profile Settings"
              aria-label="Account & Profile Settings"
              className="relative rounded-full p-0.5 border-2 border-white/20 hover:border-[#FFF025] focus:outline-none focus:border-[#FFF025] transition-all cursor-pointer shrink-0 group"
            >
              <img
                src={getLiveUserAvatarUrl(currentUser.uid, builderProfile.avatarUrl)}
                alt={builderProfile.displayName}
                className="w-8 h-8 rounded-full object-cover"
              />
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#141519] ${
                  userStatus === 'suspended' ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
              />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAuthModal('signin')}
              className="px-3 py-1.5 rounded-xl bg-[#FFF025] hover:bg-[#ffe500] text-black text-xs font-black cursor-pointer shrink-0"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* MOBILE SIDEBAR BACKDROP OVERLAY */}
        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
            className="fixed inset-0 bg-black/65 backdrop-blur-[1px] z-30 lg:hidden animate-fade-in"
          />
        )}

        {/* LEFT SIDEBAR: Categorized Channels & Sub-Groups (Slide-over on mobile, static on desktop) */}
        <aside
          aria-label="Community Channels Sidebar"
          className={`${
            mobileSidebarOpen
              ? 'fixed inset-y-0 left-0 z-40 w-72 max-w-[84vw] flex shadow-2xl'
              : 'hidden lg:flex lg:w-64'
          } flex-col bg-[#121317] border-r border-white/10 shrink-0 select-none transition-transform duration-200`}
        >
          {/* Brand Banner inside Sidebar */}
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src="/assets/aistudio/images/aurora logo (1).png"
                alt="Build Buds"
                className="w-7 h-7 rounded-lg object-contain bg-black/40 p-0.5 border border-white/15"
              />
              <div>
                <div className="text-xs font-black tracking-wide text-white flex items-center gap-1">
                  <span>BUILD BUDS HUB</span>
                  <Sparkles className="w-3 h-3 text-[#FFF025]" />
                </div>
                <div className="text-[10px] text-white/50">Real-Time Community</div>
              </div>
            </div>
            {mobileSidebarOpen && (
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                aria-label="Close Channels Panel"
                className="lg:hidden p-1.5 rounded-lg bg-white/5 text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Scrollable Channel Categories */}
          <div className="flex-1 overflow-y-auto hub-scroll px-2.5 py-3 space-y-5">
            {(['INFORMATION', 'CREATOR SHOWCASES', 'SOCIAL'] as const).map((category) => {
              const categoryChannels = allChannels.filter((c) => c.category === category);
              return (
                <div key={category}>
                  <div className="px-2 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-white/40 flex items-center justify-between">
                    <span>{category}</span>
                    {category === 'CREATOR SHOWCASES' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#FFF025]/15 text-[#FFF025] font-mono">
                        LINKS
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {categoryChannels.map((channel) => {
                      const isSelected = channel.id === activeChannelId && viewMode === 'chat';
                      const chCfg = channelConfigs[channel.id];
                      const isChannelLocked = chCfg?.isLocked || globalSettings.globalChatLocked;
                      const isModForThisChannel =
                        currentUser && chCfg?.moderatorIds?.includes(currentUser.uid);

                      return (
                        <div key={channel.id} className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveChannelId(channel.id);
                              setActiveSubGroupId(null);
                              setViewMode('chat');
                              setMobileSidebarOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs font-medium transition-all cursor-pointer relative group ${
                              isSelected
                                ? 'bg-white/10 text-white font-bold'
                                : 'text-white/65 hover:bg-white/5 hover:text-white/90'
                            }`}
                          >
                            {isSelected && (
                              <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#FFF025] rounded-r" />
                            )}

                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-white/40 font-mono text-sm">#</span>
                              <span className="text-sm shrink-0">{channel.emoji}</span>
                              <span className="truncate">{channel.name}</span>
                            </div>

                            <div className="flex items-center gap-1">
                              {isModForThisChannel && (
                                <span
                                  title="You are a Moderator for this channel"
                                  className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-black"
                                >
                                  MOD
                                </span>
                              )}
                              {isChannelLocked && (
                                <Lock className="w-3 h-3 text-rose-400 shrink-0" />
                              )}
                            </div>
                          </button>

                          {/* Nested Sub-Groups under the currently active channel */}
                          {isSelected && visibleSubGroups.length > 0 && (
                            <div className="pl-6 pr-1 py-1 space-y-1 border-l border-white/10 ml-3">
                              {visibleSubGroups.map((grp) => {
                                const isGrpSelected = activeSubGroupId === grp.id;
                                return (
                                  <button
                                    key={grp.id}
                                    type="button"
                                    onClick={() => {
                                      setActiveSubGroupId(grp.id);
                                      setMobileSidebarOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left text-[11px] transition-colors cursor-pointer ${
                                      isGrpSelected
                                        ? 'bg-[#FFF025]/20 text-[#FFF025] font-bold'
                                        : 'text-white/55 hover:bg-white/5 hover:text-white'
                                    }`}
                                  >
                                    <span className="truncate flex items-center gap-1.5">
                                      <span>{grp.isPrivate ? '🔒' : '👥'}</span>
                                      <span className="truncate">{grp.name}</span>
                                    </span>
                                    <span className="text-[9px] font-mono opacity-60">
                                      {grp.memberIds.length}m
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Shared Creations Directory link tucked neatly under CREATOR SHOWCASES */}
                    {category === 'CREATOR SHOWCASES' && (
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode('showcase');
                          setMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs font-medium transition-all cursor-pointer mt-1 ${
                          viewMode === 'showcase'
                            ? 'bg-[#FFF025]/15 text-[#FFF025] font-bold border border-[#FFF025]/30'
                            : 'text-white/60 hover:bg-white/5 hover:text-white/90'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <LayoutGrid className="w-3.5 h-3.5 text-[#FFF025] shrink-0" />
                          <span className="truncate">All Shared Links</span>
                        </div>
                        <span className="text-[10px] font-mono text-white/45">
                          {allShowcaseMessages.length}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Authenticated Builder Status Pod */}
          <div className="p-3 bg-[#0b0c0f] border-t border-white/10">
            {currentUser && builderProfile ? (
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenProfileSettings('profile')}
                  title="Open Account & Profile Settings"
                  className="flex items-center gap-2.5 min-w-0 flex-1 text-left p-1 -m-1 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group/pod"
                >
                  <div className="relative shrink-0">
                    <img
                      src={getLiveUserAvatarUrl(currentUser.uid, builderProfile.avatarUrl)}
                      alt={builderProfile.displayName}
                      className="w-9 h-9 rounded-full object-cover border-2 border-white/20 group-hover/pod:border-[#FFF025] transition-colors"
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#0b0c0f] ${
                        userStatus === 'suspended' ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                      <span className="truncate">{builderProfile.displayName}</span>
                      {isSuperAdmin ? (
                        <span className="px-1 py-0.2 text-[9px] rounded bg-[#FFF025] text-black font-black uppercase">
                          ADMIN
                        </span>
                      ) : isCurrentChannelModerator ? (
                        <span className="px-1 py-0.2 text-[9px] rounded bg-emerald-400 text-black font-black uppercase">
                          MOD
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[10px] text-white/50 truncate">
                      {userStatus === 'suspended' ? (
                        <span className="text-amber-400 font-bold">Suspended (Read-Only)</span>
                      ) : (
                        <span>Tap to edit profile & avatar</span>
                      )}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleSignOutFromHub}
                  title="Sign Out"
                  aria-label="Sign Out"
                  className="p-2 rounded-lg text-white/50 hover:text-rose-400 hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleQuickGoogleSignIn}
                  className="w-full py-2 px-3 rounded-xl bg-[#FFF025] hover:bg-[#ffe500] text-black font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
                >
                  <LogIn className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Sign In with Google</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuthModal('join')}
                  className="w-full py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white/90 font-bold text-[11px] cursor-pointer transition-colors"
                >
                  Or Sign Up with Email
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* CENTER COLUMN: Live Chat Stream OR Shared Creations Directory */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#16171b]">
          {viewMode === 'showcase' ? (
            /* SHARED LINKS & COVERS DIRECTORY VIEW */
            <div className="flex-1 overflow-y-auto hub-scroll p-4 sm:p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h2 className="font-chewy text-2xl sm:text-3xl text-white">
                    Community Creation Links & Cover Showcase
                  </h2>
                  <p className="text-xs sm:text-sm text-white/65 mt-0.5">
                    Explore real games, websites, videos, and novels uploaded by signed-in Build Buds creators.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('chat')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white cursor-pointer"
                  >
                    ← Back to Chat
                  </button>
                  {(
                    [
                      { id: 'all', label: 'All Creations' },
                      { id: 'game', label: '🎮 Games' },
                      { id: 'website', label: '🌐 Websites' },
                      { id: 'video', label: '🎬 Videos' },
                      { id: 'novel', label: '📚 Novels' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setShowcaseFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        showcaseFilter === tab.id
                          ? 'bg-[#FFF025] text-black'
                          : 'bg-white/5 text-white/75 hover:bg-white/10'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredCreations.length === 0 ? (
                <div className="rounded-3xl bg-[#101115] border border-white/10 p-12 text-center space-y-3">
                  <Sparkles className="w-8 h-8 text-[#FFF025] mx-auto" />
                  <h3 className="text-base font-bold text-white">No creation links shared yet</h3>
                  <p className="text-xs text-white/60 max-w-md mx-auto">
                    When community members upload links to their games, websites, videos, or novels in the channels, they will appear right here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filteredCreations.map((item) => {
                    const effectiveCount = getMessageEffectiveReplyCount(item);
                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl bg-[#101115] border border-white/15 overflow-hidden flex flex-col justify-between hover:border-[#FFF025]/60 transition-all group"
                      >
                        <div>
                          <div className="relative h-44 bg-black/60 overflow-hidden border-b border-white/10">
                            <img
                              src={item.coverImageUrl || '/assets/aistudio/extracted/card-galaxy.png'}
                              alt={item.linkTitle || 'Project Cover'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-black/80 text-[#FFF025] border border-white/20">
                              {item.linkCategory || 'project'}
                            </span>
                            <span className="absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-mono bg-black/75 text-white/80">
                              #{item.channelId}
                            </span>
                          </div>

                          <div className="p-4 space-y-2">
                            <div className="text-[11px] font-mono text-white/50 truncate">
                              {item.linkDomain || 'buildbuds.community'}
                            </div>
                            <h3 className="text-base font-bold text-white line-clamp-1">
                              {item.linkTitle || 'Creator Build'}
                            </h3>
                            <p className="text-xs text-white/70 line-clamp-2 leading-relaxed">
                              {item.linkDescription || item.text}
                            </p>
                          </div>
                        </div>

                        <div className="px-4 py-3 bg-white/[0.02] border-t border-white/10 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={getLiveUserAvatarUrl(item.authorId, item.authorAvatar)}
                              alt={item.authorName}
                              className="w-6 h-6 rounded-full object-cover border border-white/20 shrink-0"
                            />
                            <span className="text-xs font-bold text-white/85 truncate">
                              {getLiveUserDisplayName(item.authorId, item.authorName)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveChannelId(item.channelId);
                                setViewMode('chat');
                                setActiveThreadMessage(item);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold text-white cursor-pointer"
                            >
                              Discuss ({effectiveCount})
                            </button>
                            {item.linkUrl && (
                              <a
                                href={item.linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#FFF025] hover:bg-[#ffe500] text-black text-xs font-black"
                              >
                                <span>Open</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* DISCORD-STYLE REAL-TIME CHAT FEED */
            <>
              {/* SUB-GROUPS & CHANNEL ROOMS BAR */}
              <div className="bg-[#121318] border-b border-white/10 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-1.5 py-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveSubGroupId(null)}
                    className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                      !activeSubGroupId
                        ? 'bg-[#FFF025] text-black font-black'
                        : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    # Main Channel
                  </button>

                  {visibleSubGroups.map((grp) => (
                    <button
                      key={grp.id}
                      type="button"
                      onClick={() => setActiveSubGroupId(grp.id)}
                      className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                        activeSubGroupId === grp.id
                          ? 'bg-[#B11469] text-white font-black border border-white/20'
                          : 'bg-white/5 text-white/75 hover:bg-white/10'
                      }`}
                    >
                      <span>{grp.isPrivate ? '🔒' : '👥'}</span>
                      <span>{grp.name}</span>
                      <span className="text-[10px] opacity-70">({grp.memberIds.length})</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {activeSubGroup && (
                    <button
                      type="button"
                      onClick={() => setShowManageGroupModal(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold text-white cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-[#FFF025]" />
                      <span className="hidden sm:inline">Members</span>
                      <span>({activeSubGroup.memberIds.length})</span>
                    </button>
                  )}

                  {currentUser && canUserCreateSubGroup && (
                    <button
                      type="button"
                      onClick={() => setShowCreateGroupModal(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold text-[#FFF025] cursor-pointer shrink-0"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>+ Create Sub-Group</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Showcase Channel Quick Prompt */}
              {activeChannel.defaultCreationCategory && !effectiveBanLinks && (
                <div className="bg-gradient-to-r from-[#1e1f26] via-[#25182e] to-[#1e1f26] border-b border-white/10 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-white/90">
                    <span className="px-2 py-0.5 rounded bg-[#FFF025] text-black font-black uppercase text-[10px]">
                      {activeChannel.name} Showcase
                    </span>
                    <span className="hidden sm:inline">
                      Share your {activeChannel.defaultCreationCategory} link and custom cover art with the community!
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAttachmentDrawer(true)}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-[#FFF025] cursor-pointer"
                  >
                    + Attach {activeChannel.name} Link & Cover
                  </button>
                </div>
              )}

              {/* Kicked From Channel Intercept */}
              {isKickedFromActiveChannel ? (
                <div className="flex-1 flex items-center justify-center p-8 text-center">
                  <div className="max-w-md rounded-3xl bg-[#101115] border border-rose-500/30 p-8 space-y-3">
                    <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto" />
                    <h3 className="text-lg font-bold text-white">
                      Removed from #{activeChannel.name}
                    </h3>
                    <p className="text-xs text-white/65 leading-relaxed">
                      A channel moderator or administrator has removed your access to this channel. Please select another channel from the sidebar.
                    </p>
                  </div>
                </div>
              ) : (
                /* Scrollable Real-Time Message Stream with Discord-Style Consecutive Grouping */
                <div
                  onClick={() => setActiveActionMessageId(null)}
                  className="flex-1 overflow-y-auto hub-scroll px-3 sm:px-6 py-4 select-text"
                >
                  {groupedMessages.length === 0 ? (
                    <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center px-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl mb-3">
                        {activeSubGroup ? '👥' : activeChannel.emoji}
                      </div>
                      <h3 className="font-bold text-white text-base">
                        Welcome to {activeSubGroup ? `Sub-Group: ${activeSubGroup.name}` : `#${activeChannel.name}`}
                      </h3>
                      <p className="text-xs text-white/50 max-w-sm mt-1 leading-relaxed">
                        {activeSubGroup
                          ? activeSubGroup.description
                          : activeChannel.description}
                      </p>
                      <p className="text-[11px] font-mono text-[#FFF025]/80 mt-3">
                        No messages yet — send the first message below to start the conversation!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {groupedMessages.map(({ message: msg, isFirstInGroup }) => {
                        const isOwnMessage = currentUser?.uid === msg.authorId;
                        const resolvedAvatarUrl = getLiveUserAvatarUrl(
                          msg.authorId,
                          msg.authorAvatar
                        );
                        const resolvedAuthorName = getLiveUserDisplayName(
                          msg.authorId,
                          msg.authorName
                        );
                        const resolvedAuthorColor = getLiveUserColor(
                          msg.authorId,
                          msg.authorColor
                        );
                        const effectiveReplyCount = getMessageEffectiveReplyCount(msg);
                        const hasReactionsOrThreads =
                          effectiveReplyCount > 0 ||
                          Object.values(msg.reactions || {}).some((c) => c > 0);
                        const isEditingThisMessage = editingMessageId === msg.id;
                        const isActionOpen = activeActionMessageId === msg.id;

                        return (
                          <div
                            key={msg.id}
                            data-grouped={isFirstInGroup ? 'false' : 'true'}
                            className={`group relative rounded-xl px-2 sm:px-2.5 -mx-2 sm:-mx-2.5 hover:bg-white/[0.035] transition-colors ${
                              isFirstInGroup ? 'mt-4 first:mt-0 pt-1.5 pb-1' : 'mt-0.5 py-0.5'
                            } ${isActionOpen ? 'bg-white/[0.04]' : ''}`}
                          >
                            {/* Curved Inline Reply Connector */}
                            {msg.replyToAuthor && (
                              <div className="flex items-center gap-2 text-xs text-white/55 mb-1 pl-4 relative">
                                <div className="w-6 h-3 border-l-2 border-t-2 border-white/25 rounded-tl-md -ml-2 mt-1.5 shrink-0" />
                                <span
                                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-black shrink-0"
                                  style={{ backgroundColor: msg.replyToColor || '#a855f7' }}
                                >
                                  {msg.replyToAuthor.charAt(0).toUpperCase()}
                                </span>
                                <span
                                  className="font-bold hover:underline cursor-pointer shrink-0"
                                  style={{ color: msg.replyToColor || '#c084fc' }}
                                >
                                  {msg.replyToAuthor}
                                </span>
                                <span className="truncate text-white/50 max-w-[200px] sm:max-w-md">
                                  {msg.replyToSnippet}
                                </span>
                              </div>
                            )}

                            <div className="flex items-start gap-2.5 sm:gap-3.5">
                              {/* Left Column: 40x40 Graphical Avatar on first message of group; subtle hover timestamp on grouped follow-ups */}
                              {isFirstInGroup ? (
                                <img
                                  src={resolvedAvatarUrl}
                                  alt={resolvedAuthorName}
                                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-white/15 shrink-0 mt-0.5 shadow-md"
                                />
                              ) : (
                                <div className="w-9 sm:w-10 shrink-0 flex items-center justify-end pr-1 pt-1 select-none">
                                  <span className="text-[10px] font-mono text-white/30 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                                    {msg.timeLabel}
                                  </span>
                                </div>
                              )}

                              {/* Right Column: Message Content aligned consistently across the group */}
                              <div className="flex-1 min-w-0">
                                {isFirstInGroup && (
                                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                                    <div className="flex items-baseline gap-2 flex-wrap min-w-0">
                                      <span
                                        className="font-mono font-bold text-sm tracking-tight truncate"
                                        style={{ color: resolvedAuthorColor }}
                                      >
                                        {resolvedAuthorName}
                                      </span>

                                      {msg.authorRole === 'admin' && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-[#FFF025] text-black">
                                          ADMIN
                                        </span>
                                      )}
                                      {msg.authorRole === 'moderator' && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-400 text-black">
                                          MOD
                                        </span>
                                      )}

                                      <span className="text-[11px] font-mono text-white/35 tabular-nums">
                                        {msg.timeLabel}
                                      </span>
                                    </div>

                                    {/* Mobile / Touch Action Menu Trigger */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveActionMessageId((prev) =>
                                          prev === msg.id ? null : msg.id
                                        );
                                      }}
                                      aria-label="Message Actions"
                                      title="Message Actions (Reply, Edit, Delete, React)"
                                      className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                                    >
                                      <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}

                                {/* Inline Message Edit Input OR Message Text */}
                                {isEditingThisMessage ? (
                                  <form
                                    onSubmit={(e) => {
                                      e.preventDefault();
                                      handleSaveEditMessage(msg);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="mt-1 space-y-2 max-w-xl"
                                  >
                                    <input
                                      type="text"
                                      autoFocus
                                      value={editingMessageText}
                                      onChange={(e) => setEditingMessageText(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Escape') {
                                          setEditingMessageId(null);
                                          setEditingMessageText('');
                                        }
                                      }}
                                      className="w-full px-3 py-2 rounded-xl bg-[#101218] border border-[#FFF025] text-sm font-mono text-white focus:outline-none"
                                    />
                                    <div className="flex items-center gap-2 text-[11px]">
                                      <button
                                        type="submit"
                                        disabled={isSavingMessageEdit}
                                        className="px-3 py-1 rounded-lg bg-[#FFF025] text-black font-black cursor-pointer flex items-center gap-1"
                                      >
                                        <Check className="w-3 h-3" />
                                        <span>{isSavingMessageEdit ? 'Saving...' : 'Save'}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingMessageId(null);
                                          setEditingMessageText('');
                                        }}
                                        className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 font-bold cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </form>
                                ) : (
                                  <div className="flex items-baseline justify-between gap-2">
                                    <div className="flex items-baseline gap-2 flex-wrap min-w-0">
                                      <p className="font-mono text-sm sm:text-[15px] text-[#eef0f3] leading-relaxed break-words">
                                        {msg.text}
                                      </p>
                                      {msg.isEdited && (
                                        <span className="text-[10px] font-mono text-white/40 select-none">
                                          (edited)
                                        </span>
                                      )}
                                      {msg.hadProfanity && (
                                        <span
                                          title="Automatic profanity filter masked restricted words"
                                          className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-white/40"
                                        >
                                          filtered
                                        </span>
                                      )}
                                    </div>

                                    {!isFirstInGroup && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveActionMessageId((prev) =>
                                            prev === msg.id ? null : msg.id
                                          );
                                        }}
                                        aria-label="Message Actions"
                                        title="Message Actions (Reply, Edit, Delete, React)"
                                        className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                                      >
                                        <MoreHorizontal className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* Rich Link Preview & Uploaded Cover Card (Rendered when Link Previews are enabled) */}
                                {msg.linkUrl && effectiveEnableLinkPreviews && (
                                  <div className="mt-2.5 max-w-xl rounded-2xl bg-[#101115] border-l-4 border-l-[#FFF025] border border-white/15 overflow-hidden shadow-lg">
                                    <div className="grid grid-cols-1 sm:grid-cols-12">
                                      {msg.coverImageUrl && (
                                        <div className="sm:col-span-5 h-36 sm:h-auto bg-black/50 overflow-hidden">
                                          <img
                                            src={msg.coverImageUrl}
                                            alt={msg.linkTitle || 'Creation preview'}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      )}
                                      <div
                                        className={`${
                                          msg.coverImageUrl ? 'sm:col-span-7' : 'sm:col-span-12'
                                        } p-3.5 flex flex-col justify-between gap-2`}
                                      >
                                        <div>
                                          <div className="flex items-center justify-between gap-2 mb-1">
                                            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-[#FFF025] font-bold">
                                              {msg.linkCategory || 'creation'}
                                            </span>
                                            <span className="text-[11px] font-mono text-white/45 truncate">
                                              {msg.linkDomain}
                                            </span>
                                          </div>
                                          <a
                                            href={msg.linkUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm font-bold text-sky-400 hover:underline line-clamp-1 flex items-center gap-1"
                                          >
                                            <span>{msg.linkTitle || msg.linkUrl}</span>
                                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                          </a>
                                          {msg.linkDescription && (
                                            <p className="text-xs text-white/65 mt-1 line-clamp-2 leading-relaxed">
                                              {msg.linkDescription}
                                            </p>
                                          )}
                                        </div>

                                        <div className="pt-1 flex flex-wrap items-center gap-2">
                                          <a
                                            href={msg.linkUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FFF025] hover:bg-[#ffe500] text-black text-xs font-black"
                                          >
                                            <span>Open Creation</span>
                                            <ExternalLink className="w-3 h-3" />
                                          </a>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setShowAdminDrawer(false);
                                              setShowMembersDrawer(false);
                                              setActiveThreadMessage(msg);
                                            }}
                                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white/85 text-xs font-bold cursor-pointer"
                                          >
                                            Feedback Thread ({effectiveReplyCount})
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Plain Link Fallback when Link Previews are turned off by Admin */}
                                {msg.linkUrl && !effectiveEnableLinkPreviews && (
                                  <div className="mt-1">
                                    <a
                                      href={msg.linkUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs font-mono text-sky-400 hover:underline"
                                    >
                                      <span>{msg.linkUrl}</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                )}

                                {/* Reaction Pills Row + Accurate Multi-Reply Thread Button */}
                                {hasReactionsOrThreads && (
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                    {Object.entries(msg.reactions || {}).map(([emoji, count]) =>
                                      count > 0 ? (
                                        <button
                                          key={emoji}
                                          type="button"
                                          onClick={() => handleToggleReaction(msg, emoji)}
                                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#23252c] hover:bg-[#2e313a] border border-white/10 text-xs font-mono font-bold text-white tabular-nums cursor-pointer transition-transform active:scale-95"
                                        >
                                          <span>{emoji}</span>
                                          <span>{count}</span>
                                        </button>
                                      ) : null
                                    )}

                                    {effectiveReplyCount > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowAdminDrawer(false);
                                          setShowMembersDrawer(false);
                                          setActiveThreadMessage(msg);
                                        }}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/25 text-xs font-bold text-sky-300 cursor-pointer"
                                      >
                                        <MessageSquare className="w-3 h-3" />
                                        <span>
                                          {effectiveReplyCount}{' '}
                                          {effectiveReplyCount === 1 ? 'reply' : 'replies'}
                                        </span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Hover & Touch Action Bar (Emoji Reactions, Reply, Thread, Edit, Delete, Report) */}
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className={`${
                                isActionOpen ? 'flex' : 'hidden group-hover:flex'
                              } items-center gap-0.5 absolute -top-3 right-2 sm:right-3 bg-[#1e2028] border border-white/15 rounded-xl px-1.5 py-1 shadow-xl z-10 max-w-[95vw] overflow-x-auto no-scrollbar`}
                            >
                              {QUICK_EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => {
                                    handleToggleReaction(msg, emoji);
                                    setActiveActionMessageId(null);
                                  }}
                                  title={`React with ${emoji}`}
                                  className="p-1 rounded hover:bg-white/10 text-sm cursor-pointer transition-transform hover:scale-110 shrink-0"
                                >
                                  {emoji}
                                </button>
                              ))}

                              <div className="w-px h-4 bg-white/15 mx-1 shrink-0" />

                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingTo(msg);
                                  setActiveActionMessageId(null);
                                }}
                                title="Reply Inline"
                                className="p-1.5 rounded hover:bg-white/10 text-white/75 hover:text-white cursor-pointer shrink-0"
                              >
                                <Reply className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setShowAdminDrawer(false);
                                  setShowMembersDrawer(false);
                                  setActiveThreadMessage(msg);
                                  setActiveActionMessageId(null);
                                }}
                                title="Open Discussion Thread"
                                className="p-1.5 rounded hover:bg-white/10 text-white/75 hover:text-[#FFF025] cursor-pointer shrink-0"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit Own Message */}
                              {isOwnMessage && userStatus === 'active' && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEditMessage(msg)}
                                  title="Edit Message"
                                  aria-label="Edit Message"
                                  className="p-1.5 rounded hover:bg-white/10 text-white/75 hover:text-[#FFF025] cursor-pointer shrink-0"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete Own Message (or Admin/Moderator Delete) */}
                              {(isOwnMessage || isSuperAdmin || isCurrentChannelModerator) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDeleteMessage(msg);
                                    setActiveActionMessageId(null);
                                  }}
                                  title="Delete Message"
                                  aria-label="Delete Message"
                                  className="p-1.5 rounded hover:bg-rose-500/20 text-white/70 hover:text-rose-400 cursor-pointer shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {!isOwnMessage && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleReportMessage(msg);
                                    setActiveActionMessageId(null);
                                  }}
                                  title="Report Message to Moderators"
                                  className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-amber-400 cursor-pointer shrink-0"
                                >
                                  <Flag className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Typing Indicator Bubble inside Stream */}
                  {typingUsersInChannel.length > 0 && (
                    <div className="flex items-center gap-3 pt-3 pl-0.5">
                      <img
                        src={getLiveUserAvatarUrl(
                          typingUsersInChannel[0].uid,
                          typingUsersInChannel[0].avatarUrl
                        )}
                        alt={typingUsersInChannel[0].displayName}
                        className="w-8 h-8 rounded-full object-cover border border-white/20"
                      />
                      <div className="px-3.5 py-2 rounded-2xl bg-[#22242b] border border-[#FFF025]/40 inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#FFF025] animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-2 h-2 rounded-full bg-[#FFF025] animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-2 h-2 rounded-full bg-[#FFF025] animate-bounce" />
                      </div>
                      <span className="text-xs font-mono font-bold text-[#FFF025]">
                        {typingUsersInChannel.map((u) => u.displayName).join(', ')}{' '}
                        {typingUsersInChannel.length === 1 ? 'is' : 'are'} typing...
                      </span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* BOTTOM COMPOSER AREA */}
              <div className="p-2.5 sm:px-5 sm:pb-4 bg-[#141519] border-t border-white/10 space-y-2">
                {/* Pinned Real-Time Typing Indicator Banner right above the input box */}
                {typingUsersInChannel.length > 0 && (
                  <div className="px-3.5 py-1.5 rounded-xl bg-[#1d1f29] border border-[#FFF025]/40 flex items-center gap-2.5 text-xs">
                    <div className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#FFF025] animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-2 h-2 rounded-full bg-[#FFF025] animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-2 h-2 rounded-full bg-[#FFF025] animate-bounce" />
                    </div>
                    <span className="font-mono font-bold text-[#FFF025]">
                      {typingUsersInChannel.map((u) => u.displayName).join(', ')}
                    </span>
                    <span className="text-white/75 font-medium">
                      {typingUsersInChannel.length === 1 ? 'is typing a message...' : 'are typing messages...'}
                    </span>
                  </div>
                )}

                {/* Suspended Account Read-Only Banner */}
                {userStatus === 'suspended' && (
                  <div className="px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Your account is currently suspended (Read-Only Mode). You can browse channels and read messages, but posting and reacting are disabled.
                    </span>
                  </div>
                )}

                {/* Channel Locked / Member Posting Disabled Notice */}
                {!canUserSendMessageInChannel && userStatus === 'active' && !isKickedFromActiveChannel && (
                  <div className="px-3.5 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>
                      {effectiveChatLocked
                        ? 'This channel is currently locked by an administrator or moderator.'
                        : 'Sending messages in this channel is currently restricted to moderators.'}
                    </span>
                  </div>
                )}

                {/* Notices & Errors */}
                {composerError && (
                  <div className="px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{composerError}</span>
                    </div>
                    <button onClick={() => setComposerError(null)} className="cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {composerNotice && (
                  <div className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{composerNotice}</span>
                    </div>
                    <button onClick={() => setComposerNotice(null)} className="cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Replying-To Banner */}
                {replyingTo && (
                  <div className="flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-[#1f2129] border border-white/10 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <Reply className="w-3.5 h-3.5 text-[#FFF025] shrink-0" />
                      <span className="text-white/65 shrink-0">Replying to</span>
                      <span
                        className="font-bold shrink-0"
                        style={{ color: replyingTo.authorColor || '#FFF025' }}
                      >
                        @{replyingTo.authorName}
                      </span>
                      <span className="text-white/45 truncate max-w-xs">
                        — {replyingTo.text}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="text-white/50 hover:text-white cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Attach Link & Upload Cover Art Drawer */}
                {showAttachmentDrawer && (!effectiveBanLinks || isSuperAdmin || isCurrentChannelModerator) && (
                  <div className="p-3.5 rounded-2xl bg-[#1c1e26] border border-white/15 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#FFF025]">
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span>Attach Creation Link & Project Cover</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAttachmentDrawer(false)}
                        className="text-white/50 hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-bold uppercase text-white/60 mb-1">
                          Creation Category
                        </label>
                        <select
                          value={linkCategoryInput}
                          onChange={(e) =>
                            setLinkCategoryInput(e.target.value as CreationCategory)
                          }
                          className="w-full px-2.5 py-2 rounded-xl bg-[#111217] border border-white/15 text-xs text-white focus:outline-none focus:border-[#FFF025]"
                        >
                          <option value="game">🎮 Game Link</option>
                          <option value="website">🌐 Website Link</option>
                          <option value="video">🎬 Video Link</option>
                          <option value="novel">📚 Novel / Story Link</option>
                        </select>
                      </div>

                      <div className="sm:col-span-5">
                        <label className="block text-[10px] font-bold uppercase text-white/60 mb-1">
                          Project / Creation URL
                        </label>
                        <input
                          type="text"
                          value={linkUrlInput}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLinkUrlInput(val);
                            if (val.trim()) {
                              const prev = generateLinkPreview(val, linkCategoryInput);
                              if (!linkTitleInput) setLinkTitleInput(prev.title);
                              if (!linkDescInput) setLinkDescInput(prev.description);
                            }
                          }}
                          placeholder="https://your-game-or-site.app"
                          className="w-full px-3 py-2 rounded-xl bg-[#111217] border border-white/15 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFF025]"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold uppercase text-white/60 mb-1">
                          Custom Cover Image (Optional)
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-[#FFF025]" />
                            <span>
                              {isCompressingImage
                                ? 'Optimizing...'
                                : customCoverDataUrl
                                  ? 'Change Cover'
                                  : 'Upload Cover'}
                            </span>
                          </button>
                          {customCoverDataUrl && (
                            <img
                              src={customCoverDataUrl}
                              alt="Uploaded Cover Preview"
                              className="w-9 h-9 rounded-lg object-cover border border-[#FFF025]"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={linkTitleInput}
                        onChange={(e) => setLinkTitleInput(e.target.value)}
                        placeholder="Preview Title (auto-generated if left blank)"
                        className="w-full px-3 py-1.5 rounded-xl bg-[#111217] border border-white/15 text-xs text-white placeholder-white/35 focus:outline-none focus:border-[#FFF025]"
                      />
                      <input
                        type="text"
                        value={linkDescInput}
                        onChange={(e) => setLinkDescInput(e.target.value)}
                        placeholder="Short description of what you built..."
                        className="w-full px-3 py-1.5 rounded-xl bg-[#111217] border border-white/15 text-xs text-white placeholder-white/35 focus:outline-none focus:border-[#FFF025]"
                      />
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverFileSelect}
                  className="hidden"
                />

                {/* Main Input Row */}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  {(!effectiveBanLinks || isSuperAdmin || isCurrentChannelModerator) && (
                    <>
                      <button
                        type="button"
                        disabled={!canUserSendMessageInChannel}
                        onClick={() => setShowAttachmentDrawer((prev) => !prev)}
                        title="Upload Link or Project Cover Image"
                        className={`p-3 rounded-xl border transition-colors cursor-pointer shrink-0 disabled:opacity-40 ${
                          showAttachmentDrawer || linkUrlInput || customCoverDataUrl
                            ? 'bg-[#FFF025] text-black border-black font-black'
                            : 'bg-[#1c1e24] hover:bg-[#252830] text-white/75 border-white/10'
                        }`}
                      >
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                      </button>

                      <button
                        type="button"
                        disabled={!canUserSendMessageInChannel}
                        onClick={() => fileInputRef.current?.click()}
                        title="Upload Cover Image of Your Game or Project"
                        className="hidden sm:flex p-3 rounded-xl bg-[#1c1e24] hover:bg-[#252830] text-white/75 hover:text-[#FFF025] border border-white/10 transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  <div className="flex-1 relative min-w-0">
                    <input
                      type="text"
                      disabled={!canUserSendMessageInChannel}
                      value={messageText}
                      onChange={(e) => handleInputChange(e.target.value)}
                      placeholder={
                        !currentUser
                          ? 'Sign in to send messages...'
                          : userStatus === 'suspended'
                            ? 'Account suspended (Read-Only Mode)'
                            : !canUserSendMessageInChannel
                              ? 'Channel is locked or restricted'
                              : activeSubGroup
                                ? `Message #${activeSubGroup.name}...`
                                : `Message #${activeChannel.name}...`
                      }
                      className="w-full px-3.5 sm:px-4 py-3 rounded-xl bg-[#1c1e24] border border-white/10 text-sm font-mono text-white placeholder-white/35 focus:outline-none focus:border-white/30 disabled:opacity-50"
                    />
                    {cooldownRemaining > 0 && !isSuperAdmin && !isCurrentChannelModerator && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-amber-400 tabular-nums">
                        {cooldownRemaining}s
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={
                      !canUserSendMessageInChannel ||
                      (cooldownRemaining > 0 && !isSuperAdmin && !isCurrentChannelModerator)
                    }
                    className="p-3 rounded-xl bg-[#eab308] hover:bg-[#facc15] disabled:opacity-40 text-black font-black border border-black/30 cursor-pointer transition-transform active:scale-95 shrink-0"
                    title="Send Message"
                  >
                    <Send className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </form>
              </div>
            </>
          )}
        </main>

        {/* RIGHT DRAWER: Admin/Moderator Dashboard OR Thread Replies OR Real Online Members
            Responsive: Full-screen slide-over on mobile (<sm), 400px drawer on tablet/desktop */}
        {(showAdminDrawer || activeThreadMessage || showMembersDrawer) && (
          <aside className="fixed inset-y-0 right-0 z-40 w-full sm:w-[400px] lg:static lg:w-80 xl:w-[400px] bg-[#121317] border-l border-white/10 flex flex-col shrink-0 lg:z-20 shadow-2xl">
            {showAdminDrawer && (isSuperAdmin || isCurrentChannelModerator) ? (
              /* ==============================================================
                 DEDICATED ADMIN & CHANNEL MODERATOR CONTROL DRAWER
                 ============================================================== */
              <>
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-[#171922]">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-[#FFF025]" />
                    <span className="font-bold text-sm text-white">
                      {isSuperAdmin ? 'Super Admin Control Center' : 'Channel Moderator Panel'}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowAdminDrawer(false)}
                    className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Admin Navigation Tabs */}
                <div className="px-3 pt-2.5 pb-2 border-b border-white/10 flex flex-wrap gap-1.5 bg-[#14151c]">
                  {isSuperAdmin && (
                    <button
                      onClick={() => setAdminTab('global')}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black cursor-pointer transition-colors ${
                        adminTab === 'global'
                          ? 'bg-[#FFF025] text-black'
                          : 'bg-white/5 text-white/70 hover:text-white'
                      }`}
                    >
                      Global Rules
                    </button>
                  )}
                  <button
                    onClick={() => setAdminTab('channels')}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black cursor-pointer transition-colors ${
                      adminTab === 'channels'
                        ? 'bg-[#FFF025] text-black'
                        : 'bg-white/5 text-white/70 hover:text-white'
                    }`}
                  >
                    Channels & Perms
                  </button>
                  {isSuperAdmin && (
                    <button
                      onClick={() => setAdminTab('users')}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black cursor-pointer transition-colors ${
                        adminTab === 'users'
                          ? 'bg-[#FFF025] text-black'
                          : 'bg-white/5 text-white/70 hover:text-white'
                      }`}
                    >
                      Users ({registeredUsers.length})
                    </button>
                  )}
                  <button
                    onClick={() => setAdminTab('groups')}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black cursor-pointer transition-colors ${
                      adminTab === 'groups'
                        ? 'bg-[#FFF025] text-black'
                        : 'bg-white/5 text-white/70 hover:text-white'
                    }`}
                  >
                    Groups & Reports
                  </button>
                </div>

                {/* Tab Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
                  {adminTab === 'global' && isSuperAdmin && (
                    /* TAB 1: GLOBAL COMMUNITY SETTINGS */
                    <div className="space-y-4">
                      <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                        <div className="font-bold text-white text-sm flex items-center justify-between">
                          <span>Slow-Mode Message Cooldown</span>
                          <span className="text-[11px] font-mono text-[#FFF025]">
                            {globalSettings.disableCooldown
                              ? 'OFF (0s)'
                              : `${globalSettings.cooldownSeconds}s`}
                          </span>
                        </div>
                        <p className="text-white/60 text-[11px]">
                          Control how long members wait between messages or disable cooldown completely.
                        </p>

                        <div className="flex flex-wrap gap-1.5">
                          {[0, 3, 5, 10, 15, 30, 60].map((sec) => {
                            const isActive =
                              (sec === 0 && globalSettings.disableCooldown) ||
                              (!globalSettings.disableCooldown &&
                                globalSettings.cooldownSeconds === sec);
                            return (
                              <button
                                key={sec}
                                onClick={() =>
                                  handleUpdateGlobalSettings({
                                    cooldownSeconds: sec,
                                    disableCooldown: sec === 0,
                                  })
                                }
                                className={`px-2.5 py-1.5 rounded-lg font-mono font-bold cursor-pointer ${
                                  isActive
                                    ? 'bg-[#FFF025] text-black'
                                    : 'bg-white/10 text-white/80 hover:bg-white/15'
                                }`}
                              >
                                {sec === 0 ? 'Off (0s)' : `${sec}s`}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Global Chat Lock */}
                      <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3">
                        <div>
                          <div className="font-bold text-white">Lock Entire Community Chat</div>
                          <div className="text-[11px] text-white/55">
                            When locked, only admins and moderators can send messages in any channel.
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            handleUpdateGlobalSettings({
                              globalChatLocked: !globalSettings.globalChatLocked,
                            })
                          }
                          className={`px-3 py-1.5 rounded-xl font-black cursor-pointer shrink-0 flex items-center gap-1.5 ${
                            globalSettings.globalChatLocked
                              ? 'bg-rose-500 text-white'
                              : 'bg-white/10 text-white/80 hover:bg-white/15'
                          }`}
                        >
                          {globalSettings.globalChatLocked ? (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>Locked</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Unlocked</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Global Link Ban */}
                      <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3">
                        <div>
                          <div className="font-bold text-white">Ban External Links</div>
                          <div className="text-[11px] text-white/55">
                            Block regular members from posting URLs or attaching links across channels.
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            handleUpdateGlobalSettings({
                              banLinks: !globalSettings.banLinks,
                            })
                          }
                          className={`px-3 py-1.5 rounded-xl font-black cursor-pointer shrink-0 ${
                            globalSettings.banLinks
                              ? 'bg-rose-500 text-white'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {globalSettings.banLinks ? 'Links Banned' : 'Links Allowed'}
                        </button>
                      </div>

                      {/* Global Link Previews Toggle */}
                      <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3">
                        <div>
                          <div className="font-bold text-white">Rich Link Previews</div>
                          <div className="text-[11px] text-white/55">
                            Toggle automatic OpenGraph & creation cover preview cards on messages.
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            handleUpdateGlobalSettings({
                              enableLinkPreviews: !globalSettings.enableLinkPreviews,
                            })
                          }
                          className={`px-3 py-1.5 rounded-xl font-black cursor-pointer shrink-0 ${
                            globalSettings.enableLinkPreviews
                              ? 'bg-[#FFF025] text-black'
                              : 'bg-white/10 text-white/60'
                          }`}
                        >
                          {globalSettings.enableLinkPreviews ? 'Previews ON' : 'Previews OFF'}
                        </button>
                      </div>
                    </div>
                  )}

                  {adminTab === 'channels' && (
                    /* TAB 2: CHANNEL PERMISSIONS, MINI-ADMINS & KICK CONTROLS */
                    <div className="space-y-4">
                      {/* Channel Selector */}
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-white/50 mb-1">
                          Select Channel to Manage
                        </label>
                        <select
                          value={selectedAdminChannelId}
                          onChange={(e) => setSelectedAdminChannelId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#1a1c24] border border-white/15 text-xs font-bold text-white focus:outline-none focus:border-[#FFF025]"
                        >
                          {allChannels
                            .filter(
                              (ch) =>
                                isSuperAdmin ||
                                isGlobalModerator ||
                                (currentUser &&
                                  channelConfigs[ch.id]?.moderatorIds?.includes(currentUser.uid))
                            )
                            .map((ch) => (
                              <option key={ch.id} value={ch.id}>
                                {ch.emoji} #{ch.name} ({ch.category})
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Per-Channel Member Permissions */}
                      <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                        <div className="font-bold text-white text-xs uppercase tracking-wider text-[#FFF025]">
                          #{adminTargetChannel.name} Permissions
                        </div>

                        {[
                          {
                            key: 'isLocked' as const,
                            label: 'Lock This Channel',
                            desc: 'Only admins and channel moderators can post',
                            invertColor: true,
                          },
                          {
                            key: 'allowMemberMessages' as const,
                            label: 'Allow Members to Send Messages',
                            desc: 'Let regular members chat in this channel',
                          },
                          {
                            key: 'allowMemberGroups' as const,
                            label: 'Allow Members to Create Sub-Groups',
                            desc: 'Let regular members create rooms in this channel',
                          },
                          {
                            key: 'allowMemberInvites' as const,
                            label: 'Allow Members to Add Others to Groups',
                            desc: 'Let members invite/add users into channel sub-groups',
                          },
                          {
                            key: 'banLinks' as const,
                            label: 'Ban Links in This Channel',
                            desc: 'Block URLs from regular members in this channel',
                            invertColor: true,
                          },
                          {
                            key: 'enableLinkPreviews' as const,
                            label: 'Show Link Preview Cards',
                            desc: 'Render rich link preview cards in this channel',
                          },
                        ].map((perm) => {
                          const val = Boolean(adminTargetConfig[perm.key]);
                          return (
                            <div
                              key={perm.key}
                              className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 first:border-t-0 first:pt-0"
                            >
                              <div>
                                <div className="font-bold text-white">{perm.label}</div>
                                <div className="text-[10px] text-white/50">{perm.desc}</div>
                              </div>
                              <button
                                onClick={() =>
                                  handleSaveChannelConfig(selectedAdminChannelId, {
                                    [perm.key]: !val,
                                  })
                                }
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer shrink-0 ${
                                  val
                                    ? perm.invertColor
                                      ? 'bg-rose-500 text-white'
                                      : 'bg-emerald-400 text-black'
                                    : 'bg-white/10 text-white/60'
                                }`}
                              >
                                {val ? 'ON' : 'OFF'}
                              </button>
                            </div>
                          );
                        })}

                        {/* Channel Cooldown Override */}
                        <div className="pt-2 border-t border-white/10 space-y-1.5">
                          <div className="font-bold text-white">Channel Cooldown Override</div>
                          <div className="flex flex-wrap gap-1">
                            {[
                              { val: -1, label: 'Global Default' },
                              { val: 0, label: 'Off (0s)' },
                              { val: 3, label: '3s' },
                              { val: 5, label: '5s' },
                              { val: 10, label: '10s' },
                              { val: 30, label: '30s' },
                            ].map((opt) => (
                              <button
                                key={opt.val}
                                onClick={() =>
                                  handleSaveChannelConfig(selectedAdminChannelId, {
                                    cooldownSeconds: opt.val,
                                  })
                                }
                                className={`px-2 py-1 rounded text-[10px] font-mono font-bold cursor-pointer ${
                                  adminTargetConfig.cooldownSeconds === opt.val
                                    ? 'bg-[#FFF025] text-black'
                                    : 'bg-white/10 text-white/75'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Appoint Channel Moderators ("Mini-Admins") — Super Admin Only */}
                      {isSuperAdmin && (
                        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                          <div className="font-bold text-white">
                            Appoint Channel Moderators (#{adminTargetChannel.name})
                          </div>
                          <p className="text-[11px] text-white/55">
                            Channel Moderators act as mini-admins for this channel and can manage its permissions, sub-groups, and kick disruptive users.
                          </p>
                          {registeredUsers.length === 0 ? (
                            <div className="text-white/40 italic">No registered users yet.</div>
                          ) : (
                            <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                              {registeredUsers.map((u) => {
                                const isChannelMod = adminTargetConfig.moderatorIds.includes(u.uid);
                                return (
                                  <div
                                    key={u.uid}
                                    className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-black/30 border border-white/5"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span
                                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-black shrink-0"
                                        style={{ backgroundColor: u.avatarColor }}
                                      >
                                        {u.displayName.charAt(0).toUpperCase()}
                                      </span>
                                      <span className="truncate font-bold text-white">
                                        {u.displayName}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => {
                                        const nextMods = isChannelMod
                                          ? adminTargetConfig.moderatorIds.filter((id) => id !== u.uid)
                                          : [...adminTargetConfig.moderatorIds, u.uid];
                                        handleSaveChannelConfig(selectedAdminChannelId, {
                                          moderatorIds: nextMods,
                                        });
                                      }}
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer ${
                                        isChannelMod
                                          ? 'bg-emerald-400 text-black'
                                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                                      }`}
                                    >
                                      {isChannelMod ? '✓ Channel Mod' : 'Make Mod'}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Kick / Restore Users from This Channel (Super Admin & Channel Moderator) */}
                      <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                        <div className="font-bold text-white">
                          Channel Member Access & Kick (#{adminTargetChannel.name})
                        </div>
                        <p className="text-[11px] text-white/55">
                          Remove or restore members in #{adminTargetChannel.name}.
                        </p>
                        {registeredUsers.length === 0 ? (
                          <div className="text-white/40 italic">No registered users yet.</div>
                        ) : (
                          <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                            {registeredUsers
                              .filter((u) => u.role !== 'admin')
                              .map((u) => {
                                const isKicked = adminTargetConfig.kickedUserIds.includes(u.uid);
                                return (
                                  <div
                                    key={u.uid}
                                    className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-black/30 border border-white/5"
                                  >
                                    <span className="truncate font-bold text-white">
                                      {u.displayName}
                                    </span>
                                    <button
                                      onClick={() => {
                                        const nextKicked = isKicked
                                          ? adminTargetConfig.kickedUserIds.filter((id) => id !== u.uid)
                                          : [...adminTargetConfig.kickedUserIds, u.uid];
                                        handleSaveChannelConfig(selectedAdminChannelId, {
                                          kickedUserIds: nextKicked,
                                        });
                                      }}
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer ${
                                        isKicked
                                          ? 'bg-rose-500 text-white'
                                          : 'bg-white/10 text-white/75 hover:bg-rose-500/20 hover:text-rose-300'
                                      }`}
                                    >
                                      {isKicked ? 'Kicked (Restore)' : 'Kick from Channel'}
                                    </button>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>

                      {/* Super Admin: Create New Custom Channel */}
                      {isSuperAdmin && (
                        <form
                          onSubmit={handleCreateCustomChannel}
                          className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5"
                        >
                          <div className="font-bold text-[#FFF025]">+ Create New Community Channel</div>
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={newChannelEmoji}
                              onChange={(e) => setNewChannelEmoji(e.target.value)}
                              placeholder="Emoji"
                              className="px-2.5 py-1.5 rounded-xl bg-[#111217] border border-white/15 text-xs text-white"
                            />
                            <input
                              type="text"
                              value={newChannelName}
                              onChange={(e) => setNewChannelName(e.target.value)}
                              placeholder="Channel Name"
                              className="col-span-2 px-2.5 py-1.5 rounded-xl bg-[#111217] border border-white/15 text-xs text-white"
                            />
                          </div>
                          <select
                            value={newChannelCategory}
                            onChange={(e) =>
                              setNewChannelCategory(
                                e.target.value as 'INFORMATION' | 'CREATOR SHOWCASES' | 'SOCIAL'
                              )
                            }
                            className="w-full px-2.5 py-1.5 rounded-xl bg-[#111217] border border-white/15 text-xs text-white"
                          >
                            <option value="SOCIAL">SOCIAL</option>
                            <option value="CREATOR SHOWCASES">CREATOR SHOWCASES</option>
                            <option value="INFORMATION">INFORMATION</option>
                          </select>
                          <input
                            type="text"
                            value={newChannelDesc}
                            onChange={(e) => setNewChannelDesc(e.target.value)}
                            placeholder="Channel topic description..."
                            className="w-full px-2.5 py-1.5 rounded-xl bg-[#111217] border border-white/15 text-xs text-white"
                          />
                          <button
                            type="submit"
                            className="w-full py-2 rounded-xl bg-[#FFF025] text-black font-black text-xs cursor-pointer"
                          >
                            Create Channel
                          </button>
                        </form>
                      )}
                    </div>
                  )}

                  {adminTab === 'users' && isSuperAdmin && (
                    /* TAB 3: USER ACCOUNTS, BAN / SUSPEND & CREATE PROFILE */
                    <div className="space-y-4">
                      {/* Create Member Profile Form */}
                      <form
                        onSubmit={handleAdminCreateMemberProfile}
                        className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5"
                      >
                        <div className="font-bold text-[#FFF025] flex items-center gap-1.5">
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Create New Member Account Profile</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={newMemberName}
                            onChange={(e) => setNewMemberName(e.target.value)}
                            placeholder="Builder Nickname *"
                            className="px-2.5 py-1.5 rounded-xl bg-[#111217] border border-white/15 text-xs text-white"
                          />
                          <input
                            type="text"
                            value={newMemberSchool}
                            onChange={(e) => setNewMemberSchool(e.target.value)}
                            placeholder="School / Club"
                            className="px-2.5 py-1.5 rounded-xl bg-[#111217] border border-white/15 text-xs text-white"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={newMemberGrade}
                            onChange={(e) => setNewMemberGrade(e.target.value)}
                            placeholder="Grade Level"
                            className="px-2.5 py-1.5 rounded-xl bg-[#111217] border border-white/15 text-xs text-white"
                          />
                          <select
                            value={newMemberRole}
                            onChange={(e) =>
                              setNewMemberRole(e.target.value as 'member' | 'moderator')
                            }
                            className="px-2.5 py-1.5 rounded-xl bg-[#111217] border border-white/15 text-xs text-white"
                          >
                            <option value="member">Role: Member</option>
                            <option value="moderator">Role: Global Moderator</option>
                          </select>
                        </div>
                        <button
                          type="submit"
                          className="w-full py-2 rounded-xl bg-[#FFF025] text-black font-black text-xs cursor-pointer"
                        >
                          Create Member Profile
                        </button>
                      </form>

                      {/* Search & Manage Signed-Up Users */}
                      <div className="space-y-2.5">
                        <input
                          type="text"
                          value={memberSearchQuery}
                          onChange={(e) => setMemberSearchQuery(e.target.value)}
                          placeholder="Search signed-up members..."
                          className="w-full px-3 py-2 rounded-xl bg-[#1a1c24] border border-white/15 text-xs text-white"
                        />

                        {registeredUsers.length === 0 ? (
                          <div className="p-6 text-center text-white/45 font-mono">
                            No users have signed up yet.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {registeredUsers
                              .filter((u) =>
                                u.displayName
                                  .toLowerCase()
                                  .includes(memberSearchQuery.toLowerCase())
                              )
                              .map((u) => {
                                const st = u.status || 'active';
                                return (
                                  <div
                                    key={u.uid}
                                    className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span
                                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-black shrink-0"
                                          style={{ backgroundColor: u.avatarColor }}
                                        >
                                          {u.displayName.charAt(0).toUpperCase()}
                                        </span>
                                        <div className="min-w-0">
                                          <div className="font-bold text-white truncate flex items-center gap-1.5">
                                            <span>{u.displayName}</span>
                                            <span className="px-1.5 py-0.2 rounded bg-white/10 text-[9px] uppercase font-mono">
                                              {u.role}
                                            </span>
                                          </div>
                                          <div className="text-[10px] text-white/45 truncate">
                                            {u.schoolName || 'Build Buds'} • Status:{' '}
                                            <strong
                                              className={
                                                st === 'banned'
                                                  ? 'text-rose-400'
                                                  : st === 'suspended'
                                                    ? 'text-amber-400'
                                                    : 'text-emerald-400'
                                              }
                                            >
                                              {st.toUpperCase()}
                                            </strong>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Global Moderator Promotion Toggle */}
                                      {u.role !== 'admin' && (
                                        <button
                                          onClick={() =>
                                            handleUpdateUserAccount(u, {
                                              role: u.role === 'moderator' ? 'member' : 'moderator',
                                            })
                                          }
                                          className={`px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer ${
                                            u.role === 'moderator'
                                              ? 'bg-emerald-400 text-black'
                                              : 'bg-white/10 text-white/75 hover:bg-white/20'
                                          }`}
                                        >
                                          {u.role === 'moderator' ? 'Global Mod ✓' : 'Make Global Mod'}
                                        </button>
                                      )}
                                    </div>

                                    {/* Account Status Controls: Active | Suspend (Read-Only) | Ban (Block Access) */}
                                    {u.role !== 'admin' && (
                                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                                        <button
                                          onClick={() =>
                                            handleUpdateUserAccount(u, { status: 'active' })
                                          }
                                          className={`py-1 rounded-lg text-[10px] font-black cursor-pointer ${
                                            st === 'active'
                                              ? 'bg-emerald-500 text-black'
                                              : 'bg-white/5 text-white/60 hover:bg-white/10'
                                          }`}
                                        >
                                          Active
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleUpdateUserAccount(u, { status: 'suspended' })
                                          }
                                          className={`py-1 rounded-lg text-[10px] font-black cursor-pointer ${
                                            st === 'suspended'
                                              ? 'bg-amber-400 text-black'
                                              : 'bg-white/5 text-white/60 hover:bg-amber-500/20 hover:text-amber-300'
                                          }`}
                                        >
                                          Suspend (Read-Only)
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleUpdateUserAccount(u, { status: 'banned' })
                                          }
                                          className={`py-1 rounded-lg text-[10px] font-black cursor-pointer ${
                                            st === 'banned'
                                              ? 'bg-rose-500 text-white'
                                              : 'bg-white/5 text-white/60 hover:bg-rose-500/20 hover:text-rose-300'
                                          }`}
                                        >
                                          Ban Account
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {adminTab === 'groups' && (
                    /* TAB 4: SUB-GROUPS IN ACTIVE CHANNEL & MODERATION REPORTS */
                    <div className="space-y-4">
                      <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">
                            Sub-Groups in #{activeChannel.name} ({channelSubGroups.length})
                          </span>
                          <button
                            onClick={() => setShowCreateGroupModal(true)}
                            className="px-2.5 py-1 rounded-lg bg-[#FFF025] text-black font-black text-[10px] cursor-pointer"
                          >
                            + New Sub-Group
                          </button>
                        </div>

                        {channelSubGroups.length === 0 ? (
                          <div className="text-white/45 text-[11px]">
                            No sub-groups created in #{activeChannel.name} yet.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {channelSubGroups.map((grp) => (
                              <div
                                key={grp.id}
                                className="p-2.5 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <div className="font-bold text-white truncate">
                                    {grp.isPrivate ? '🔒' : '👥'} {grp.name}
                                  </div>
                                  <div className="text-[10px] text-white/50">
                                    {grp.memberIds.length} members
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      setActiveSubGroupId(grp.id);
                                      setShowManageGroupModal(true);
                                    }}
                                    className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-white text-[10px] font-bold cursor-pointer"
                                  >
                                    Members
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSubGroup(grp)}
                                    className="p-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 cursor-pointer"
                                    title="Delete Sub-Group"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Flagged Message Reports */}
                      {isGlobalModerator && (
                        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                          <div className="font-bold text-white">
                            Flagged Message Reports ({reports.filter((r) => r.status === 'open').length} open)
                          </div>
                          {reports.length === 0 ? (
                            <div className="text-white/45 text-[11px]">No message reports.</div>
                          ) : (
                            <div className="space-y-2">
                              {reports.map((rep) => (
                                <div
                                  key={rep.id}
                                  className="p-2.5 rounded-xl bg-black/30 border border-white/10 space-y-1.5"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono text-[10px] text-[#FFF025]">
                                      #{rep.channelId}
                                    </span>
                                    <span
                                      className={`text-[10px] font-bold uppercase ${
                                        rep.status === 'open' ? 'text-amber-400' : 'text-emerald-400'
                                      }`}
                                    >
                                      {rep.status}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-white/80">{rep.reason}</p>
                                  {rep.status === 'open' && (
                                    <button
                                      onClick={() => handleResolveReport(rep.id)}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-bold cursor-pointer"
                                    >
                                      Mark Resolved
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : activeThreadMessage ? (
              /* THREAD REPLIES PANEL (WITH EDIT & DELETE FOR REPLIES + ACCURATE COUNT) */
              <>
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-[#15171e]">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#FFF025]" />
                    <span className="font-bold text-sm text-white">
                      Discussion Thread ({getMessageEffectiveReplyCount(activeThreadMessage)})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveThreadMessage(null);
                      setEditingThreadReplyId(null);
                      setEditingThreadReplyText('');
                    }}
                    aria-label="Close Discussion Thread"
                    className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 border-b border-white/10 bg-white/[0.02] space-y-2">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={getLiveUserAvatarUrl(
                        activeThreadMessage.authorId,
                        activeThreadMessage.authorAvatar
                      )}
                      alt={activeThreadMessage.authorName}
                      className="w-7 h-7 rounded-full object-cover border border-white/20 shrink-0"
                    />
                    <span
                      className="font-mono font-bold text-xs truncate"
                      style={{
                        color: getLiveUserColor(
                          activeThreadMessage.authorId,
                          activeThreadMessage.authorColor
                        ),
                      }}
                    >
                      {getLiveUserDisplayName(
                        activeThreadMessage.authorId,
                        activeThreadMessage.authorName
                      )}
                    </span>
                    <span className="text-[11px] font-mono text-white/40 shrink-0">
                      {activeThreadMessage.timeLabel}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-white/90 leading-relaxed select-text break-words">
                    {activeThreadMessage.text}
                  </p>
                  {activeThreadMessage.linkUrl && (
                    <a
                      href={activeThreadMessage.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#FFF025] hover:underline"
                    >
                      <span>{activeThreadMessage.linkTitle || activeThreadMessage.linkUrl}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto hub-scroll p-4 space-y-3 select-text">
                  {(() => {
                    const inlineReplies = inlineRepliesByParentId[activeThreadMessage.id] || [];
                    if (threadReplies.length === 0 && inlineReplies.length === 0) {
                      return (
                        <div className="text-center py-8 text-xs text-white/45 font-mono">
                          No replies in this thread yet. Start the conversation below!
                        </div>
                      );
                    }

                    return (
                      <>
                        {/* Direct Thread Replies */}
                        {threadReplies.map((reply) => {
                          const isOwnReply = currentUser?.uid === reply.authorId;
                          const canDeleteReply =
                            isOwnReply || isSuperAdmin || isCurrentChannelModerator;
                          const isEditingThisReply = editingThreadReplyId === reply.id;

                          return (
                            <div
                              key={reply.id}
                              className="group/reply p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 space-y-1.5 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <img
                                    src={getLiveUserAvatarUrl(reply.authorId)}
                                    alt={reply.authorName}
                                    className="w-5 h-5 rounded-full object-cover border border-white/15 shrink-0"
                                  />
                                  <span
                                    className="font-mono text-xs font-bold truncate"
                                    style={{
                                      color: getLiveUserColor(reply.authorId, reply.authorColor),
                                    }}
                                  >
                                    {getLiveUserDisplayName(reply.authorId, reply.authorName)}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[10px] font-mono text-white/35 mr-1">
                                    {reply.timeLabel}
                                  </span>

                                  {isOwnReply && userStatus === 'active' && !isEditingThisReply && (
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditThreadReply(reply)}
                                      title="Edit Reply"
                                      aria-label="Edit Reply"
                                      className="p-1 rounded hover:bg-white/10 text-white/55 hover:text-[#FFF025] cursor-pointer transition-colors"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                  )}

                                  {canDeleteReply && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteThreadReply(reply)}
                                      title="Delete Reply"
                                      aria-label="Delete Reply"
                                      className="p-1 rounded hover:bg-rose-500/20 text-white/55 hover:text-rose-400 cursor-pointer transition-colors"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {isEditingThisReply ? (
                                <form
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSaveEditThreadReply(reply);
                                  }}
                                  className="space-y-2 pt-1"
                                >
                                  <input
                                    type="text"
                                    autoFocus
                                    value={editingThreadReplyText}
                                    onChange={(e) => setEditingThreadReplyText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Escape') {
                                        setEditingThreadReplyId(null);
                                        setEditingThreadReplyText('');
                                      }
                                    }}
                                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#101218] border border-[#FFF025] text-xs font-mono text-white focus:outline-none"
                                  />
                                  <div className="flex items-center gap-1.5 text-[10px]">
                                    <button
                                      type="submit"
                                      className="px-2.5 py-1 rounded bg-[#FFF025] text-black font-black cursor-pointer flex items-center gap-1"
                                    >
                                      <Check className="w-2.5 h-2.5" />
                                      <span>Save</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingThreadReplyId(null);
                                        setEditingThreadReplyText('');
                                      }}
                                      className="px-2.5 py-1 rounded bg-white/10 text-white/80 font-bold cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                <div className="flex items-baseline gap-1.5 flex-wrap">
                                  <p className="text-xs font-mono text-white/85 leading-relaxed break-words">
                                    {reply.text}
                                  </p>
                                  {reply.isEdited && (
                                    <span className="text-[10px] font-mono text-white/40">
                                      (edited)
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Inline Channel Replies targeting this parent message */}
                        {inlineReplies.map((inlineMsg) => {
                          const isOwnInline = currentUser?.uid === inlineMsg.authorId;
                          const canDeleteInline =
                            isOwnInline || isSuperAdmin || isCurrentChannelModerator;
                          return (
                            <div
                              key={`inline-${inlineMsg.id}`}
                              className="p-3 rounded-xl bg-sky-500/[0.04] border border-sky-400/20 space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <img
                                    src={getLiveUserAvatarUrl(
                                      inlineMsg.authorId,
                                      inlineMsg.authorAvatar
                                    )}
                                    alt={inlineMsg.authorName}
                                    className="w-5 h-5 rounded-full object-cover border border-white/15 shrink-0"
                                  />
                                  <span
                                    className="font-mono text-xs font-bold truncate"
                                    style={{
                                      color: getLiveUserColor(
                                        inlineMsg.authorId,
                                        inlineMsg.authorColor
                                      ),
                                    }}
                                  >
                                    {getLiveUserDisplayName(
                                      inlineMsg.authorId,
                                      inlineMsg.authorName
                                    )}
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-300 text-[9px] font-mono">
                                    inline
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[10px] font-mono text-white/35 mr-1">
                                    {inlineMsg.timeLabel}
                                  </span>
                                  {canDeleteInline && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMessage(inlineMsg)}
                                      title="Delete Inline Reply"
                                      className="p-1 rounded hover:bg-rose-500/20 text-white/55 hover:text-rose-400 cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs font-mono text-white/85 leading-relaxed break-words">
                                {inlineMsg.text}
                              </p>
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>

                <form
                  onSubmit={handleSendThreadReply}
                  className="p-3 border-t border-white/10 flex items-center gap-2 bg-[#141519]"
                >
                  <input
                    type="text"
                    disabled={userStatus === 'suspended'}
                    value={threadInput}
                    onChange={(e) => setThreadInput(e.target.value)}
                    placeholder={
                      userStatus === 'suspended' ? 'Suspended (Read-Only)' : 'Reply to thread...'
                    }
                    className="flex-1 px-3 py-2.5 rounded-xl bg-[#1c1e24] border border-white/15 text-xs font-mono text-white placeholder-white/35 focus:outline-none focus:border-[#FFF025] disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={userStatus === 'suspended'}
                    className="px-3.5 py-2.5 rounded-xl bg-[#FFF025] hover:bg-[#ffe500] text-black font-black text-xs cursor-pointer disabled:opacity-40 shrink-0"
                  >
                    Reply
                  </button>
                </form>
              </>
            ) : (
              /* REAL ONLINE & REGISTERED MEMBERS LIST (ZERO DEMO USERS) */
              <>
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-[#15171e]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="font-bold text-sm text-white tabular-nums">
                      Community Members ({registeredUsers.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMembersDrawer(false)}
                    aria-label="Close Members Drawer"
                    className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto hub-scroll p-3 space-y-4">
                  {/* Currently Online Section */}
                  <div>
                    <div className="px-2 mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      <span>Online Now ({liveOnlineCount})</span>
                      <span className="text-white/45 font-mono">
                        {activeChannelOnlineCount} in #{activeChannel.name}
                      </span>
                    </div>
                    {effectiveOnlineMembers.length === 0 ? (
                      <div className="px-2 py-2 text-xs text-white/40 font-mono">
                        No active sessions right now.
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {effectiveOnlineMembers.map((member) => (
                          <div
                            key={member.uid}
                            className="flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-white/5"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="relative shrink-0">
                                <img
                                  src={getLiveUserAvatarUrl(member.uid, member.avatarUrl)}
                                  alt={member.displayName}
                                  className="w-8 h-8 rounded-full object-cover border border-white/20"
                                />
                                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#121317]" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white truncate">
                                  {getLiveUserDisplayName(member.uid, member.displayName)}
                                </div>
                                <div className="text-[10px] text-white/45 font-mono truncate">
                                  in #{member.activeChannelId.split('__group__')[0]}
                                </div>
                              </div>
                            </div>
                            {member.isTyping && (
                              <span className="text-[10px] font-mono text-[#FFF025]">typing...</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* All Signed-Up Community Builders */}
                  <div>
                    <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/45">
                      Registered Builders ({registeredUsers.length})
                    </div>
                    {registeredUsers.length === 0 ? (
                      <div className="px-2 py-3 text-xs text-white/40 font-mono">
                        No registered members yet. When users sign up, they will appear here.
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {registeredUsers.map((u) => {
                          const isOnline = effectiveOnlineMembers.some((m) => m.uid === u.uid);
                          return (
                            <div
                              key={u.uid}
                              className="flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-white/5"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="relative shrink-0">
                                  <img
                                    src={getLiveUserAvatarUrl(u.uid, u.avatarUrl)}
                                    alt={u.displayName}
                                    className="w-8 h-8 rounded-full object-cover border border-white/20"
                                  />
                                  <span
                                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#121317] ${
                                      isOnline ? 'bg-emerald-400' : 'bg-white/25'
                                    }`}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                                    <span className="truncate">{u.displayName}</span>
                                    {u.role === 'admin' && (
                                      <span className="px-1 py-0.2 rounded bg-[#FFF025] text-black text-[9px] font-black">
                                        ADMIN
                                      </span>
                                    )}
                                    {u.role === 'moderator' && (
                                      <span className="px-1 py-0.2 rounded bg-emerald-400 text-black text-[9px] font-black">
                                        MOD
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-white/40 truncate">
                                    {u.schoolName || 'Build Buds'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </aside>
        )}
      </div>

      {/* CREATE SUB-GROUP MODAL */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateSubGroup}
            className="w-full max-w-md rounded-3xl bg-[#14161f] border-2 border-white/20 p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#FFF025] font-black text-sm uppercase">
                <FolderPlus className="w-5 h-5" />
                <span>Create Sub-Group in #{activeChannel.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(false)}
                className="text-white/60 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">
                Sub-Group / Room Name *
              </label>
              <input
                type="text"
                required
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Level Design Squad"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e1017] border border-white/15 text-xs text-white focus:outline-none focus:border-[#FFF025]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">
                Purpose / Topic Description
              </label>
              <input
                type="text"
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                placeholder="Collaborating on sprites and physics..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e1017] border border-white/15 text-xs text-white focus:outline-none focus:border-[#FFF025]"
              />
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-white/85">
              <input
                type="checkbox"
                checked={newGroupPrivate}
                onChange={(e) => setNewGroupPrivate(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span>Private Room (Only added members & moderators can view and chat)</span>
            </label>

            {canUserInviteToSubGroup && registeredUsers.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1.5">
                  Add Community Members (Optional)
                </label>
                <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded-xl bg-[#0e1017] border border-white/10">
                  {registeredUsers
                    .filter((u) => u.uid !== currentUser?.uid)
                    .map((u) => {
                      const selected = newGroupInitialMembers.includes(u.uid);
                      return (
                        <button
                          key={u.uid}
                          type="button"
                          onClick={() =>
                            setNewGroupInitialMembers((prev) =>
                              selected ? prev.filter((id) => id !== u.uid) : [...prev, u.uid]
                            )
                          }
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer ${
                            selected ? 'bg-[#FFF025]/20 text-[#FFF025] font-bold' : 'text-white/75 hover:bg-white/5'
                          }`}
                        >
                          <span>{u.displayName}</span>
                          <span>{selected ? '✓ Added' : '+ Add'}</span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#FFF025] text-black text-xs font-black cursor-pointer"
              >
                Create Sub-Group
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MANAGE SUB-GROUP MEMBERS MODAL */}
      {showManageGroupModal && activeSubGroup && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#14161f] border-2 border-white/20 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">
                  {activeSubGroup.isPrivate ? '🔒' : '👥'} {activeSubGroup.name}
                </h3>
                <p className="text-xs text-white/55">{activeSubGroup.description}</p>
              </div>
              <button
                onClick={() => setShowManageGroupModal(false)}
                className="text-white/60 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {registeredUsers.map((u) => {
                const isMember = activeSubGroup.memberIds.includes(u.uid);
                const canModify = isMember
                  ? isSuperAdmin ||
                    isCurrentChannelModerator ||
                    activeSubGroup.createdBy === currentUser?.uid
                  : canUserInviteToSubGroup;

                return (
                  <div
                    key={u.uid}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-black/30 border border-white/10"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-black"
                        style={{ backgroundColor: u.avatarColor }}
                      >
                        {u.displayName.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-xs font-bold text-white truncate">
                        {u.displayName}
                      </span>
                    </div>

                    {canModify && (
                      <button
                        onClick={() => handleToggleSubGroupMember(activeSubGroup, u.uid)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer flex items-center gap-1 ${
                          isMember
                            ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                            : 'bg-[#FFF025] text-black'
                        }`}
                      >
                        {isMember ? (
                          <>
                            <UserMinus className="w-3 h-3" />
                            <span>Remove</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3 h-3" />
                            <span>Add to Group</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {(isSuperAdmin ||
              isCurrentChannelModerator ||
              activeSubGroup.createdBy === currentUser?.uid) && (
              <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                <button
                  onClick={() => handleDeleteSubGroup(activeSubGroup)}
                  className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Sub-Group</span>
                </button>
                <button
                  onClick={() => setShowManageGroupModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* UNIFIED ACCOUNT & PROFILE SETTINGS MODAL (OPENED BY CLICKING ACCOUNT ICON) */}
      {showAvatarModal && currentUser && builderProfile && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Account & Profile Settings"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
        >
          <div className="w-full max-w-2xl rounded-3xl bg-[#14161f] border-2 border-white/20 p-4 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2 text-[#FFF025] font-black text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>Account & Profile Settings</span>
                </div>
                <h3 className="font-chewy text-xl sm:text-2xl text-white mt-0.5">
                  Customize Your Builder Profile
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAvatarModal(false)}
                aria-label="Close Account Settings"
                className="p-1.5 rounded-xl bg-white/5 text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Settings Tabs: Profile & Avatar vs Push Notifications */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-2.5">
              <button
                type="button"
                onClick={() => setProfileModalTab('profile')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-colors ${
                  profileModalTab === 'profile'
                    ? 'bg-[#FFF025] text-black'
                    : 'bg-white/5 text-white/70 hover:text-white'
                }`}
              >
                Profile & Character Avatar
              </button>
              <button
                type="button"
                onClick={() => {
                  setBrowserPermission(getBrowserNotificationPermission());
                  setProfileModalTab('notifications');
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-colors flex items-center gap-1.5 ${
                  profileModalTab === 'notifications'
                    ? 'bg-[#FFF025] text-black'
                    : 'bg-white/5 text-white/70 hover:text-white'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Notifications</span>
              </button>
            </div>

            {profileModalTab === 'profile' ? (
              <>
                {/* Editable Nickname & School + Live Avatar Preview */}
                {(() => {
                  const activePreset =
                    findPresetAvatar(selectedPresetAvatarId) ||
                    getDefaultPresetAvatar(currentUser.uid);
                  return (
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0e1017] border border-white/15 space-y-3.5">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 w-full sm:w-auto">
                          <img
                            src={activePreset.dataUrl}
                            alt={activePreset.name}
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-[#FFF025] shadow-lg shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className="font-mono font-bold text-base truncate"
                                style={{ color: selectedAccentColor }}
                              >
                                {editProfileName.trim() || builderProfile.displayName}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-black text-[#FFF025] uppercase">
                                {activePreset.name}
                              </span>
                            </div>
                            <p className="text-xs text-white/65 mt-0.5">{activePreset.tagline}</p>
                            <p className="text-[11px] text-white/40 mt-0.5 truncate">
                              {currentUser.email || 'Authenticated Builder'}
                            </p>
                          </div>
                        </div>

                        {/* Name Color Accent Picker */}
                        <div className="flex flex-col items-start sm:items-end gap-1.5 w-full sm:w-auto">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                            Name Accent Color
                          </span>
                          <div className="flex items-center gap-1.5">
                            {AVATAR_COLORS.map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => setSelectedAccentColor(color)}
                                aria-label={`Select accent color ${color}`}
                                className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-transform ${
                                  selectedAccentColor === color
                                    ? 'scale-115 border-white ring-2 ring-[#FFF025]'
                                    : 'border-black/50 opacity-75 hover:opacity-100'
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Nickname & School Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-white/55 mb-1">
                            Builder Nickname
                          </label>
                          <input
                            type="text"
                            value={editProfileName}
                            onChange={(e) => setEditProfileName(e.target.value)}
                            placeholder="Your Builder Nickname"
                            className="w-full px-3 py-2 rounded-xl bg-[#14161f] border border-white/15 text-xs font-bold text-white focus:outline-none focus:border-[#FFF025]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-white/55 mb-1">
                            School or Creator Club
                          </label>
                          <input
                            type="text"
                            value={editProfileSchool}
                            onChange={(e) => setEditProfileSchool(e.target.value)}
                            placeholder="School or Club"
                            className="w-full px-3 py-2 rounded-xl bg-[#14161f] border border-white/15 text-xs font-bold text-white focus:outline-none focus:border-[#FFF025]"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Scrollable Grid of 24 Graphical Character Portraits */}
                <div className="flex-1 overflow-y-auto hub-scroll pr-1 min-h-[180px]">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-2">
                    Choose Character Portrait ({PRESET_AVATARS.length} Available)
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                    {PRESET_AVATARS.map((avatar) => {
                      const isSelected = selectedPresetAvatarId === avatar.id;
                      return (
                        <button
                          key={avatar.id}
                          type="button"
                          onClick={() => setSelectedPresetAvatarId(avatar.id)}
                          className={`p-2 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#FFF025]/15 border-[#FFF025] ring-2 ring-[#FFF025] scale-[1.02]'
                              : 'bg-[#0e1017] border-white/10 hover:border-white/30 hover:bg-white/5'
                          }`}
                        >
                          <img
                            src={avatar.dataUrl}
                            alt={avatar.name}
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border border-black/40 shadow"
                          />
                          <span
                            className={`text-[11px] font-bold truncate w-full text-center ${
                              isSelected ? 'text-[#FFF025]' : 'text-white/85'
                            }`}
                          >
                            {avatar.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Save, Download App, Sign Out & Cancel Footer */}
                <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSignOutFromHub}
                      className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold cursor-pointer flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                    <div className="w-auto">
                      <PWAInstallButton variant="hub" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAvatarModal(false)}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSavingAvatar}
                      onClick={handleSaveSelectedAvatar}
                      className="px-5 py-2 rounded-xl bg-[#FFF025] hover:bg-[#ffe500] disabled:opacity-50 text-black text-xs font-black border-2 border-black cursor-pointer shadow-lg"
                    >
                      {isSavingAvatar ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* NOTIFICATIONS TAB INSIDE ACCOUNT MODAL */
              <div className="flex-1 overflow-y-auto hub-scroll space-y-4 pr-1">
                <div className="p-4 rounded-2xl bg-[#0e1017] border border-white/15 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-white text-sm">
                        Desktop & Browser Message Alerts
                      </div>
                      <div className="text-xs text-white/60 mt-0.5">
                        Get notified when builders post in channels while you are in another tab or window.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleBrowserNotifications}
                      className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer shrink-0 transition-colors ${
                        notificationPrefs.enabled && browserPermission === 'granted'
                          ? 'bg-emerald-400 text-black'
                          : 'bg-[#FFF025] text-black'
                      }`}
                    >
                      {notificationPrefs.enabled && browserPermission === 'granted'
                        ? 'Enabled ✓'
                        : 'Enable Alerts'}
                    </button>
                  </div>

                  {notificationStatusBanner && (
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-[#FFF025] font-medium">
                      {notificationStatusBanner}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-white/50">
                    Channel Alert Preferences (Mute / Unmute)
                  </div>
                  {allChannels.map((ch) => {
                    const isMuted = notificationPrefs.mutedChannels.includes(ch.id);
                    return (
                      <div
                        key={ch.id}
                        className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#0e1017] border border-white/10"
                      >
                        <div className="flex items-center gap-2 text-xs font-bold text-white">
                          <span>{ch.emoji}</span>
                          <span>#{ch.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setNotificationPrefs((prev) => ({
                              ...prev,
                              mutedChannels: isMuted
                                ? prev.mutedChannels.filter((id) => id !== ch.id)
                                : [...prev.mutedChannels, ch.id],
                            }))
                          }
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer ${
                            isMuted
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {isMuted ? 'Muted' : 'Active'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BROWSER PUSH NOTIFICATION PREFERENCES MODAL */}
      {showNotificationModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Browser Notification Settings"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg rounded-3xl bg-[#14161f] border-2 border-white/20 p-6 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-[#FFF025] font-black text-sm uppercase">
                <Bell className="w-5 h-5" />
                <span>Browser Push Notifications</span>
              </div>
              <button
                type="button"
                onClick={() => setShowNotificationModal(false)}
                aria-label="Close Notification Settings"
                className="text-white/60 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Permission Status & Master Toggle */}
            <div className="p-4 rounded-2xl bg-[#0e1017] border border-white/15 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-white text-sm">
                    Desktop & Browser Message Alerts
                  </div>
                  <div className="text-xs text-white/60 mt-0.5">
                    Get notified when builders post in channels while you are in another tab or window.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleBrowserNotifications}
                  className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer shrink-0 transition-colors ${
                    notificationPrefs.enabled && browserPermission === 'granted'
                      ? 'bg-emerald-400 text-black'
                      : 'bg-[#FFF025] text-black'
                  }`}
                >
                  {notificationPrefs.enabled && browserPermission === 'granted'
                    ? 'Enabled ✓'
                    : 'Enable Alerts'}
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                <span className="text-white/55">Browser Permission Status:</span>
                <span
                  className={`px-2 py-0.5 rounded font-mono font-bold uppercase text-[11px] ${
                    browserPermission === 'granted'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : browserPermission === 'denied'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {browserPermission === 'granted'
                    ? 'Allowed'
                    : browserPermission === 'denied'
                      ? 'Blocked in Browser'
                      : browserPermission === 'unsupported'
                        ? 'Unsupported'
                        : 'Not Yet Requested'}
                </span>
              </div>

              {browserPermission === 'denied' && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200 leading-relaxed">
                  <strong>How to unblock:</strong> Click the lock or site-settings icon on the left side of your browser&apos;s address bar, set <strong>Notifications</strong> to <strong>Allow</strong>, and click Enable Alerts again.
                </div>
              )}

              {notificationStatusBanner && (
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-[#FFF025] font-medium">
                  {notificationStatusBanner}
                </div>
              )}

              {browserPermission === 'granted' && (
                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSendTestNotification}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold text-white cursor-pointer"
                  >
                    Send Test Notification
                  </button>
                </div>
              )}
            </div>

            {/* Per-Channel Mute Controls */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <div className="text-xs font-bold uppercase tracking-wider text-white/50">
                Channel Alert Preferences (Mute / Unmute)
              </div>
              <div className="space-y-1.5">
                {allChannels.map((ch) => {
                  const isMuted = notificationPrefs.mutedChannels.includes(ch.id);
                  return (
                    <div
                      key={ch.id}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#0e1017] border border-white/10"
                    >
                      <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <span>{ch.emoji}</span>
                        <span>#{ch.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setNotificationPrefs((prev) => ({
                            ...prev,
                            mutedChannels: isMuted
                              ? prev.mutedChannels.filter((id) => id !== ch.id)
                              : [...prev.mutedChannels, ch.id],
                          }))
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer ${
                          isMuted
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {isMuted ? 'Muted' : 'Active'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowNotificationModal(false)}
                className="px-5 py-2 rounded-xl bg-[#FFF025] text-black text-xs font-black cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMMUNITY GUIDELINES MODAL */}
      {showGuidelinesPrompt && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#14161f] border-2 border-white/20 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-sm uppercase">
                <ShieldCheck className="w-5 h-5" />
                <span>Build Buds Community Guidelines</span>
              </div>
              <button
                onClick={() => setShowGuidelinesPrompt(false)}
                className="text-white/60 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="font-chewy text-2xl text-white">
              Keep Build Buds Safe, Kind & Creative
            </h3>

            <ul className="space-y-2.5 text-xs text-white/80 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-[#FFF025] font-black">1.</span>
                <span>
                  <strong>Encourage Fellow Creators:</strong> Share constructive feedback on games, websites, videos, and novels.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#FFF025] font-black">2.</span>
                <span>
                  <strong>Clean & Friendly Chat:</strong> Our automatic profanity filter masks inappropriate words with <code className="text-[#FFF025]">***</code>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#FFF025] font-black">3.</span>
                <span>
                  <strong>Safe Links Only:</strong> Only upload links to your own creations or safe educational resources.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#FFF025] font-black">4.</span>
                <span>
                  <strong>Respect Channel Moderators:</strong> Follow channel permissions and slow-mode settings configured by administrators and moderators.
                </span>
              </li>
            </ul>

            <div className="pt-2 flex items-center gap-3">
              {currentUser ? (
                <button
                  onClick={handleAcceptGuidelines}
                  className="w-full py-3 rounded-xl bg-[#FFF025] hover:bg-[#ffe500] text-black font-black text-xs border-2 border-black cursor-pointer"
                >
                  I Agree to Follow the Guidelines
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowGuidelinesPrompt(false);
                    onOpenAuthModal('signin');
                  }}
                  className="w-full py-3 rounded-xl bg-[#FFF025] hover:bg-[#ffe500] text-black font-black text-xs border-2 border-black cursor-pointer"
                >
                  Sign In to Join the Conversation
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
