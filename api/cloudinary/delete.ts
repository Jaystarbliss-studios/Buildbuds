import {
  verifyFirebaseIdTokenFromHeader,
  signCloudinaryParameters,
} from '../_lib/firebaseAuthVerifier.ts';
import type { ApiRequest, ApiResponse } from './signature.ts';

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
      publicId?: string;
      ownerUid?: string;
    };

    if (!body.publicId) {
      return res.status(400).json({ error: 'publicId is required.' });
    }

    // Only allow the owner or an authorized admin to delete an asset
    if (body.ownerUid && body.ownerUid !== verifiedUser.uid && !verifiedUser.isAdmin) {
      return res.status(403).json({
        error: 'Forbidden: Only the post owner or an administrator can delete this image.',
      });
    }

    const cloudName =
      process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || '';
    const apiKey = process.env.CLOUDINARY_API_KEY || '';
    const apiSecret = process.env.CLOUDINARY_API_SECRET || '';

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(200).json({
        deleted: false,
        note: 'Cloudinary server credentials not configured; skipped remote asset deletion.',
      });
    }

    const timestamp = Math.round(Date.now() / 1000);
    const signature = signCloudinaryParameters(
      {
        public_id: body.publicId,
        timestamp,
      },
      apiSecret
    );

    const formParams = new URLSearchParams();
    formParams.append('public_id', body.publicId);
    formParams.append('api_key', apiKey);
    formParams.append('timestamp', String(timestamp));
    formParams.append('signature', signature);

    const destroyRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formParams.toString(),
      }
    );

    const destroyData = await destroyRes.json().catch(() => ({}));
    return res.status(200).json({
      deleted: destroyRes.ok,
      result: destroyData,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unauthorized delete request.';
    return res.status(401).json({ error: message });
  }
}
