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
import { CommunityHub } from './components/CommunityHub.tsx';

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
} from './types/community.ts';

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
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc'),
      limit(24)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const liveItems: ProjectItem[] = snap.docs.map((docSnap) => {
          const p = docSnap.data() as PublicPost;
          const cat =
            p.categoryId === 'games'
              ? 'games'
              : p.categoryId === 'websites'
              ? 'websites'
              : 'experiments';
          return {
            id: docSnap.id,
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

  // Client router path state
  const [currentPath, setCurrentPath] = useState<string>(
    () => (window.location.pathname || '/') + (window.location.search || '')
  );

  // Detect whether the app was launched as a downloaded/installed Web App (PWA standalone mode)
  const [isStandaloneAppMode, setIsStandaloneAppMode] = useState<boolean>(() =>
    detectStandaloneAppLaunch()
  );
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [hubChannelId, setHubChannelId] = useState<string>('general-chat');

  // Firebase Auth user & Builder Profile
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [builderProfile, setBuilderProfile] = useState<BuilderProfile | null>(null);
  const isAuthModalBusyRef = useRef(false);

  // Student Access & Membership state
  const [membership, setMembership] = useState<CommunityMembership | null>(null);
  const [studentRequest, setStudentRequest] = useState<StudentAccessRequest | null>(null);

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

  const initialPostsSnapshotSeenRef = useRef(false);
  const knownPostIdsRef = useRef<Set<string>>(new Set());
  const initialGlobalMessagesSeenRef = useRef(false);
  const knownGlobalMessageIdsRef = useRef<Set<string>>(new Set());

  const navigateTo = useCallback((path: string) => {
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath((window.location.pathname || '/') + (window.location.search || ''));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Listen for PWA installation or display-mode changes
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

  // Listen to Firebase Auth state — restores existing session or creates/retrieves a profile (`users/{uid}`)
  // so users stay signed in across page reloads and visits.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (isAuthModalBusyRef.current) {
        return;
      }

      if (user) {
        setCurrentUser(user);
        try {
          const profile = await ensurePublicUserProfile(user);
          setBuilderProfile(profile);
        } catch (err) {
          console.error('Fallback to local auth profile:', err);
          setBuilderProfile((prev) => prev || buildFallbackBuilderProfile(user));
        } finally {
          setIsAuthChecking(false);
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

  // Real-time listeners for `communityMemberships/{uid}` and `studentAccessRequests/{uid}`
  useEffect(() => {
    if (!currentUser) {
      setMembership(null);
      setStudentRequest(null);
      return;
    }

    const unsubMembership = onSnapshot(
      doc(db, 'communityMemberships', currentUser.uid),
      (snap) => {
        if (snap.exists()) {
          setMembership(snap.data() as CommunityMembership);
        } else {
          setMembership(null);
        }
      },
      () => {
        setMembership(null);
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
      },
      () => {
        setStudentRequest(null);
      }
    );

    return () => {
      unsubMembership();
      unsubRequest();
    };
  }, [currentUser?.uid]);

  // First-time sign-in prompt & Push Notification Prompt Modal on App Open
  useEffect(() => {
    if (isAuthChecking) return;

    // If notifications are already granted, ensure Service Worker is active
    if (isBrowserNotificationSupported() && getBrowserNotificationPermission() === 'granted') {
      registerNotificationServiceWorker();
    }

    // If user is not signed in yet when opening the app for the first time, request Sign In / Login
    if (!currentUser && !isStandaloneAppMode) {
      let alreadyPrompted = false;
      try {
        alreadyPrompted = window.sessionStorage.getItem(FIRST_TIME_AUTH_PROMPTED_KEY) === '1';
      } catch {
        // Ignore
      }
      if (!alreadyPrompted) {
        try {
          window.sessionStorage.setItem(FIRST_TIME_AUTH_PROMPTED_KEY, '1');
        } catch {
          // Ignore
        }
        setPublicAuthMode('signin');
        setPublicAuthDescription(
          'sign in to your Build Buds account (or create one if this is your first time)'
        );
        setIsPublicAuthOpen(true);
      }
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
  }, [isAuthChecking, currentUser, isStandaloneAppMode]);

  // Listen for Service Worker notification clicks to navigate to the target channel or post
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'BUILDBUDS_NOTIFICATION_CLICK') {
        if (event.data.channelId) {
          setHubChannelId(event.data.channelId);
          navigateTo(`/hub?channel=${encodeURIComponent(event.data.channelId)}`);
        } else if (event.data.actionUrl) {
          navigateTo(event.data.actionUrl);
        }
      }
    };
    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleSwMessage);
  }, [navigateTo]);

  // Global real-time desktop/PC notification listener for:
  // 1) New Public Community Posts / Updates (`publicPosts`)
  // 2) New Chat Messages (`messages`) when user is outside `/hub`
  useEffect(() => {
    if (!currentUser) return;

    // 1. Listen for new community posts/updates
    initialPostsSnapshotSeenRef.current = false;
    knownPostIdsRef.current.clear();
    const postsQ = query(collection(db, 'publicPosts'), orderBy('createdAt', 'desc'), limit(30));
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
          if (post.authorId === currentUser.uid) return;
          if (post.status && post.status !== 'published') return;
          const createdMs = post.createdAt ? new Date(post.createdAt).getTime() : Date.now();
          if (Date.now() - createdMs > 120000) return;

          const prefs = loadNotificationPreferences();
          if (prefs.explicitlyDisabled) return;

          triggerSystemDesktopNotification({
            title: `🚀 New on Build Buds: ${post.title}`,
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

    // 2. Listen for new chat messages when user is not currently on `/hub` (since `/hub` has its own listener)
    const isOnHubPage = currentPath.split('?')[0] === '/hub';
    let unsubMsgs = () => {};
    if (!isOnHubPage) {
      initialGlobalMessagesSeenRef.current = false;
      knownGlobalMessageIdsRef.current.clear();
      const msgsQ = query(collection(db, 'messages'), limit(80));
      unsubMsgs = onSnapshot(
        msgsQ,
        (snap) => {
          if (!initialGlobalMessagesSeenRef.current) {
            snap.docs.forEach((d) => knownGlobalMessageIdsRef.current.add(d.id));
            initialGlobalMessagesSeenRef.current = true;
            return;
          }
          snap.docChanges().forEach((change) => {
            if (change.type !== 'added') return;
            const msgId = change.doc.id;
            if (knownGlobalMessageIdsRef.current.has(msgId)) return;
            knownGlobalMessageIdsRef.current.add(msgId);

            const data = change.doc.data();
            const createdMs = data.createdAt?.toMillis
              ? data.createdAt.toMillis()
              : Number(data.createdAtMillis || Date.now());
            if (Date.now() - createdMs > 60000) return;

            const baseChannelId = String(data.channelId || 'general-chat').split('__group__')[0];
            dispatchMessageBrowserNotification({
              messageId: msgId,
              channelId: String(data.channelId || 'general-chat'),
              channelName: baseChannelId,
              authorId: String(data.authorId || ''),
              authorName: String(data.authorName || 'Builder'),
              authorAvatarUrl: resolveBuilderAvatarUrl(
                data.authorAvatar,
                String(data.authorId || 'builder')
              ),
              text: String(data.text || ''),
              currentUserId: currentUser.uid,
              currentUserDisplayName: builderProfile?.displayName,
              preferences: loadNotificationPreferences(),
              onNavigateToChannel: (targetCh) => {
                setHubChannelId(targetCh);
                navigateTo(`/hub?channel=${encodeURIComponent(targetCh)}`);
              },
            });
          });
        },
        () => {}
      );
    }

    return () => {
      unsubPosts();
      unsubMsgs();
    };
  }, [currentUser?.uid, builderProfile?.displayName, currentPath, navigateTo]);

  const isAdmin = isSuperAdminUser(currentUser, builderProfile);

  // Student Hub Approval Gate:
  // Approved students (`communityMemberships/{uid}.status === 'approved'`), pre-existing Student Hub builders, or Admins can enter `/hub`
  const isApprovedForHub = isApprovedStudentMember({
    user: currentUser,
    profile: builderProfile,
    membership,
    studentRequest,
  });

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
    if (currentUser) {
      navigateTo('/community');
    } else {
      setJoinModalMode('signin');
    }
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
    </>
  );

  const cleanPathname = currentPath.split('?')[0];
  const queryString = currentPath.includes('?') ? currentPath.split('?')[1] : '';

  // STANDALONE DOWNLOADED WEB APP FIRST-TIME SIGN-IN GATE:
  // When opened as a downloaded/installed Web App, if the user is not signed in yet,
  // prompt them with the dedicated Sign-In / Sign-Up screen first; once signed in (and on all
  // subsequent launches), take them directly to the Community Main Page (`/community`).
  if (isStandaloneAppMode && cleanPathname !== '/hub' && !cleanPathname.startsWith('/student-access') && !cleanPathname.startsWith('/admin')) {
    if (isAuthChecking) {
      return (
        <div className="fixed inset-0 bg-[#06060c] text-white flex flex-col items-center justify-center p-6 select-none">
          <img
            src="/assets/aistudio/images/aurora-logo.png"
            alt="Build Buds App"
            className="w-16 h-16 rounded-3xl object-contain drop-shadow-2xl mb-4 animate-pulse"
          />
          <div className="font-chewy text-2xl text-[#FFF025] tracking-wide">Build Buds</div>
          <div className="text-xs font-mono text-white/60 mt-1">
            Restoring your Build Buds session...
          </div>
          <OfflineIndicator />
        </div>
      );
    }

    if (!currentUser) {
      return (
        <div className="min-h-screen bg-[#06060c] text-white relative">
          <SpaceBackdrop />
          <JoinModal
            key={`standalone-${joinModalMode}`}
            isOpen={true}
            initialMode={joinModalMode}
            isStandaloneAppScreen={true}
            onBrowseWebsite={() => {
              setStandaloneAppSession(false);
              setIsStandaloneAppMode(false);
              navigateTo('/community');
            }}
            onAuthBusyChange={(busy) => {
              isAuthModalBusyRef.current = busy;
            }}
            onClose={() => {
              setStandaloneAppSession(false);
              setIsStandaloneAppMode(false);
              navigateTo('/community');
            }}
            onSuccess={(profile, user) => {
              setCurrentUser(user);
              setBuilderProfile(profile);
              navigateTo('/community');
            }}
          />
          <OfflineIndicator />
        </div>
      );
    }
  }

  // ROUTE 1: ADMIN STUDENT VERIFICATION DASHBOARD (/admin/student-access)
  if (cleanPathname.startsWith('/admin/student-access')) {
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
    if (isAuthChecking) {
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
      return (
        <>
          <CommunityHub
            currentUser={currentUser}
            builderProfile={builderProfile}
            initialChannelId={hubChannelId}
            isStandaloneApp={false}
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

  // ROUTE 4 (DEFAULT APP ENTRY): PUBLIC COMMUNITY DISCOVERY MAIN PAGE (`/`, `/community`, `/community/*`, `/login`)
  if (
    cleanPathname === '/' ||
    cleanPathname.startsWith('/community') ||
    cleanPathname === '/login'
  ) {
    let initialTab: PublicCommunityTab = 'all';
    let initialPostId: string | null = null;

    const searchParams = new URLSearchParams(queryString);
    const tabParam = searchParams.get('tab');

    if (cleanPathname.startsWith('/community/creations')) {
      initialTab = 'creations';
    } else if (cleanPathname.startsWith('/community/updates')) {
      initialTab = 'updates';
    } else if (cleanPathname.startsWith('/community/challenges')) {
      initialTab = 'challenges';
    } else if (cleanPathname.startsWith('/community/posts/')) {
      initialPostId = cleanPathname.replace('/community/posts/', '').split('/')[0] || null;
    } else if (tabParam === 'saved') {
      initialTab = 'saved';
    } else if (tabParam === 'my-posts') {
      initialTab = 'my-posts';
    } else if (tabParam === 'challenges') {
      initialTab = 'challenges';
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
