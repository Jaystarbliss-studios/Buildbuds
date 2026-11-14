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

const DEFAULT_COVERS: Record<CreationCategory, string> = {
  game: '/assets/aistudio/extracted/card-galaxy.png',
  website: '/assets/aistudio/extracted/card-math.png',
  video: '/assets/aistudio/extracted/community-collab.png',
  novel: '/assets/aistudio/extracted/card-eco.png',
  other: '/assets/aistudio/extracted/card-pixel.png',
};

export function cleanExtractedUrl(raw: string): string {
  // Strip trailing sentence punctuation that is not part of the URL
  let cleaned = raw.trim().replace(/[.,!?;:'"\])>]+$/, '');
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned;
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
    /(?:^|\s)((?![a-z0-9._%+-]+@)(?:[a-z0-9-]+\.)+(?:vercel\.app|netlify\.app|github\.io|github\.com|itch\.io|scratch\.mit\.edu|roblox\.com|youtube\.com|youtu\.be|vimeo\.com|loom\.com|wattpad\.com|docs\.google\.com|replit\.com|codepen\.io|codesandbox\.io|com|org|net|io|app|dev|edu|gg)(?:\/[^\s<>"]*)?)/i
  );
  if (bareMatch) {
    return cleanExtractedUrl(bareMatch[1]);
  }
  return null;
}

export function generateLinkPreview(
  rawUrl: string,
  overrideCategory?: CreationCategory,
  customTitle?: string,
  customDescription?: string
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

  const lowerHost = domain.toLowerCase();
  const lowerPath = pathname.toLowerCase();

  let detectedCategory: CreationCategory = overrideCategory || 'website';
  if (!overrideCategory || overrideCategory === 'other') {
    if (
      lowerHost.includes('itch.io') ||
      lowerHost.includes('scratch.mit.edu') ||
      lowerHost.includes('roblox.com') ||
      lowerHost.includes('kaboom') ||
      lowerHost.includes('phaser') ||
      lowerPath.includes('game') ||
      lowerPath.includes('quest') ||
      lowerPath.includes('arcade')
    ) {
      detectedCategory = 'game';
    } else if (
      lowerHost.includes('youtube.com') ||
      lowerHost.includes('youtu.be') ||
      lowerHost.includes('vimeo.com') ||
      lowerHost.includes('loom.com') ||
      lowerHost.includes('tiktok.com')
    ) {
      detectedCategory = 'video';
    } else if (
      lowerHost.includes('wattpad.com') ||
      lowerHost.includes('medium.com') ||
      lowerHost.includes('substack.com') ||
      lowerHost.includes('archiveofourown') ||
      lowerHost.includes('royalroad.com') ||
      lowerHost.includes('docs.google.com') ||
      lowerPath.includes('novel') ||
      lowerPath.includes('story') ||
      lowerPath.includes('chapter')
    ) {
      detectedCategory = 'novel';
    } else if (!overrideCategory) {
      detectedCategory = 'website';
    }
  }

  // Build readable title from path, query id, or domain if not provided
  const rawSlugSegment = pathname.split('/').filter(Boolean).pop() || '';
  const slugSegment =
    rawSlugSegment === 'watch' && searchParams?.get('v')
      ? `Video ${searchParams.get('v')}`
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
    other: humanizedSlug || `Creator Project on ${domain}`,
  };

  const categoryDescriptions: Record<CreationCategory, string> = {
    game: `Playable student-built game hosted on ${domain}. Click to launch and share playtest feedback in the thread!`,
    website: `Live web creation published on ${domain}. Explore the interface, design, and code built by a Build Buds creator.`,
    video: `Video devlog, animation, or tutorial shared from ${domain}. Watch and drop your thoughts below!`,
    novel: `Original serialized novel, worldbuilding lore, or creative writing piece hosted on ${domain}.`,
    other: `Shared project link from ${domain} for the Build Buds community.`,
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
 * or edited links ALWAYS display a complete link preview card.
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
    extractedFromText !== normalizedStored &&
    msg.text?.includes(extractedFromText || '');

  const targetUrl = urlChangedInText && extractedFromText ? extractedFromText : rawUrl;
  const generated = generateLinkPreview(
    targetUrl,
    msg.linkCategory || defaultCategory,
    urlChangedInText ? undefined : msg.linkTitle,
    urlChangedInText ? undefined : msg.linkDescription
  );

  return {
    linkUrl: generated.url,
    linkTitle: generated.title,
    linkDescription: generated.description,
    linkCategory: generated.category,
    linkDomain: msg.linkDomain && !urlChangedInText ? msg.linkDomain : generated.domain,
    coverImageUrl:
      msg.coverImageUrl && !urlChangedInText
        ? msg.coverImageUrl
        : generated.defaultCoverUrl,
  };
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
