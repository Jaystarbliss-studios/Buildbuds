/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ThemeProvider, useTheme } from './utils/themeContext.tsx';
import { SpaceBackdrop } from './components/SpaceBackdrop.tsx';
import { SparkleCursor } from './components/SparkleCursor.tsx';
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

// Interactive Modals
import { ProjectDetailModal } from './components/ProjectDetailModal.tsx';
import { JoinModal } from './components/JoinModal.tsx';
import { NewDiscussionModal } from './components/NewDiscussionModal.tsx';
import { ChallengeJoinModal } from './components/ChallengeJoinModal.tsx';
import { GuidelinesModal } from './components/GuidelinesModal.tsx';
import { ShareProjectModal } from './components/ShareProjectModal.tsx';

// Firebase Auth & Profile
import {
  auth,
  onAuthStateChanged,
  signOut,
  checkExistingBuilderProfile,
  BuilderProfile,
  User,
} from './firebase.ts';

import { OfflineIndicator } from './components/PWAInstallButton.tsx';
import {
  detectStandaloneAppLaunch,
  setStandaloneAppSession,
} from './utils/usePWAInstall.ts';

// Data
import { SAMPLE_PROJECTS, SAMPLE_DISCUSSIONS } from './data/mockData.ts';
import { ProjectItem, DiscussionPost, ChallengeItem } from './types/index.ts';

const HUB_OPEN_STORAGE_KEY = 'buildbuds_hub_open';

function BuildBudsApp() {
  const { isDark } = useTheme();
  const [projects, setProjects] = useState<ProjectItem[]>(SAMPLE_PROJECTS);
  const [discussions, setDiscussions] = useState<DiscussionPost[]>(SAMPLE_DISCUSSIONS);

  // Detect whether the app was launched as a downloaded/installed Web App (PWA standalone mode)
  const [isStandaloneAppMode, setIsStandaloneAppMode] = useState<boolean>(() =>
    detectStandaloneAppLaunch()
  );
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // Full-screen Discord-style Community Hub state
  const [isCommunityHubOpen, setIsCommunityHubOpen] = useState<boolean>(() => {
    if (detectStandaloneAppLaunch()) return true;
    try {
      return localStorage.getItem(HUB_OPEN_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [hubChannelId, setHubChannelId] = useState<string>('general-chat');

  // Firebase Auth user & Builder Profile (only set if user is registered in the database)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [builderProfile, setBuilderProfile] = useState<BuilderProfile | null>(null);
  const isAuthModalBusyRef = useRef(false);

  // Modal states
  const [activeProjectModal, setActiveProjectModal] = useState<ProjectItem | null>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinModalMode, setJoinModalMode] = useState<'join' | 'signin'>('join');
  const [isNewDiscussionOpen, setIsNewDiscussionOpen] = useState(false);
  const [activeChallengeModal, setActiveChallengeModal] = useState<ChallengeItem | null>(null);
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);
  const [isShareProjectOpen, setIsShareProjectOpen] = useState(false);

  // Listen for PWA installation or display-mode changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleStandaloneChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsStandaloneAppMode(true);
        setIsCommunityHubOpen(true);
      }
    };
    const handleAppInstalled = () => {
      setIsStandaloneAppMode(true);
      setIsCommunityHubOpen(true);
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

  // Listen to Firebase Auth state — only recognize users who have signed up in the database.
  // When signed in already, automatically sign the user directly into their account!
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (isAuthModalBusyRef.current) {
        return;
      }

      if (user) {
        try {
          const existingProfile = await checkExistingBuilderProfile(user);
          if (existingProfile) {
            setCurrentUser(user);
            setBuilderProfile(existingProfile);
            // If running as the downloaded web app OR user previously had the hub open, sign in directly to hub
            if (
              detectStandaloneAppLaunch() ||
              localStorage.getItem(HUB_OPEN_STORAGE_KEY) !== '0'
            ) {
              setIsCommunityHubOpen(true);
            }
          } else {
            // Unregistered Gmail / Auth user — sign out immediately so they are not recognized
            await signOut(auth);
            setCurrentUser(null);
            setBuilderProfile(null);
            setIsCommunityHubOpen(false);
          }
        } catch (err) {
          console.error('Failed to verify builder profile:', err);
          setCurrentUser(null);
          setBuilderProfile(null);
          setIsCommunityHubOpen(false);
        } finally {
          setIsAuthChecking(false);
        }
      } else {
        setCurrentUser(null);
        setBuilderProfile(null);
        setIsCommunityHubOpen(false);
        setIsAuthChecking(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Unified handler: ONLY enter Community Hub if signed in AND signed up in the database
  const handleEnterCommunity = (mode: 'join' | 'signin' = 'join', channelId = 'general-chat') => {
    setHubChannelId(channelId);
    if (currentUser && builderProfile) {
      try {
        localStorage.setItem(HUB_OPEN_STORAGE_KEY, '1');
      } catch {
        // Ignore
      }
      setIsCommunityHubOpen(true);
    } else {
      setJoinModalMode(mode);
      setIsJoinModalOpen(true);
    }
  };

  // Switch into standalone Web App mode (starts from dedicated Sign-In/Sign-Up or goes straight to Hub if signed in)
  const handleLaunchStandaloneApp = () => {
    setStandaloneAppSession(true);
    setIsStandaloneAppMode(true);
    if (currentUser && builderProfile) {
      try {
        localStorage.setItem(HUB_OPEN_STORAGE_KEY, '1');
      } catch {
        // Ignore
      }
      setIsCommunityHubOpen(true);
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

  const scrollToExplore = () => {
    const el = document.getElementById('discover');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // STANDALONE DOWNLOADED WEB APP FLOW:
  // 1) Never starts from the main marketing website.
  // 2) If already signed in -> opens CommunityHub directly into the user's account.
  // 3) If first-time downloader / not signed in -> shows dedicated full-screen Sign-In / Sign-Up page.
  if (isStandaloneAppMode) {
    if (isAuthChecking) {
      return (
        <div className="fixed inset-0 bg-[#06060c] text-white flex flex-col items-center justify-center p-6 select-none">
          <img
            src="/pwa-192x192.png"
            alt="Build Buds App"
            className="w-16 h-16 rounded-3xl border-2 border-[#FFF025] object-cover shadow-2xl mb-4 animate-pulse"
          />
          <div className="font-chewy text-2xl text-[#FFF025] tracking-wide">Build Buds</div>
          <div className="text-xs font-mono text-white/60 mt-1">
            Signing you in to your account...
          </div>
          <OfflineIndicator />
        </div>
      );
    }

    if (currentUser && builderProfile) {
      return (
        <>
          <CommunityHub
            currentUser={currentUser}
            builderProfile={builderProfile}
            initialChannelId={hubChannelId}
            isStandaloneApp={true}
            onBackToLanding={() => {
              setStandaloneAppSession(false);
              setIsStandaloneAppMode(false);
              try {
                localStorage.setItem(HUB_OPEN_STORAGE_KEY, '0');
              } catch {
                // Ignore
              }
              setIsCommunityHubOpen(false);
            }}
            onOpenAuthModal={(mode) => {
              setJoinModalMode(mode);
              setIsJoinModalOpen(true);
            }}
            onProfileUpdated={(profile) => setBuilderProfile(profile)}
          />
          <OfflineIndicator />
        </>
      );
    }

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
          }}
          onAuthBusyChange={(busy) => {
            isAuthModalBusyRef.current = busy;
          }}
          onClose={() => {}}
          onSuccess={(profile, user) => {
            try {
              localStorage.setItem(HUB_OPEN_STORAGE_KEY, '1');
            } catch {
              // Ignore
            }
            setCurrentUser(user);
            setBuilderProfile(profile);
            setIsCommunityHubOpen(true);
          }}
        />
        <OfflineIndicator />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col font-sans selection:bg-[#FFF025] selection:text-black relative transition-colors duration-300 ${
        isDark ? 'bg-[#06060c] text-white' : 'bg-white text-slate-900'
      }`}
    >
      {/* Sticky/Fixed Space Backdrop with stars and cosmic brand nebula in dark mode, soft crisp backdrop in light mode */}
      <SpaceBackdrop />

      {/* Fairy dust / cosmic sparkle mouse trail */}
      <SparkleCursor />

      {/* Offline status toast for PWA */}
      <OfflineIndicator />

      {/* Full-Screen Discord-Style Community Hub View — strictly gated to registered database users */}
      {isCommunityHubOpen && currentUser && builderProfile && (
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
            setIsCommunityHubOpen(false);
          }}
          onOpenAuthModal={(mode) => {
            setJoinModalMode(mode);
            setIsJoinModalOpen(true);
          }}
          onProfileUpdated={(profile) => setBuilderProfile(profile)}
        />
      )}

      {/* 1. Header with Download App, Day/Night Mode Switcher, Sign In & Join Build Buds CTA */}
      <SiteHeader
        builderProfile={builderProfile}
        onJoinClick={() => handleEnterCommunity('join', 'general-chat')}
        onSignInClick={() => handleEnterCommunity('signin', 'general-chat')}
        onLaunchAppMode={handleLaunchStandaloneApp}
      />

      {/* Main Page Body */}
      <main className="flex-1">
        {/* 2. Hero Section: Young creator lady with laptop mockup visual, beautiful build buds backdrop */}
        <HeroSection
          onJoinClick={() => handleEnterCommunity('join', 'general-chat')}
          onExploreClick={scrollToExplore}
          onOpenProject={handleOpenProjectById}
        />

        {/* 3. Project Showcase: "Look what we’re building." with mockup cards & extracted screenshots */}
        <ProjectShowcase
          projects={projects}
          onSelectProject={(project) => setActiveProjectModal(project)}
          onSubmitProjectClick={() => handleEnterCommunity('join', 'games')}
        />

        {/* 4. Community Preview: "Making things is better together." with collaboration photo banner */}
        <CommunityPreview
          initialDiscussions={discussions}
          onNewDiscussionClick={() => handleEnterCommunity('join', 'general-chat')}
          onJoinClick={() => handleEnterCommunity('join', 'general-chat')}
        />

        {/* 5. Project Publishing Section: "Your work deserves a home." with Forest Quest card */}
        <ProjectPublishingSection
          onPublishClick={() => handleEnterCommunity('join', 'games')}
        />

        {/* 6. How It Works: "Got an idea? Let’s build on it." (4 numbered circular steps) */}
        <HowItWorks
          onJoinClick={() => handleEnterCommunity('join', 'general-chat')}
        />

        {/* 7. Builder Community: "Your people are building here." with group banner & interest pills */}
        <BuilderCommunity
          onJoinClick={() => handleEnterCommunity('join', 'general-chat')}
        />

        {/* 8. Challenges & Creative Missions: "What will you build next?" with 3 challenge cards */}
        <ChallengeSection
          onJoinChallengeClick={(challenge) => setActiveChallengeModal(challenge)}
        />

        {/* 9. Community Values & Trust: "Build boldly. Be kind. Help each other grow." */}
        <CommunityValues />

        {/* 10. Homepage FAQ: Questions Accordion */}
        <FAQSection
          onJoinClick={() => handleEnterCommunity('join', 'general-chat')}
        />

        {/* 11. Final Call To Action: "You bring the idea. We'll build the community." */}
        <FinalCTA
          onJoinClick={() => handleEnterCommunity('join', 'general-chat')}
          onExploreClick={scrollToExplore}
        />
      </main>

      {/* 12. Site Footer with Jaystarbliss Studios ownership credit */}
      <SiteFooter
        onJoinClick={() => handleEnterCommunity('join', 'general-chat')}
        onOpenGuidelines={() => setIsGuidelinesOpen(true)}
      />

      {/* Interactive Modals */}
      <ProjectDetailModal
        project={activeProjectModal}
        onClose={() => setActiveProjectModal(null)}
      />

      <JoinModal
        key={joinModalMode}
        isOpen={isJoinModalOpen}
        initialMode={joinModalMode}
        onAuthBusyChange={(busy) => {
          isAuthModalBusyRef.current = busy;
        }}
        onClose={() => {
          setIsJoinModalOpen(false);
          if (!builderProfile && auth.currentUser) {
            signOut(auth).catch(() => {});
          }
        }}
        onSuccess={(profile, user) => {
          try {
            localStorage.setItem(HUB_OPEN_STORAGE_KEY, '1');
          } catch {
            // Ignore
          }
          setCurrentUser(user);
          setBuilderProfile(profile);
          setIsJoinModalOpen(false);
          setIsCommunityHubOpen(true);
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
