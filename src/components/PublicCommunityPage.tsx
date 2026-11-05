import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Plus,
  FolderGit2,
  MessageSquare,
  Bookmark,
  ExternalLink,
  Globe,
  Gamepad2,
  Code2,
  ArrowRight,
  ShieldCheck,
  Bell,
  Flame,
  TrendingUp,
  Layers,
  Menu,
  X,
  ChevronDown,
  Trophy,
  Calendar,
  Sparkles,
  BookOpen,
  Check,
  Filter,
  Pencil,
  Trash2,
  Archive,
  Send,
  FileText,
  Sun,
  Moon,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo.tsx';
import { UserAccountMenu } from './UserAccountMenu.tsx';
import { useTheme } from '../utils/themeContext.tsx';
import {
  db,
  doc,
  setDoc,
  updateDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  BuilderProfile,
  User,
  isSuperAdminUser,
} from '../firebase.ts';
import {
  PublicPost,
  PublicCategory,
  PublicReactionType,
  PublicReactionDoc,
  PublicCommunityConfig,
  StudentAccessStatus,
  UserNotificationItem,
  ShowcaseSubmission,
  CommunityChallenge,
  ChallengeLifecycleStatus,
  ChallengePublishStatus,
  ChallengeSkillLevel,
  ChallengeResourceLink,
  DEFAULT_PUBLIC_CATEGORIES,
  PUBLIC_REACTION_OPTIONS,
  CHALLENGE_CATEGORY_OPTIONS,
  CHALLENGE_LEARNER_GROUPS,
} from '../types/community.ts';
import { INITIAL_PUBLIC_COMMUNITY_POSTS } from '../data/publicCommunitySeeds.ts';
import {
  getCloudinaryResponsiveUrl,
  togglePublicPostReaction,
  toggleBookmarkPublicPost,
  seedDefaultCategoriesIfNeeded,
  updatePublicCommunityConfig,
  subscribeToShowcaseSubmissions,
  adminCurateShowcaseSubmission,
  canUserPublishPublicContent,
  doesPostMatchCategoryFilter,
  subscribeToCommunityChallenges,
  saveCommunityChallenge,
  updateCommunityChallengeStatus,
  deleteCommunityChallenge,
} from '../utils/communityService.ts';
import { resolveBuilderAvatarUrl } from '../utils/avatars.ts';
import { PublicPostComposer } from './PublicPostComposer.tsx';
import { PublicPostDetailModal } from './PublicPostDetailModal.tsx';
import {
  VerifiedAvatarFrame,
  AnimatedEmoteButton,
  useMentionableUsers,
} from './MentionAndEmotes.tsx';

export type PublicCommunityTab =
  | 'all'
  | 'creations'
  | 'updates'
  | 'challenges'
  | 'saved'
  | 'my-posts';

interface PublicCommunityPageProps {
  currentUser: User | null;
  builderProfile: BuilderProfile | null;
  studentAccessStatus: StudentAccessStatus;
  isApprovedForHub: boolean;
  isAuthChecking?: boolean;
  initialTab?: PublicCommunityTab;
  initialPostId?: string | null;
  onNavigate: (path: string) => void;
  onRequireAuth: (
    actionDescription: string,
    onAfterAuth?: () => void,
    mode?: 'signin' | 'join'
  ) => void;
  onSignOut: () => void;
  onProfileUpdated: (updated: BuilderProfile) => void;
}

export const PublicCommunityPage: React.FC<PublicCommunityPageProps> = ({
  currentUser,
  builderProfile,
  studentAccessStatus,
  isApprovedForHub,
  isAuthChecking = false,
  initialTab = 'all',
  initialPostId = null,
  onNavigate,
  onRequireAuth,
  onSignOut,
  onProfileUpdated,
}) => {
  const { isDark, toggleTheme } = useTheme();

  const [firestorePosts, setFirestorePosts] = useState<PublicPost[]>([]);
  const [categories, setCategories] = useState<PublicCategory[]>(DEFAULT_PUBLIC_CATEGORIES);
  const [publicConfig, setPublicConfig] = useState<PublicCommunityConfig>({
    requireReviewForNewPosts: false,
    featuredBannerHeadline: 'Discover What Young Minds Are Building',
    featuredBannerSubtext:
      'Explore games, websites, creative experiments, and tutorials shared by young builders across schools.',
    updatedBy: '',
    updatedAt: '',
  });

  const [activeTab, setActiveTab] = useState<PublicCommunityTab>(initialTab);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null);

  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'featured'>('latest');
  const [searchQuery, setSearchQuery] = useState('');

  const [userReactionsMap, setUserReactionsMap] = useState<Record<string, PublicReactionType[]>>(
    {}
  );
  const [notifications, setNotifications] = useState<UserNotificationItem[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<PublicPost | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(initialPostId);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // Challenges state (real Firestore collection `communityChallenges`)
  const [challenges, setChallenges] = useState<CommunityChallenge[]>([]);
  const [challengeCategoryFilter, setChallengeCategoryFilter] = useState<string>('all');
  const [challengeGroupFilter, setChallengeGroupFilter] = useState<string>('all');
  const [challengeStatusFilter, setChallengeStatusFilter] = useState<
    'all' | ChallengeLifecycleStatus
  >('all');
  const [selectedChallenge, setSelectedChallenge] = useState<CommunityChallenge | null>(null);

  // Admin Challenge Composer / Manager Modal state
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<CommunityChallenge | null>(null);
  const [chalTitle, setChalTitle] = useState('');
  const [chalSummary, setChalSummary] = useState('');
  const [chalDescription, setChalDescription] = useState('');
  const [chalCategoryId, setChalCategoryId] = useState<string>(
    CHALLENGE_CATEGORY_OPTIONS[0].id
  );
  const [chalLearnerGroup, setChalLearnerGroup] = useState<string>(CHALLENGE_LEARNER_GROUPS[0]);
  const [chalSkillLevel, setChalSkillLevel] = useState<ChallengeSkillLevel>('All Levels');
  const [chalProgramme, setChalProgramme] = useState('');
  const [chalInstructions, setChalInstructions] = useState('');
  const [chalStartDate, setChalStartDate] = useState('');
  const [chalDeadline, setChalDeadline] = useState('');
  const [chalLifecycleStatus, setChalLifecycleStatus] =
    useState<ChallengeLifecycleStatus>('active');
  const [chalResources, setChalResources] = useState<ChallengeResourceLink[]>([]);
  const [newResourceLabel, setNewResourceLabel] = useState('');
  const [newResourceUrl, setNewResourceUrl] = useState('');
  const [challengeFormError, setChallengeFormError] = useState<string | null>(null);
  const [isSavingChallenge, setIsSavingChallenge] = useState(false);

  // Admin Category & Public Settings Manager Modal
  const [isAdminCategoryModalOpen, setIsAdminCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('✨');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Admin Showcase Curation Modal state
  const [isAdminCurationModalOpen, setIsAdminCurationModalOpen] = useState(false);
  const [showcaseSubmissions, setShowcaseSubmissions] = useState<ShowcaseSubmission[]>([]);
  const [curatingSubmission, setCuratingSubmission] = useState<ShowcaseSubmission | null>(null);
  const [curateTitle, setCurateTitle] = useState('');
  const [curateSummary, setCurateSummary] = useState('');
  const [curateCategory, setCurateCategory] = useState('project-showcases');
  const [isSubmittingCuration, setIsSubmittingCuration] = useState(false);

  const isAdmin = isSuperAdminUser(currentUser, builderProfile);
  const directoryUsers = useMentionableUsers();
  const verifiedUserIds = useMemo(() => {
    const s = new Set<string>();
    directoryUsers.forEach((u) => {
      if (u.isVerifiedStudent || u.role === 'admin' || u.role === 'moderator') {
        s.add(u.uid);
      }
    });
    return s;
  }, [directoryUsers]);
  const canPublish = canUserPublishPublicContent({
    isAuthenticated: Boolean(currentUser),
    isApprovedForHub,
    isAdmin,
    publishingDisabled: Boolean((builderProfile as any)?.publishingDisabled),
  });
  const bookmarkedIds = builderProfile?.bookmarkedPostIds || [];

  // Close category dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(e.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Subscribe to showcase submissions for administrators
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = subscribeToShowcaseSubmissions((subs) => {
      setShowcaseSubmissions(subs);
    });
    return () => unsub();
  }, [isAdmin]);

  // Subscribe to communityChallenges
  useEffect(() => {
    const unsub = subscribeToCommunityChallenges((list) => {
      setChallenges(list);
    }, isAdmin);
    return () => unsub();
  }, [isAdmin]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setSelectedPostId(initialPostId);
  }, [initialPostId]);

  // Subscribe to publicPosts, publicCategories, and public_config
  useEffect(() => {
    seedDefaultCategoriesIfNeeded();

    const postsQuery = query(collection(db, 'publicPosts'), orderBy('createdAt', 'desc'));
    const unsubPosts = onSnapshot(
      postsQuery,
      (snap) => {
        const list: PublicPost[] = [];
        snap.forEach((docSnap) => {
          list.push({ ...(docSnap.data() as PublicPost), id: docSnap.id });
        });
        setFirestorePosts(list);
      },
      () => {
        // Fallback to seed posts if unauthenticated query encounters transient network error
      }
    );

    const unsubCats = onSnapshot(
      collection(db, 'publicCategories'),
      (snap) => {
        if (snap.empty) {
          setCategories(DEFAULT_PUBLIC_CATEGORIES);
          return;
        }
        const list: PublicCategory[] = [];
        snap.forEach((docSnap) => {
          list.push({ ...(docSnap.data() as PublicCategory), id: docSnap.id });
        });
        list.sort((a, b) => (a.order || 99) - (b.order || 99));
        setCategories(list);
      },
      () => {
        setCategories(DEFAULT_PUBLIC_CATEGORIES);
      }
    );

    const unsubConfig = onSnapshot(
      doc(db, 'community_settings', 'public_config'),
      (snap) => {
        if (snap.exists()) {
          setPublicConfig((prev) => ({
            ...prev,
            ...(snap.data() as Partial<PublicCommunityConfig>),
          }));
        }
      },
      () => {}
    );

    return () => {
      unsubPosts();
      unsubCats();
      unsubConfig();
    };
  }, []);

  // Subscribe to signed-in user's notifications
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }
    const q = query(
      collection(db, 'userNotifications', currentUser.uid, 'items'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: UserNotificationItem[] = [];
        snap.forEach((d) => items.push({ ...(d.data() as UserNotificationItem), id: d.id }));
        setNotifications(items);
      },
      () => {}
    );
    return () => unsub();
  }, [currentUser?.uid]);

  // Merge Firestore posts with initial seed posts
  const allMergedPosts = useMemo(() => {
    const map = new Map<string, PublicPost>();
    for (const p of firestorePosts) {
      map.set(p.id, p);
    }
    for (const seed of INITIAL_PUBLIC_COMMUNITY_POSTS) {
      if (!map.has(seed.id)) {
        map.set(seed.id, seed);
      }
    }
    return Array.from(map.values());
  }, [firestorePosts]);

  // Subscribe to current user's reactions for visible posts
  useEffect(() => {
    if (!currentUser || allMergedPosts.length === 0) {
      setUserReactionsMap({});
      return;
    }

    const unsubs = allMergedPosts.slice(0, 30).map((post) =>
      onSnapshot(
        doc(db, 'publicPosts', post.id, 'reactions', currentUser.uid),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as PublicReactionDoc;
            setUserReactionsMap((prev) => ({
              ...prev,
              [post.id]: data.types || [],
            }));
          } else {
            setUserReactionsMap((prev) => ({
              ...prev,
              [post.id]: [],
            }));
          }
        },
        () => {}
      )
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [currentUser?.uid, allMergedPosts.length]);

  const visiblePosts = useMemo(() => {
    return allMergedPosts.filter((post) => {
      const isMyPost = Boolean(currentUser && post.authorId === currentUser.uid);
      if (post.status !== 'published') {
        if (!isMyPost && !isAdmin) return false;
        if (post.status === 'removed' && !isAdmin) return false;
      }

      // If the user explicitly selected a category in the Category Filter Dropdown,
      // match directly against that category across all posts so no category ever falsely returns empty
      if (selectedCategoryId !== 'all') {
        if (!doesPostMatchCategoryFilter(post, selectedCategoryId)) {
          return false;
        }
      } else {
        if (activeTab === 'creations') {
          const creationCats = [
            'games',
            'websites',
            'project-showcases',
            'creative-experiments',
          ];
          if (
            !creationCats.some((c) => doesPostMatchCategoryFilter(post, c))
          ) {
            return false;
          }
        } else if (activeTab === 'updates') {
          const updateCats = [
            'announcements',
            'tutorials-learning',
            'technology-discoveries',
            'community-questions',
          ];
          if (
            !updateCats.some((c) => doesPostMatchCategoryFilter(post, c))
          ) {
            return false;
          }
        }
      }

      if (activeTab === 'saved') {
        if (!bookmarkedIds.includes(post.id)) return false;
      } else if (activeTab === 'my-posts') {
        if (!isMyPost) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const hay = [
          post.title,
          post.summary,
          post.body,
          post.categoryName,
          post.authorName,
          ...(post.tags || []),
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [
    allMergedPosts,
    currentUser,
    isAdmin,
    activeTab,
    selectedCategoryId,
    searchQuery,
    bookmarkedIds,
  ]);

  const sortedPosts = useMemo(() => {
    const copy = [...visiblePosts];
    if (sortBy === 'popular') {
      copy.sort(
        (a, b) =>
          (b.totalReactions || 0) * 2 +
          (b.commentCount || 0) * 3 -
          ((a.totalReactions || 0) * 2 + (a.commentCount || 0) * 3)
      );
    } else if (sortBy === 'featured') {
      copy.sort((a, b) => {
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } else {
      copy.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    return copy;
  }, [visiblePosts, sortBy]);

  // Filtered Challenges for the dedicated Challenges View
  const filteredChallenges = useMemo(() => {
    return challenges.filter((c) => {
      if (!isAdmin && c.publishStatus !== 'published') return false;
      if (
        challengeCategoryFilter !== 'all' &&
        c.categoryId !== challengeCategoryFilter &&
        c.category !== challengeCategoryFilter
      ) {
        return false;
      }
      if (
        challengeGroupFilter !== 'all' &&
        c.learnerGroup !== challengeGroupFilter &&
        c.skillLevel !== challengeGroupFilter
      ) {
        return false;
      }
      if (
        challengeStatusFilter !== 'all' &&
        c.challengeStatus !== challengeStatusFilter
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const hay = [
          c.title,
          c.summary,
          c.description,
          c.category,
          c.learnerGroup,
          c.programme || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    challenges,
    isAdmin,
    challengeCategoryFilter,
    challengeGroupFilter,
    challengeStatusFilter,
    searchQuery,
  ]);

  const featuredBannerPost = useMemo(() => {
    const published = allMergedPosts.filter((p) => p.status === 'published');
    if (publicConfig.featuredPostId) {
      const explicit = published.find((p) => p.id === publicConfig.featuredPostId);
      if (explicit) return explicit;
    }
    return published.find((p) => p.isFeatured) || published[0] || null;
  }, [allMergedPosts, publicConfig.featuredPostId]);

  const trendingTags = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of allMergedPosts) {
      if (p.status !== 'published') continue;
      for (const tag of p.tags || []) {
        counts[tag] = (counts[tag] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }));
  }, [allMergedPosts]);

  const selectedDetailPost = useMemo(() => {
    if (!selectedPostId) return null;
    return allMergedPosts.find((p) => p.id === selectedPostId) || null;
  }, [allMergedPosts, selectedPostId]);

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  const handleOpenPostDetail = (postId: string) => {
    setSelectedPostId(postId);
    window.history.pushState({}, '', `/community/posts/${postId}`);
  };

  const handleClosePostDetail = () => {
    setSelectedPostId(null);
    if (window.location.pathname.startsWith('/community/posts/')) {
      window.history.pushState({}, '', '/community');
    }
  };

  const handleCreatePostClick = () => {
    if (!canPublish) return;
    setEditingPost(null);
    setIsComposerOpen(true);
  };

  const handleQuickReact = async (postId: string, type: PublicReactionType) => {
    if (!currentUser || !builderProfile) {
      onRequireAuth('react to community posts');
      return;
    }
    try {
      await togglePublicPostReaction(postId, type);
    } catch {
      // Handled in UI
    }
  };

  const handleToggleBookmark = async (postId: string) => {
    if (!currentUser || !builderProfile) {
      onRequireAuth('save and bookmark posts');
      return;
    }
    const currentlyBookmarked = bookmarkedIds.includes(postId);
    const nextIds = currentlyBookmarked
      ? bookmarkedIds.filter((id) => id !== postId)
      : [...bookmarkedIds, postId];

    onProfileUpdated({
      ...builderProfile,
      bookmarkedPostIds: nextIds,
    });

    try {
      await toggleBookmarkPublicPost(currentUser.uid, postId, currentlyBookmarked);
    } catch {
      // Ignore
    }
  };

  const handleMarkNotificationRead = async (notif: UserNotificationItem) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'userNotifications', currentUser.uid, 'items', notif.id), {
        read: true,
      });
    } catch {
      // Ignore
    }
    if (notif.actionUrl) {
      setIsNotifOpen(false);
      onNavigate(notif.actionUrl);
    }
  };

  // Admin Challenge Composer helpers
  const openNewChallengeModal = () => {
    setEditingChallenge(null);
    setChalTitle('');
    setChalSummary('');
    setChalDescription('');
    setChalCategoryId(CHALLENGE_CATEGORY_OPTIONS[0].id);
    setChalLearnerGroup(CHALLENGE_LEARNER_GROUPS[0]);
    setChalSkillLevel('All Levels');
    setChalProgramme('');
    setChalInstructions('');
    setChalStartDate(new Date().toISOString().slice(0, 10));
    setChalDeadline('');
    setChalLifecycleStatus('active');
    setChalResources([]);
    setNewResourceLabel('');
    setNewResourceUrl('');
    setChallengeFormError(null);
    setIsChallengeModalOpen(true);
  };

  const openEditChallengeModal = (challenge: CommunityChallenge) => {
    setEditingChallenge(challenge);
    setChalTitle(challenge.title);
    setChalSummary(challenge.summary);
    setChalDescription(challenge.description);
    setChalCategoryId(challenge.categoryId || CHALLENGE_CATEGORY_OPTIONS[0].id);
    setChalLearnerGroup(challenge.learnerGroup || CHALLENGE_LEARNER_GROUPS[0]);
    setChalSkillLevel(challenge.skillLevel || 'All Levels');
    setChalProgramme(challenge.programme || '');
    setChalInstructions(challenge.instructions || '');
    setChalStartDate(challenge.startDate || '');
    setChalDeadline(challenge.deadline || '');
    setChalLifecycleStatus(challenge.challengeStatus || 'active');
    setChalResources(challenge.resources || []);
    setNewResourceLabel('');
    setNewResourceUrl('');
    setChallengeFormError(null);
    setIsChallengeModalOpen(true);
  };

  const handleAddChallengeResource = () => {
    if (!newResourceLabel.trim() || !newResourceUrl.trim()) return;
    setChalResources((prev) => [
      ...prev,
      { title: newResourceLabel.trim(), url: newResourceUrl.trim() },
    ]);
    setNewResourceLabel('');
    setNewResourceUrl('');
  };

  const handleSaveChallenge = async (publishStatus: ChallengePublishStatus) => {
    if (!isAdmin) return;
    setChallengeFormError(null);
    setIsSavingChallenge(true);
    try {
      const catOpt =
        CHALLENGE_CATEGORY_OPTIONS.find((c) => c.id === chalCategoryId) ||
        CHALLENGE_CATEGORY_OPTIONS[0];
      await saveCommunityChallenge({
        existingChallengeId: editingChallenge?.id,
        title: chalTitle,
        summary: chalSummary,
        description: chalDescription,
        category: catOpt.label,
        categoryId: catOpt.id,
        learnerGroup: chalLearnerGroup,
        skillLevel: chalSkillLevel,
        programme: chalProgramme,
        instructions: chalInstructions,
        resources: chalResources,
        startDate: chalStartDate,
        deadline: chalDeadline,
        challengeStatus: chalLifecycleStatus,
        publishStatus,
        accentColor: '#FFF025',
      });
      setIsChallengeModalOpen(false);
      setEditingChallenge(null);
    } catch (err) {
      setChallengeFormError(
        err instanceof Error ? err.message : 'Failed to save challenge.'
      );
    } finally {
      setIsSavingChallenge(false);
    }
  };

  const handleDeleteChallenge = async (challengeId: string) => {
    if (!isAdmin) return;
    try {
      await deleteCommunityChallenge(challengeId);
      if (selectedChallenge?.id === challengeId) {
        setSelectedChallenge(null);
      }
    } catch (err) {
      console.error('Failed to delete challenge:', err);
    }
  };

  const handleAdminAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !newCatName.trim()) return;
    const slug = newCatName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const catDoc: PublicCategory = {
      id: slug || `cat-${Date.now()}`,
      name: newCatName.trim(),
      slug: slug || `cat-${Date.now()}`,
      emoji: newCatEmoji.trim() || '✨',
      description: newCatDesc.trim() || `Community posts in ${newCatName.trim()}`,
      order: categories.length + 1,
      isActive: true,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'publicCategories', catDoc.id), catDoc);
    setNewCatName('');
    setNewCatDesc('');
  };

  const handleAdminToggleCategoryActive = async (cat: PublicCategory) => {
    if (!isAdmin) return;
    await setDoc(
      doc(db, 'publicCategories', cat.id),
      {
        ...cat,
        isActive: !cat.isActive,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  };

  const handleStartCuratingSubmission = (sub: ShowcaseSubmission) => {
    setCuratingSubmission(sub);
    setCurateTitle(sub.title || `${sub.creatorName}'s Creation`);
    setCurateSummary(sub.description || '');
    setCurateCategory(
      sub.linkCategory === 'games' || sub.linkCategory === 'game'
        ? 'games'
        : sub.linkCategory === 'websites' || sub.linkCategory === 'website'
        ? 'websites'
        : 'project-showcases'
    );
  };

  const handleExecuteCuration = async (approved: boolean) => {
    if (!curatingSubmission) return;
    setIsSubmittingCuration(true);
    try {
      const cat = categories.find((c) => c.id === curateCategory) || categories[0];
      await adminCurateShowcaseSubmission(curatingSubmission.id, {
        title: curateTitle.trim() || curatingSubmission.title,
        summary: curateSummary.trim() || curateTitle.trim(),
        body: curateSummary.trim() || curateTitle.trim(),
        categoryId: curateCategory,
        categoryName: cat?.name || 'Project Showcases',
        tags: [curatingSubmission.linkCategory || 'Showcase', 'Student Builder'],
        status: approved ? 'approved' : 'rejected',
        adminNotes: approved
          ? 'Curated and published to public showcase.'
          : 'Submission not selected for public showcase at this time.',
      });
      setCuratingSubmission(null);
    } catch (err) {
      console.error('Failed to curate submission:', err);
    } finally {
      setIsSubmittingCuration(false);
    }
  };

  const activeCategories = categories.filter((c) => c.isActive);
  const selectedCategoryObj = activeCategories.find((c) => c.id === selectedCategoryId);

  const bannerHeadlineText =
    publicConfig.featuredBannerHeadline &&
    publicConfig.featuredBannerHeadline.toLowerCase() !==
      'discover what young minds are building.'
      ? publicConfig.featuredBannerHeadline
      : 'Discover What Young Minds Are Building';

  return (
    <div
      className={`min-h-screen font-sans flex flex-col transition-colors duration-300 ${
        isDark ? 'bg-[#080811] text-white' : 'bg-[#FAFAFA] text-black'
      }`}
    >
      {/* Public Community Navigation Header */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-md border-b-3 border-black transition-colors duration-300 ${
          isDark ? 'bg-[#0b0b16]/95 text-white' : 'bg-white/95 text-black'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Left: Brand Logo + Compact Primary Navigation */}
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              onClick={() => onNavigate('/home')}
              title="Visit Build Buds Website Home"
              className="focus:outline-none cursor-pointer text-left shrink-0"
            >
              <BrandLogo size="sm" />
            </button>

            <nav
              className="hidden lg:flex items-center gap-1"
              aria-label="Public Community Navigation"
            >
              <button
                type="button"
                onClick={() => {
                  setActiveTab('all');
                  setSelectedCategoryId('all');
                  onNavigate('/community');
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold whitespace-nowrap cursor-pointer border-2 transition-all ${
                  activeTab === 'all'
                    ? 'bg-[#FFF025] text-black border-black brand-shadow-sm'
                    : isDark
                    ? 'border-transparent text-slate-200 hover:bg-white/10'
                    : 'border-transparent text-slate-800 hover:bg-slate-100'
                }`}
              >
                All Feed
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('creations');
                  setSelectedCategoryId('all');
                  onNavigate('/community/creations');
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold whitespace-nowrap cursor-pointer border-2 transition-all ${
                  activeTab === 'creations'
                    ? 'bg-[#FFF025] text-black border-black brand-shadow-sm'
                    : isDark
                    ? 'border-transparent text-slate-200 hover:bg-white/10'
                    : 'border-transparent text-slate-800 hover:bg-slate-100'
                }`}
              >
                Explore Creations
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('updates');
                  setSelectedCategoryId('all');
                  onNavigate('/community/updates');
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold whitespace-nowrap cursor-pointer border-2 transition-all ${
                  activeTab === 'updates'
                    ? 'bg-[#FFF025] text-black border-black brand-shadow-sm'
                    : isDark
                    ? 'border-transparent text-slate-200 hover:bg-white/10'
                    : 'border-transparent text-slate-800 hover:bg-slate-100'
                }`}
              >
                Latest Updates
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('challenges');
                  onNavigate('/community/challenges');
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold whitespace-nowrap cursor-pointer border-2 transition-all flex items-center gap-1 ${
                  activeTab === 'challenges'
                    ? 'bg-[#FFF025] text-black border-black brand-shadow-sm'
                    : isDark
                    ? 'border-transparent text-slate-200 hover:bg-white/10'
                    : 'border-transparent text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Trophy className="w-3.5 h-3.5 text-[#C15D00] shrink-0" />
                <span>Challenges</span>
              </button>
            </nav>
          </div>

          {/* Right: Search + Icon-Only Plus Button (Role-Gated) + UserAccountMenu (contains Notifications & Appearance) */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative hidden md:block">
              <Search
                className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === 'challenges' ? 'Search challenges...' : 'Search creations...'
                }
                className={`pl-8 pr-3 py-1.5 text-xs font-semibold rounded-xl border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFF025] w-40 lg:w-52 transition-all ${
                  isDark
                    ? 'bg-[#171726] text-white placeholder:text-slate-400 focus:bg-[#1f1f33]'
                    : 'bg-slate-50 text-black placeholder:text-slate-400 focus:bg-white'
                }`}
              />
            </div>

            {/* Role-Based Publishing Permission: Clean icon-only "+" button for Approved Student Hub Members & Admins */}
            {canPublish && (
              <button
                type="button"
                onClick={handleCreatePostClick}
                title="Share Creation / Post"
                aria-label="Share Creation / Post"
                className="w-9 h-9 rounded-xl border-2 border-black bg-[#FFF025] hover:bg-[#ffe500] text-black flex items-center justify-center brand-shadow-sm cursor-pointer transition-transform hover:-translate-y-0.5 shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[2.75]" />
              </button>
            )}

            {/* User Account / Profile Menu placed at extreme right (includes Notifications & Dark Mode) */}
            <UserAccountMenu
              currentUser={currentUser}
              builderProfile={builderProfile}
              studentAccessStatus={studentAccessStatus}
              isApprovedForHub={isApprovedForHub}
              isAuthChecking={isAuthChecking}
              notifications={notifications}
              onSelectNotification={handleMarkNotificationRead}
              onSignInClick={() =>
                onRequireAuth('sign in to your Build Buds account', undefined, 'signin')
              }
              onJoinClick={() =>
                onRequireAuth(
                  'create your Build Buds account to explore creations, react, and comment',
                  undefined,
                  'join'
                )
              }
              onSignOut={onSignOut}
              onNavigate={onNavigate}
              onOpenCurationModal={() => setIsAdminCurationModalOpen(true)}
              onOpenCategoriesModal={() => setIsAdminCategoryModalOpen(true)}
              onOpenChallengesModal={() => {
                setActiveTab('challenges');
                onNavigate('/community/challenges');
                openNewChallengeModal();
              }}
            />

            <button
              type="button"
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              className={`lg:hidden p-2 rounded-xl border-2 border-black cursor-pointer ${
                isDark ? 'bg-[#171726] text-white' : 'bg-white text-black'
              }`}
              aria-label="Toggle mobile menu"
            >
              {isMobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {isMobileNavOpen && (
          <div
            className={`lg:hidden border-t-2 border-black px-4 py-4 space-y-2 ${
              isDark ? 'bg-[#12121e] text-white' : 'bg-white text-black'
            }`}
          >
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsMobileNavOpen(false);
                  onNavigate('/home');
                }}
                className={`py-2 px-3 rounded-xl border-2 border-black text-xs font-black text-left ${
                  isDark ? 'bg-[#1a1a2e] text-white' : 'bg-white text-black'
                }`}
              >
                Website Home
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobileNavOpen(false);
                  setActiveTab('all');
                  setSelectedCategoryId('all');
                  onNavigate('/community');
                }}
                className={`py-2 px-3 rounded-xl border-2 border-black text-xs font-black text-left ${
                  activeTab === 'all'
                    ? 'bg-[#FFF025] text-black'
                    : isDark
                    ? 'bg-[#1a1a2e] text-white'
                    : 'bg-white text-black'
                }`}
              >
                Community Feed
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobileNavOpen(false);
                  setActiveTab('creations');
                  setSelectedCategoryId('all');
                  onNavigate('/community/creations');
                }}
                className={`py-2 px-3 rounded-xl border-2 border-black text-xs font-black text-left ${
                  activeTab === 'creations'
                    ? 'bg-[#FFF025] text-black'
                    : isDark
                    ? 'bg-[#1a1a2e] text-white'
                    : 'bg-white text-black'
                }`}
              >
                Explore Creations
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobileNavOpen(false);
                  setActiveTab('updates');
                  setSelectedCategoryId('all');
                  onNavigate('/community/updates');
                }}
                className={`py-2 px-3 rounded-xl border-2 border-black text-xs font-black text-left ${
                  activeTab === 'updates'
                    ? 'bg-[#FFF025] text-black'
                    : isDark
                    ? 'bg-[#1a1a2e] text-white'
                    : 'bg-white text-black'
                }`}
              >
                Latest Updates
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobileNavOpen(false);
                  setActiveTab('challenges');
                  onNavigate('/community/challenges');
                }}
                className={`py-2 px-3 rounded-xl border-2 border-black text-xs font-black text-left ${
                  activeTab === 'challenges'
                    ? 'bg-[#FFF025] text-black'
                    : isDark
                    ? 'bg-[#1a1a2e] text-white'
                    : 'bg-white text-black'
                }`}
              >
                Challenges
              </button>
              {canPublish && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileNavOpen(false);
                    handleCreatePostClick();
                  }}
                  className="py-2 px-3 rounded-xl border-2 border-black bg-[#FFF025] text-black text-xs font-black text-left"
                >
                  + Share Creation
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {activeTab === 'challenges' ? (
          /* ============================================================================
             DEDICATED COMMUNITY CHALLENGES SECTION
             ============================================================================ */
          <section aria-label="Community Challenges" className="space-y-8">
            {/* Challenges Header Banner */}
            <div
              className={`rounded-3xl border-3 border-black brand-shadow overflow-hidden ${
                isDark ? 'bg-[#121222]' : 'bg-[#FFFDF5]'
              }`}
            >
              <div className="bg-[#FFF025] border-b-3 border-black px-6 sm:px-8 py-6 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-black">
                    <Trophy className="w-4 h-4 text-[#B11469]" />
                    <span>Build Buds Creative Missions & Challenges</span>
                  </div>
                  <h1 className="font-chewy text-3xl sm:text-4xl text-black">
                    Take On a Real Building Challenge
                  </h1>
                  <p className="text-xs sm:text-sm font-bold text-black/80 max-w-2xl">
                    Explore creative coding, web design, game development, and STEM challenges
                    crafted by the Build Buds mentor team.
                  </p>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={openNewChallengeModal}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border-2 border-black bg-black hover:bg-slate-900 text-[#FFF025] text-xs sm:text-sm font-black cursor-pointer brand-shadow-sm"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>+ Create New Challenge</span>
                  </button>
                )}
              </div>

              {/* Challenge Filter Dropdowns Bar */}
              <div
                className={`p-5 sm:px-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                  isDark ? 'bg-[#121222] text-white' : 'bg-[#FFFDF5] text-black'
                }`}
              >
                <div className="relative flex-1 max-w-md">
                  <Search
                    className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search challenges by topic, tool, or programme..."
                    className={`w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-semibold rounded-2xl border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFF025] ${
                      isDark
                        ? 'bg-[#1b1b2f] text-white placeholder:text-slate-400'
                        : 'bg-white text-black placeholder:text-slate-400'
                    }`}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Category Filter Dropdown */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[11px] font-black uppercase tracking-wider ${
                        isDark ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      Category:
                    </span>
                    <select
                      aria-label="Filter challenges by category"
                      value={challengeCategoryFilter}
                      onChange={(e) => setChallengeCategoryFilter(e.target.value)}
                      className={`px-3 py-2 rounded-xl border-2 border-black text-xs font-black cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FFF025] ${
                        isDark ? 'bg-[#1b1b2f] text-white' : 'bg-white text-black'
                      }`}
                    >
                      <option value="all">All Categories</option>
                      {CHALLENGE_CATEGORY_OPTIONS.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Learner Group / Skill Filter Dropdown */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[11px] font-black uppercase tracking-wider ${
                        isDark ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      Group:
                    </span>
                    <select
                      aria-label="Filter challenges by learner group"
                      value={challengeGroupFilter}
                      onChange={(e) => setChallengeGroupFilter(e.target.value)}
                      className={`px-3 py-2 rounded-xl border-2 border-black text-xs font-black cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FFF025] ${
                        isDark ? 'bg-[#1b1b2f] text-white' : 'bg-white text-black'
                      }`}
                    >
                      <option value="all">All Builders & Levels</option>
                      {CHALLENGE_LEARNER_GROUPS.map((grp) => (
                        <option key={grp} value={grp}>
                          {grp}
                        </option>
                      ))}
                      <option value="Beginner">Skill: Beginner</option>
                      <option value="Intermediate">Skill: Intermediate</option>
                      <option value="Advanced">Skill: Advanced</option>
                    </select>
                  </div>

                  {/* Lifecycle Status Filter Dropdown */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[11px] font-black uppercase tracking-wider ${
                        isDark ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      Status:
                    </span>
                    <select
                      aria-label="Filter challenges by status"
                      value={challengeStatusFilter}
                      onChange={(e) =>
                        setChallengeStatusFilter(
                          e.target.value as 'all' | ChallengeLifecycleStatus
                        )
                      }
                      className={`px-3 py-2 rounded-xl border-2 border-black text-xs font-black cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FFF025] ${
                        isDark ? 'bg-[#1b1b2f] text-white' : 'bg-white text-black'
                      }`}
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">🟢 Active</option>
                      <option value="upcoming">🕒 Upcoming</option>
                      <option value="completed">🏁 Completed</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Challenges Grid or Authentic Empty State */}
            {filteredChallenges.length === 0 ? (
              <div
                className={`p-10 sm:p-14 rounded-3xl border-3 border-black brand-shadow text-center space-y-4 max-w-2xl mx-auto ${
                  isDark ? 'bg-[#121222] text-white' : 'bg-white text-black'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl border-2 border-black bg-[#FFF025] text-black flex items-center justify-center mx-auto brand-shadow-sm">
                  <Trophy className="w-8 h-8" />
                </div>
                <h2 className="font-chewy text-2xl sm:text-3xl">
                  {challenges.filter((c) => c.publishStatus === 'published').length === 0
                    ? 'New Community Challenges Coming Soon'
                    : 'No Challenges Match Your Current Filters'}
                </h2>
                <p
                  className={`text-sm font-medium max-w-md mx-auto leading-relaxed ${
                    isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  {challenges.filter((c) => c.publishStatus === 'published').length === 0
                    ? 'Our mentors are preparing the next official Build Buds challenge. Check back soon or explore student creations in the meantime!'
                    : 'Try resetting your category, learner group, or status filters to see all available challenges.'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  {challenges.filter((c) => c.publishStatus === 'published').length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setChallengeCategoryFilter('all');
                        setChallengeGroupFilter('all');
                        setChallengeStatusFilter('all');
                        setSearchQuery('');
                      }}
                      className="px-5 py-2.5 rounded-xl border-2 border-black bg-[#FFF025] text-black text-xs font-black brand-shadow-sm cursor-pointer"
                    >
                      Reset Challenge Filters
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('creations');
                      onNavigate('/community/creations');
                    }}
                    className={`px-5 py-2.5 rounded-xl border-2 border-black text-xs font-black cursor-pointer ${
                      isDark
                        ? 'bg-[#1b1b2f] hover:bg-white/10 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-black'
                    }`}
                  >
                    Explore Student Creations
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={openNewChallengeModal}
                      className="px-5 py-2.5 rounded-xl border-2 border-black bg-[#B11469] text-white text-xs font-black brand-shadow-sm cursor-pointer"
                    >
                      + Publish First Challenge
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredChallenges.map((chal) => {
                  const statusBadge =
                    chal.challengeStatus === 'active'
                      ? { label: 'Active Challenge', bg: 'bg-emerald-400 text-black' }
                      : chal.challengeStatus === 'upcoming'
                      ? { label: 'Upcoming', bg: 'bg-[#FFF025] text-black' }
                      : { label: 'Completed', bg: 'bg-slate-300 text-black' };

                  return (
                    <article
                      key={chal.id}
                      className={`rounded-3xl border-3 border-black brand-shadow p-6 sm:p-7 flex flex-col justify-between gap-5 transition-transform hover:-translate-y-0.5 ${
                        isDark ? 'bg-[#121222] text-white' : 'bg-white text-black'
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-3 py-1 rounded-xl border-2 border-black text-xs font-black uppercase ${statusBadge.bg}`}
                            >
                              {statusBadge.label}
                            </span>
                            <span className="px-3 py-1 rounded-xl border-2 border-black bg-[#B11469] text-white text-xs font-black">
                              {chal.category}
                            </span>
                            {chal.publishStatus !== 'published' && (
                              <span className="px-2.5 py-1 rounded-xl border-2 border-black bg-amber-300 text-black text-[11px] font-black uppercase">
                                {chal.publishStatus}
                              </span>
                            )}
                          </div>

                          {isAdmin && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditChallengeModal(chal)}
                                title="Edit challenge"
                                className={`p-2 rounded-xl border-2 border-black cursor-pointer ${
                                  isDark
                                    ? 'bg-[#1b1b2f] hover:bg-[#FFF025] hover:text-black text-white'
                                    : 'bg-slate-100 hover:bg-[#FFF025] text-black'
                                }`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteChallenge(chal.id)}
                                title="Delete challenge"
                                className="p-2 rounded-xl border-2 border-black bg-rose-100 hover:bg-rose-600 text-rose-700 hover:text-white cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        <div>
                          <h3
                            onClick={() => setSelectedChallenge(chal)}
                            className="font-chewy text-2xl sm:text-3xl cursor-pointer hover:text-[#FFF025] transition-colors leading-snug"
                          >
                            {chal.title}
                          </h3>
                          <p
                            className={`mt-2 text-sm font-medium leading-relaxed line-clamp-3 ${
                              isDark ? 'text-slate-300' : 'text-slate-700'
                            }`}
                          >
                            {chal.summary || chal.description}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                          <span
                            className={`px-2.5 py-1 rounded-lg border border-black/30 ${
                              isDark ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            👥 {chal.learnerGroup}
                          </span>
                          <span
                            className={`px-2.5 py-1 rounded-lg border border-black/30 ${
                              isDark ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            ⚡ {chal.skillLevel}
                          </span>
                          {chal.programme && (
                            <span
                              className={`px-2.5 py-1 rounded-lg border border-black/30 ${
                                isDark
                                  ? 'bg-white/10 text-slate-200'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              🎓 {chal.programme}
                            </span>
                          )}
                        </div>
                      </div>

                      <div
                        className={`pt-4 border-t-2 flex flex-wrap items-center justify-between gap-3 ${
                          isDark ? 'border-white/10' : 'border-black/10'
                        }`}
                      >
                        <div
                          className={`flex items-center gap-1.5 text-xs font-bold ${
                            isDark ? 'text-slate-300' : 'text-slate-600'
                          }`}
                        >
                          <Calendar className="w-4 h-4 text-[#C15D00]" />
                          <span>
                            {chal.deadline
                              ? `Deadline: ${new Date(chal.deadline).toLocaleDateString()}`
                              : 'Open-ended Mission'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedChallenge(chal)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-black bg-[#FFF025] hover:bg-[#ffe500] text-black text-xs font-black brand-shadow-sm cursor-pointer"
                        >
                          <span>View Challenge</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          /* ============================================================================
             STANDARD COMMUNITY DISCOVERY VIEW (FEATURED BANNER + DROPDOWN FILTER + FEED)
             ============================================================================ */
          <>
            {/* SECTION 1 — TOP FEATURED COMMUNITY CONTENT BANNER */}
            <section aria-label="Featured Community Content">
              <div
                className={`rounded-3xl border-3 border-black brand-shadow overflow-hidden ${
                  isDark ? 'bg-[#121222]' : 'bg-[#FFFDF5]'
                }`}
              >
                <div className="bg-[#FFF025] border-b-3 border-black px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-black">
                      <FolderGit2 className="w-4 h-4" />
                      <span>Build Buds Public Community Showcase</span>
                    </div>
                    <h1 className="font-chewy text-3xl sm:text-4xl text-black mt-0.5">
                      {bannerHeadlineText}
                    </h1>
                  </div>

                  {/* Role-Based Publishing Permission: Only Approved Student Hub Members & Admins see Publish Your Creation */}
                  {canPublish && (
                    <button
                      type="button"
                      onClick={handleCreatePostClick}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border-2 border-black bg-black hover:bg-slate-900 text-[#FFF025] text-xs sm:text-sm font-black cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>Publish Your Creation</span>
                    </button>
                  )}
                </div>

                {featuredBannerPost && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8 items-center">
                    {/* Featured Visual Preview */}
                    <div className="lg:col-span-6">
                      {featuredBannerPost.media?.[0]?.secureUrl &&
                      !brokenImages[featuredBannerPost.media[0].secureUrl] ? (
                        <div
                          onClick={() => handleOpenPostDetail(featuredBannerPost.id)}
                          className="rounded-2xl border-3 border-black overflow-hidden aspect-video bg-slate-900 cursor-pointer group"
                        >
                          <img
                            src={getCloudinaryResponsiveUrl(
                              featuredBannerPost.media[0].secureUrl,
                              'feed'
                            )}
                            alt={featuredBannerPost.title}
                            onError={() =>
                              setBrokenImages((prev) => ({
                                ...prev,
                                [featuredBannerPost.media[0].secureUrl]: true,
                              }))
                            }
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div
                          onClick={() => handleOpenPostDetail(featuredBannerPost.id)}
                          className="rounded-2xl border-3 border-black aspect-video bg-[#B11469] text-white p-8 flex flex-col justify-between cursor-pointer"
                        >
                          <span className="px-3 py-1 rounded-xl border-2 border-black bg-[#FFF025] text-black text-xs font-black uppercase w-fit">
                            {featuredBannerPost.categoryName}
                          </span>
                          <div className="font-chewy text-3xl leading-tight">
                            {featuredBannerPost.title}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Featured Details */}
                    <div className="lg:col-span-6 space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-xl border-2 border-black bg-[#B11469] text-white text-xs font-black uppercase">
                          Featured Highlight
                        </span>
                        <span className="px-3 py-1 rounded-xl border-2 border-black bg-[#FFF025] text-black text-xs font-black uppercase">
                          {featuredBannerPost.categoryName}
                        </span>
                      </div>

                      <h2
                        onClick={() => handleOpenPostDetail(featuredBannerPost.id)}
                        className={`font-chewy text-2xl sm:text-3xl cursor-pointer leading-tight transition-colors ${
                          isDark
                            ? 'text-white hover:text-[#FFF025]'
                            : 'text-black hover:text-[#B11469]'
                        }`}
                      >
                        {featuredBannerPost.title}
                      </h2>

                      <p
                        className={`text-sm sm:text-base font-medium leading-relaxed line-clamp-3 ${
                          isDark ? 'text-slate-300' : 'text-slate-700'
                        }`}
                      >
                        {featuredBannerPost.summary || featuredBannerPost.body}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                        <div className="flex items-center gap-2.5">
                          <VerifiedAvatarFrame
                            src={resolveBuilderAvatarUrl(
                              featuredBannerPost.authorAvatar,
                              featuredBannerPost.authorId
                            )}
                            alt={featuredBannerPost.authorName}
                            isVerified={
                              featuredBannerPost.authorRole === 'admin' ||
                              featuredBannerPost.authorRole === 'moderator' ||
                              verifiedUserIds.has(featuredBannerPost.authorId) ||
                              !featuredBannerPost.authorId.startsWith('seed-')
                            }
                            sizeClass="w-9 h-9"
                            ringPaddingClass="p-[2.5px]"
                          />
                          <div>
                            <div
                              className={`text-xs font-black ${
                                isDark ? 'text-white' : 'text-black'
                              }`}
                            >
                              {featuredBannerPost.authorName}
                            </div>
                            <div
                              className={`text-[11px] ${
                                isDark ? 'text-slate-400' : 'text-slate-600'
                              }`}
                            >
                              {new Date(featuredBannerPost.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenPostDetail(featuredBannerPost.id)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-black bg-[#FFF025] hover:bg-[#ffe500] text-black text-xs sm:text-sm font-black brand-shadow-sm cursor-pointer"
                        >
                          <span>Read Post</span>
                          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* SECTION 2 — REFINED CATEGORY FILTER DROPDOWN, SEARCH & SORT */}
            <section aria-label="Category Filter and Search" className="space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                  {/* Refined Custom Category Filter Dropdown (Replaces Horizontal Category Bar) */}
                  <div className="relative" ref={categoryDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
                      aria-haspopup="listbox"
                      aria-expanded={isCategoryDropdownOpen}
                      className={`w-full sm:w-auto min-w-[230px] flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border-2 border-black text-xs sm:text-sm font-black cursor-pointer brand-shadow-sm transition-colors ${
                        selectedCategoryId !== 'all'
                          ? 'bg-[#FFF025] text-black'
                          : isDark
                          ? 'bg-[#171726] hover:bg-[#1f1f33] text-white'
                          : 'bg-white hover:bg-slate-50 text-black'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Filter className="w-4 h-4 shrink-0" />
                        <span className="truncate">
                          {selectedCategoryObj
                            ? `${selectedCategoryObj.emoji} ${selectedCategoryObj.name}`
                            : 'Showing: All Categories'}
                        </span>
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 shrink-0 transition-transform ${
                          isCategoryDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isCategoryDropdownOpen && (
                      <div
                        role="listbox"
                        aria-label="Filter by category"
                        className={`absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl border-3 border-black brand-shadow z-30 overflow-hidden ${
                          isDark ? 'bg-[#121222] text-white' : 'bg-white text-black'
                        }`}
                      >
                        <div className="px-4 py-2.5 bg-[#FFF025] border-b-2 border-black flex items-center justify-between text-black">
                          <span className="text-[11px] font-black uppercase tracking-wider">
                            Filter by Category
                          </span>
                          {selectedCategoryId !== 'all' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCategoryId('all');
                                setIsCategoryDropdownOpen(false);
                              }}
                              className="text-[11px] font-black underline cursor-pointer"
                            >
                              Reset
                            </button>
                          )}
                        </div>

                        <div className="max-h-80 overflow-y-auto p-1.5 space-y-1">
                          <button
                            type="button"
                            role="option"
                            aria-selected={selectedCategoryId === 'all'}
                            onClick={() => {
                              setSelectedCategoryId('all');
                              setIsCategoryDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black cursor-pointer transition-colors ${
                              selectedCategoryId === 'all'
                                ? 'bg-[#FFF025] text-black border-2 border-black'
                                : isDark
                                ? 'hover:bg-white/10 text-white'
                                : 'hover:bg-slate-100 text-black'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span>✨</span>
                              <span>All Categories</span>
                            </span>
                            {selectedCategoryId === 'all' && <Check className="w-4 h-4" />}
                          </button>

                          {activeCategories.map((cat) => {
                            const isSelected = selectedCategoryId === cat.id;
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => {
                                  setSelectedCategoryId(cat.id);
                                  setIsCategoryDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black cursor-pointer transition-colors text-left ${
                                  isSelected
                                    ? 'bg-[#FFF025] text-black border-2 border-black'
                                    : isDark
                                    ? 'hover:bg-white/10 text-white'
                                    : 'hover:bg-slate-100 text-black'
                                }`}
                              >
                                <span className="flex items-center gap-2 truncate">
                                  <span>{cat.emoji}</span>
                                  <span className="truncate">{cat.name}</span>
                                </span>
                                {isSelected && <Check className="w-4 h-4 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>

                        {isAdmin && (
                          <div
                            className={`p-2 border-t-2 border-black ${
                              isDark ? 'bg-[#17172b]' : 'bg-slate-50'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setIsCategoryDropdownOpen(false);
                                setIsAdminCategoryModalOpen(true);
                              }}
                              className="w-full py-2 px-3 rounded-xl border-2 border-dashed border-black bg-[#FFF025] text-black text-xs font-black cursor-pointer"
                            >
                              + Manage Categories
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Search Input */}
                  <div className="relative flex-1 max-w-xl">
                    <Search
                      className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search projects, games, tutorials, tags, or creators..."
                      className={`w-full pl-10 pr-4 py-2.5 text-sm font-semibold rounded-2xl border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFF025] ${
                        isDark
                          ? 'bg-[#171726] text-white placeholder:text-slate-400'
                          : 'bg-white text-black placeholder:text-slate-400'
                      }`}
                    />
                  </div>
                </div>

                {/* Sort & View Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  {(['latest', 'popular', 'featured'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSortBy(mode)}
                      className={`px-3.5 py-2 rounded-xl border-2 border-black text-xs font-black capitalize cursor-pointer transition-all ${
                        sortBy === mode
                          ? 'bg-[#FFF025] text-black brand-shadow-sm'
                          : isDark
                          ? 'bg-[#171726] hover:bg-white/10 text-slate-200'
                          : 'bg-white hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {mode === 'latest' && '🕒 Latest'}
                      {mode === 'popular' && '🔥 Popular'}
                      {mode === 'featured' && '⭐ Featured'}
                    </button>
                  ))}

                  {currentUser && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveTab(activeTab === 'saved' ? 'all' : 'saved')
                        }
                        className={`px-3.5 py-2 rounded-xl border-2 border-black text-xs font-black cursor-pointer ${
                          activeTab === 'saved'
                            ? 'bg-[#B11469] text-white'
                            : isDark
                            ? 'bg-[#171726] hover:bg-white/10 text-white'
                            : 'bg-white hover:bg-slate-100 text-black'
                        }`}
                      >
                        Saved ({bookmarkedIds.length})
                      </button>

                      {canPublish && (
                        <button
                          type="button"
                          onClick={() =>
                            setActiveTab(activeTab === 'my-posts' ? 'all' : 'my-posts')
                          }
                          className={`px-3.5 py-2 rounded-xl border-2 border-black text-xs font-black cursor-pointer ${
                            activeTab === 'my-posts'
                              ? 'bg-[#FFF025] text-black'
                              : isDark
                              ? 'bg-[#171726] hover:bg-white/10 text-white'
                              : 'bg-white hover:bg-slate-100 text-black'
                          }`}
                        >
                          My Posts
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </section>

            {/* SECTION 3 & SECTION 4 — CENTRAL FEED + RIGHT DISCOVERY SIDEBAR */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Central Community Discovery Feed (8 Columns on Desktop) */}
              <section className="lg:col-span-8 space-y-6" aria-label="Community Feed">
                {sortedPosts.length === 0 ? (
                  <div
                    className={`p-10 rounded-3xl border-3 border-black text-center space-y-4 ${
                      isDark ? 'bg-[#121222] text-white' : 'bg-white text-black'
                    }`}
                  >
                    <div className="font-chewy text-2xl">
                      No posts match this filter yet
                    </div>
                    <p
                      className={`text-sm max-w-md mx-auto ${
                        isDark ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      Try clearing your search or selecting &ldquo;All Categories&rdquo; from the
                      dropdown filter to explore all published creations.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      {(selectedCategoryId !== 'all' || searchQuery.trim() !== '') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategoryId('all');
                            setSearchQuery('');
                            setActiveTab('all');
                          }}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-black bg-[#FFF025] text-black text-xs font-black brand-shadow-sm cursor-pointer"
                        >
                          <span>Show All Categories</span>
                        </button>
                      )}

                      {canPublish && (
                        <button
                          type="button"
                          onClick={handleCreatePostClick}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-black bg-black text-[#FFF025] text-xs font-black brand-shadow-sm cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Create First Post</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  sortedPosts.map((post) => {
                    const postMedia = (post.media || []).filter(
                      (m) => m.secureUrl && !brokenImages[m.secureUrl]
                    );
                    const myPostReactions = userReactionsMap[post.id] || [];
                    const isPostBookmarked = bookmarkedIds.includes(post.id);

                    return (
                      <article
                        key={post.id}
                        className={`rounded-3xl border-3 border-black brand-shadow overflow-hidden transition-transform hover:-translate-y-0.5 ${
                          isDark ? 'bg-[#121222] text-white' : 'bg-white text-black'
                        }`}
                      >
                        {/* Cover Image / Multi-Image Strip */}
                        {postMedia.length > 0 && (
                          <div
                            onClick={() => handleOpenPostDetail(post.id)}
                            className="relative border-b-3 border-black bg-slate-950 aspect-[16/9] max-h-80 overflow-hidden cursor-pointer group"
                          >
                            <img
                              src={getCloudinaryResponsiveUrl(postMedia[0].secureUrl, 'feed')}
                              alt={post.title}
                              onError={() =>
                                setBrokenImages((prev) => ({
                                  ...prev,
                                  [postMedia[0].secureUrl]: true,
                                }))
                              }
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {postMedia.length > 1 && (
                              <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-xl border-2 border-black bg-black/85 text-[#FFF025] text-xs font-black flex items-center gap-1">
                                <Layers className="w-3.5 h-3.5" />
                                <span>+{postMedia.length - 1} more</span>
                              </span>
                            )}
                          </div>
                        )}

                        <div className="p-5 sm:p-7 space-y-4">
                          {/* Category, Status & Bookmark Row */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-3 py-1 rounded-xl border-2 border-black bg-[#FFF025] text-black text-xs font-black uppercase tracking-wider">
                                {post.categoryName}
                              </span>
                              {post.isFeatured && (
                                <span className="px-2.5 py-1 rounded-xl border-2 border-black bg-[#B11469] text-white text-xs font-black">
                                  Featured
                                </span>
                              )}
                              {post.status !== 'published' && (
                                <span className="px-2.5 py-1 rounded-xl border-2 border-black bg-amber-100 text-amber-900 text-xs font-black uppercase">
                                  {post.status}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleBookmark(post.id)}
                              aria-label={isPostBookmarked ? 'Remove bookmark' : 'Bookmark post'}
                              className={`p-2 rounded-xl border-2 border-black cursor-pointer transition-colors ${
                                isPostBookmarked
                                  ? 'bg-[#FFF025] text-black'
                                  : isDark
                                  ? 'bg-[#1b1b2f] hover:bg-white/10 text-slate-200'
                                  : 'bg-white hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <Bookmark
                                className={`w-4 h-4 ${isPostBookmarked ? 'fill-black' : ''}`}
                              />
                            </button>
                          </div>

                          {/* Title & Excerpt */}
                          <div>
                            <h3
                              onClick={() => handleOpenPostDetail(post.id)}
                              className={`font-chewy text-2xl sm:text-3xl cursor-pointer leading-snug transition-colors ${
                                isDark
                                  ? 'text-white hover:text-[#FFF025]'
                                  : 'text-black hover:text-[#B11469]'
                              }`}
                            >
                              {post.title}
                            </h3>
                            <p
                              className={`mt-2 text-sm sm:text-base font-medium leading-relaxed line-clamp-3 ${
                                isDark ? 'text-slate-300' : 'text-slate-700'
                              }`}
                            >
                              {post.summary || post.body}
                            </p>
                          </div>

                          {/* Quick External Creation Links */}
                          {(post.gameUrl || post.websiteUrl || post.githubUrl) && (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {post.gameUrl && (
                                <a
                                  href={post.gameUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-black bg-[#FFF025] text-black text-xs font-black"
                                >
                                  <Gamepad2 className="w-3.5 h-3.5" />
                                  <span>Play Game</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              {post.websiteUrl && (
                                <a
                                  href={post.websiteUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-black bg-[#B11469] text-white text-xs font-black"
                                >
                                  <Globe className="w-3.5 h-3.5" />
                                  <span>Live Website</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              {post.githubUrl && (
                                <a
                                  href={post.githubUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-black text-xs font-black ${
                                    isDark
                                      ? 'bg-[#1b1b2f] text-white'
                                      : 'bg-slate-100 text-black'
                                  }`}
                                >
                                  <Code2 className="w-3.5 h-3.5" />
                                  <span>Source Code</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          )}

                          {/* Tags */}
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {post.tags.map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => setSearchQuery(tag)}
                                  className={`px-2.5 py-0.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                                    isDark
                                      ? 'border-white/20 bg-white/5 hover:bg-[#FFF025] hover:text-black text-slate-300'
                                      : 'border-black/30 bg-slate-50 hover:bg-[#FFF025]/40 text-slate-700'
                                  }`}
                                >
                                  #{tag}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Footer: Creator Info + Real Reactions + Comments + Read CTA */}
                          <div
                            className={`pt-4 border-t-2 flex flex-wrap items-center justify-between gap-4 ${
                              isDark ? 'border-white/10' : 'border-black/10'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <VerifiedAvatarFrame
                                src={resolveBuilderAvatarUrl(post.authorAvatar, post.authorId)}
                                alt={post.authorName}
                                isVerified={
                                  post.authorRole === 'admin' ||
                                  post.authorRole === 'moderator' ||
                                  verifiedUserIds.has(post.authorId) ||
                                  !post.authorId.startsWith('seed-')
                                }
                                sizeClass="w-9 h-9"
                                ringPaddingClass="p-[2.5px]"
                              />
                              <div>
                                <div
                                  className={`text-xs font-black ${
                                    isDark ? 'text-white' : 'text-black'
                                  }`}
                                >
                                  {post.authorName}
                                </div>
                                <div
                                  className={`text-[11px] ${
                                    isDark ? 'text-slate-400' : 'text-slate-500'
                                  }`}
                                >
                                  {new Date(post.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {PUBLIC_REACTION_OPTIONS.slice(0, 3).map((opt) => {
                                const count = post.reactionCounts?.[opt.type] || 0;
                                const active = myPostReactions.includes(opt.type);
                                return (
                                  <AnimatedEmoteButton
                                    key={opt.type}
                                    emote={opt.type}
                                    count={count}
                                    active={active}
                                    title={opt.label}
                                    size="md"
                                    variant={isDark ? 'dark' : 'light'}
                                    onClick={() => handleQuickReact(post.id, opt.type)}
                                  />
                                );
                              })}

                              <button
                                type="button"
                                onClick={() => handleOpenPostDetail(post.id)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-black text-xs font-black cursor-pointer ${
                                  isDark
                                    ? 'bg-[#1b1b2f] hover:bg-white/10 text-white'
                                    : 'bg-white hover:bg-slate-100 text-black'
                                }`}
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-[#B11469]" />
                                <span>{post.commentCount || 0}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenPostDetail(post.id)}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl border-2 border-black bg-[#FFF025] hover:bg-[#ffe500] text-black text-xs font-black cursor-pointer"
                              >
                                <span>Read Post</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </section>

              {/* SECTION 4 — RIGHT-HAND DISCOVERY SIDEBAR (4 Columns on Desktop)
                  Note: Yellow Student Hub side box removed per specification; pink bottom CTA banner retained. */}
              <aside className="lg:col-span-4 space-y-6" aria-label="Community Discovery Sidebar">
                {/* Trending Topics & Tags */}
                <div
                  className={`p-6 rounded-3xl border-3 border-black brand-shadow space-y-4 ${
                    isDark ? 'bg-[#121222] text-white' : 'bg-white text-black'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#B11469]" />
                    <h2 className="font-chewy text-xl">Trending Topics & Tags</h2>
                  </div>
                  {trendingTags.length === 0 ? (
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Tags will appear as posts are published.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {trendingTags.map((item) => (
                        <button
                          key={item.tag}
                          type="button"
                          onClick={() => setSearchQuery(item.tag)}
                          className={`px-3 py-1.5 rounded-xl border-2 border-black text-xs font-black cursor-pointer transition-colors ${
                            isDark
                              ? 'bg-[#1b1b2f] hover:bg-[#FFF025] hover:text-black text-white'
                              : 'bg-slate-50 hover:bg-[#FFF025] text-black'
                          }`}
                        >
                          #{item.tag}{' '}
                          <span
                            className={`text-[10px] ml-0.5 ${
                              isDark ? 'text-slate-400' : 'text-slate-600'
                            }`}
                          >
                            ({item.count})
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recently Published Projects & Announcements */}
                <div
                  className={`p-6 rounded-3xl border-3 border-black brand-shadow space-y-4 ${
                    isDark ? 'bg-[#121222] text-white' : 'bg-white text-black'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-[#C15D00]" />
                    <h2 className="font-chewy text-xl">Recent Community Highlights</h2>
                  </div>
                  <div className="space-y-3">
                    {allMergedPosts
                      .filter((p) => p.status === 'published')
                      .slice(0, 4)
                      .map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleOpenPostDetail(p.id)}
                          className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                            isDark
                              ? 'border-white/15 hover:border-[#FFF025] bg-[#1b1b2f]'
                              : 'border-black/15 hover:border-black bg-slate-50 hover:bg-[#FFFDF5]'
                          }`}
                        >
                          <span className="text-[10px] font-black uppercase text-[#FFF025] bg-black px-2 py-0.5 rounded">
                            {p.categoryName}
                          </span>
                          <div className="text-xs font-black line-clamp-2 mt-1.5">
                            {p.title}
                          </div>
                          <div
                            className={`text-[11px] mt-1 ${
                              isDark ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            by {p.authorName}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Challenges Quick Card */}
                <div
                  className={`p-6 rounded-3xl border-3 border-black brand-shadow space-y-3 ${
                    isDark ? 'bg-[#121222] text-white' : 'bg-white text-black'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-[#C15D00]" />
                    <h2 className="font-chewy text-xl">Creative Challenges</h2>
                  </div>
                  <p
                    className={`text-xs font-medium leading-relaxed ${
                      isDark ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    Take on themed coding, game design, and web building missions with fellow
                    young creators.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('challenges');
                      onNavigate('/community/challenges');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl border-2 border-black bg-[#FFF025] hover:bg-[#ffe500] text-black text-xs font-black flex items-center justify-center gap-2 cursor-pointer brand-shadow-sm"
                  >
                    <span>Explore Challenges</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </aside>
            </div>
          </>
        )}

        {/* SECTION 5 — STUDENT HUB CALL-TO-ACTION BANNER (PINK BANNER RETAINED) */}
        <section aria-label="Student Hub Call To Action" className="pt-4">
          <div className="rounded-3xl border-3 border-black bg-[#B11469] text-white p-8 sm:p-10 brand-shadow flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border-2 border-black bg-[#FFF025] text-black text-xs font-black uppercase">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified Student Community</span>
              </div>
              <h2 className="font-chewy text-3xl sm:text-4xl text-white">
                Are you a Jaystarbliss Studios student?
              </h2>
              <p className="text-sm sm:text-base text-white/90 font-medium leading-relaxed">
                Verified students can unlock the full Build Buds Student Hub to chat in real time,
                join project channels and collaborate with other builders.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                onNavigate(isApprovedForHub ? '/hub' : '/student-access')
              }
              className="px-6 py-4 rounded-2xl border-3 border-black bg-[#FFF025] hover:bg-[#ffe500] text-black font-black text-sm sm:text-base brand-shadow shrink-0 flex items-center gap-2 cursor-pointer transition-transform hover:-translate-y-0.5"
            >
              <span>
                {isApprovedForHub ? 'Enter Student Hub' : 'Request Student Hub Access'}
              </span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </section>
      </main>

      {/* Post Composer Modal (Only for Approved Students & Admins) */}
      {builderProfile && canPublish && (
        <PublicPostComposer
          isOpen={isComposerOpen}
          onClose={() => {
            setIsComposerOpen(false);
            setEditingPost(null);
          }}
          authorProfile={builderProfile}
          categories={categories}
          editingPost={editingPost}
          requireReview={publicConfig.requireReviewForNewPosts}
          onSaved={(saved) => {
            setSelectedPostId(saved.id);
          }}
        />
      )}

      {/* Post Detail Modal */}
      <PublicPostDetailModal
        post={selectedDetailPost}
        currentUser={currentUser}
        builderProfile={builderProfile}
        userReactions={selectedDetailPost ? userReactionsMap[selectedDetailPost.id] || [] : []}
        isBookmarked={
          selectedDetailPost ? bookmarkedIds.includes(selectedDetailPost.id) : false
        }
        onClose={handleClosePostDetail}
        onRequireAuth={(desc) => onRequireAuth(desc)}
        onToggleBookmark={handleToggleBookmark}
        onEditPost={
          canPublish
            ? (postToEdit) => {
                setSelectedPostId(null);
                setEditingPost(postToEdit);
                setIsComposerOpen(true);
              }
            : undefined
        }
        onPostDeleted={() => handleClosePostDetail()}
      />

      {/* Challenge Detail Modal */}
      {selectedChallenge && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="challenge-detail-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
        >
          <div
            className={`relative w-full max-w-3xl rounded-3xl border-3 border-black brand-shadow my-6 max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 ${
              isDark ? 'bg-[#121222] text-white' : 'bg-white text-black'
            }`}
          >
            <div
              className={`flex items-start justify-between gap-4 border-b-2 pb-4 ${
                isDark ? 'border-white/15' : 'border-black/15'
              }`}
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-xl border-2 border-black bg-[#FFF025] text-black text-xs font-black uppercase">
                    {selectedChallenge.category}
                  </span>
                  <span className="px-3 py-1 rounded-xl border-2 border-black bg-[#B11469] text-white text-xs font-black uppercase">
                    {selectedChallenge.challengeStatus}
                  </span>
                </div>
                <h2 id="challenge-detail-title" className="font-chewy text-3xl sm:text-4xl">
                  {selectedChallenge.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedChallenge(null)}
                className={`p-2 rounded-xl border-2 border-black cursor-pointer ${
                  isDark
                    ? 'bg-[#1b1b2f] hover:bg-[#FFF025] hover:text-black text-white'
                    : 'bg-white hover:bg-[#FFF025] text-black'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
              <span
                className={`px-3 py-1.5 rounded-xl border-2 border-black ${
                  isDark ? 'bg-[#1b1b2f] text-white' : 'bg-slate-100 text-black'
                }`}
              >
                👥 Group: {selectedChallenge.learnerGroup}
              </span>
              <span
                className={`px-3 py-1.5 rounded-xl border-2 border-black ${
                  isDark ? 'bg-[#1b1b2f] text-white' : 'bg-slate-100 text-black'
                }`}
              >
                ⚡ Level: {selectedChallenge.skillLevel}
              </span>
              {selectedChallenge.programme && (
                <span
                  className={`px-3 py-1.5 rounded-xl border-2 border-black ${
                    isDark ? 'bg-[#1b1b2f] text-white' : 'bg-slate-100 text-black'
                  }`}
                >
                  🎓 Programme: {selectedChallenge.programme}
                </span>
              )}
              {selectedChallenge.deadline && (
                <span className="px-3 py-1.5 rounded-xl border-2 border-black bg-[#FFF025] text-black">
                  📅 Deadline: {new Date(selectedChallenge.deadline).toLocaleDateString()}
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-chewy text-xl mb-1">Challenge Brief</h3>
                <p
                  className={`text-sm sm:text-base whitespace-pre-line leading-relaxed font-medium ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}
                >
                  {selectedChallenge.description}
                </p>
              </div>

              {selectedChallenge.instructions && (
                <div
                  className={`p-5 rounded-2xl border-2 border-black space-y-2 ${
                    isDark ? 'bg-[#1b1b2f]' : 'bg-[#FFFDF5]'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#C15D00]">
                    <Sparkles className="w-4 h-4" />
                    <span>Participation & Submission Instructions</span>
                  </div>
                  <p
                    className={`text-sm whitespace-pre-line leading-relaxed font-medium ${
                      isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}
                  >
                    {selectedChallenge.instructions}
                  </p>
                </div>
              )}

              {selectedChallenge.resources && selectedChallenge.resources.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-[#B11469]" />
                    <span>Starter Resources & Reference Links</span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {selectedChallenge.resources.map((res, i) => (
                      <a
                        key={`${res.url}-${i}`}
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-black bg-[#FFF025] hover:bg-[#ffe500] text-black text-xs font-black brand-shadow-sm"
                      >
                        <span>{res.title}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              className={`pt-4 border-t-2 flex flex-wrap items-center justify-between gap-3 ${
                isDark ? 'border-white/15' : 'border-black/15'
              }`}
            >
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedChallenge;
                    setSelectedChallenge(null);
                    openEditChallengeModal(target);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-black bg-[#FFF025] text-black text-xs font-black cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Challenge</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2.5">
                {canPublish && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedChallenge(null);
                      handleCreatePostClick();
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-black bg-[#FFF025] hover:bg-[#ffe500] text-black text-xs font-black brand-shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Submit Creation for Challenge</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedChallenge(null)}
                  className={`px-4 py-2.5 rounded-xl border-2 border-black text-xs font-black cursor-pointer ${
                    isDark ? 'bg-[#1b1b2f] text-white' : 'bg-slate-100 text-black'
                  }`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN CHALLENGE COMPOSER & MANAGEMENT MODAL */}
      {isAdmin && isChallengeModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-challenge-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
        >
          <div
            className={`w-full max-w-2xl rounded-3xl border-3 border-black brand-shadow p-6 sm:p-8 space-y-5 my-8 max-h-[92vh] overflow-y-auto ${
              isDark ? 'bg-[#121222] text-white' : 'bg-white text-black'
            }`}
          >
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-lg border-2 border-black bg-[#FFF025] text-black text-[10px] font-black uppercase">
                  Admin Challenge CMS
                </span>
                <h3 id="admin-challenge-modal-title" className="font-chewy text-2xl sm:text-3xl mt-1">
                  {editingChallenge ? 'Edit Community Challenge' : 'Create Community Challenge'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsChallengeModalOpen(false)}
                className={`p-2 rounded-xl border-2 border-black cursor-pointer ${
                  isDark ? 'bg-[#1b1b2f] text-white' : 'bg-white text-black'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {challengeFormError && (
              <div className="p-3 rounded-xl border-2 border-rose-600 bg-rose-50 text-rose-900 text-xs font-bold">
                {challengeFormError}
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-black uppercase tracking-wider mb-1">
                  Challenge Title *
                </label>
                <input
                  type="text"
                  value={chalTitle}
                  onChange={(e) => setChalTitle(e.target.value)}
                  placeholder="e.g. Build an Interactive Clean-Energy Mini Game"
                  className={`w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border-2 border-black ${
                    isDark ? 'bg-[#1b1b2f] text-white' : 'bg-white text-black'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-black uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    value={chalCategoryId}
                    onChange={(e) => setChalCategoryId(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border-2 border-black font-bold ${
                      isDark ? 'bg-[#1b1b2f] text-white' : 'bg-white text-black'
                    }`}
                  >
                    {CHALLENGE_CATEGORY_OPTIONS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-black uppercase tracking-wider mb-1">
                    Learner Group *
                  </label>
                  <select
                    value={chalLearnerGroup}
                    onChange={(e) => setChalLearnerGroup(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border-2 border-black font-bold ${
                      isDark ? 'bg-[#1b1b2f] text-white' : 'bg-white text-black'
                    }`}
                  >
                    {CHALLENGE_LEARNER_GROUPS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-black uppercase tracking-wider mb-1">
                    Skill Level *
                  </label>
                  <select
                    value={chalSkillLevel}
                    onChange={(e) =>
                      setChalSkillLevel(e.target.value as ChallengeSkillLevel)
                    }
                    className={`w-full px-3 py-2.5 rounded-xl border-2 border-black font-bold ${
                      isDark ? 'bg-[#1b1b2f] text-white' : 'bg-white text-black'
                    }`}
                  >
                    <option value="All Levels">All Levels</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-black uppercase tracking-wider mb-1">
                    Lifecycle Status
                  </label>
                  <select
                    value={chalLifecycleStatus}
                    onChange={(e) =>
                      setChalLifecycleStatus(e.target.value as ChallengeLifecycleStatus)
                    }
                    className={`w-full px-3 py-2.5 rounded-xl border-2 border-black font-bold ${
                      isDark ? 'bg-[#1b1b2f] text-white' : 'bg-white text-black'
                    }`}
                  >
                    <option value="active">Active</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block font-black uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={chalStartDate}
                    onChange={(e) => setChalStartDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border-2 border-black font-bold ${
                      isDark ? 'bg-[#1b1b2f] text-white' : 'bg-white text-black'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-black uppercase tracking-wider mb-1">
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={chalDeadline}
                    onChange={(e) => setChalDeadline(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border-2 border-black font-bold ${
                      isDark ? 'bg-[#1b1b2f] text-white' : 'bg-white text-black'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-black uppercase tracking-wider mb-1">
                  Class / Programme (Optional)
                </label>
                <input
                  type="text"
                  value={chalProgramme}
                  onChange={(e) => setChalProgramme(e.target.value)}
                  placeholder="e.g. Jaystarbliss Saturday Coding Club / Web & Game Track"
                  className={`w-full px-3.5 py-2 rounded-xl border-2 border-black ${
                    isDark ? 'bg-[#1b1b2f] text-white' : 'bg-white text-black'
                  }`}
                />
              </div>

              <div>
                <label className="block font-black uppercase tracking-wider mb-1">
                  Short Summary (Shown on Challenge Card)
                </label>
                <input
                  type="text"
                  value={chalSummary}
                  onChange={(e) => setChalSummary(e.target.value)}
                  placeholder="One or two sentences summarizing the mission..."
                  className={`w-full px-3.5 py-2 rounded-xl border-2 border-black ${
                    isDark ? 'bg-[#1b1b2f] text-white' : 'bg-white text-black'
                  }`}
                />
              </div>

              <div>
                <label className="block font-black uppercase tracking-wider mb-1">
                  Full Challenge Description *
                </label>
                <textarea
                  rows={4}
                  value={chalDescription}
                  onChange={(e) => setChalDescription(e.target.value)}
                  placeholder="Describe the goal, creative prompt, and what builders will learn..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border-2 border-black ${
                    isDark ? 'bg-[#1b1b2f] text-white' : 'bg-white text-black'
                  }`}
                />
              </div>

              <div>
                <label className="block font-black uppercase tracking-wider mb-1">
                  Submission Instructions & Requirements
                </label>
                <textarea
                  rows={3}
                  value={chalInstructions}
                  onChange={(e) => setChalInstructions(e.target.value)}
                  placeholder="How should students build and submit their project? What should they include?"
                  className={`w-full px-3.5 py-2.5 rounded-xl border-2 border-black ${
                    isDark ? 'bg-[#1b1b2f] text-white' : 'bg-white text-black'
                  }`}
                />
              </div>

              {/* Resource Links Builder */}
              <div
                className={`p-4 rounded-2xl border-2 border-black space-y-3 ${
                  isDark ? 'bg-[#1b1b2f]' : 'bg-slate-50'
                }`}
              >
                <div className="font-black uppercase tracking-wider">
                  Helpful Resource Links ({chalResources.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  <input
                    type="text"
                    value={newResourceLabel}
                    onChange={(e) => setNewResourceLabel(e.target.value)}
                    placeholder="Resource Label (e.g. Starter Template)"
                    className={`sm:col-span-2 px-3 py-2 rounded-xl border-2 border-black ${
                      isDark ? 'bg-[#121222] text-white' : 'bg-white text-black'
                    }`}
                  />
                  <input
                    type="url"
                    value={newResourceUrl}
                    onChange={(e) => setNewResourceUrl(e.target.value)}
                    placeholder="https://..."
                    className={`sm:col-span-2 px-3 py-2 rounded-xl border-2 border-black ${
                      isDark ? 'bg-[#121222] text-white' : 'bg-white text-black'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleAddChallengeResource}
                    className="px-3 py-2 rounded-xl border-2 border-black bg-[#FFF025] text-black font-black cursor-pointer"
                  >
                    + Add Link
                  </button>
                </div>

                {chalResources.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {chalResources.map((r, idx) => (
                      <span
                        key={`${r.url}-${idx}`}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-xl border-2 border-black bg-[#FFF025] text-black font-bold"
                      >
                        <span>{r.title}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setChalResources((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="text-black hover:text-rose-700 font-black cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t-2 border-black flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isSavingChallenge}
                  onClick={() => handleSaveChallenge('draft')}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-black text-xs font-black cursor-pointer ${
                    isDark ? 'bg-[#1b1b2f] text-white' : 'bg-slate-100 text-black'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Save as Draft</span>
                </button>
                {editingChallenge && (
                  <button
                    type="button"
                    disabled={isSavingChallenge}
                    onClick={() => handleSaveChallenge('archived')}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-black bg-amber-200 text-black text-xs font-black cursor-pointer"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Archive</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                disabled={isSavingChallenge}
                onClick={() => handleSaveChallenge('published')}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border-2 border-black bg-[#FFF025] hover:bg-[#ffe500] text-black text-xs sm:text-sm font-black brand-shadow-sm cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSavingChallenge
                    ? 'Saving...'
                    : editingChallenge
                    ? 'Update & Publish Challenge'
                    : 'Publish Challenge'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Category & Publishing Settings Modal */}
      {isAdmin && isAdminCategoryModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
        >
          <div
            className={`w-full max-w-xl rounded-3xl border-3 border-black brand-shadow p-6 sm:p-8 space-y-6 my-8 ${
              isDark ? 'bg-[#121222] text-white' : 'bg-white text-black'
            }`}
          >
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <h3 className="font-chewy text-2xl">
                Admin: Public Categories & Publishing Mode
              </h3>
              <button
                type="button"
                onClick={() => setIsAdminCategoryModalOpen(false)}
                className={`p-1.5 rounded-xl border-2 border-black cursor-pointer ${
                  isDark ? 'bg-[#1b1b2f] text-white' : 'bg-white text-black'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Publishing Review Toggle */}
            <div
              className={`p-4 rounded-2xl border-2 border-black flex items-center justify-between gap-4 ${
                isDark ? 'bg-[#1b1b2f]' : 'bg-slate-50'
              }`}
            >
              <div>
                <div className="text-xs font-black uppercase">
                  Require Admin Review for New Public Posts
                </div>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  When enabled, new posts from non-admin approved students enter
                  &ldquo;pending_review&rdquo; until approved.
                </p>
              </div>
              <input
                type="checkbox"
                checked={publicConfig.requireReviewForNewPosts}
                onChange={(e) =>
                  updatePublicCommunityConfig({
                    requireReviewForNewPosts: e.target.checked,
                  })
                }
                className="w-5 h-5 accent-black cursor-pointer"
              />
            </div>

            {/* Existing Categories */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`p-3 rounded-xl border-2 border-black flex items-center justify-between gap-2 ${
                    isDark ? 'bg-[#1b1b2f]' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cat.emoji}</span>
                    <div>
                      <div className="text-xs font-black">{cat.name}</div>
                      <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {cat.description}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAdminToggleCategoryActive(cat)}
                    className={`px-3 py-1 rounded-lg border-2 border-black text-xs font-black cursor-pointer ${
                      cat.isActive ? 'bg-emerald-300 text-black' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {cat.isActive ? 'Active' : 'Hidden'}
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Category */}
            <form
              onSubmit={handleAdminAddCategory}
              className="space-y-3 pt-3 border-t-2 border-black"
            >
              <div className="text-xs font-black uppercase">Add New Category</div>
              <div className="grid grid-cols-4 gap-2">
                <input
                  type="text"
                  value={newCatEmoji}
                  onChange={(e) => setNewCatEmoji(e.target.value)}
                  placeholder="Emoji"
                  className={`px-3 py-2 text-sm rounded-xl border-2 border-black ${
                    isDark ? 'bg-[#1b1b2f] text-white' : 'bg-white text-black'
                  }`}
                />
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Category Name"
                  className={`col-span-3 px-3 py-2 text-sm rounded-xl border-2 border-black ${
                    isDark ? 'bg-[#1b1b2f] text-white' : 'bg-white text-black'
                  }`}
                />
              </div>
              <input
                type="text"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                placeholder="Short category description..."
                className={`w-full px-3 py-2 text-sm rounded-xl border-2 border-black ${
                  isDark ? 'bg-[#1b1b2f] text-white' : 'bg-white text-black'
                }`}
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl border-2 border-black bg-[#FFF025] text-black text-xs font-black cursor-pointer"
              >
                + Add Category
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN SHOWCASE SUBMISSIONS & CURATION MANAGEMENT MODAL */}
      {isAdminCurationModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Manage Public Posts and Showcase Curation"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            className={`w-full max-w-3xl rounded-3xl border-3 border-black brand-shadow p-6 space-y-4 max-h-[90vh] flex flex-col ${
              isDark ? 'bg-[#121222] text-white' : 'bg-white text-black'
            }`}
          >
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-[#B11469] tracking-wider">
                  Admin Control
                </span>
                <h3 className="font-chewy text-2xl">
                  Manage Public Posts & Showcase Curation
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAdminCurationModalOpen(false)}
                className={`p-1 rounded-lg border-2 border-black cursor-pointer ${
                  isDark ? 'bg-[#1b1b2f] text-white' : 'bg-slate-100 text-black'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-1">
              <div>
                <h4 className="font-black text-sm mb-2 flex items-center gap-2">
                  <span>Student Showcase Submissions</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#FFF025] text-black border border-black text-xs font-bold">
                    {showcaseSubmissions.filter((s) => s.status === 'pending').length} Pending
                  </span>
                </h4>
                {showcaseSubmissions.length === 0 ? (
                  <div className="p-8 border-2 border-dashed border-slate-400 rounded-2xl text-center text-xs text-slate-400 font-medium">
                    No private student showcase submissions yet. When students click &ldquo;Request
                    Public Showcase&rdquo; in the channels, they appear here.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {showcaseSubmissions.map((sub) => (
                      <div
                        key={sub.id}
                        className={`p-4 rounded-2xl border-2 border-black flex flex-col sm:flex-row items-start justify-between gap-4 ${
                          isDark ? 'bg-[#1b1b2f]' : 'bg-slate-50'
                        }`}
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs">{sub.creatorName}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-black bg-[#FFF025] text-black uppercase">
                              {sub.linkCategory || 'project'}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                sub.status === 'approved'
                                  ? 'bg-emerald-200 text-emerald-900'
                                  : sub.status === 'rejected'
                                  ? 'bg-rose-200 text-rose-900'
                                  : 'bg-amber-200 text-amber-900'
                              }`}
                            >
                              {sub.status}
                            </span>
                          </div>
                          <h5 className="font-bold text-sm">{sub.title}</h5>
                          {sub.description && (
                            <p
                              className={`text-xs line-clamp-2 ${
                                isDark ? 'text-slate-300' : 'text-slate-600'
                              }`}
                            >
                              {sub.description}
                            </p>
                          )}
                          <a
                            href={sub.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-sky-500 hover:underline flex items-center gap-1 font-mono break-all"
                          >
                            <span>{sub.linkUrl}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartCuratingSubmission(sub)}
                            className="px-3 py-1.5 rounded-xl border-2 border-black bg-[#FFF025] hover:bg-[#ffe500] text-black text-xs font-black cursor-pointer"
                          >
                            Curate & Feature
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CURATION DIALOG FOR A SINGLE SUBMISSION */}
      {curatingSubmission && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Curate Showcase Submission"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            className={`w-full max-w-lg rounded-3xl border-3 border-black brand-shadow p-6 space-y-4 ${
              isDark ? 'bg-[#121222] text-white' : 'bg-white text-black'
            }`}
          >
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-[#B11469]">
                  Showcase Curation
                </span>
                <h3 className="font-chewy text-2xl mt-0.5">Publish to Public Showcase</h3>
              </div>
              <button
                type="button"
                onClick={() => setCuratingSubmission(null)}
                className={`p-1 rounded-lg border-2 border-black cursor-pointer ${
                  isDark ? 'bg-[#1b1b2f] text-white' : 'bg-slate-100 text-black'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Public Title</label>
                <input
                  type="text"
                  value={curateTitle}
                  onChange={(e) => setCurateTitle(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border-2 border-black font-medium focus:outline-none focus:ring-2 focus:ring-[#FFF025] ${
                    isDark ? 'bg-[#1b1b2f] text-white' : 'bg-white text-black'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Public Summary / Description</label>
                <textarea
                  rows={3}
                  value={curateSummary}
                  onChange={(e) => setCurateSummary(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border-2 border-black font-medium focus:outline-none focus:ring-2 focus:ring-[#FFF025] ${
                    isDark ? 'bg-[#1b1b2f] text-white' : 'bg-white text-black'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Category</label>
                <select
                  value={curateCategory}
                  onChange={(e) => setCurateCategory(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border-2 border-black font-medium focus:outline-none focus:ring-2 focus:ring-[#FFF025] ${
                    isDark ? 'bg-[#1b1b2f] text-white' : 'bg-white text-black'
                  }`}
                >
                  <option value="games">🎮 Games</option>
                  <option value="websites">🌐 Websites</option>
                  <option value="project-showcases">🚀 Project Showcases</option>
                  <option value="creative-experiments">🎨 Creative Experiments</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t-2 border-black">
              <button
                type="button"
                disabled={isSubmittingCuration}
                onClick={() => handleExecuteCuration(false)}
                className="px-4 py-2 rounded-xl border-2 border-black bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs cursor-pointer"
              >
                Reject
              </button>
              <button
                type="button"
                disabled={isSubmittingCuration}
                onClick={() => handleExecuteCuration(true)}
                className="px-5 py-2 rounded-xl border-2 border-black bg-[#FFF025] hover:bg-[#ffe500] text-black font-black text-xs cursor-pointer brand-shadow-sm"
              >
                {isSubmittingCuration ? 'Publishing...' : 'Approve & Publish to Showcase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
