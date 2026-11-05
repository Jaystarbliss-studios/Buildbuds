import { PublicPost } from '../types/community.ts';

/**
 * Authentic initial Build Buds showcase and announcement posts.
 * Note: Zero fabricated engagement statistics (all reactionCounts and commentCount start at 0
 * and only increment when real signed-in users react or comment).
 */
export const INITIAL_PUBLIC_COMMUNITY_POSTS: PublicPost[] = [
  {
    id: 'seed-welcome-buildbuds-community',
    title: 'Welcome to the Build Buds Public Community Showcase!',
    summary:
      'Explore games, websites, tutorials, and creative experiments built by young minds across schools — or sign in with Google to share your own project.',
    body: `Welcome to the official Build Buds Public Community!

Here, young creators, parents, teachers, and fellow builders can browse projects, read tutorials, and celebrate what students are building.

How to participate:
• Browse any post, creation, or update freely — no account needed to explore.
• Sign in with your Google account to react to projects, leave constructive comments, bookmark inspiration, or publish your own creation with screenshots and links.
• Are you a registered Jaystarbliss Studios student? Visit the Student Hub Access page to verify your student record and unlock our private real-time Student Hub channels!`,
    categoryId: 'announcements',
    categoryName: 'Announcements',
    tags: ['buildbuds', 'announcement', 'welcome', 'jaystarbliss'],
    media: [
      {
        secureUrl:
          'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
        publicId: 'buildbuds/seed/welcome-banner',
        ownerUid: 'jaystarbliss-official',
        width: 1200,
        height: 675,
        format: 'jpg',
        bytes: 185400,
        createdAt: '2026-02-01T10:00:00.000Z',
        postId: 'seed-welcome-buildbuds-community',
      },
    ],
    websiteUrl: 'https://buildbuds.vercel.app',
    gameUrl: '',
    githubUrl: 'https://github.com/Jaystarbliss-studios/Buildbuds',
    authorId: 'jaystarbliss-official',
    authorName: 'Jaystarbliss Studios',
    authorAvatar: 'avatar-1',
    authorColor: '#FFF025',
    authorRole: 'admin',
    status: 'published',
    isFeatured: true,
    reactionCounts: {},
    totalReactions: 0,
    commentCount: 0,
    createdAt: '2026-02-01T10:00:00.000Z',
    updatedAt: '2026-02-01T10:00:00.000Z',
  },
];
