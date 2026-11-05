import { ProjectCategory, ProjectItem, DiscussionPost } from '../types/index.ts';

/**
 * Filter projects by category and optional query
 */
export function filterProjects(
  projects: ProjectItem[],
  category: ProjectCategory,
  query: string = ''
): ProjectItem[] {
  const trimmed = query.trim().toLowerCase();
  return projects.filter((project) => {
    const matchesCategory = category === 'all' || project.category === category;
    const matchesQuery =
      !trimmed ||
      project.title.toLowerCase().includes(trimmed) ||
      project.description.toLowerCase().includes(trimmed) ||
      project.tools.some((t) => t.toLowerCase().includes(trimmed));
    return matchesCategory && matchesQuery;
  });
}

/**
 * Count projects per category
 */
export function getCategoryCounts(projects: ProjectItem[]): Record<ProjectCategory, number> {
  const counts: Record<ProjectCategory, number> = {
    all: projects.length,
    games: 0,
    websites: 0,
    experiments: 0,
    tools: 0,
  };

  projects.forEach((p) => {
    if (counts[p.category] !== undefined) {
      counts[p.category] += 1;
    }
  });

  return counts;
}

/**
 * Toggle reaction on a discussion post (pure state transform)
 */
export function toggleReaction(
  post: DiscussionPost,
  reactionType: 'hearts' | 'bulbs' | 'rockets'
): DiscussionPost {
  const currentReacted = post.userReacted?.[reactionType] ?? false;
  const countChange = currentReacted ? -1 : 1;

  return {
    ...post,
    reactions: {
      ...post.reactions,
      [reactionType]: Math.max(0, post.reactions[reactionType] + countChange),
    },
    userReacted: {
      ...post.userReacted,
      [reactionType]: !currentReacted,
    },
  };
}

/**
 * Toggle reaction on a chat message ensuring each user can react at most ONCE per emoji (pure transform)
 */
export interface ToggleMessageReactionParams {
  reactions?: Record<string, number>;
  userReactions?: Record<string, string[]>;
  emoji: string;
  userId: string;
}

export interface ToggleMessageReactionResult {
  reactions: Record<string, number>;
  userReactions: Record<string, string[]>;
  hasReacted: boolean;
}

export function toggleMessageReaction({
  reactions = {},
  userReactions = {},
  emoji,
  userId,
}: ToggleMessageReactionParams): ToggleMessageReactionResult {
  const nextReactions: Record<string, number> = { ...reactions };
  const nextUserReactions: Record<string, string[]> = { ...userReactions };
  const userList = [...(nextUserReactions[emoji] || [])];

  const userIdx = userList.indexOf(userId);
  let hasReacted = false;

  if (userIdx >= 0) {
    // Already reacted -> remove reaction (toggle OFF)
    userList.splice(userIdx, 1);
    nextReactions[emoji] = Math.max(0, (nextReactions[emoji] || 1) - 1);
    if (nextReactions[emoji] === 0) {
      delete nextReactions[emoji];
    }
    hasReacted = false;
  } else {
    // Not reacted yet -> add reaction (toggle ON)
    userList.push(userId);
    nextReactions[emoji] = (nextReactions[emoji] || 0) + 1;
    hasReacted = true;
  }

  if (userList.length > 0) {
    nextUserReactions[emoji] = userList;
  } else {
    delete nextUserReactions[emoji];
  }

  return {
    reactions: nextReactions,
    userReactions: nextUserReactions,
    hasReacted,
  };
}

/**
 * Add a reply to a discussion post
 */
export function addReplyToPost(
  post: DiscussionPost,
  author: string,
  school: string,
  text: string
): DiscussionPost {
  const cleanText = text.trim();
  if (!cleanText) return post;

  const newReply = {
    id: `reply-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    author: author.trim() || 'Fellow Builder',
    school: school.trim() || 'Build Buds Member',
    text: cleanText,
    timestamp: 'Just now',
  };

  return {
    ...post,
    repliesCount: post.repliesCount + 1,
    replies: [...post.replies, newReply],
  };
}

/**
 * Validate member registration form input
 */
export interface JoinFormData {
  fullName: string;
  gradeLevel: string;
  schoolName: string;
  primaryInterest: string;
  agreedToValues: boolean;
}

export function validateJoinForm(data: JoinFormData): { valid: boolean; errors: Partial<Record<keyof JoinFormData, string>> } {
  const errors: Partial<Record<keyof JoinFormData, string>> = {};

  if (!data.fullName.trim() || data.fullName.trim().length < 2) {
    errors.fullName = 'Please enter your name or builder nickname (at least 2 letters).';
  }

  if (!data.schoolName.trim()) {
    errors.schoolName = 'Please enter your school or learning community.';
  }

  if (!data.gradeLevel.trim()) {
    errors.gradeLevel = 'Please select your grade or year group.';
  }

  if (!data.primaryInterest.trim()) {
    errors.primaryInterest = 'Please select what you like building most.';
  }

  if (!data.agreedToValues) {
    errors.agreedToValues = 'Please agree to build boldly and be kind to fellow creators.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
