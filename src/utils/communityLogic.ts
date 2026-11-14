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
 * Toggle reaction on a chat message ensuring each user can react at most ONCE per message.
 * - Clicking the same emoji the user already reacted with removes their reaction.
 * - Clicking a different emoji when the user already reacted on the message moves their single
 *   reaction from the previous emoji to the new emoji.
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
  const nextUserReactions: Record<string, string[]> = {};

  // Clone and deduplicate existing user arrays per emoji
  for (const [k, arr] of Object.entries(userReactions)) {
    if (Array.isArray(arr)) {
      const unique = Array.from(new Set(arr.filter(Boolean)));
      if (unique.length > 0) {
        nextUserReactions[k] = unique;
      }
    }
  }

  const wasReactedToThisEmoji = (nextUserReactions[emoji] || []).includes(userId);

  // Remove userId from ALL emojis on this message so the user can never have more than 1 reaction on a message
  for (const existingEmoji of Object.keys(nextUserReactions)) {
    const list = nextUserReactions[existingEmoji];
    if (list && list.includes(userId)) {
      const filtered = list.filter((id) => id !== userId);
      if (filtered.length > 0) {
        nextUserReactions[existingEmoji] = filtered;
      } else {
        delete nextUserReactions[existingEmoji];
      }
      nextReactions[existingEmoji] = Math.max(0, (nextReactions[existingEmoji] || 1) - 1);
      if (nextReactions[existingEmoji] === 0) {
        delete nextReactions[existingEmoji];
      }
    }
  }

  let hasReacted = false;
  if (!wasReactedToThisEmoji) {
    // Toggle ON for the selected emoji
    const updatedList = [...(nextUserReactions[emoji] || []), userId];
    nextUserReactions[emoji] = updatedList;
    nextReactions[emoji] = (nextReactions[emoji] || 0) + 1;
    hasReacted = true;
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
