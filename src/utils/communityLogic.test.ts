import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterProjects,
  getCategoryCounts,
  toggleReaction,
  addReplyToPost,
  validateJoinForm,
} from './communityLogic.ts';
import { ProjectItem, DiscussionPost } from '../types/index.ts';

const sampleProjects: ProjectItem[] = [
  {
    id: 'p1',
    title: 'Orbital Jump',
    tagline: 'Retro physics platformer',
    description: 'A 2D platformer created with Canvas and JavaScript.',
    category: 'games',
    creator: { name: 'Maya', grade: 'Grade 8', school: 'Northfield Academy', avatarBg: '#FFF025' },
    tools: ['HTML5 Canvas', 'TypeScript', 'Web Audio'],
    whatLearned: ['Collision detection', 'Gravity curves'],
    sourceCodeSnippet: 'function updateGravity() {}',
    demoType: 'playable-game',
    previewAccent: '#B11469',
  },
  {
    id: 'p2',
    title: 'School Garden EcoTrack',
    tagline: 'Live plant moisture dashboard',
    description: 'Track real-time moisture levels for science class.',
    category: 'websites',
    creator: { name: 'Sam', grade: 'Grade 7', school: 'Oakwood Middle', avatarBg: '#C15D00' },
    tools: ['React', 'CSS', 'LocalStorage'],
    whatLearned: ['DOM updates', 'Responsive layouts'],
    sourceCodeSnippet: 'const moisture = calculateAverage();',
    demoType: 'interactive-web',
    previewAccent: '#FFF025',
  },
  {
    id: 'p3',
    title: 'PixelPalette Studio',
    tagline: '8-bit digital art maker',
    description: 'Create pixel art animations directly in browser.',
    category: 'tools',
    creator: { name: 'Kiran', grade: 'Grade 9', school: 'Tech Spark High', avatarBg: '#B11469' },
    tools: ['JavaScript', 'Canvas API'],
    whatLearned: ['Grid coordinate math', 'Color palettes'],
    sourceCodeSnippet: 'export function renderPixel() {}',
    demoType: 'simulation',
    previewAccent: '#C15D00',
  },
];

test('filterProjects filters by category accurately', () => {
  const gamesOnly = filterProjects(sampleProjects, 'games');
  assert.equal(gamesOnly.length, 1);
  assert.equal(gamesOnly[0].id, 'p1');

  const allProjects = filterProjects(sampleProjects, 'all');
  assert.equal(allProjects.length, 3);
});

test('filterProjects searches title and tools', () => {
  const canvasSearch = filterProjects(sampleProjects, 'all', 'Canvas');
  assert.equal(canvasSearch.length, 2);

  const gardenSearch = filterProjects(sampleProjects, 'all', 'Garden');
  assert.equal(gardenSearch.length, 1);
  assert.equal(gardenSearch[0].title, 'School Garden EcoTrack');
});

test('getCategoryCounts counts correctly across categories', () => {
  const counts = getCategoryCounts(sampleProjects);
  assert.equal(counts.all, 3);
  assert.equal(counts.games, 1);
  assert.equal(counts.websites, 1);
  assert.equal(counts.tools, 1);
  assert.equal(counts.experiments, 0);
});

test('toggleReaction increments and decrements correctly', () => {
  const samplePost: DiscussionPost = {
    id: 'post-1',
    author: { name: 'Leo', grade: 'Grade 7', school: 'Riverdale', avatarBg: '#FFF025' },
    channel: 'help',
    title: 'Jump velocity problem',
    question: 'How do I stop my character jumping twice in mid-air?',
    timestamp: '2 hours ago',
    repliesCount: 0,
    reactions: { hearts: 4, bulbs: 2, rockets: 1 },
    replies: [],
  };

  const reacted = toggleReaction(samplePost, 'hearts');
  assert.equal(reacted.reactions.hearts, 5);
  assert.equal(reacted.userReacted?.hearts, true);

  const unreacted = toggleReaction(reacted, 'hearts');
  assert.equal(unreacted.reactions.hearts, 4);
  assert.equal(unreacted.userReacted?.hearts, false);
});

test('addReplyToPost appends new reply and increments count', () => {
  const samplePost: DiscussionPost = {
    id: 'post-2',
    author: { name: 'Aiden', grade: 'Grade 8', school: 'Metro Academy', avatarBg: '#B11469' },
    channel: 'ideas',
    title: 'Game idea brainstorm',
    question: 'Thinking about a multiplayer quiz game!',
    timestamp: '1 hour ago',
    repliesCount: 1,
    reactions: { hearts: 2, bulbs: 1, rockets: 3 },
    replies: [
      { id: 'r1', author: 'Maya', school: 'Northfield', text: 'Love that concept!', timestamp: '45m ago' },
    ],
  };

  const updated = addReplyToPost(samplePost, 'Zack', 'Oakwood High', 'Count me in for testing!');
  assert.equal(updated.repliesCount, 2);
  assert.equal(updated.replies.length, 2);
  assert.equal(updated.replies[1].author, 'Zack');
  assert.equal(updated.replies[1].text, 'Count me in for testing!');
});

test('validateJoinForm validates required student onboarding fields', () => {
  const invalid = validateJoinForm({
    fullName: '',
    schoolName: '',
    gradeLevel: '',
    primaryInterest: '',
    agreedToValues: false,
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.fullName);
  assert.ok(invalid.errors.schoolName);
  assert.ok(invalid.errors.agreedToValues);

  const valid = validateJoinForm({
    fullName: 'Alex Chen',
    schoolName: 'Horizon Middle School',
    gradeLevel: 'Grade 8',
    primaryInterest: 'Game Development',
    agreedToValues: true,
  });
  assert.equal(valid.valid, true);
  assert.equal(Object.keys(valid.errors).length, 0);
});
