export type ProjectCategory = 'all' | 'games' | 'websites' | 'experiments' | 'tools';

export interface ProjectItem {
  id: string;
  title: string;
  tagline: string;
  description: string;
  category: 'games' | 'websites' | 'experiments' | 'tools';
  creator: {
    name: string;
    grade: string;
    school: string;
    avatarBg: string;
  };
  tools: string[];
  whatLearned: string[];
  sourceCodeSnippet: string;
  demoType: 'playable-game' | 'interactive-web' | 'simulation';
  previewAccent: string; // Brand color: #FFF025, #B11469, or #C15D00
  imageUrl?: string;
}

export interface DiscussionPost {
  id: string;
  author: {
    name: string;
    grade: string;
    school: string;
    avatarBg: string;
  };
  channel: 'all' | 'help' | 'showcase' | 'ideas' | 'collab';
  title: string;
  question: string;
  timestamp: string;
  repliesCount: number;
  reactions: {
    hearts: number;
    bulbs: number;
    rockets: number;
  };
  userReacted?: {
    hearts?: boolean;
    bulbs?: boolean;
    rockets?: boolean;
  };
  replies: Array<{
    id: string;
    author: string;
    school: string;
    text: string;
    timestamp: string;
  }>;
}

export interface ChallengeItem {
  id: string;
  title: string;
  theme: string;
  description: string;
  badgeText: string;
  accentColor: string;
  timeframe: string;
  featured?: boolean;
  participantCount: number;
  prompts: string[];
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface BuilderPersona {
  role: string;
  tagline: string;
  exampleProject: string;
  accentColor: string;
  iconType: string;
}
