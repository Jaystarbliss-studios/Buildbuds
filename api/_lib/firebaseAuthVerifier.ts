import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const AUTHORIZED_ADMIN_EMAIL = 'johnrufai242@gmail.com';

export interface VerifiedAuthUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  isAdmin: boolean;
}

function getFirebaseWebApiKey(): string {
  if (process.env.FIREBASE_API_KEY) return process.env.FIREBASE_API_KEY;
  if (process.env.VITE_FIREBASE_API_KEY) return process.env.VITE_FIREBASE_API_KEY;
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (raw.apiKey) return raw.apiKey;
    }
  } catch {
    // Ignore
  }
  return '';
}

/**
 * Verifies a Firebase ID token from the `Authorization: Bearer <token>` header.
 * Uses Google Identity Toolkit (`accounts:lookup`) to cryptographically verify the live token
 * against Firebase Auth servers and validates optional `FB_ADMIN_SERVICE_ACCOUNT_JSON` configuration.
 */
export async function verifyFirebaseIdTokenFromHeader(
  authHeader: string | undefined
): Promise<VerifiedAuthUser> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization Bearer header.');
  }

  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken) {
    throw new Error('Empty Firebase ID token.');
  }

  // Validate FB_ADMIN_SERVICE_ACCOUNT_JSON format if configured in environment
  const rawServiceAccount = process.env.FB_ADMIN_SERVICE_ACCOUNT_JSON;
  if (rawServiceAccount && rawServiceAccount.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(rawServiceAccount);
      if (!parsed.project_id || !parsed.client_email) {
        console.warn('FB_ADMIN_SERVICE_ACCOUNT_JSON is missing project_id or client_email.');
      }
    } catch {
      console.warn('FB_ADMIN_SERVICE_ACCOUNT_JSON is not valid JSON.');
    }
  }

  const apiKey = getFirebaseWebApiKey();
  if (!apiKey) {
    throw new Error('Firebase API key is not configured on the server.');
  }

  const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
    apiKey
  )}`;

  const response = await fetch(verifyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    throw new Error('Invalid or expired Firebase authentication token.');
  }

  const data = (await response.json()) as {
    users?: Array<{
      localId: string;
      email?: string;
      emailVerified?: boolean;
      displayName?: string;
      customAttributes?: string;
    }>;
  };

  const userRecord = data.users?.[0];
  if (!userRecord || !userRecord.localId) {
    throw new Error('Firebase user record could not be verified.');
  }

  let hasCustomAdminClaim = false;
  if (userRecord.customAttributes) {
    try {
      const attrs = JSON.parse(userRecord.customAttributes);
      if (attrs.admin === true || attrs.role === 'admin') {
        hasCustomAdminClaim = true;
      }
    } catch {
      // Ignore
    }
  }

  const email = (userRecord.email || '').toLowerCase();
  const emailVerified = Boolean(userRecord.emailVerified);
  const isBootstrapAdmin = email === AUTHORIZED_ADMIN_EMAIL.toLowerCase() && emailVerified;

  return {
    uid: userRecord.localId,
    email: userRecord.email || '',
    emailVerified,
    displayName: userRecord.displayName,
    isAdmin: hasCustomAdminClaim || isBootstrapAdmin,
  };
}

/**
 * Generates a SHA-1 signature for signed Cloudinary uploads (`CLOUDINARY_API_SECRET`).
 */
export function signCloudinaryParameters(
  paramsToSign: Record<string, string | number>,
  apiSecret: string
): string {
  const sortedKeys = Object.keys(paramsToSign).sort();
  const serialized = sortedKeys
    .filter((k) => paramsToSign[k] !== undefined && paramsToSign[k] !== '')
    .map((k) => `${k}=${paramsToSign[k]}`)
    .join('&');

  return crypto
    .createHash('sha1')
    .update(`${serialized}${apiSecret}`)
    .digest('hex');
}
