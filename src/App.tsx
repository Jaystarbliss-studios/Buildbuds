/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  ensureBuilderProfile,
  BuilderProfile,
  User,
} from './firebase.ts';

// Data
import { SAMPLE_PROJECTS, SAMPLE_DISCUSSIONS } from './data/mockData.ts';
import { ProjectItem, DiscussionPost, ChallengeItem } from './types/index.ts';

function BuildBudsApp() {
  const { isDark } = useTheme();
  const [projects, setProjects] = useState<ProjectItem[]>(SAMPLE_PROJECTS);
  const [discussions, setDiscussions] = useState<DiscussionPost[]>(SAMPLE_DISCUSSIONS);

  // Full-screen Discord-style Community Hub state
  const [isCommunityHubOpen, setIsCommunityHubOpen] = useState(false);
  const [hubChannelId, setHubChannelId] = useState<string>('general-chat');

  // Firebase Auth user & Builder Profile
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [builderProfile, setBuilderProfile] = useState<BuilderProfile | null>(null);

  // Modal states
  const [activeProjectModal, setActiveProjectModal] = useState<ProjectItem | null>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinModalMode, setJoinModalMode] = useState<'join' | 'signin'>('join');
  const [isNewDiscussionOpen, setIsNewDiscussionOpen] = useState(false);
  const [activeChallengeModal, setActiveChallengeModal] = useState<ChallengeItem | null>(null);
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);
  const [isShareProjectOpen, setIsShareProjectOpen] = useState(false);

  // Listen to Firebase Auth state for automatic session persistence
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profile = await ensureBuilderProfile(user);
          setBuilderProfile(profile);
        } catch (err) {
          console.error('Failed to load builder profile:', err);
        }
      } else {
        setBuilderProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Unified handler: if signed in, go straight into Community Chat; otherwise prompt Sign In / Join and then go straight into Community Chat
  const handleEnterCommunity = (mode: 'join' | 'signin' = 'join', channelId = 'general-chat') => {
    setHubChannelId(channelId);
    if (currentUser) {
      setIsCommunityHubOpen(true);
    } else {
      setJoinModalMode(mode);
      setIsJoinModalOpen(true);
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

      {/* Full-Screen Discord-Style Community Hub View */}
      {isCommunityHubOpen && (
        <CommunityHub
          currentUser={currentUser}
          builderProfile={builderProfile}
          initialChannelId={hubChannelId}
          onBackToLanding={() => setIsCommunityHubOpen(false)}
          onOpenAuthModal={(mode) => {
            setJoinModalMode(mode);
            setIsJoinModalOpen(true);
          }}
          onProfileUpdated={(profile) => setBuilderProfile(profile)}
        />
      )}

      {/* 1. Header with Day/Night Mode Switcher, Sign In & Join Build Buds CTA */}
      <SiteHeader
        builderProfile={builderProfile}
        onJoinClick={() => handleEnterCommunity('join', 'general-chat')}
        onSignInClick={() => handleEnterCommunity('signin', 'general-chat')}
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
        onClose={() => setIsJoinModalOpen(false)}
        onSuccess={(profile) => {
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
