/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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

export default function App() {
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
    <div className="min-h-screen bg-[#06060c] text-white flex flex-col font-sans selection:bg-[#FFF025] selection:text-black relative">
      {/* Sticky/Fixed Space Backdrop with stars and cosmic brand nebula */}
      <SpaceBackdrop />

      {/* Fairy dust / cosmic sparkle mouse trail */}
      <SparkleCursor />

      {/* 1. Refined Responsive Navigation Header */}
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
        {/* 2. Hero Section: Asymmetrical, Chewy Headline, Playable Canvas Mini-Sandbox */}
        <HeroSection
          onJoinClick={() => setIsJoinModalOpen(true)}
          onExploreClick={scrollToExplore}
          onOpenProject={handleOpenProjectById}
        />

        {/* 3. Project Showcase: "Look what we’re building." with category filters & view actions */}
        <ProjectShowcase
          projects={projects}
          onSelectProject={(project) => setActiveProjectModal(project)}
          onSubmitProjectClick={() => setIsShareProjectOpen(true)}
        />

        {/* 4. Community Preview: "Making things is better together." with discussions, reactions, and reply flow */}
        <CommunityPreview
          initialDiscussions={discussions}
          onNewDiscussionClick={() => setIsNewDiscussionOpen(true)}
          onJoinClick={() => setIsJoinModalOpen(true)}
        />

        {/* 5. Project Publishing Section: "Your work deserves a home." */}
        <ProjectPublishingSection
          onPublishClick={() => setIsShareProjectOpen(true)}
        />

        {/* 6. How It Works: "Got an idea? Let’s build on it." (4-step visual flow) */}
        <HowItWorks
          onJoinClick={() => setIsJoinModalOpen(true)}
        />

        {/* 7. Builder Community: "Your people are building here." */}
        <BuilderCommunity
          onJoinClick={() => setIsJoinModalOpen(true)}
        />

        {/* 8. Challenges & Creative Missions: "What will you build next?" */}
        <ChallengeSection
          onJoinChallengeClick={(challenge) => setActiveChallengeModal(challenge)}
        />

        {/* 9. Community Values & Trust: "Build boldly. Be kind. Help each other grow." */}
        <CommunityValues />

        {/* 10. Homepage FAQ: 6 Questions Accordion */}
        <FAQSection
          onJoinClick={() => setIsJoinModalOpen(true)}
        />

        {/* 11. Final Call To Action: "You bring the idea. We'll build the community." */}
        <FinalCTA
          onJoinClick={() => setIsJoinModalOpen(true)}
          onExploreClick={scrollToExplore}
        />
      </main>

      {/* 12. Site Footer with JW Studios / Jaystarbliss Studios ownership credit */}
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
