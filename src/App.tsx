/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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

// Interactive Modals
import { ProjectDetailModal } from './components/ProjectDetailModal.tsx';
import { JoinModal } from './components/JoinModal.tsx';
import { NewDiscussionModal } from './components/NewDiscussionModal.tsx';
import { ChallengeJoinModal } from './components/ChallengeJoinModal.tsx';
import { GuidelinesModal } from './components/GuidelinesModal.tsx';
import { ShareProjectModal } from './components/ShareProjectModal.tsx';

// Data
import { SAMPLE_PROJECTS, SAMPLE_DISCUSSIONS } from './data/mockData.ts';
import { ProjectItem, DiscussionPost, ChallengeItem } from './types/index.ts';

function BuildBudsApp() {
  const { isDark } = useTheme();
  const [projects, setProjects] = useState<ProjectItem[]>(SAMPLE_PROJECTS);
  const [discussions, setDiscussions] = useState<DiscussionPost[]>(SAMPLE_DISCUSSIONS);
  
  // Modal states
  const [activeProjectModal, setActiveProjectModal] = useState<ProjectItem | null>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinModalMode, setJoinModalMode] = useState<'join' | 'signin'>('join');
  const [isNewDiscussionOpen, setIsNewDiscussionOpen] = useState(false);
  const [activeChallengeModal, setActiveChallengeModal] = useState<ChallengeItem | null>(null);
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);
  const [isShareProjectOpen, setIsShareProjectOpen] = useState(false);

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

      {/* 1. Header with Day/Night Mode Switcher & Responsive Navigation */}
      <SiteHeader
        onJoinClick={() => {
          setJoinModalMode('join');
          setIsJoinModalOpen(true);
        }}
        onSignInClick={() => {
          setJoinModalMode('signin');
          setIsJoinModalOpen(true);
        }}
      />

      {/* Main Page Body */}
      <main className="flex-1">
        {/* 2. Hero Section: Young creator lady with laptop mockup visual, beautiful build buds backdrop */}
        <HeroSection
          onJoinClick={() => setIsJoinModalOpen(true)}
          onExploreClick={scrollToExplore}
          onOpenProject={handleOpenProjectById}
        />

        {/* 3. Project Showcase: "Look what we’re building." with mockup cards & extracted screenshots */}
        <ProjectShowcase
          projects={projects}
          onSelectProject={(project) => setActiveProjectModal(project)}
          onSubmitProjectClick={() => setIsShareProjectOpen(true)}
        />

        {/* 4. Community Preview: "Making things is better together." with collaboration photo banner */}
        <CommunityPreview
          initialDiscussions={discussions}
          onNewDiscussionClick={() => setIsNewDiscussionOpen(true)}
          onJoinClick={() => setIsJoinModalOpen(true)}
        />

        {/* 5. Project Publishing Section: "Your work deserves a home." with Forest Quest card */}
        <ProjectPublishingSection
          onPublishClick={() => setIsShareProjectOpen(true)}
        />

        {/* 6. How It Works: "Got an idea? Let’s build on it." (4 numbered circular steps) */}
        <HowItWorks
          onJoinClick={() => setIsJoinModalOpen(true)}
        />

        {/* 7. Builder Community: "Your people are building here." with group banner & interest pills */}
        <BuilderCommunity
          onJoinClick={() => setIsJoinModalOpen(true)}
        />

        {/* 8. Challenges & Creative Missions: "What will you build next?" with 3 challenge cards */}
        <ChallengeSection
          onJoinChallengeClick={(challenge) => setActiveChallengeModal(challenge)}
        />

        {/* 9. Community Values & Trust: "Build boldly. Be kind. Help each other grow." */}
        <CommunityValues />

        {/* 10. Homepage FAQ: Questions Accordion */}
        <FAQSection
          onJoinClick={() => setIsJoinModalOpen(true)}
        />

        {/* 11. Final Call To Action: "You bring the idea. We'll build the community." */}
        <FinalCTA
          onJoinClick={() => setIsJoinModalOpen(true)}
          onExploreClick={scrollToExplore}
        />
      </main>

      {/* 12. Site Footer with Jaystarbliss Studios ownership credit */}
      <SiteFooter
        onJoinClick={() => setIsJoinModalOpen(true)}
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
        onSuccess={() => {}}
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
