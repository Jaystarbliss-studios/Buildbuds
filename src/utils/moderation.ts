/**
 * Profanity filter, link preview extractor, and client-side canvas image compressor
 * for the Build Buds Community Hub.
 */

const BLOCKED_WORDS = [
  'fuck',
  'fucking',
  'fucked',
  'shit',
  'shitty',
  'bitch',
  'asshole',
  'bastard',
  'dick',
  'pussy',
  'cunt',
  'slut',
  'whore',
  'damn',
  'crap',
  'stupid',
  'idiot',
  'dumbass',
  'wtf',
  'stfu',
  ' trash',
  'sucks',
];

export function filterProfanity(input: string): {
  filteredText: string;
  hadProfanity: boolean;
} {
  let filteredText = input;
  let hadProfanity = false;

  for (const word of BLOCKED_WORDS) {
    const cleanWord = word.trim();
    const escaped = cleanWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}(s|es|ing|ed)?\\b`, 'gi');
    if (regex.test(filteredText)) {
      hadProfanity = true;
      filteredText = filteredText.replace(regex, (match) => '*'.repeat(Math.max(3, match.length)));
    }
  }

  return { filteredText, hadProfanity };
}

export type CreationCategory = 'game' | 'website' | 'video' | 'novel' | 'other';

export interface LinkPreviewMetadata {
  url: string;
  domain: string;
  title: string;
  description: string;
  category: CreationCategory;
  defaultCoverUrl: string;
}

export const DEFAULT_COVERS: Record<CreationCategory, string> = {
  game: '/assets/aistudio/extracted/galaxy-explorer.png',
  website: '/assets/aistudio/extracted/my-portfolio.png',
  video: '/assets/aistudio/extracted/sound-shapes.png',
  novel: '/assets/aistudio/extracted/forest-quest.png',
  other: '/assets/aistudio/extracted/doodle-studio.png',
};

const BROKEN_LEGACY_COVER_PATHS: Record<string, CreationCategory> = {
  '/assets/aistudio/extracted/card-galaxy.png': 'game',
  '/assets/aistudio/extracted/card-math.png': 'website',
  '/assets/aistudio/extracted/card-eco.png': 'novel',
  '/assets/aistudio/extracted/card-pixel.png': 'other',
};

/**
 * Ensures any legacy or missing cover image URL resolves to a guaranteed valid image asset
 * so broken image icons never render in the chat or shared links directory.
 */
export function normalizeCoverImageUrl(
  rawCoverUrl: string | undefined | null,
  category: CreationCategory = 'other'
): string {
  const trimmed = (rawCoverUrl || '').trim();
  if (!trimmed) {
    return DEFAULT_COVERS[category] || DEFAULT_COVERS.other;
  }
  const lower = trimmed.toLowerCase();
  const mappedLegacy = BROKEN_LEGACY_COVER_PATHS[lower];
  if (mappedLegacy) {
    return DEFAULT_COVERS[category] || DEFAULT_COVERS[mappedLegacy] || DEFAULT_COVERS.other;
  }
  return trimmed;
}

export function cleanExtractedUrl(raw: string): string {
  // Strip trailing sentence punctuation that is not part of the URL
  let cleaned = raw.trim().replace(/[.,!?;:'"\])>]+$/, '');
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned;
}

/**
 * Produces a canonical comparison key for a URL so identical links shared with minor formatting
 * differences (http vs https, www., trailing slash, UTM tracking parameters, uppercase host)
 * are recognized as the exact same link and deduplicated reliably.
 */
export function normalizeLinkKey(rawUrl: string | undefined | null): string {
  const raw = (rawUrl || '').trim();
  if (!raw) return '';
  const cleaned = cleanExtractedUrl(raw);
  try {
    const parsed = new URL(cleaned);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const path = parsed.pathname.replace(/\/+$/, '') || '';
    const keptParams = new URLSearchParams();
    Array.from(parsed.searchParams.entries())
      .filter(([k]) => !/^utm_/i.test(k) && k.toLowerCase() !== 'fbclid' && k.toLowerCase() !== 'gclid')
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([k, v]) => keptParams.append(k, v));
    const search = keptParams.toString();
    return `${host}${path.toLowerCase()}${search ? `?${search}` : ''}`;
  } catch {
    return cleaned
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/+$/, '');
  }
}

export function extractFirstUrl(text: string): string | null {
  if (!text) return null;
  // 1. Explicit http:// or https:// URL
  const explicitMatch = text.match(/https?:\/\/[^\s<>"]+/i);
  if (explicitMatch) {
    return cleanExtractedUrl(explicitMatch[0]);
  }
  // 2. www. domain URL
  const wwwMatch = text.match(/(?:^|\s)(www\.[^\s<>"]+)/i);
  if (wwwMatch) {
    return cleanExtractedUrl(wwwMatch[1]);
  }
  // 3. Bare domain URLs for common creator platforms & TLDs (avoiding @mentions and emails)
  const bareMatch = text.match(
    /(?:^|\s)((?![a-z0-9._%+-]+@)(?:[a-z0-9-]+\.)+(?:name\.ng|vercel\.app|netlify\.app|github\.io|github\.com|itch\.io|scratch\.mit\.edu|roblox\.com|youtube\.com|youtu\.be|vimeo\.com|loom\.com|wattpad\.com|docs\.google\.com|drive\.google\.com|dropbox\.com|onedrive\.live\.com|1drv\.ms|replit\.com|codepen\.io|codesandbox\.io|com|org|net|io|app|dev|edu|gg|ng)(?:\/[^\s<>"]*)?)/i
  );
  if (bareMatch) {
    return cleanExtractedUrl(bareMatch[1]);
  }
  return null;
}

export interface VercelGameUrlValidation {
  valid: boolean;
  normalizedUrl: string;
  error?: string;
}

export type ShowcaseUrlValidationResult = VercelGameUrlValidation;

const BLOCKED_PUBLIC_FILE_STORAGE_HOSTS = [
  'drive.google.com',
  'docs.google.com',
  'sheets.google.com',
  'slides.google.com',
  'forms.google.com',
  'dropbox.com',
  'dl.dropboxusercontent.com',
  'onedrive.live.com',
  '1drv.ms',
  'sharepoint.com',
  'box.com',
  'mega.nz',
  'mediafire.com',
  'wetransfer.com',
  'icloud.com',
  'terabox.com',
];

function isBlockedFileStorageHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return BLOCKED_PUBLIC_FILE_STORAGE_HOSTS.some(
    (blocked) => lower === blocked || lower.endsWith(`.${blocked}`)
  );
}

/**
 * Validates URLs shared inside the Private Student Hub (#games, #websites, #general-chat, etc.).
 * Accepts any legitimate HTTP or HTTPS link (Vercel, .com, .name.ng, Google Drive, Google Docs,
 * GitHub, Dropbox, OneDrive, etc.), while rejecting dangerous/malformed protocols.
 */
export function validateHubUrl(rawUrl: string): VercelGameUrlValidation {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return {
      valid: false,
      normalizedUrl: '',
      error: 'Please enter a URL.',
    };
  }

  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return {
      valid: false,
      normalizedUrl: trimmed,
      error: 'Only standard http:// or https:// website links are allowed.',
    };
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        valid: false,
        normalizedUrl: trimmed,
        error: 'Only http:// and https:// URLs are allowed.',
      };
    }
    const host = parsed.hostname.toLowerCase();
    if (!host || !host.includes('.') || /\s/.test(host) || host.startsWith('.') || host.endsWith('.')) {
      return {
        valid: false,
        normalizedUrl: trimmed,
        error: 'Please enter a valid website link (e.g. https://example.com or https://drive.google.com/...).',
      };
    }
    const normalizedPath = parsed.pathname === '/' && !parsed.search && !parsed.hash ? '' : parsed.pathname;
    return {
      valid: true,
      normalizedUrl: `${parsed.protocol}//${host}${normalizedPath}${parsed.search}${parsed.hash}`,
    };
  } catch {
    return {
      valid: false,
      normalizedUrl: trimmed,
      error: 'Please enter a valid web link starting with https:// or http://.',
    };
  }
}

/**
 * Enforces strict Public Showcase publishing URL policy using URL hostname parsing:
 * Accepts ONLY HTTPS URLs ending in:
 * - `.vercel.app` (e.g. `https://my-game.vercel.app`)
 * - `.com` (regular live websites)
 * - `.name.ng` (regular `.name.ng` websites)
 * Explicitly rejects file-sharing / cloud storage hosts (`drive.google.com`, `docs.google.com`,
 * `dropbox.com`, `onedrive.live.com`, `1drv.ms`, etc.), deceptive suffixes, non-HTTPS, and malformed URLs.
 */
export function validatePublicShowcaseUrl(
  rawUrl: string,
  options?: { label?: string; required?: boolean }
): ShowcaseUrlValidationResult {
  const label = options?.label || 'Project link';
  const trimmed = (rawUrl || '').trim();

  if (!trimmed) {
    if (options?.required === false) {
      return { valid: true, normalizedUrl: '' };
    }
    return {
      valid: false,
      normalizedUrl: '',
      error: `${label} is required for this showcase post. Use a live https:// link on .vercel.app, .com, or .name.ng.`,
    };
  }

  if (!/^https:\/\//i.test(trimmed)) {
    return {
      valid: false,
      normalizedUrl: trimmed,
      error: `${label} must start with https:// and point to a live .vercel.app, .com, or .name.ng website.`,
    };
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();

    if (
      parsed.protocol !== 'https:' ||
      !host ||
      parsed.port ||
      parsed.username ||
      parsed.password
    ) {
      return {
        valid: false,
        normalizedUrl: trimmed,
        error: `${label} must be a clean https:// website URL without embedded credentials or custom ports.`,
      };
    }

    if (isBlockedFileStorageHostname(host)) {
      return {
        valid: false,
        normalizedUrl: trimmed,
        error: `Cloud storage and document links (${host}) are allowed in the Private Student Hub, but Public Showcase projects require a live hosted website on .vercel.app, .com, or .name.ng.`,
      };
    }

    if (host.includes('.vercel.app.') || host.includes('.name.ng.')) {
      return {
        valid: false,
        normalizedUrl: trimmed,
        error: `${label} appears to use a deceptive subdomain (${host}). Please use your real .vercel.app, .com, or .name.ng domain.`,
      };
    }

    const labelPart = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?';
    const isVercelDomain =
      host !== 'vercel.app' && new RegExp(`^(?:${labelPart}\\.)+vercel\\.app$`).test(host);
    const isComDomain =
      host !== 'com' && new RegExp(`^(?:${labelPart}\\.)+com$`).test(host);
    const isNameNgDomain =
      host !== 'name.ng' && new RegExp(`^(?:${labelPart}\\.)+name\\.ng$`).test(host);

    if (!isVercelDomain && !isComDomain && !isNameNgDomain) {
      return {
        valid: false,
        normalizedUrl: trimmed,
        error: `${label} must use an approved live website domain: .vercel.app (e.g. https://my-app.vercel.app), .com, or .name.ng. File-sharing/storage hosts are only allowed in the Private Hub.`,
      };
    }

    const normalizedPath = parsed.pathname === '/' && !parsed.search && !parsed.hash ? '' : parsed.pathname;
    return {
      valid: true,
      normalizedUrl: `https://${host}${normalizedPath}${parsed.search}${parsed.hash}`,
    };
  } catch {
    return {
      valid: false,
      normalizedUrl: trimmed,
      error: `Please enter a valid https:// ${label.toLowerCase()} on .vercel.app, .com, or .name.ng.`,
    };
  }
}

/**
 * Enforces that game links strictly match `https://game-name.vercel.app`
 * (HTTPS scheme + single-label `<game-name>.vercel.app` hostname).
 */
export function validateVercelGameUrl(rawUrl: string): VercelGameUrlValidation {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return {
      valid: false,
      normalizedUrl: '',
      error: 'A game link in the format https://game-name.vercel.app is required.',
    };
  }

  if (!trimmed.toLowerCase().startsWith('https://')) {
    return {
      valid: false,
      normalizedUrl: trimmed,
      error: 'Game links must start with https:// and follow the format https://game-name.vercel.app.',
    };
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    const validHost = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.vercel\.app$/.test(host);
    if (parsed.protocol !== 'https:' || !validHost || parsed.port) {
      return {
        valid: false,
        normalizedUrl: trimmed,
        error:
          'Only Vercel game links in the exact format https://game-name.vercel.app are allowed.',
      };
    }

    const normalizedPath = parsed.pathname === '/' ? '' : parsed.pathname;
    return {
      valid: true,
      normalizedUrl: `https://${host}${normalizedPath}${parsed.search}${parsed.hash}`,
    };
  } catch {
    return {
      valid: false,
      normalizedUrl: trimmed,
      error: 'Please enter a valid Vercel game URL in the format https://game-name.vercel.app.',
    };
  }
}

const AUTO_GENERATED_TITLE_PATTERNS = [
  /^.+ — Playable Build$/i,
  /^.+ Playable Game \([^)]+\)$/i,
  /^Playable Game on .+$/i,
  /^.+ — Live Web App$/i,
  /^.+ Web App \([^)]+\)$/i,
  /^.+ — Creator Video$/i,
  /^Creator Video Showcase \([^)]+\)$/i,
  /^.+ — Original Story$/i,
  /^Original Story & Novel \([^)]+\)$/i,
  /^Creator Project on .+$/i,
];

const AUTO_GENERATED_DESC_PATTERNS = [
  /^Playable student-built game hosted on .+\. Click to launch and share playtest feedback in the thread!$/i,
  /^Live web creation published on .+\. Explore the interface, design, and code built by a Build Buds creator\.$/i,
  /^Video devlog, animation, or tutorial shared from .+\. Watch and drop your thoughts below!$/i,
  /^Original serialized novel, worldbuilding lore, or creative writing piece hosted on .+\.$/i,
  /^Shared project link from .+ for the Build Buds community\.$/i,
];

export function isAutoGeneratedTitle(title: string | undefined): boolean {
  const trimmed = (title || '').trim();
  if (!trimmed) return true;
  return AUTO_GENERATED_TITLE_PATTERNS.some((re) => re.test(trimmed));
}

export function isAutoGeneratedDescription(desc: string | undefined): boolean {
  const trimmed = (desc || '').trim();
  if (!trimmed) return true;
  return AUTO_GENERATED_DESC_PATTERNS.some((re) => re.test(trimmed));
}

export function detectCategoryFromUrl(rawUrl: string): CreationCategory | null {
  const normalizedUrl = cleanExtractedUrl(rawUrl);
  let lowerHost = '';
  let lowerPath = '';
  try {
    const parsed = new URL(normalizedUrl);
    lowerHost = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    lowerPath = parsed.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  } catch {
    return null;
  }

  // Dedicated video platforms
  if (
    lowerHost.includes('youtube.com') ||
    lowerHost.includes('youtu.be') ||
    lowerHost.includes('vimeo.com') ||
    lowerHost.includes('loom.com') ||
    lowerHost.includes('tiktok.com') ||
    lowerHost.includes('twitch.tv') ||
    lowerHost.includes('dailymotion.com')
  ) {
    return 'video';
  }

  // Dedicated game hosts & clear game URL slugs
  if (
    lowerHost.includes('itch.io') ||
    lowerHost.includes('scratch.mit.edu') ||
    lowerHost.includes('roblox.com') ||
    lowerHost.includes('kaboom') ||
    lowerHost.includes('phaser') ||
    lowerHost.includes('poki.com') ||
    lowerHost.includes('crazygames.com') ||
    lowerHost.includes('gd.games') ||
    lowerHost.includes('flowlab.io') ||
    lowerHost.includes('construct.net') ||
    lowerHost.includes('newgrounds.com') ||
    lowerHost.includes('kongregate.com') ||
    /\b(game|games|arcade|quest|escape|platformer|shooter|puzzle|dungeon|adventure|tycoon|clicker|simulator|playtest|tetris|snake|chess|racing)\b/.test(
      `${lowerHost.replace(/[-_.]/g, ' ')} ${lowerPath.replace(/[-_/]/g, ' ')}`
    )
  ) {
    return 'game';
  }

  // Dedicated novel / story hosts & slugs
  if (
    lowerHost.includes('wattpad.com') ||
    lowerHost.includes('medium.com') ||
    lowerHost.includes('substack.com') ||
    lowerHost.includes('archiveofourown') ||
    lowerHost.includes('royalroad.com') ||
    lowerHost.includes('webnovel.com') ||
    lowerHost.includes('inkitt.com') ||
    lowerHost.includes('docs.google.com') ||
    /\b(novel|novels|story|stories|chapter|chapters|fiction|book|lore)\b/.test(
      `${lowerHost.replace(/[-_.]/g, ' ')} ${lowerPath.replace(/[-_/]/g, ' ')}`
    )
  ) {
    return 'novel';
  }

  // Cloud drive & external file-sharing resources (valid in Private Student Hub)
  if (
    lowerHost === 'drive.google.com' ||
    lowerHost === 'dropbox.com' ||
    lowerHost.endsWith('.dropbox.com') ||
    lowerHost === 'onedrive.live.com' ||
    lowerHost === '1drv.ms'
  ) {
    return 'other';
  }

  // Clear website / web-app slugs on generic hosting domains or .name.ng domains
  if (
    lowerHost.endsWith('.name.ng') ||
    /\b(website|websites|web|site|portfolio|school|academy|college|university|shop|store|blog|agency|clinic|hospital|dashboard|landing|company|restaurant|library|tracker|calculator|converter|weather|notes|todo|calendar|resume|profile|church)\b/.test(
      `${lowerHost.replace(/[-_.]/g, ' ')} ${lowerPath.replace(/[-_/]/g, ' ')}`
    )
  ) {
    return 'website';
  }

  return null;
}

export function inferCategoryFromHintText(hintText: string): CreationCategory | null {
  const lower = (hintText || '').toLowerCase();
  if (!lower.trim()) return null;

  // 1. Explicit multi-word phrases first so e.g. "website for my game" or "game website" resolves as website,
  //    while "game links" or "playable game" resolves as game.
  if (
    /\b(website link|website links|school website|portfolio website|my website|new website|this website|landing page|web app|webapp|e-commerce|ecommerce|online store)\b/.test(
      lower
    ) ||
    /\bwebsite\s+for\b/.test(lower) ||
    /\bgame\s+website\b/.test(lower)
  ) {
    return 'website';
  }
  if (
    /\b(game link|game links|playable game|my game|new game|this game|2d game|3d game|horror game|survival game|adventure game|puzzle game|video game|play my game|playtest|100 levels|top-down survival)\b/.test(
      lower
    )
  ) {
    return 'game';
  }
  if (/\b(video link|video links|youtube video|devlog|speed-build|trailer|animation)\b/.test(lower)) {
    return 'video';
  }
  if (/\b(novel link|novel links|my novel|new novel|chapter \d+|short story|worldbuilding lore|interactive fiction)\b/.test(lower)) {
    return 'novel';
  }

  // 2. General keyword scoring when explicit compound phrases were not present
  const hasWebsiteCue =
    /\b(website|websites|site|portfolio|school|academy|shop|store|blog|landing|dashboard|calculator|tracker|web app|webapp|clinic|company)\b/.test(
      lower
    );
  const hasGameCue =
    /\b(game|games|playable|arcade|roblox|scratch|itch|level|levels|monster|monsters|horror|survival|platformer|shooter|rpg|tycoon|quest)\b/.test(
      lower
    );
  const hasVideoCue = /\b(video|videos|devlog|youtube|youtu\.be|vimeo|reel|gameplay)\b/.test(lower);
  const hasNovelCue = /\b(novel|novels|story|stories|chapter|chapters|fiction|book|lore)\b/.test(lower);

  if (hasVideoCue && !hasGameCue && !hasWebsiteCue) return 'video';
  if (hasNovelCue && !hasGameCue && !hasWebsiteCue) return 'novel';
  if (hasWebsiteCue && !hasGameCue) return 'website';
  if (hasGameCue && !hasWebsiteCue) return 'game';
  if (hasWebsiteCue && hasGameCue) {
    // If both appear generically, whichever mentions "website"/"portfolio"/"school" explicitly usually describes a website project
    return 'website';
  }
  if (hasVideoCue) return 'video';
  if (hasNovelCue) return 'novel';

  return null;
}

export function generateLinkPreview(
  rawUrl: string,
  overrideCategory?: CreationCategory,
  customTitle?: string,
  customDescription?: string,
  options?: { isExplicitOverride?: boolean }
): LinkPreviewMetadata {
  const normalizedUrl = cleanExtractedUrl(rawUrl);

  let domain = 'buildbuds.community';
  let pathname = '';
  let searchParams: URLSearchParams | null = null;
  try {
    const parsed = new URL(normalizedUrl);
    domain = parsed.hostname.replace(/^www\./i, '');
    pathname = parsed.pathname.replace(/^\/+|\/+$/g, '');
    searchParams = parsed.searchParams;
  } catch {
    domain = 'creator-link.app';
  }

  const urlCategory = detectCategoryFromUrl(normalizedUrl);
  const cleanUserTitle = isAutoGeneratedTitle(customTitle) ? '' : customTitle || '';
  const cleanUserDesc = isAutoGeneratedDescription(customDescription)
    ? ''
    : customDescription || '';
  const titleHintCategory = inferCategoryFromHintText(`${cleanUserTitle} ${cleanUserDesc}`);

  let detectedCategory: CreationCategory = 'website';
  const lowerDomain = domain.toLowerCase();
  const isCloudResourceHost = isBlockedFileStorageHostname(lowerDomain);

  if (options?.isExplicitOverride && overrideCategory && overrideCategory !== 'other') {
    detectedCategory = overrideCategory;
  } else if (
    urlCategory &&
    (urlCategory === 'video' ||
      urlCategory === 'other' ||
      lowerDomain.includes('itch.io') ||
      lowerDomain.includes('scratch.mit.edu') ||
      lowerDomain.includes('roblox.com') ||
      lowerDomain.includes('wattpad.com'))
  ) {
    // Dedicated platform or cloud-resource hosts
    detectedCategory = urlCategory;
  } else if (titleHintCategory) {
    detectedCategory = titleHintCategory;
  } else if (urlCategory) {
    detectedCategory = urlCategory;
  } else if (overrideCategory && overrideCategory !== 'other') {
    detectedCategory = overrideCategory;
  } else if (isCloudResourceHost) {
    detectedCategory = 'other';
  } else {
    detectedCategory = 'website';
  }

  // Build readable title from path, query id, or domain if not provided
  const rawSlugSegment = pathname.split('/').filter(Boolean).pop() || '';
  const slugSegment =
    rawSlugSegment === 'watch' && searchParams?.get('v')
      ? `Video ${searchParams.get('v')}`
      : ['view', 'edit', 'usp'].includes(rawSlugSegment.toLowerCase()) || isCloudResourceHost
        ? ''
        : rawSlugSegment;
  const humanizedSlug = slugSegment
    ? slugSegment
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase())
    : '';

  const DomainLabel = domain
    .split('.')[0]
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  const resourceHostLabel = lowerDomain.includes('drive.google.com')
    ? 'Google Drive Resource'
    : lowerDomain.includes('docs.google.com')
      ? 'Google Docs File'
      : lowerDomain.includes('dropbox.com')
        ? 'Dropbox Shared Resource'
        : lowerDomain.includes('onedrive.live.com') || lowerDomain === '1drv.ms'
          ? 'OneDrive Shared Resource'
          : `Creator Project on ${domain}`;

  const categoryTitles: Record<CreationCategory, string> = {
    game: humanizedSlug
      ? `${humanizedSlug} — Playable Build`
      : `${DomainLabel || 'Creator'} Playable Game (${domain})`,
    website: humanizedSlug
      ? `${humanizedSlug} — Live Web App`
      : `${DomainLabel || 'Interactive'} Web App (${domain})`,
    video: humanizedSlug
      ? `${humanizedSlug} — Creator Video`
      : `Creator Video Showcase (${domain})`,
    novel: humanizedSlug
      ? `${humanizedSlug} — Original Story`
      : `Original Story & Novel (${domain})`,
    other: isCloudResourceHost ? resourceHostLabel : humanizedSlug || `Creator Project on ${domain}`,
  };

  const categoryDescriptions: Record<CreationCategory, string> = {
    game: `Playable student-built game hosted on ${domain}. Click to launch and share playtest feedback in the thread!`,
    website: `Live web creation published on ${domain}. Explore the interface, design, and code built by a Build Buds creator.`,
    video: `Video devlog, animation, or tutorial shared from ${domain}. Watch and drop your thoughts below!`,
    novel: `Original serialized novel, worldbuilding lore, or creative writing piece hosted on ${domain}.`,
    other: isCloudResourceHost
      ? `Shared resource hosted on ${domain} inside the Private Student Hub.`
      : `Shared project link from ${domain} for the Build Buds community.`,
  };

  return {
    url: normalizedUrl.slice(0, 2000),
    domain: domain.slice(0, 120),
    title: (customTitle?.trim() || categoryTitles[detectedCategory]).slice(0, 160),
    description: (
      customDescription?.trim() || categoryDescriptions[detectedCategory]
    ).slice(0, 600),
    category: detectedCategory,
    defaultCoverUrl: DEFAULT_COVERS[detectedCategory],
  };
}

export interface MessageWithOptionalLink {
  text?: string;
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  linkCategory?: CreationCategory;
  linkDomain?: string;
  coverImageUrl?: string;
  categoryManuallySet?: boolean;
}

export interface ResolvedMessageLinkPreview {
  linkUrl: string;
  linkTitle: string;
  linkDescription: string;
  linkCategory: CreationCategory;
  linkDomain: string;
  coverImageUrl: string;
}

/**
 * Resolves a complete link preview for ANY message that either has `linkUrl` set
 * OR contains a URL inside `text` — ensuring that links sent previously, repeated links,
 * or edited links ALWAYS display a complete link preview card with valid cover art
 * and accurate category separation (Games vs Websites vs Videos vs Novels).
 */
export function resolveMessageLinkPreview(
  msg: MessageWithOptionalLink,
  defaultCategory?: CreationCategory
): ResolvedMessageLinkPreview | null {
  const extractedFromText = extractFirstUrl(msg.text || '');
  const rawUrl = (msg.linkUrl || '').trim() || extractedFromText || '';
  if (!rawUrl) return null;

  const normalizedStored = msg.linkUrl ? cleanExtractedUrl(msg.linkUrl) : '';
  const urlChangedInText =
    Boolean(extractedFromText) &&
    Boolean(normalizedStored) &&
    normalizeLinkKey(extractedFromText) !== normalizeLinkKey(normalizedStored) &&
    msg.text?.includes(extractedFromText || '');

  const targetUrl = urlChangedInText && extractedFromText ? extractedFromText : rawUrl;
  const userTitle = urlChangedInText || isAutoGeneratedTitle(msg.linkTitle) ? '' : msg.linkTitle || '';
  const userDesc =
    urlChangedInText || isAutoGeneratedDescription(msg.linkDescription)
      ? ''
      : msg.linkDescription || '';

  const textHintCategory = inferCategoryFromHintText(`${userTitle} ${userDesc} ${msg.text || ''}`);
  const urlCategory = detectCategoryFromUrl(targetUrl);

  let resolvedExplicitCategory: CreationCategory | undefined;
  let isExplicitOverride = false;

  if (msg.categoryManuallySet && msg.linkCategory && msg.linkCategory !== 'other' && !urlChangedInText) {
    resolvedExplicitCategory = msg.linkCategory;
    isExplicitOverride = true;
  } else if (
    urlCategory &&
    (urlCategory === 'video' ||
      targetUrl.toLowerCase().includes('itch.io') ||
      targetUrl.toLowerCase().includes('scratch.mit.edu') ||
      targetUrl.toLowerCase().includes('roblox.com') ||
      targetUrl.toLowerCase().includes('wattpad.com'))
  ) {
    resolvedExplicitCategory = urlCategory;
    isExplicitOverride = true;
  } else if (textHintCategory) {
    resolvedExplicitCategory = textHintCategory;
    isExplicitOverride = true;
  } else if (urlCategory) {
    resolvedExplicitCategory = urlCategory;
    isExplicitOverride = true;
  } else if (msg.linkCategory && msg.linkCategory !== 'other' && !urlChangedInText) {
    resolvedExplicitCategory = msg.linkCategory;
  } else {
    resolvedExplicitCategory = defaultCategory;
  }

  const generated = generateLinkPreview(
    targetUrl,
    resolvedExplicitCategory,
    userTitle || undefined,
    userDesc || undefined,
    { isExplicitOverride }
  );

  // If the resolved category differs from a previously misclassified default cover, pick the category cover;
  // otherwise keep any user-uploaded custom cover artwork.
  const defaultCoverSet = new Set(Object.values(DEFAULT_COVERS));
  const rawSafeCover = normalizeCoverImageUrl(msg.coverImageUrl, generated.category);
  const isLegacyDefaultCover = defaultCoverSet.has(rawSafeCover);

  const safeCover =
    urlChangedInText || isLegacyDefaultCover
      ? generated.defaultCoverUrl
      : rawSafeCover;

  return {
    linkUrl: generated.url,
    linkTitle: generated.title,
    linkDescription: generated.description,
    linkCategory: generated.category,
    linkDomain: msg.linkDomain && !urlChangedInText ? msg.linkDomain : generated.domain,
    coverImageUrl: safeCover,
  };
}

export interface DeduplicatableSharedLinkMessage extends MessageWithOptionalLink {
  id: string;
  channelId: string;
  createdAtMillis: number;
  threadCount?: number;
  showcaseStatus?: 'pending' | 'approved' | 'rejected';
}

export type DeduplicatedSharedLinkItem<T extends DeduplicatableSharedLinkMessage> = T &
  ResolvedMessageLinkPreview & {
    normalizedLinkKey: string;
    duplicateCount: number;
  };

/**
 * Finds an existing message in the target channel (or sub-group) that already shares the same canonical URL.
 */
export function findDuplicateLinkMessage<
  T extends { id: string; channelId: string; text?: string; linkUrl?: string }
>(messages: T[], candidateUrl: string | undefined | null, targetChannelId?: string): T | null {
  const key = normalizeLinkKey(candidateUrl);
  if (!key) return null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (targetChannelId && m.channelId !== targetChannelId) continue;
    const msgUrl = (m.linkUrl || '').trim() || extractFirstUrl(m.text || '');
    if (normalizeLinkKey(msgUrl) === key) {
      return m;
    }
  }
  return null;
}

/**
 * Deduplicates shared creation links by canonical URL so identical links are never repeated
 * over and over again in All Shared Links or category link directories.
 */
export function deduplicateSharedLinks<T extends DeduplicatableSharedLinkMessage>(
  items: T[],
  channelDefaultCategories: Record<string, CreationCategory> = {
    games: 'game',
    websites: 'website',
    videos: 'video',
    novels: 'novel',
  }
): Array<DeduplicatedSharedLinkItem<T>> {
  const byKey = new Map<string, DeduplicatedSharedLinkItem<T>>();

  for (const item of items) {
    const baseChannel = String(item.channelId || '').split('__group__')[0];
    const resolved = resolveMessageLinkPreview(item, channelDefaultCategories[baseChannel]);
    if (!resolved) continue;

    const key = normalizeLinkKey(resolved.linkUrl);
    if (!key) continue;

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        ...item,
        ...resolved,
        normalizedLinkKey: key,
        duplicateCount: 1,
      });
      continue;
    }

    const nextCount = existing.duplicateCount + 1;
    const preferIncoming = item.createdAtMillis >= existing.createdAtMillis;
    const bestBase = preferIncoming ? item : existing;
    const bestResolved = preferIncoming ? resolved : existing;

    // Preserve a custom cover if either entry has a non-default uploaded cover
    const defaultSet = new Set(Object.values(DEFAULT_COVERS));
    const preferredCover =
      !defaultSet.has(resolved.coverImageUrl)
        ? resolved.coverImageUrl
        : !defaultSet.has(existing.coverImageUrl)
          ? existing.coverImageUrl
          : bestResolved.coverImageUrl;

    byKey.set(key, {
      ...bestBase,
      linkUrl: bestResolved.linkUrl,
      linkTitle: bestResolved.linkTitle,
      linkDescription: bestResolved.linkDescription,
      linkCategory: bestResolved.linkCategory,
      linkDomain: bestResolved.linkDomain,
      coverImageUrl: preferredCover,
      threadCount: Math.max(Number(existing.threadCount || 0), Number(item.threadCount || 0)),
      showcaseStatus:
        existing.showcaseStatus === 'approved' || item.showcaseStatus === 'approved'
          ? 'approved'
          : bestBase.showcaseStatus,
      normalizedLinkKey: key,
      duplicateCount: nextCount,
    });
  }

  return Array.from(byKey.values()).sort((a, b) => b.createdAtMillis - a.createdAtMillis);
}


/**
 * Compresses an uploaded image file via HTML5 Canvas into a compact JPEG Data URL (<100KB)
 * so it can be stored directly inside Firestore documents without exceeding the 1MB limit.
 */
export function compressCoverImage(
  file: File,
  maxWidth = 640,
  maxHeight = 380,
  quality = 0.76
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select a valid image file (PNG, JPG, WebP).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode image file.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable.'));
          return;
        }

        ctx.fillStyle = '#0c0c18';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
