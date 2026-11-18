/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ThemeProvider, useTheme } from './utils/themeContext.tsx';
import { SpaceBackdrop } from './components/SpaceBackdrop.tsx';
import { SiteHeader } from './components/SiteHeader.tsx';
import { HeroSection } from './components/HeroSection.tsx';
import { ProjectShowcase } from './components/ProjectShowcase.tsx';
import { CommunityPreview } from './components/CommunityPreview.tsx';
import { ProjectPublishingSection } from './components/ProjectPublishingSection.tsx';
import { HowItWorks } from './components/HowItWorks.tsx';
import { BuilderCommunity } from './components/BuilderCommunity.tsx';
import { ChallengeSection } from './components/ChallengeSection.tsx';
import { CommunityValues } from './components/CommunityValues.tsx';
import { FAQSection } from './components/FAQSection.tsx';
import { FinalCTA } from './components/FinalCTA.tsx';
import { SiteFooter } from './components/SiteFooter.tsx';
import { CommunityHub, DEFAULT_COMMUNITY_CHANNELS } from './components/CommunityHub.tsx';

// Public Community & Student Verification Pages
import { PublicCommunityPage, PublicCommunityTab } from './components/PublicCommunityPage.tsx';
import { StudentAccessPage } from './components/StudentAccessPage.tsx';
import { AdminStudentAccessDashboard } from './components/AdminStudentAccessDashboard.tsx';
import { PublicAuthModal } from './components/PublicAuthModal.tsx';

// Interactive Modals
import { ProjectDetailModal } from './components/ProjectDetailModal.tsx';
import { JoinModal } from './components/JoinModal.tsx';
import { NewDiscussionModal } from './components/NewDiscussionModal.tsx';
import { ChallengeJoinModal } from './components/ChallengeJoinModal.tsx';
import { GuidelinesModal } from './components/GuidelinesModal.tsx';
import { ShareProjectModal } from './components/ShareProjectModal.tsx';

// Firebase Auth & Profile
import {
  db,
  auth,
  doc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  onAuthStateChanged,
  signOut,
  ensurePublicUserProfile,
  buildFallbackBuilderProfile,
  loadCachedBuilderProfile,
  isSuperAdminUser,
  isApprovedStudentMember,
  BuilderProfile,
  User,
} from './firebase.ts';

import {
  CommunityMembership,
  StudentAccessRequest,
  StudentAccessStatus,
  PublicPost,
  UserNotificationItem,
} from './types/community.ts';
import { InboxCenterModal } from './components/InboxCenterModal.tsx';
import {
  subscribeToUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from './utils/communityService.ts';

import { OfflineIndicator } from './components/PWAInstallButton.tsx';
import {
  detectStandaloneAppLaunch,
  setStandaloneAppSession,
} from './utils/usePWAInstall.ts';
import { NotificationPromptModal } from './components/NotificationPromptModal.tsx';
import {
  isBrowserNotificationSupported,
  getBrowserNotificationPermission,
  hasDismissedNotificationPromptThisSession,
  registerNotificationServiceWorker,
  loadNotificationPreferences,
  dispatchMessageBrowserNotification,
  triggerSystemDesktopNotification,
} from './utils/notifications.ts';
import { resolveBuilderAvatarUrl } from './utils/avatars.ts';
import {
  parseHubDeepLinkParams,
  resolveStandaloneInitialRoute,
  HubDeepLinkTarget,
} from './utils/messageGrouping.ts';

// Types
import { ProjectItem, DiscussionPost, ChallengeItem } from './types/index.ts';

const HUB_OPEN_STORAGE_KEY = 'buildbuds_hub_open';
const FIRST_TIME_AUTH_PROMPTED_KEY = 'buildbuds_first_auth_prompted_session';

function BuildBudsApp() {
  const { isDark } = useTheme();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [discussions, setDiscussions] = useState<DiscussionPost[]>([]);

  // Real-time listener for authentic published showcase projects from Firestore
  useEffect(() => {
    const q = query(
      collection(db, 'publicPosts'),
      where('status', '==', 'published')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rawDocs = snap.docs.map((docSnap) => ({
          ...(docSnap.data() as PublicPost),
          id: docSnap.id,
        }));
        rawDocs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        const liveItems: ProjectItem[] = rawDocs.slice(0, 12).map((p) => {
            const cat =
              p.categoryId === 'games'
                ? 'games'
                : p.categoryId === 'websites'
                ? 'websites'
                : 'experiments';
          return {
            id: p.id,
            title: p.title,
            tagline: p.summary || p.title,
            description: p.body,
            category: cat,
            creator: {
              name: p.authorName,
              grade: 'Student Builder',
              school: 'Jaystarbliss Partner School',
              avatarBg: p.authorColor || '#FFF025',
            },
            tools: p.tags && p.tags.length > 0 ? p.tags : ['Creative Code'],
            whatLearned: ['Building & Launching', 'Peer Collaboration'],
            sourceCodeSnippet: p.gameUrl || p.websiteUrl || '',
            demoType: cat === 'games' ? 'playable-game' : 'interactive-web',
            previewAccent:
              cat === 'games' ? '#FFF025' : cat === 'websites' ? '#B11469' : '#C15D00',
            imageUrl: p.media?.[0]?.secureUrl || undefined,
          };
        });
        setProjects(liveItems);
      },
      () => {
        setProjects([]);
      }
    );
    return () => unsub();
  }, []);

  // Detect whether the app was launched as a downloaded/installed Web App (PWA standalone mode)
  const [isStandaloneAppMode, setIsStandaloneAppMode] = useState<boolean>(() =>
    detectStandaloneAppLaunch()
  );

  // Client router path state (installed PWA launches on `/` go straight to `/community`)
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const standalone = detectStandaloneAppLaunch();
    const rawPath = window.location.pathname || '/';
    const rawSearch = window.location.search || '';
    const resolved = resolveStandaloneInitialRoute(rawPath, rawSearch, standalone);
    if (resolved !== `${rawPath}${rawSearch}`) {
      try {
        window.history.replaceState({}, '', resolved);
      } catch {
        // Ignore history errors
      }
    }
    return resolved;
  });
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [hubChannelId, setHubChannelId] = useState<string>('general-chat');
  const hubLinkTokenRef = useRef<number>(1);
  const [hubDeepLinkTarget, setHubDeepLinkTarget] = useState<
    (HubDeepLinkTarget & { token: number }) | null
  >(() => {
    const initial = parseHubDeepLinkParams(
      (window.location.pathname || '/') + (window.location.search || '')
    );
    return initial ? { ...initial, token: 1 } : null;
  });

  // Firebase Auth user & Builder Profile
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [builderProfile, setBuilderProfile] = useState<BuilderProfile | null>(null);
  const isAuthModalBusyRef = useRef(false);

  // Student Access & Membership state
  const [membership, setMembership] = useState<CommunityMembership | null>(null);
  const [studentRequest, setStudentRequest] = useState<StudentAccessRequest | null>(null);
  const [isMembershipChecking, setIsMembershipChecking] = useState<boolean>(false);

  // Public Auth Modal state (supports both 'signin' and 'join' modes)
  const [isPublicAuthOpen, setIsPublicAuthOpen] = useState(false);
  const [publicAuthMode, setPublicAuthMode] = useState<'signin' | 'join'>('signin');
  const [publicAuthDescription, setPublicAuthDescription] = useState<string>(
    'explore community creations, react, comment, and save your favourite projects'
  );
  const afterPublicAuthCallbackRef = useRef<(() => void) | null>(null);

  // Modal states
  const [activeProjectModal, setActiveProjectModal] = useState<ProjectItem | null>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinModalMode, setJoinModalMode] = useState<'join' | 'signin'>('join');
  const [isNewDiscussionOpen, setIsNewDiscussionOpen] = useState(false);
  const [activeChallengeModal, setActiveChallengeModal] = useState<ChallengeItem | null>(null);
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);
  const [isShareProjectOpen, setIsShareProjectOpen] = useState(false);
  const [isNotifPromptOpen, setIsNotifPromptOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotificationItem[]>([]);
  const [isInboxOpen, setIsInboxOpen] = useState(false);

  const initialPostsSnapshotSeenRef = useRef(false);
  const knownPostIdsRef = useRef<Set<string>>(new Set());
  const initialGlobalMessagesSeenRef = useRef(false);
  const knownGlobalMessageIdsRef = useRef<Set<string>>(new Set());

  const syncHubDeepLinkFromPath = useCallback((path: string) => {
    const parsed = parseHubDeepLinkParams(path);
    if (parsed) {
      hubLinkTokenRef.current += 1;
      setHubChannelId(parsed.channelId);
      setHubDeepLinkTarget({ ...parsed, token: hubLinkTokenRef.current });
    }
  }, []);

  const navigateTo = useCallback(
    (path: string) => {
      if (path.startsWith('/#')) {
        const hash = path.slice(1);
        window.history.pushState({}, '', '/');
        setCurrentPath('/');
        setTimeout(() => {
          const el = document.querySelector(hash);
          el?.scrollIntoView({ behavior: 'smooth' });
        }, 60);
        return;
      }
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      syncHubDeepLinkFromPath(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [syncHubDeepLinkFromPath]
  );

  useEffect(() => {
    const handlePopState = () => {
      const nextPath = (window.location.pathname || '/') + (window.location.search || '');
      setCurrentPath(nextPath);
      syncHubDeepLinkFromPath(nextPath);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [syncHubDeepLinkFromPath]);

  // Listen for PWA installation or display-mode changes & ensure installed app starts at /community
  useEffect(() => {
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleStandaloneChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsStandaloneAppMode(true);
      }
    };
    const handleAppInstalled = () => {
      setIsStandaloneAppMode(true);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleStandaloneChange);
    }
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleStandaloneChange);
      }
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!isStandaloneAppMode) return;
    const clean = currentPath.split('?')[0];
    if (clean === '/' || clean === '') {
      const searchPart = currentPath.includes('?') ? `?${currentPath.split('?')[1]}` : '';
      const target = `/community${searchPart}`;
      try {
        window.history.replaceState({}, '', target);
      } catch {
        // Ignore history errors
      }
      setCurrentPath(target);
    }
  }, [isStandaloneAppMode, currentPath]);

  // Listen to Firebase Auth state — restores existing session or creates/retrieves a profile (`users/{uid}`)
  // so users stay signed in across page reloads and visits.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (isAuthModalBusyRef.current) {
        return;
      }

      if (user) {
        setCurrentUser(user);
        const immediateProfile =
          loadCachedBuilderProfile(user.uid) || buildFallbackBuilderProfile(user);
        setBuilderProfile((prev) => prev || immediateProfile);
        setIsAuthChecking(false);
        try {
          const profile = await ensurePublicUserProfile(user);
          setBuilderProfile(profile);
        } catch (err) {
          console.warn('Fallback to local auth profile:', err);
          setBuilderProfile((prev) => prev || immediateProfile);
        }
      } else {
        setCurrentUser(null);
        setBuilderProfile(null);
        setMembership(null);
        setStudentRequest(null);
        setIsAuthChecking(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time listeners for `users/{uid}`, `communityMemberships/{uid}`, and `studentAccessRequests/{uid}`
  useEffect(() => {
    if (!currentUser) {
      setMembership(null);
      setStudentRequest(null);
      setIsMembershipChecking(false);
      return;
    }

    setIsMembershipChecking(true);
    let memLoaded = false;
    let reqLoaded = false;
    const markCheckDone = () => {
      if (memLoaded && reqLoaded) {
        setIsMembershipChecking(false);
      }
    };

    const unsubUserDoc = onSnapshot(
      doc(db, 'users', currentUser.uid),
      (snap) => {
        if (snap.exists()) {
          setBuilderProfile(
            buildFallbackBuilderProfile(currentUser, snap.data() as Partial<BuilderProfile>)
          );
        }
      },
      () => {}
    );

    const unsubMembership = onSnapshot(
      doc(db, 'communityMemberships', currentUser.uid),
      (snap) => {
        if (snap.exists()) {
          const memData = snap.data() as CommunityMembership;
          setMembership(memData);
          try {
            window.localStorage.setItem(
              `buildbuds_membership_${currentUser.uid}`,
              JSON.stringify(memData)
            );
          } catch {
            // Ignore storage errors
          }
        } else {
          setMembership(null);
        }
        memLoaded = true;
        markCheckDone();
      },
      () => {
        try {
          const cachedMem = window.localStorage.getItem(
            `buildbuds_membership_${currentUser.uid}`
          );
          if (cachedMem) {
            setMembership(JSON.parse(cachedMem) as CommunityMembership);
          }
        } catch {
          // Ignore
        }
        memLoaded = true;
        markCheckDone();
      }
    );

    const unsubRequest = onSnapshot(
      doc(db, 'studentAccessRequests', currentUser.uid),
      (snap) => {
        if (snap.exists()) {
          setStudentRequest(snap.data() as StudentAccessRequest);
        } else {
          setStudentRequest(null);
        }
        reqLoaded = true;
        markCheckDone();
      },
      () => {
        reqLoaded = true;
        markCheckDone();
      }
    );

    return () => {
      unsubUserDoc();
      unsubMembership();
      unsubRequest();
    };
  }, [currentUser?.uid]);

  // Ensure builderProfile always carries the student's real schoolName & gradeLevel from membership or application if missing on users/{uid}
  useEffect(() => {
    if (!builderProfile) return;
    const realSchool =
      builderProfile.schoolName?.trim() ||
      membership?.schoolName?.trim() ||
      studentRequest?.schoolName?.trim() ||
      '';
    const realGrade =
      builderProfile.gradeLevel?.trim() ||
      membership?.gradeLevel?.trim() ||
      studentRequest?.gradeLevel?.trim() ||
      '';
    if (
      (realSchool && realSchool !== builderProfile.schoolName) ||
      (realGrade && realGrade !== builderProfile.gradeLevel)
    ) {
      setBuilderProfile((prev) =>
        prev
          ? {
              ...prev,
              schoolName: realSchool || prev.schoolName,
              gradeLevel: realGrade || prev.gradeLevel,
            }
          : prev
      );
    }
  }, [
    builderProfile?.schoolName,
    builderProfile?.gradeLevel,
    membership?.schoolName,
    membership?.gradeLevel,
    studentRequest?.schoolName,
    studentRequest?.gradeLevel,
  ]);

  // Global real-time Inbox notifications listener for the signed-in user
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setIsInboxOpen(false);
      return;
    }
    return subscribeToUserNotifications(currentUser.uid, setNotifications);
  }, [currentUser?.uid]);

  // First-time sign-in prompt & Push Notification Prompt Modal on App Open
  useEffect(() => {
    if (isAuthChecking) return;

    // If notifications are already granted, ensure Service Worker is active
    if (isBrowserNotificationSupported() && getBrowserNotificationPermission() === 'granted') {
      registerNotificationServiceWorker();
    }

    // Show "Do you want to receive notifications from Build Buds?" modal once user is in the app
    // and browser notification permission is still 'default'
    if (
      isBrowserNotificationSupported() &&
      getBrowserNotificationPermission() === 'default' &&
      !hasDismissedNotificationPromptThisSession()
    ) {
      const timer = window.setTimeout(() => {
        setIsNotifPromptOpen(true);
      }, 900);
      return () => window.clearTimeout(timer);
    }
  }, [isAuthChecking, isStandaloneAppMode]);

  // Listen for Service Worker notification clicks to navigate to the target channel or post
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'BUILDBUDS_NOTIFICATION_CLICK') {
        if (event.data.actionUrl && String(event.data.actionUrl).startsWith('/')) {
          navigateTo(String(event.data.actionUrl));
        } else if (event.data.channelId) {
          setHubChannelId(event.data.channelId);
          navigateTo(`/hub?channel=${encodeURIComponent(event.data.channelId)}`);
        }
      }
    };
    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleSwMessage);
  }, [navigateTo]);

  // Global real-time desktop/mobile push notification listener for newly published Public Community Posts (`publicPosts`)
  // Uses a minimal limit(5) query so opening the app does not consume extra read quota.
  useEffect(() => {
    initialPostsSnapshotSeenRef.current = false;
    knownPostIdsRef.current.clear();
    const postsQ = query(collection(db, 'publicPosts'), orderBy('createdAt', 'desc'), limit(5));
    const unsubPosts = onSnapshot(
      postsQ,
      (snap) => {
        if (!initialPostsSnapshotSeenRef.current) {
          snap.docs.forEach((d) => knownPostIdsRef.current.add(d.id));
          initialPostsSnapshotSeenRef.current = true;
          return;
        }
        snap.docChanges().forEach((change) => {
          if (change.type !== 'added') return;
          const postId = change.doc.id;
          if (knownPostIdsRef.current.has(postId)) return;
          knownPostIdsRef.current.add(postId);

          const post = change.doc.data() as PublicPost;
          if (currentUser && post.authorId === currentUser.uid) return;
          if (post.status && post.status !== 'published') return;
          const createdMs = post.createdAt ? new Date(post.createdAt).getTime() : Date.now();
          if (Date.now() - createdMs > 120000) return;

          const prefs = loadNotificationPreferences();
          if (prefs.explicitlyDisabled) return;

          triggerSystemDesktopNotification({
            title: `New on Build Buds: ${post.title}`,
            body: `${post.authorName} published in ${post.categoryName || 'Community'}: ${
              post.summary || post.body || ''
            }`,
            tag: `buildbuds-post-${postId}`,
            iconUrl: resolveBuilderAvatarUrl(post.authorAvatar, post.authorId),
            actionUrl: `/community/posts/${postId}`,
            onClick: () => navigateTo(`/community/posts/${postId}`),
          });
        });
      },
      () => {}
    );

    return () => {
      unsubPosts();
    };
  }, [currentUser?.uid, navigateTo]);

  const isAdmin = isSuperAdminUser(currentUser, builderProfile);
  const isModeratorOrAdmin = isAdmin || builderProfile?.role === 'moderator';

  // Student Hub Approval Gate:
  // Approved students (`communityMemberships/{uid}.status === 'approved'`), pre-existing Student Hub builders, or Admins can enter `/hub`
  const isApprovedForHub = isApprovedStudentMember({
    user: currentUser,
    profile: builderProfile,
    membership,
    studentRequest,
  });

  const handleSelectInboxNotification = useCallback(
    (notif: UserNotificationItem) => {
      if (currentUser && !notif.read) {
        void markNotificationAsRead(currentUser.uid, notif.id);
        setNotifications((prev) =>
          prev.map((item) => (item.id === notif.id ? { ...item, read: true } : item))
        );
      }
      setIsInboxOpen(false);
      let target = notif.actionUrl || '/community';

      // Enrich moderation_report notifications (including legacy ones lacking messageId/tab params)
      if (notif.type === 'moderation_report') {
        if (notif.postId || target.startsWith('/community/posts/')) {
          if (!target.startsWith('/community/posts/') && notif.postId) {
            target = `/community/posts/${notif.postId}`;
          }
        } else {
          const existingQuery = target.includes('?') ? target.split('?')[1] : '';
          const qs = new URLSearchParams(existingQuery);
          const effectiveChannel = notif.channelId || qs.get('channel') || 'general-chat';
          qs.set('channel', effectiveChannel);
          if (notif.streamId && !qs.get('stream')) {
            qs.set('stream', notif.streamId);
          }
          if (notif.messageId && !qs.get('messageId')) {
            qs.set('messageId', notif.messageId);
          }
          if (notif.reportId && !qs.get('reportId')) {
            qs.set('reportId', notif.reportId);
          }
          // For legacy report notifications that lack a messageId, open the Flagged Reports queue directly
          if (!qs.get('messageId')) {
            qs.set('tab', 'reports');
          }
          target = `/hub?${qs.toString()}`;
        }
      } else if (target.startsWith('/hub')) {
        const existingQuery = target.includes('?') ? target.split('?')[1] : '';
        const qs = new URLSearchParams(existingQuery);
        if (notif.channelId && !qs.get('channel')) {
          qs.set('channel', notif.channelId);
        }
        if (notif.streamId && !qs.get('stream')) {
          qs.set('stream', notif.streamId);
        }
        if (notif.messageId && !qs.get('messageId')) {
          qs.set('messageId', notif.messageId);
        }
        if (qs.toString()) {
          target = `/hub?${qs.toString()}`;
        }
      }

      navigateTo(target);
    },
    [currentUser?.uid, navigateTo]
  );

  const handleMarkAllNotificationsRead = useCallback(() => {
    if (!currentUser) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    void markAllNotificationsAsRead(currentUser.uid, notifications);
  }, [currentUser?.uid, notifications]);

  // Global real-time push notification listener for new messages across ALL channels
  // Active whenever the user is signed in and approved for the Hub, even while browsing `/` or `/community`.
  // Uses a bounded limit(5) query + shared tag deduplication to preserve read quota and prevent duplicate alerts.
  useEffect(() => {
    if (!currentUser || !isApprovedForHub) return;

    initialGlobalMessagesSeenRef.current = false;
    knownGlobalMessageIdsRef.current.clear();

    const globalMsgsQ = query(
      collection(db, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubGlobalMsgs = onSnapshot(
      globalMsgsQ,
      (snap) => {
        if (!initialGlobalMessagesSeenRef.current) {
          snap.docs.forEach((d) => knownGlobalMessageIdsRef.current.add(d.id));
          initialGlobalMessagesSeenRef.current = true;
          return;
        }
        const prefs = loadNotificationPreferences();
        snap.docChanges().forEach((change) => {
          if (change.type !== 'added') return;
          const docId = change.doc.id;
          if (knownGlobalMessageIdsRef.current.has(docId)) return;
          knownGlobalMessageIdsRef.current.add(docId);

          const data = change.doc.data() as Record<string, any>;
          const createdAtField = data.createdAt;
          const createdMillis =
            createdAtField && typeof createdAtField.toMillis === 'function'
              ? createdAtField.toMillis()
              : typeof data.createdAtMillis === 'number'
              ? data.createdAtMillis
              : Date.now();
          if (Date.now() - createdMillis > 90000) return;

          const rawChannelId = String(data.channelId || 'general-chat');
          const baseChannelId = rawChannelId.split('__group__')[0];
          const chObj = DEFAULT_COMMUNITY_CHANNELS.find((c) => c.id === baseChannelId);
          const channelName = chObj?.name || baseChannelId;

          dispatchMessageBrowserNotification({
            messageId: docId,
            channelId: rawChannelId,
            channelName,
            authorId: String(data.authorId || ''),
            authorName: String(data.authorName || 'Builder'),
            authorAvatarUrl: resolveBuilderAvatarUrl(
              data.authorAvatar,
              String(data.authorId || 'builder')
            ),
            text: String(data.text || ''),
            currentUserId: currentUser.uid,
            currentUserDisplayName: builderProfile?.displayName,
            preferences: prefs,
            onNavigateToChannel: (targetChannelId) => {
              setHubChannelId(targetChannelId);
              navigateTo(`/hub?channel=${encodeURIComponent(targetChannelId)}`);
            },
          });
        });
      },
      () => {}
    );

    return () => {
      unsubGlobalMsgs();
    };
  }, [currentUser?.uid, isApprovedForHub, builderProfile?.displayName, navigateTo]);

  const studentAccessStatus: StudentAccessStatus = isApprovedForHub
    ? 'approved'
    : membership?.status === 'suspended' || studentRequest?.status === 'suspended'
      ? 'suspended'
      : studentRequest?.status || 'not_requested';

  const handleRequirePublicAuth = (
    description: string,
    onAfterAuth?: () => void,
    mode: 'signin' | 'join' = 'signin'
  ) => {
    setPublicAuthMode(mode);
    setPublicAuthDescription(description);
    afterPublicAuthCallbackRef.current = onAfterAuth || null;
    setIsPublicAuthOpen(true);
  };

  // Handler for "Join Build Buds" CTA:
  // Opens the registration experience (or goes directly to /community if already signed in)
  const handleJoinBuildBudsClick = () => {
    if (currentUser) {
      navigateTo('/community');
      return;
    }
    handleRequirePublicAuth(
      'create your Build Buds account and explore the community',
      () => {
        navigateTo('/community');
      },
      'join'
    );
  };

  const handleSignOutAll = async () => {
    try {
      localStorage.setItem(HUB_OPEN_STORAGE_KEY, '0');
    } catch {
      // Ignore
    }
    await signOut(auth).catch(() => {});
    setCurrentUser(null);
    setBuilderProfile(null);
    setMembership(null);
    setStudentRequest(null);
    if (currentPath.startsWith('/hub') || currentPath.startsWith('/admin')) {
      navigateTo('/community');
    }
  };

  // Handler when user specifically clicks "Student Hub" / "Request Student Hub Access"
  const handleEnterStudentHubOrVerify = (channelId = 'general-chat') => {
    setHubChannelId(channelId);
    if (currentUser && builderProfile && isApprovedForHub) {
      try {
        localStorage.setItem(HUB_OPEN_STORAGE_KEY, '1');
      } catch {
        // Ignore
      }
      navigateTo('/hub');
    } else if (currentUser) {
      navigateTo(
        studentAccessStatus === 'not_requested'
          ? '/student-access'
          : '/student-access/status'
      );
    } else {
      navigateTo('/student-access');
    }
  };

  const handleLaunchStandaloneApp = () => {
    setStandaloneAppSession(true);
    setIsStandaloneAppMode(true);
    navigateTo('/community');
  };

  const handleOpenProjectById = (id: string) => {
    const found = projects.find((p) => p.id === id);
    if (found) {
      setActiveProjectModal(found);
    }
  };

  const handleAddNewDiscussion = (newPost: DiscussionPost) => {
    setDiscussions((prev) => [newPost, ...prev]);
  };

  const handleAddNewProject = (newProject: ProjectItem) => {
    setProjects((prev) => [newProject, ...prev]);
    setActiveProjectModal(newProject);
  };

  // Global Public Auth Modal + Push Notification Prompt Modal (rendered across all routes)
  const publicAuthModalElement = (
    <>
      <PublicAuthModal
        isOpen={isPublicAuthOpen || currentPath === '/login'}
        initialMode={publicAuthMode}
        actionDescription={publicAuthDescription}
        onClose={() => {
          setIsPublicAuthOpen(false);
          afterPublicAuthCallbackRef.current = null;
          if (currentPath === '/login') {
            navigateTo('/community');
          }
        }}
        onSuccess={(profile, user) => {
          setCurrentUser(user);
          setBuilderProfile(profile);
          setIsPublicAuthOpen(false);
          if (currentPath === '/login') {
            navigateTo('/community');
          }
          const cb = afterPublicAuthCallbackRef.current;
          afterPublicAuthCallbackRef.current = null;
          cb?.();
        }}
      />
      <NotificationPromptModal
        isOpen={isNotifPromptOpen && !isPublicAuthOpen && currentPath !== '/login'}
        onClose={() => setIsNotifPromptOpen(false)}
      />
      <InboxCenterModal
        isOpen={isInboxOpen && Boolean(currentUser)}
        onClose={() => setIsInboxOpen(false)}
        notifications={notifications}
        onSelectNotification={handleSelectInboxNotification}
        onMarkAllRead={handleMarkAllNotificationsRead}
        isModeratorOrAdmin={isModeratorOrAdmin}
      />
    </>
  );

  const cleanPathname = currentPath.split('?')[0];
  const queryString = currentPath.includes('?') ? currentPath.split('?')[1] : '';

  // ROUTE 1: GENERALIZED ADMIN CONTROL CENTER (/admin, /admin/student-access)
  if (cleanPathname === '/admin' || cleanPathname.startsWith('/admin/')) {
    return (
      <>
        <AdminStudentAccessDashboard
          currentUser={currentUser}
          builderProfile={builderProfile}
          onNavigate={navigateTo}
        />
        {publicAuthModalElement}
        <OfflineIndicator />
      </>
    );
  }

  // ROUTE 2: STUDENT HUB ACCESS REQUEST & STATUS (/student-access, /student-access/status)
  if (cleanPathname.startsWith('/student-access')) {
    const viewMode = cleanPathname.startsWith('/student-access/status') ? 'status' : 'form';
    return (
      <>
        <StudentAccessPage
          currentUser={currentUser}
          builderProfile={builderProfile}
          accessStatus={studentAccessStatus}
          existingRequest={studentRequest}
          isApprovedForHub={isApprovedForHub}
          viewMode={viewMode}
          onNavigate={navigateTo}
          onRequireAuth={(desc) => handleRequirePublicAuth(desc)}
          onRequestSubmitted={(req) => setStudentRequest(req)}
        />
        {publicAuthModalElement}
        <OfflineIndicator />
      </>
    );
  }

  // ROUTE 3: PRIVATE REAL-TIME STUDENT HUB (/hub)
  if (cleanPathname === '/hub') {
    if (isAuthChecking || (currentUser && !isApprovedForHub && isMembershipChecking)) {
      return (
        <div className="fixed inset-0 bg-[#06060c] text-white flex flex-col items-center justify-center p-6 select-none">
          <img
            src="/assets/aistudio/images/aurora-logo.png"
            alt="Build Buds App"
            className="w-16 h-16 rounded-3xl object-contain drop-shadow-2xl mb-4 animate-pulse"
          />
          <div className="font-chewy text-2xl text-[#FFF025] tracking-wide">Build Buds</div>
          <div className="text-xs font-mono text-white/60 mt-1">
            Verifying your account & student membership...
          </div>
          <OfflineIndicator />
        </div>
      );
    }

    // Only approved students or admins can enter the private CommunityHub
    if (currentUser && builderProfile && isApprovedForHub) {
      const hubParams = new URLSearchParams(queryString);
      const effectiveInitialChannel = hubParams.get('channel') || hubChannelId;
      return (
        <>
          <CommunityHub
            currentUser={currentUser}
            builderProfile={builderProfile}
            initialChannelId={effectiveInitialChannel}
            hubDeepLinkTarget={hubDeepLinkTarget}
            isStandaloneApp={isStandaloneAppMode}
            isApprovedForHub={isApprovedForHub}
            notifications={notifications}
            onOpenInbox={() => setIsInboxOpen(true)}
            onBackToLanding={() => {
              try {
                localStorage.setItem(HUB_OPEN_STORAGE_KEY, '0');
              } catch {
                // Ignore
              }
              navigateTo('/community');
            }}
            onOpenAuthModal={(mode) => {
              setJoinModalMode(mode);
              setIsJoinModalOpen(true);
            }}
            onProfileUpdated={(profile) => setBuilderProfile(profile)}
          />
          {publicAuthModalElement}
          <OfflineIndicator />
        </>
      );
    }

    // If signed in, but NOT yet an approved Jaystarbliss Studios student -> show the Student Verification Page
    if (currentUser) {
      return (
        <>
          <StudentAccessPage
            currentUser={currentUser}
            builderProfile={builderProfile}
            accessStatus={studentAccessStatus}
            existingRequest={studentRequest}
            isApprovedForHub={false}
            viewMode={studentAccessStatus === 'not_requested' ? 'form' : 'status'}
            onNavigate={navigateTo}
            onRequireAuth={(desc) => handleRequirePublicAuth(desc)}
            onRequestSubmitted={(req) => setStudentRequest(req)}
          />
          {publicAuthModalElement}
          <OfflineIndicator />
        </>
      );
    }

    // If not signed in on `/hub` -> show Sign-In / Sign-Up screen
    return (
      <div className="min-h-screen bg-[#06060c] text-white relative">
        <SpaceBackdrop />
        <JoinModal
          key={`standalone-${joinModalMode}`}
          isOpen={true}
          initialMode={joinModalMode}
          isStandaloneAppScreen={true}
          onBrowseWebsite={() => {
            navigateTo('/community');
          }}
          onAuthBusyChange={(busy) => {
            isAuthModalBusyRef.current = busy;
          }}
          onClose={() => {
            navigateTo('/community');
          }}
          onSuccess={(profile, user) => {
            setCurrentUser(user);
            setBuilderProfile(profile);
          }}
        />
        <OfflineIndicator />
      </div>
    );
  }

  // ROUTE 4: PUBLIC COMMUNITY DISCOVERY MAIN PAGE (`/community`, `/community/*`, `/login`, or installed PWA on `/`)
  // In installed PWA standalone mode, `/` always starts straight from `/community` rather than the marketing homepage.
  if (
    cleanPathname.startsWith('/community') ||
    cleanPathname === '/login' ||
    (isStandaloneAppMode && (cleanPathname === '/' || cleanPathname === ''))
  ) {
    let initialTab: PublicCommunityTab = 'all';
    let initialPostId: string | null = null;

    const searchParams = new URLSearchParams(queryString);
    const tabParam = searchParams.get('tab');

    if (cleanPathname.startsWith('/community/creations') || tabParam === 'creations') {
      initialTab = 'creations';
    } else if (cleanPathname.startsWith('/community/updates') || tabParam === 'updates') {
      initialTab = 'updates';
    } else if (cleanPathname.startsWith('/community/challenges') || tabParam === 'challenges') {
      initialTab = 'challenges';
    } else if (cleanPathname.startsWith('/community/contributors') || tabParam === 'contributors') {
      initialTab = 'contributors';
    } else if (cleanPathname.startsWith('/community/saved') || tabParam === 'saved') {
      initialTab = 'saved';
    } else if (cleanPathname.startsWith('/community/my-posts') || tabParam === 'my-posts') {
      initialTab = 'my-posts';
    } else if (cleanPathname.startsWith('/community/review') || tabParam === 'review') {
      initialTab = 'review';
    } else if (cleanPathname.startsWith('/community/posts/')) {
      initialPostId = cleanPathname.replace('/community/posts/', '').split('/')[0] || null;
    }

    return (
      <>
        <PublicCommunityPage
          currentUser={currentUser}
          builderProfile={builderProfile}
          studentAccessStatus={studentAccessStatus}
          isApprovedForHub={isApprovedForHub}
          isAuthChecking={isAuthChecking}
          initialTab={initialTab}
          initialPostId={initialPostId}
          notifications={notifications}
          onOpenInbox={() => setIsInboxOpen(true)}
          onSelectNotification={handleSelectInboxNotification}
          onNavigate={navigateTo}
          onRequireAuth={handleRequirePublicAuth}
          onSignOut={handleSignOutAll}
          onProfileUpdated={(updated) => setBuilderProfile(updated)}
        />
        {publicAuthModalElement}
        <OfflineIndicator />
      </>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col font-sans selection:bg-[#FFF025] selection:text-black relative transition-colors duration-300 ${
        isDark ? 'bg-[#06060c] text-white' : 'bg-white text-slate-900'
      }`}
    >
      {/* Sticky/Fixed Space Backdrop */}
      <SpaceBackdrop />

      {/* Offline status toast for PWA */}
      <OfflineIndicator />

      {/* 1. Header with Navigation to Public Community, Student Hub, Day/Night Switcher, and User Menu */}
      <SiteHeader
        currentUser={currentUser}
        builderProfile={builderProfile}
        studentAccessStatus={studentAccessStatus}
        isApprovedForHub={isApprovedForHub}
        isAuthChecking={isAuthChecking}
        notifications={notifications}
        onOpenInbox={() => setIsInboxOpen(true)}
        onSelectNotification={handleSelectInboxNotification}
        onNavigate={navigateTo}
        onSignOut={handleSignOutAll}
        onJoinClick={handleJoinBuildBudsClick}
        onSignInClick={() =>
          handleRequirePublicAuth('sign in to your Build Buds account', undefined, 'signin')
        }
        onLaunchAppMode={handleLaunchStandaloneApp}
      />

      {/* Main Page Body */}
      <main className="flex-1">
        {/* 2. Hero Section:
            - Join Build Buds opens registration/sign-up flow (then takes user to /community)
            - Explore Creations navigates directly to /community */}
        <HeroSection
          onJoinClick={handleJoinBuildBudsClick}
          onExploreClick={() => navigateTo('/community')}
          onOpenProject={handleOpenProjectById}
        />

        {/* 3. Project Showcase */}
        <ProjectShowcase
          projects={projects}
          onSelectProject={(project) => setActiveProjectModal(project)}
          onSubmitProjectClick={() => navigateTo('/community/creations')}
        />

        {/* 4. Community Preview */}
        <CommunityPreview
          initialDiscussions={discussions}
          onNewDiscussionClick={() => navigateTo('/community')}
          onJoinClick={handleJoinBuildBudsClick}
        />

        {/* 5. Project Publishing Section */}
        <ProjectPublishingSection
          onPublishClick={() => navigateTo('/community/creations')}
        />

        {/* 6. How It Works */}
        <HowItWorks
          onJoinClick={handleJoinBuildBudsClick}
        />

        {/* 7. Builder Community */}
        <BuilderCommunity
          onJoinClick={handleJoinBuildBudsClick}
        />

        {/* 8. Challenges & Creative Missions */}
        <ChallengeSection
          onJoinChallengeClick={() => navigateTo('/community/challenges')}
        />

        {/* 9. Community Values & Trust */}
        <CommunityValues />

        {/* 10. Homepage FAQ */}
        <FAQSection
          onJoinClick={handleJoinBuildBudsClick}
        />

        {/* 11. Final Call To Action */}
        <FinalCTA
          onJoinClick={handleJoinBuildBudsClick}
          onExploreClick={() => navigateTo('/community')}
        />
      </main>

      {/* 12. Site Footer */}
      <SiteFooter
        onJoinClick={handleJoinBuildBudsClick}
        onOpenGuidelines={() => setIsGuidelinesOpen(true)}
      />

      {/* Interactive Modals */}
      <ProjectDetailModal
        project={activeProjectModal}
        onClose={() => setActiveProjectModal(null)}
      />

      {publicAuthModalElement}

      <JoinModal
        key={joinModalMode}
        isOpen={isJoinModalOpen}
        initialMode={joinModalMode}
        onAuthBusyChange={(busy) => {
          isAuthModalBusyRef.current = busy;
        }}
        onClose={() => {
          setIsJoinModalOpen(false);
        }}
        onSuccess={(profile, user) => {
          setCurrentUser(user);
          setBuilderProfile(profile);
          setIsJoinModalOpen(false);
        }}
      />

      <NewDiscussionModal
        isOpen={isNewDiscussionOpen}
        onClose={() => setIsNewDiscussionOpen(false)}
        onSubmit={handleAddNewDiscussion}
      />

      <ChallengeJoinModal
        challenge={activeChallengeModal}
        onClose={() => setActiveChallengeModal(null)}
      />

      <GuidelinesModal
        isOpen={isGuidelinesOpen}
        onClose={() => setIsGuidelinesOpen(false)}
      />

      <ShareProjectModal
        isOpen={isShareProjectOpen}
        onClose={() => setIsShareProjectOpen(false)}
        onAddProject={handleAddNewProject}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BuildBudsApp />
    </ThemeProvider>
  );
}
