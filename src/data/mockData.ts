import { ProjectItem, DiscussionPost, ChallengeItem, FAQItem, BuilderPersona } from '../types/index.ts';

export const SAMPLE_PROJECTS: ProjectItem[] = [
  {
    id: 'galaxy-explorer',
    title: 'Galaxy Explorer',
    tagline: 'A small space adventure game with cool challenges and hidden treasures.',
    description: 'A small space adventure game with cool challenges and hidden treasures.',
    category: 'games',
    imageUrl: '/assets/aistudio/extracted/galaxy-explorer.png',
    creator: {
      name: 'Creator Alex',
      grade: 'Grade 8',
      school: 'Lincoln Middle School',
      avatarBg: '#FFF025',
    },
    tools: ['HTML5 Canvas', 'TypeScript', 'Web Audio API'],
    whatLearned: [
      'How to calculate gravitational pull between objects using physics vectors.',
      'Smooth 60FPS delta-time game loops with particle starfields.',
      'Synthesizing space adventure sound effects using Web Audio oscillators.',
    ],
    sourceCodeSnippet: `// Galaxy Explorer Space Flight Loop
function updateFlight(ship, stars) {
  ship.x += ship.vx;
  ship.y += ship.vy;
  ship.vx *= 0.98; // Cosmic friction
  ship.vy *= 0.98;
}`,
    demoType: 'playable-game',
    previewAccent: '#FFF025',
  },
  {
    id: 'my-portfolio',
    title: 'My Portfolio',
    tagline: 'A personal website to showcase my skills and projects.',
    description: 'A personal website to showcase my skills and projects.',
    category: 'websites',
    imageUrl: '/assets/aistudio/extracted/my-portfolio.png',
    creator: {
      name: 'Creator Maya',
      grade: 'Grade 9',
      school: 'Westfield High School',
      avatarBg: '#B11469',
    },
    tools: ['React', 'CSS Grid', 'LocalStorage API', 'Tailwind'],
    whatLearned: [
      'Designing clean responsive project cards for desktop and tablet.',
      'Interactive dark/light theme switching with smooth transitions.',
      'Showcasing live demos and source code links cleanly.',
    ],
    sourceCodeSnippet: `// Theme State Switcher
export function useThemeToggle() {
  const [theme, setTheme] = useState('light');
  return { theme, toggle: () => setTheme(t => t === 'light' ? 'dark' : 'light') };
}`,
    demoType: 'interactive-web',
    previewAccent: '#B11469',
  },
  {
    id: 'sound-shapes',
    title: 'Sound Shapes',
    tagline: 'An interactive experiment with sound and motion.',
    description: 'An interactive experiment with sound and motion.',
    category: 'experiments',
    imageUrl: '/assets/aistudio/extracted/sound-shapes.png',
    creator: {
      name: 'Creator Daniel',
      grade: 'Grade 8',
      school: 'Westfield STEM',
      avatarBg: '#C15D00',
    },
    tools: ['Web Audio API', 'Canvas 2D', 'Frequency Analyser'],
    whatLearned: [
      'Transforming sound frequencies into pulsating geometric shapes.',
      'Connecting micro-oscillators to interactive canvas coordinates.',
      'Harmonics and acoustic waves visualization.',
    ],
    sourceCodeSnippet: `// Audio Harmonic Visualizer
function drawPulseWave(ctx, freqData, radius) {
  ctx.beginPath();
  for (let i = 0; i < freqData.length; i++) {
    const angle = (i / freqData.length) * Math.PI * 2;
    const r = radius + freqData[i] * 0.4;
    ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
  }
  ctx.stroke();
}`,
    demoType: 'simulation',
    previewAccent: '#C15D00',
  },
  {
    id: 'doodle-studio',
    title: 'Doodle Studio',
    tagline: 'A simple drawing tool with fun brushes and colours.',
    description: 'A simple drawing tool with fun brushes and colours.',
    category: 'tools',
    imageUrl: '/assets/aistudio/extracted/doodle-studio.png',
    creator: {
      name: 'Creator Sophia',
      grade: 'Grade 7',
      school: 'Beacon Crest School',
      avatarBg: '#FFF025',
    },
    tools: ['JavaScript', 'Canvas 2D Context', 'Blob API'],
    whatLearned: [
      'Building responsive pencil, rainbow brush and eraser tools.',
      'Undo/redo canvas snapshot history stack.',
      'Exporting student artwork directly to PNG downloads.',
    ],
    sourceCodeSnippet: `// Brush Stroke Tracker
function onDraw(ctx, x, y, color, size) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
}`,
    demoType: 'simulation',
    previewAccent: '#FFF025',
  },
  {
    id: 'mathquest-dungeon',
    title: 'MathQuest: The Prime Dungeon',
    tagline: 'Puzzle maze where doors unlock by solving numerical patterns',
    description: 'An educational dungeon crawler combining turn-based tile exploration with fast mental math challenges to defeat arithmetic guardians.',
    category: 'games',
    creator: {
      name: 'Zane & Priya',
      grade: 'Grade 9',
      school: 'Northside Collegiate',
      avatarBg: '#C15D00',
    },
    tools: ['TypeScript', 'Tile Engine', 'Procedural Level Gen'],
    whatLearned: [
      'Creating random maze rooms using recursive division algorithms.',
      'Balancing difficulty curves so questions match the player progression.',
      'Working together as a two-person team and dividing game art and code.',
    ],
    sourceCodeSnippet: `// Prime Door Lock Checker
export function verifyDoorCode(userAnswer, factors) {
  const targetProduct = factors.reduce((acc, f) => acc * f, 1);
  return Number(userAnswer) === targetProduct;
}`,
    demoType: 'playable-game',
    previewAccent: '#FFF025',
  },
  {
    id: 'studycard-recall',
    title: 'StudyBuddy QuickRecall',
    tagline: 'Flashcard revision deck with Leitner spaced repetition',
    description: 'A revision app built to help classmates memorize vocabulary, science terminology, and historical dates through active recall cards.',
    category: 'websites',
    creator: {
      name: 'Alia V.',
      grade: 'Grade 7',
      school: 'Oakwood Middle',
      avatarBg: '#B11469',
    },
    tools: ['React', 'CSS Transitions', 'JSON Deck Parser'],
    whatLearned: [
      'Designing accessible 3D card flips with pure CSS transforms.',
      'The Leitner 5-box memory retention algorithm.',
      'Keyboard shortcuts (Space to flip, 1-3 to grade memory difficulty).',
    ],
    sourceCodeSnippet: `// Card Flip State Transition
export function gradeCardRecall(card, rating) {
  const nextInterval = rating === 'easy' ? card.interval * 2 : 1;
  return { ...card, interval: nextInterval, reviewedAt: Date.now() };
}`,
    demoType: 'interactive-web',
    previewAccent: '#C15D00',
  },
];

export const SAMPLE_DISCUSSIONS: DiscussionPost[] = [
  {
    id: 'disc-1',
    author: {
      name: 'Leo T.',
      grade: 'Grade 7',
      school: 'Beacon Crest School',
      avatarBg: '#FFF025',
    },
    channel: 'help',
    title: 'How can I make my character move more smoothly?',
    question: 'Whenever I press the arrow keys, my sprite moves in sudden choppy steps instead of smoothly speeding up and slowing down. How do creators make natural deceleration?',
    timestamp: '2 hours ago',
    repliesCount: 3,
    reactions: {
      hearts: 8,
      bulbs: 5,
      rockets: 3,
    },
    userReacted: {
      hearts: true,
      bulbs: false,
      rockets: false,
    },
    replies: [
      {
        id: 'rep-1',
        author: 'Maya K.',
        school: 'Westfield Middle',
        text: 'Instead of directly changing x += 5 on keypress, create a velocity variable like vx! Add 0.5 to vx while key is held, then multiply vx by 0.9 each frame for friction.',
        timestamp: '1 hour ago',
      },
      {
        id: 'rep-2',
        author: 'Devon M.',
        school: 'Summit Park',
        text: 'Maya is right! This is called linear interpolation or friction damping. I had the same issue on my spaceship game.',
        timestamp: '45 mins ago',
      },
    ],
  },
  {
    id: 'disc-2',
    author: {
      name: 'Zara N.',
      grade: 'Grade 8',
      school: 'Riverdale STEM Academy',
      avatarBg: '#B11469',
    },
    channel: 'ideas',
    title: 'What should I add to my first website?',
    question: 'I just finished building my about-me portfolio with basic HTML/CSS. I want to add something interactive that lets people test things. What is a fun starter feature?',
    timestamp: '4 hours ago',
    repliesCount: 4,
    reactions: {
      hearts: 11,
      bulbs: 9,
      rockets: 4,
    },
    replies: [
      {
        id: 'rep-3',
        author: 'Chloe T.',
        school: 'Beacon Crest',
        text: 'A theme customizer! Add a button that lets visitors toggle between light mode and high-contrast mode using CSS variables.',
        timestamp: '3 hours ago',
      },
      {
        id: 'rep-4',
        author: 'Samir L.',
        school: 'Riverdale STEM',
        text: 'Or an interactive mini quiz about your hobbies or favorite books! That always gets classmates clicking.',
        timestamp: '2 hours ago',
      },
    ],
  },
  {
    id: 'disc-3',
    author: {
      name: 'Marcus E.',
      grade: 'Grade 9',
      school: 'Northside Collegiate',
      avatarBg: '#C15D00',
    },
    channel: 'showcase',
    title: 'I built a little quiz game. What do you think?',
    question: 'Just published "QuizClash" for our geography class. It runs 10 quick country silhouette questions. Would love feedback on the timer speed and layout!',
    timestamp: 'Yesterday',
    repliesCount: 5,
    reactions: {
      hearts: 14,
      bulbs: 7,
      rockets: 12,
    },
    replies: [
      {
        id: 'rep-5',
        author: 'Alia V.',
        school: 'Oakwood Middle',
        text: 'The silhouette graphics look super crisp! I found 10 seconds per question just right.',
        timestamp: '18 hours ago',
      },
    ],
  },
  {
    id: 'disc-4',
    author: {
      name: 'Kiran P.',
      grade: 'Grade 8',
      school: 'Westfield Middle School',
      avatarBg: '#FFF025',
    },
    channel: 'collab',
    title: 'Does anyone have an idea for our next project?',
    question: 'Looking for 1 or 2 partners from other schools to brainstorm a shared tool for tracking school library books or homework deadlines. Who wants to team up?',
    timestamp: 'Yesterday',
    repliesCount: 6,
    reactions: {
      hearts: 19,
      bulbs: 12,
      rockets: 8,
    },
    replies: [
      {
        id: 'rep-6',
        author: 'Samir L.',
        school: 'Riverdale STEM',
        text: 'I would love to help with the data structures and LocalStorage part!',
        timestamp: '20 hours ago',
      },
    ],
  },
];

export const SAMPLE_CHALLENGES: ChallengeItem[] = [
  {
    id: 'chal-60s',
    title: 'The 60-Second Mini Game Challenge',
    theme: 'Fast paced micro-games with clear rules and instant replay',
    description: 'Design and build a complete game loop that can be picked up, played, and enjoyed in 60 seconds or less. Focus on crisp controls and rewarding feedback.',
    badgeText: 'Active Mission',
    accentColor: '#FFF025',
    timeframe: 'Ongoing Community Prompt',
    featured: true,
    participantCount: 38,
    prompts: [
      'Keep your game controls to 2 keys (e.g. Space to jump, Arrow keys to steer).',
      'Add a visible timer or score tracker.',
      'Provide instant "Play Again" restart without refreshing the page.',
    ],
  },
  {
    id: 'chal-eco',
    title: 'Everyday Problem Solver',
    theme: 'Create a digital tool that solves a daily student challenge',
    description: 'Whether it is calculating cafeteria lunch budgets, remembering locker combinations, or tracking bus schedules, build a lightweight utility for real life.',
    badgeText: 'Creative Mission',
    accentColor: '#B11469',
    timeframe: 'Open Collaboration',
    featured: false,
    participantCount: 24,
    prompts: [
      'Pick one clear annoyance in your school day.',
      'Design a simple 1-screen interface that solves it in under 3 clicks.',
      'Test it with two classmates before sharing.',
    ],
  },
  {
    id: 'chal-sound',
    title: 'Sound & Motion Sandbox',
    theme: 'Experiment with playful animations, audio effects, and visual feedback',
    description: 'Explore the Web Audio API or CSS keyframes to create a satisfying interactive toy, soundboard, or kinetic visual experiment.',
    badgeText: 'Exploration Lab',
    accentColor: '#C15D00',
    timeframe: 'Open Challenge',
    featured: false,
    participantCount: 19,
    prompts: [
      'Synthesize your own beeps, blips, or drum thumps using Web Audio oscillators.',
      'Connect button clicks to bouncy CSS transitions.',
      'Keep all visuals within our three brand accent colors.',
    ],
  },
];

export const BUILDER_PERSONAS: BuilderPersona[] = [
  {
    role: 'Game Builders',
    tagline: 'Designing characters, writing physics loops, and making play happen',
    exampleProject: 'Platformers, arcade games, and puzzle challenges',
    accentColor: '#FFF025',
    iconType: 'gamepad',
  },
  {
    role: 'Website Makers',
    tagline: 'Crafting responsive layouts, digital magazines, and club homes',
    exampleProject: 'Portfolios, school blogs, and informative guides',
    accentColor: '#B11469',
    iconType: 'globe',
  },
  {
    role: 'Problem Solvers',
    tagline: 'Automating calculations, tracking data, and fixing daily hurdles',
    exampleProject: 'Calculators, revision planners, and schedule assistants',
    accentColor: '#C15D00',
    iconType: 'tool',
  },
  {
    role: 'Creative Explorers',
    tagline: 'Blending music, generative art, storytelling, and digital canvas',
    exampleProject: 'Audio synthesizers, drawing apps, and visualizers',
    accentColor: '#FFF025',
    iconType: 'sparkles',
  },
  {
    role: 'Curious Beginners',
    tagline: 'Taking their very first steps in HTML, CSS, and logic with friends',
    exampleProject: 'Interactive quizzes, button toys, and intro cards',
    accentColor: '#B11469',
    iconType: 'lightbulb',
  },
  {
    role: 'Students Helping Students',
    tagline: 'Answering questions, reviewing code, and cheering on fellow builders',
    exampleProject: 'Starter templates, debugging tips, and friendly code reviews',
    accentColor: '#C15D00',
    iconType: 'users',
  },
];

export const HOMEPAGE_FAQS: FAQItem[] = [
  {
    question: 'What is Build Buds?',
    answer: 'Build Buds is a community for young creators to share projects, exchange ideas, solve problems and learn from one another.',
  },
  {
    question: 'Who can join Build Buds?',
    answer: 'The community is intended for young builders and creators participating in the Build Buds network across schools. Display the actual eligibility rules once they have been established.',
  },
  {
    question: 'What can I share?',
    answer: 'Members can showcase games, websites, creative experiments, project descriptions, screenshots, live demos and relevant source-code links, subject to the platform’s publishing rules.',
  },
  {
    question: 'Can I ask questions and get help?',
    answer: 'The planned community experience includes discussions, questions, comments and peer feedback.',
  },
  {
    question: 'Can I connect with other builders?',
    answer: 'Build Buds is designed to connect students through shared interests, community discussions and collaboration. Private messaging can be introduced through the platform’s account system.',
  },
  {
    question: 'How do I get started?',
    answer: 'Use the Join Build Buds action to begin the registration process when account registration is available.',
  },
];
