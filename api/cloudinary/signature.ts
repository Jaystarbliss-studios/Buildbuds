import {
  verifyFirebaseIdTokenFromHeader,
  signCloudinaryParameters,
} from '../_lib/firebaseAuthVerifier.ts';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

export interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (payload: unknown) => void;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const authHeader = Array.isArray(req.headers.authorization)
      ? req.headers.authorization[0]
      : req.headers.authorization;
    const verifiedUser = await verifyFirebaseIdTokenFromHeader(authHeader);

    const body = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}) as {
      fileName?: string;
      fileType?: string;
      fileSize?: number;
    };

    if (body.fileType && !ALLOWED_MIME_TYPES.includes(body.fileType.toLowerCase())) {
      return res.status(400).json({
        error: 'Unsupported image MIME type. Allowed: JPEG, PNG, WebP, AVIF.',
      });
    }

    if (typeof body.fileSize === 'number' && body.fileSize > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({
        error: 'Image exceeds maximum size limit of 5 MB.',
      });
    }

    const cloudName =
      process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || '';
    const apiKey = process.env.CLOUDINARY_API_KEY || '';
    const apiSecret = process.env.CLOUDINARY_API_SECRET || '';
    const uploadPreset =
      process.env.CLOUDINARY_UPLOAD_PRESET || 'buildbuds-public-posts';
    const folder = process.env.CLOUDINARY_UPLOAD_FOLDER || 'buildbuds/public-posts';

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(503).json({
        error:
          'Cloudinary signed upload credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are not configured on the server.',
      });
    }

    const timestamp = Math.round(Date.now() / 1000);
    const context = `owner_uid=${verifiedUser.uid}`;

    const paramsToSign: Record<string, string | number> = {
      context,
      folder,
      timestamp,
      upload_preset: uploadPreset,
    };

    const signature = signCloudinaryParameters(paramsToSign, apiSecret);

    return res.status(200).json({
      signature,
      timestamp,
      cloudName,
      apiKey,
      uploadPreset,
      folder,
      context,
      ownerUid: verifiedUser.uid,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unauthorized upload signature request.';
    return res.status(401).json({ error: message });
  }
}
