export interface PresetAvatar {
  id: string;
  name: string;
  tagline: string;
  accentColor: string;
  dataUrl: string;
}

interface CharacterSpec {
  id: string;
  name: string;
  tagline: string;
  bg: string;
  bgAccent: string;
  skin: string;
  blush: string;
  hairColor: string;
  hairStyle:
    | 'afro'
    | 'puffs'
    | 'spiky'
    | 'curly'
    | 'bob'
    | 'braids'
    | 'beanie'
    | 'cap'
    | 'bun'
    | 'waves'
    | 'hijab'
    | 'visor';
  shirtColor: string;
  shirtAccent: string;
  accessory: 'none' | 'glasses' | 'headphones' | 'goggles' | 'star' | 'bandana';
  smileType: 'grin' | 'smile' | 'cat' | 'cool';
}

const CHARACTER_SPECS: CharacterSpec[] = [
  {
    id: 'avatar-nova',
    name: 'Nova',
    tagline: 'Arcade Pixel Architect',
    bg: '#FFF025',
    bgAccent: '#F59E0B',
    skin: '#8D5524',
    blush: '#E07A5F',
    hairColor: '#1A181B',
    hairStyle: 'puffs',
    shirtColor: '#B11469',
    shirtAccent: '#FFF025',
    accessory: 'headphones',
    smileType: 'grin',
  },
  {
    id: 'avatar-leo',
    name: 'Leo',
    tagline: 'Game Physics Explorer',
    bg: '#38BDF8',
    bgAccent: '#0284C7',
    skin: '#F1C27D',
    blush: '#F4978E',
    hairColor: '#4A2C11',
    hairStyle: 'spiky',
    shirtColor: '#111827',
    shirtAccent: '#FFF025',
    accessory: 'goggles',
    smileType: 'grin',
  },
  {
    id: 'avatar-maya',
    name: 'Maya',
    tagline: 'UI & Shader Designer',
    bg: '#B11469',
    bgAccent: '#EC4899',
    skin: '#C68642',
    blush: '#E56B6F',
    hairColor: '#1F1B24',
    hairStyle: 'braids',
    shirtColor: '#FFF025',
    shirtAccent: '#111827',
    accessory: 'glasses',
    smileType: 'smile',
  },
  {
    id: 'avatar-kai',
    name: 'Kai',
    tagline: 'Synth & Sound Coder',
    bg: '#10B981',
    bgAccent: '#059669',
    skin: '#FFDBAC',
    blush: '#F28482',
    hairColor: '#1E293B',
    hairStyle: 'beanie',
    shirtColor: '#C15D00',
    shirtAccent: '#FFF025',
    accessory: 'headphones',
    smileType: 'cool',
  },
  {
    id: 'avatar-zuri',
    name: 'Zuri',
    tagline: '3D World Builder',
    bg: '#A855F7',
    bgAccent: '#7E22CE',
    skin: '#6F4E37',
    blush: '#D47A6A',
    hairColor: '#14141F',
    hairStyle: 'afro',
    shirtColor: '#FFF025',
    shirtAccent: '#B11469',
    accessory: 'star',
    smileType: 'grin',
  },
  {
    id: 'avatar-milo',
    name: 'Milo',
    tagline: 'Redstone & Logic Wiz',
    bg: '#F97316',
    bgAccent: '#C15D00',
    skin: '#E0AC69',
    blush: '#E57A6E',
    hairColor: '#7C2D12',
    hairStyle: 'curly',
    shirtColor: '#1E293B',
    shirtAccent: '#38BDF8',
    accessory: 'glasses',
    smileType: 'smile',
  },
  {
    id: 'avatar-amina',
    name: 'Amina',
    tagline: 'Story & Lore Weaver',
    bg: '#F43F5E',
    bgAccent: '#BE123C',
    skin: '#C68642',
    blush: '#E56B6F',
    hairColor: '#831843',
    hairStyle: 'hijab',
    shirtColor: '#FFF025',
    shirtAccent: '#B11469',
    accessory: 'glasses',
    smileType: 'smile',
  },
  {
    id: 'avatar-pixel',
    name: 'Jax',
    tagline: 'Speedrun Tester',
    bg: '#6366F1',
    bgAccent: '#4338CA',
    skin: '#8D5524',
    blush: '#D97757',
    hairColor: '#0F172A',
    hairStyle: 'cap',
    shirtColor: '#FFF025',
    shirtAccent: '#111827',
    accessory: 'none',
    smileType: 'grin',
  },
  {
    id: 'avatar-chloe',
    name: 'Chloe',
    tagline: 'Web App Animator',
    bg: '#EC4899',
    bgAccent: '#B11469',
    skin: '#FFDBAC',
    blush: '#F4978E',
    hairColor: '#D97706',
    hairStyle: 'bob',
    shirtColor: '#0F172A',
    shirtAccent: '#38BDF8',
    accessory: 'star',
    smileType: 'cat',
  },
  {
    id: 'avatar-mateo',
    name: 'Mateo',
    tagline: 'Multiplayer Netcoder',
    bg: '#14B8A6',
    bgAccent: '#0F766E',
    skin: '#D2996C',
    blush: '#E07A5F',
    hairColor: '#1E1B18',
    hairStyle: 'waves',
    shirtColor: '#B11469',
    shirtAccent: '#FFF025',
    accessory: 'headphones',
    smileType: 'cool',
  },
  {
    id: 'avatar-hana',
    name: 'Hana',
    tagline: 'Pixel Sprite Artist',
    bg: '#FFF025',
    bgAccent: '#EAB308',
    skin: '#FFE0BD',
    blush: '#F4978E',
    hairColor: '#312E81',
    hairStyle: 'bun',
    shirtColor: '#7C3AED',
    shirtAccent: '#FFF025',
    accessory: 'glasses',
    smileType: 'cat',
  },
  {
    id: 'avatar-kofi',
    name: 'Kofi',
    tagline: 'Robotics & Hardware Kid',
    bg: '#C15D00',
    bgAccent: '#9A3412',
    skin: '#5C3A21',
    blush: '#B85D43',
    hairColor: '#0F172A',
    hairStyle: 'visor',
    shirtColor: '#FFF025',
    shirtAccent: '#0F172A',
    accessory: 'goggles',
    smileType: 'grin',
  },
  {
    id: 'avatar-sora',
    name: 'Sora',
    tagline: 'Sci-Fi Novel Author',
    bg: '#06B6D4',
    bgAccent: '#0E7490',
    skin: '#F1C27D',
    blush: '#F28482',
    hairColor: '#0F766E',
    hairStyle: 'spiky',
    shirtColor: '#B11469',
    shirtAccent: '#FFF025',
    accessory: 'bandana',
    smileType: 'smile',
  },
  {
    id: 'avatar-nia',
    name: 'Nia',
    tagline: 'Level Design Captain',
    bg: '#8B5CF6',
    bgAccent: '#6D28D9',
    skin: '#8D5524',
    blush: '#D97757',
    hairColor: '#4C1D95',
    hairStyle: 'puffs',
    shirtColor: '#10B981',
    shirtAccent: '#FFF025',
    accessory: 'glasses',
    smileType: 'grin',
  },
  {
    id: 'avatar-liam',
    name: 'Liam',
    tagline: 'Open Source Helper',
    bg: '#22C55E',
    bgAccent: '#15803D',
    skin: '#FFDBAC',
    blush: '#F4978E',
    hairColor: '#9A3412',
    hairStyle: 'cap',
    shirtColor: '#1E293B',
    shirtAccent: '#FFF025',
    accessory: 'glasses',
    smileType: 'smile',
  },
  {
    id: 'avatar-priya',
    name: 'Priya',
    tagline: 'Algorithmic Puzzle Maker',
    bg: '#F59E0B',
    bgAccent: '#B45309',
    skin: '#C68642',
    blush: '#E07A5F',
    hairColor: '#1C1917',
    hairStyle: 'braids',
    shirtColor: '#7C3AED',
    shirtAccent: '#38BDF8',
    accessory: 'star',
    smileType: 'grin',
  },
  {
    id: 'avatar-ezra',
    name: 'Ezra',
    tagline: 'Retro Console Modder',
    bg: '#3B82F6',
    bgAccent: '#1D4ED8',
    skin: '#E0AC69',
    blush: '#E57A6E',
    hairColor: '#27272A',
    hairStyle: 'beanie',
    shirtColor: '#FFF025',
    shirtAccent: '#B11469',
    accessory: 'goggles',
    smileType: 'cool',
  },
  {
    id: 'avatar-luna',
    name: 'Luna',
    tagline: 'Cosmic Shader Artist',
    bg: '#D946EF',
    bgAccent: '#A21CAF',
    skin: '#FFE0BD',
    blush: '#F4978E',
    hairColor: '#581C87',
    hairStyle: 'bob',
    shirtColor: '#FFF025',
    shirtAccent: '#111827',
    accessory: 'headphones',
    smileType: 'cat',
  },
  {
    id: 'avatar-tariq',
    name: 'Tariq',
    tagline: 'Full-Stack Young Builder',
    bg: '#10B981',
    bgAccent: '#047857',
    skin: '#8D5524',
    blush: '#D97757',
    hairColor: '#18181B',
    hairStyle: 'curly',
    shirtColor: '#111827',
    shirtAccent: '#38BDF8',
    accessory: 'none',
    smileType: 'grin',
  },
  {
    id: 'avatar-mei',
    name: 'Mei',
    tagline: 'VFX & Particle Crafter',
    bg: '#F43F5E',
    bgAccent: '#E11D48',
    skin: '#F1C27D',
    blush: '#F28482',
    hairColor: '#1E1B4B',
    hairStyle: 'bun',
    shirtColor: '#FFF025',
    shirtAccent: '#0F172A',
    accessory: 'star',
    smileType: 'smile',
  },
  {
    id: 'avatar-tobi',
    name: 'Tobi',
    tagline: 'Creative Game Director',
    bg: '#FFF025',
    bgAccent: '#CA8A04',
    skin: '#6F4E37',
    blush: '#C86D51',
    hairColor: '#09090B',
    hairStyle: 'waves',
    shirtColor: '#0284C7',
    shirtAccent: '#FFF025',
    accessory: 'glasses',
    smileType: 'grin',
  },
  {
    id: 'avatar-iris',
    name: 'Iris',
    tagline: 'Interactive Fiction Writer',
    bg: '#A855F7',
    bgAccent: '#6B21A8',
    skin: '#E0AC69',
    blush: '#E57A6E',
    hairColor: '#9D174D',
    hairStyle: 'afro',
    shirtColor: '#10B981',
    shirtAccent: '#111827',
    accessory: 'glasses',
    smileType: 'smile',
  },
  {
    id: 'avatar-devon',
    name: 'Devon',
    tagline: 'Chiptune Beatmaker',
    bg: '#0EA5E9',
    bgAccent: '#0369A1',
    skin: '#5C3A21',
    blush: '#B85D43',
    hairColor: '#18181B',
    hairStyle: 'visor',
    shirtColor: '#B11469',
    shirtAccent: '#FFF025',
    accessory: 'headphones',
    smileType: 'cool',
  },
  {
    id: 'avatar-ruby',
    name: 'Ruby',
    tagline: '3D Character Sculptor',
    bg: '#B11469',
    bgAccent: '#831843',
    skin: '#FFDBAC',
    blush: '#F4978E',
    hairColor: '#B45309',
    hairStyle: 'puffs',
    shirtColor: '#38BDF8',
    shirtAccent: '#FFF025',
    accessory: 'goggles',
    smileType: 'grin',
  },
];

function renderHairBack(spec: CharacterSpec): string {
  switch (spec.hairStyle) {
    case 'afro':
      return `<circle cx="60" cy="52" r="34" fill="${spec.hairColor}" stroke="#000" stroke-width="3.5"/>`;
    case 'puffs':
      return `
        <circle cx="26" cy="38" r="16" fill="${spec.hairColor}" stroke="#000" stroke-width="3.5"/>
        <circle cx="94" cy="38" r="16" fill="${spec.hairColor}" stroke="#000" stroke-width="3.5"/>
        <circle cx="32" cy="40" r="5" fill="${spec.shirtAccent}"/>
        <circle cx="88" cy="40" r="5" fill="${spec.shirtAccent}"/>
      `;
    case 'bob':
      return `<path d="M26 52 C24 30, 96 30, 94 52 L96 80 C96 84, 86 86, 84 80 L36 80 C34 86, 24 84, 24 80 Z" fill="${spec.hairColor}" stroke="#000" stroke-width="3.5"/>`;
    case 'braids':
      return `
        <rect x="25" y="48" width="11" height="38" rx="5.5" fill="${spec.hairColor}" stroke="#000" stroke-width="3"/>
        <rect x="84" y="48" width="11" height="38" rx="5.5" fill="${spec.hairColor}" stroke="#000" stroke-width="3"/>
        <circle cx="30.5" cy="84" r="4" fill="${spec.shirtAccent}" stroke="#000" stroke-width="2"/>
        <circle cx="89.5" cy="84" r="4" fill="${spec.shirtAccent}" stroke="#000" stroke-width="2"/>
      `;
    case 'bun':
      return `<circle cx="60" cy="20" r="14" fill="${spec.hairColor}" stroke="#000" stroke-width="3.5"/>`;
    case 'hijab':
      return `<path d="M24 56 C24 22, 96 22, 96 56 L100 96 L20 96 Z" fill="${spec.hairColor}" stroke="#000" stroke-width="3.5"/>`;
    default:
      return '';
  }
}

function renderHairFront(spec: CharacterSpec): string {
  switch (spec.hairStyle) {
    case 'spiky':
      return `<path d="M30 48 L26 30 L42 36 L52 20 L64 34 L78 22 L84 36 L96 30 L90 48 Z" fill="${spec.hairColor}" stroke="#000" stroke-width="3.5" stroke-linejoin="round"/>`;
    case 'curly':
      return `
        <circle cx="38" cy="34" r="11" fill="${spec.hairColor}" stroke="#000" stroke-width="3"/>
        <circle cx="52" cy="30" r="12" fill="${spec.hairColor}" stroke="#000" stroke-width="3"/>
        <circle cx="68" cy="30" r="12" fill="${spec.hairColor}" stroke="#000" stroke-width="3"/>
        <circle cx="82" cy="34" r="11" fill="${spec.hairColor}" stroke="#000" stroke-width="3"/>
      `;
    case 'waves':
      return `<path d="M32 46 C34 26, 86 26, 88 46 C76 38, 66 44, 60 39 C54 44, 44 38, 32 46 Z" fill="${spec.hairColor}" stroke="#000" stroke-width="3.5"/>`;
    case 'bob':
    case 'bun':
    case 'puffs':
    case 'braids':
    case 'afro':
      return `<path d="M32 48 C34 28, 86 28, 88 48 C76 36, 44 36, 32 48 Z" fill="${spec.hairColor}" stroke="#000" stroke-width="3.5"/>`;
    case 'beanie':
      return `
        <path d="M28 46 C30 22, 90 22, 92 46 Z" fill="${spec.shirtColor}" stroke="#000" stroke-width="3.5"/>
        <rect x="25" y="40" width="70" height="10" rx="5" fill="${spec.shirtAccent}" stroke="#000" stroke-width="3"/>
        <circle cx="60" cy="20" r="6" fill="${spec.shirtAccent}" stroke="#000" stroke-width="3"/>
      `;
    case 'cap':
      return `
        <path d="M30 45 C32 24, 88 24, 90 45 Z" fill="${spec.shirtColor}" stroke="#000" stroke-width="3.5"/>
        <path d="M28 43 L102 43 C104 43, 104 49, 96 49 L28 49 Z" fill="${spec.shirtAccent}" stroke="#000" stroke-width="3"/>
      `;
    case 'visor':
      return `
        <path d="M32 44 C36 26, 84 26, 88 44 Z" fill="${spec.hairColor}" stroke="#000" stroke-width="3.5"/>
        <rect x="26" y="38" width="68" height="9" rx="4.5" fill="${spec.shirtAccent}" stroke="#000" stroke-width="3"/>
      `;
    case 'hijab':
      return `<path d="M30 48 C36 30, 84 30, 90 48 C78 39, 42 39, 30 48 Z" fill="${spec.hairColor}" stroke="#000" stroke-width="3.5"/>`;
    default:
      return '';
  }
}

function renderAccessory(spec: CharacterSpec): string {
  switch (spec.accessory) {
    case 'glasses':
      return `
        <g stroke="#000" stroke-width="3" fill="rgba(255,255,255,0.22)">
          <rect x="36" y="51" width="19" height="14" rx="4"/>
          <rect x="65" y="51" width="19" height="14" rx="4"/>
          <line x1="55" y1="58" x2="65" y2="58"/>
        </g>
      `;
    case 'goggles':
      return `
        <g stroke="#000" stroke-width="3">
          <rect x="33" y="29" width="23" height="13" rx="6" fill="#38BDF8"/>
          <rect x="64" y="29" width="23" height="13" rx="6" fill="#38BDF8"/>
          <line x1="56" y1="35" x2="64" y2="35" stroke-width="3.5"/>
        </g>
      `;
    case 'headphones':
      return `
        <path d="M24 58 C20 22, 100 22, 96 58" fill="none" stroke="#111827" stroke-width="5"/>
        <rect x="18" y="49" width="11" height="22" rx="5.5" fill="${spec.shirtAccent}" stroke="#000" stroke-width="3"/>
        <rect x="91" y="49" width="11" height="22" rx="5.5" fill="${spec.shirtAccent}" stroke="#000" stroke-width="3"/>
      `;
    case 'star':
      return `
        <polygon points="86,33 88.5,38 94,38.8 90,42.6 91,48 86,45.4 81,48 82,42.6 78,38.8 83.5,38" fill="#FFF025" stroke="#000" stroke-width="2.2"/>
      `;
    case 'bandana':
      return `<rect x="32" y="41" width="56" height="7" rx="3.5" fill="${spec.shirtAccent}" stroke="#000" stroke-width="2.5"/>`;
    default:
      return '';
  }
}

function renderMouth(spec: CharacterSpec): string {
  switch (spec.smileType) {
    case 'grin':
      return `<path d="M49 71 Q60 81 71 71 Z" fill="#FFFFFF" stroke="#000" stroke-width="2.8" stroke-linejoin="round"/>`;
    case 'cat':
      return `<path d="M50 72 Q55 77 60 72 Q65 77 70 72" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round"/>`;
    case 'cool':
      return `<path d="M50 73 Q62 78 72 70" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round"/>`;
    case 'smile':
    default:
      return `<path d="M49 71 Q60 79 71 71" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round"/>`;
  }
}

function buildAvatarSvgDataUrl(spec: CharacterSpec): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
    <rect width="120" height="120" rx="60" fill="${spec.bg}"/>
    <circle cx="98" cy="24" r="18" fill="${spec.bgAccent}" opacity="0.45"/>
    <circle cx="20" cy="96" r="22" fill="${spec.bgAccent}" opacity="0.35"/>
    ${renderHairBack(spec)}
    <!-- Hoodie / Shoulders -->
    <path d="M22 120 C24 92, 96 92, 98 120 Z" fill="${spec.shirtColor}" stroke="#000" stroke-width="3.5"/>
    <path d="M46 97 L60 112 L74 97" fill="none" stroke="${spec.shirtAccent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- Neck -->
    <rect x="52" y="80" width="16" height="18" rx="6" fill="${spec.skin}" stroke="#000" stroke-width="3"/>
    <!-- Ears -->
    <circle cx="31" cy="60" r="7" fill="${spec.skin}" stroke="#000" stroke-width="3"/>
    <circle cx="89" cy="60" r="7" fill="${spec.skin}" stroke="#000" stroke-width="3"/>
    <!-- Head -->
    <rect x="33" y="34" width="54" height="52" rx="26" fill="${spec.skin}" stroke="#000" stroke-width="3.5"/>
    <!-- Cheeks -->
    <ellipse cx="43" cy="66" rx="5" ry="3" fill="${spec.blush}" opacity="0.65"/>
    <ellipse cx="77" cy="66" rx="5" ry="3" fill="${spec.blush}" opacity="0.65"/>
    <!-- Eyes -->
    <circle cx="46" cy="58" r="4" fill="#111827"/>
    <circle cx="74" cy="58" r="4" fill="#111827"/>
    <circle cx="47.5" cy="56.5" r="1.4" fill="#FFFFFF"/>
    <circle cx="75.5" cy="56.5" r="1.4" fill="#FFFFFF"/>
    <!-- Eyebrows -->
    <path d="M41 49 Q46 46 51 49" fill="none" stroke="#111827" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M69 49 Q74 46 79 49" fill="none" stroke="#111827" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Mouth -->
    ${renderMouth(spec)}
    <!-- Hair Front -->
    ${renderHairFront(spec)}
    <!-- Accessory -->
    ${renderAccessory(spec)}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

export const PRESET_AVATARS: PresetAvatar[] = CHARACTER_SPECS.map((spec) => ({
  id: spec.id,
  name: spec.name,
  tagline: spec.tagline,
  accentColor: spec.bg,
  dataUrl: buildAvatarSvgDataUrl(spec),
}));

const PRESET_BY_ID = new Map<string, PresetAvatar>(
  PRESET_AVATARS.map((avatar) => [avatar.id, avatar])
);

/**
 * Deterministically picks a predefined character avatar based on a seed (e.g., user UID or display name).
 */
export function getDefaultPresetAvatar(seed: string): PresetAvatar {
  const safeSeed = seed || 'builder';
  let hash = 0;
  for (let i = 0; i < safeSeed.length; i++) {
    hash = safeSeed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PRESET_AVATARS.length;
  return PRESET_AVATARS[index];
}

/**
 * Looks up a preset avatar by its ID (`avatar-nova`, etc.) or dataUrl.
 */
export function findPresetAvatar(value?: string | null): PresetAvatar | null {
  if (!value) return null;
  if (PRESET_BY_ID.has(value)) {
    return PRESET_BY_ID.get(value) || null;
  }
  const byDataUrl = PRESET_AVATARS.find((a) => a.dataUrl === value);
  return byDataUrl || null;
}

/**
 * Resolves a user's stored `avatarUrl` (which may be a preset ID like `avatar-nova`,
 * a preset SVG data URL, or empty/legacy) to a guaranteed graphical character portrait URL.
 * Always returns one of the 24 Build Buds predefined graphical character portraits.
 */
export function resolveBuilderAvatarUrl(
  storedAvatarUrl: string | undefined | null,
  seed: string
): string {
  const matched = findPresetAvatar(storedAvatarUrl);
  if (matched) {
    return matched.dataUrl;
  }
  if (storedAvatarUrl && storedAvatarUrl.startsWith('data:image/svg+xml')) {
    return storedAvatarUrl;
  }
  return getDefaultPresetAvatar(seed).dataUrl;
}
