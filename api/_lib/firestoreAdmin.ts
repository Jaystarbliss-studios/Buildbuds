import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

interface ServiceAccountJson {
  project_id: string;
  private_key: string;
  client_email: string;
  token_uri?: string;
}

interface FirebaseRuntimeConfig {
  projectId: string;
  databaseId: string;
}

let cachedToken: { accessToken: string; expiresAtMs: number; clientEmail: string } | null = null;

function getFirebaseRuntimeConfig(): FirebaseRuntimeConfig {
  let projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || '';
  let databaseId =
    process.env.FIREBASE_DATABASE_ID ||
    process.env.VITE_FIREBASE_DATABASE_ID ||
    '(default)';

  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const raw = JSON.parse(fs.readFileSync(configPath, 'utf8')) as {
        projectId?: string;
        firestoreDatabaseId?: string;
      };
      if (!projectId && raw.projectId) projectId = raw.projectId;
      if (raw.firestoreDatabaseId) databaseId = raw.firestoreDatabaseId;
    }
  } catch {
    // Fallback to env/service account
  }

  const sa = parseServiceAccountJson();
  if (!projectId && sa?.project_id) {
    projectId = sa.project_id;
  }

  return {
    projectId,
    databaseId: databaseId || '(default)',
  };
}

function parseServiceAccountJson(): ServiceAccountJson | null {
  const raw = process.env.FB_ADMIN_SERVICE_ACCOUNT_JSON;
  if (!raw || !raw.trim().startsWith('{')) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccountJson>;
    if (!parsed.project_id || !parsed.private_key || !parsed.client_email) {
      return null;
    }
    return {
      project_id: parsed.project_id,
      private_key: parsed.private_key.replace(/\\n/g, '\n'),
      client_email: parsed.client_email,
      token_uri: parsed.token_uri || 'https://oauth2.googleapis.com/token',
    };
  } catch {
    return null;
  }
}

export function isFirestoreAdminConfigured(): boolean {
  const sa = parseServiceAccountJson();
  const cfg = getFirebaseRuntimeConfig();
  return Boolean(sa && cfg.projectId);
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function getAdminAccessToken(): Promise<string> {
  const sa = parseServiceAccountJson();
  if (!sa) {
    throw new Error('FB_ADMIN_SERVICE_ACCOUNT_JSON is not configured on the server.');
  }

  const nowMs = Date.now();
  if (
    cachedToken &&
    cachedToken.clientEmail === sa.client_email &&
    cachedToken.expiresAtMs - 60_000 > nowMs
  ) {
    return cachedToken.accessToken;
  }

  const nowSec = Math.floor(nowMs / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64UrlEncode(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: sa.token_uri || 'https://oauth2.googleapis.com/token',
      exp: nowSec + 3600,
      iat: nowSec,
    })
  );

  const signingInput = `${header}.${claim}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = base64UrlEncode(signer.sign(sa.private_key));
  const assertion = `${signingInput}.${signature}`;

  const tokenResponse = await fetch(sa.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  });

  if (!tokenResponse.ok) {
    const errText = await tokenResponse.text().catch(() => '');
    throw new Error(`Failed to authenticate Firebase Admin service account (${tokenResponse.status}): ${errText}`);
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!tokenData.access_token) {
    throw new Error('Service account OAuth2 response did not contain an access_token.');
  }

  cachedToken = {
    accessToken: tokenData.access_token,
    expiresAtMs: nowMs + (tokenData.expires_in || 3600) * 1000,
    clientEmail: sa.client_email,
  };

  return cachedToken.accessToken;
}

export function getDocumentsBasePath(): string {
  const { projectId, databaseId } = getFirebaseRuntimeConfig();
  return `projects/${projectId}/databases/${databaseId}/documents`;
}

export function getDocumentsBaseUrl(): string {
  return `https://firestore.googleapis.com/v1/${getDocumentsBasePath()}`;
}

export type FirestoreValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { timestampValue: string }
  | { stringValue: string }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

export function encodeFirestoreValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }
  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return { integerValue: String(value) };
    }
    return { doubleValue: value };
  }
  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }
  if (typeof value === 'string') {
    return { stringValue: value };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((item) => encodeFirestoreValue(item)),
      },
    };
  }
  if (typeof value === 'object') {
    const fields: Record<string, FirestoreValue> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        fields[k] = encodeFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

export function encodeFirestoreFields(obj: Record<string, unknown>): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      fields[k] = encodeFirestoreValue(v);
    }
  }
  return fields;
}

export function decodeFirestoreValue(val: FirestoreValue | undefined): unknown {
  if (!val) return undefined;
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('timestampValue' in val) return val.timestampValue;
  if ('stringValue' in val) return val.stringValue;
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map((v) => decodeFirestoreValue(v));
  }
  if ('mapValue' in val) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      out[k] = decodeFirestoreValue(v);
    }
    return out;
  }
  return undefined;
}

export function decodeFirestoreDocument<T = Record<string, unknown>>(doc: {
  name?: string;
  fields?: Record<string, FirestoreValue>;
}): (T & { _id: string }) | null {
  if (!doc || !doc.fields) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    out[k] = decodeFirestoreValue(v);
  }
  const id = doc.name ? doc.name.split('/').pop() || '' : '';
  return { ...(out as T), _id: id };
}

export async function adminGetDoc<T = Record<string, unknown>>(
  relativeDocPath: string
): Promise<(T & { _id: string }) | null> {
  const token = await getAdminAccessToken();
  const cleanPath = relativeDocPath.replace(/^\/+/, '');
  const url = `${getDocumentsBaseUrl()}/${cleanPath}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Firestore Admin GET failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as {
    name?: string;
    fields?: Record<string, FirestoreValue>;
  };
  return decodeFirestoreDocument<T>(data);
}

export async function adminBatchGetDocs(
  relativeDocPaths: string[],
  transaction?: string
): Promise<Map<string, Record<string, unknown> | null>> {
  const token = await getAdminAccessToken();
  const basePath = getDocumentsBasePath();
  const url = `${getDocumentsBaseUrl()}:batchGet`;
  const fullPaths = relativeDocPaths.map((p) => `${basePath}/${p.replace(/^\/+/, '')}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      documents: fullPaths,
      ...(transaction ? { transaction } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Firestore Admin batchGet failed (${res.status}): ${text}`);
  }

  const rows = (await res.json()) as Array<{
    found?: { name: string; fields?: Record<string, FirestoreValue> };
    missing?: string;
  }>;

  const result = new Map<string, Record<string, unknown> | null>();
  for (const row of rows) {
    if (row.found?.name) {
      const rel = row.found.name.slice(row.found.name.indexOf('/documents/') + '/documents/'.length);
      result.set(rel, decodeFirestoreDocument(row.found));
    } else if (row.missing) {
      const rel = row.missing.slice(row.missing.indexOf('/documents/') + '/documents/'.length);
      result.set(rel, null);
    }
  }
  return result;
}

export interface FirestoreTransactionWrite {
  relativeDocPath: string;
  data: Record<string, unknown>;
  /** Specify `mergeFields` for partial merge updates instead of full overwrite */
  mergeFields?: string[];
  preconditionExists?: boolean;
}

export async function adminBeginTransaction(): Promise<string> {
  const token = await getAdminAccessToken();
  const url = `${getDocumentsBaseUrl()}:beginTransaction`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      options: { readWrite: {} },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Firestore Admin beginTransaction failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as { transaction?: string };
  if (!data.transaction) {
    throw new Error('Firestore beginTransaction returned no transaction token.');
  }
  return data.transaction;
}

export async function adminCommitTransaction(
  transaction: string,
  writes: FirestoreTransactionWrite[]
): Promise<void> {
  const token = await getAdminAccessToken();
  const basePath = getDocumentsBasePath();
  const url = `${getDocumentsBaseUrl()}:commit`;

  const formattedWrites = writes.map((w) => {
    const cleanRel = w.relativeDocPath.replace(/^\/+/, '');
    const writeObj: Record<string, unknown> = {
      update: {
        name: `${basePath}/${cleanRel}`,
        fields: encodeFirestoreFields(w.data),
      },
    };
    if (w.mergeFields && w.mergeFields.length > 0) {
      writeObj.updateMask = { fieldPaths: w.mergeFields };
    }
    if (typeof w.preconditionExists === 'boolean') {
      writeObj.currentDocument = { exists: w.preconditionExists };
    }
    return writeObj;
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transaction,
      writes: formattedWrites,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Firestore Admin commit failed (${res.status}): ${text}`) as Error & {
      statusCode?: number;
    };
    err.statusCode = res.status;
    throw err;
  }
}

export function buildAutoFirestoreId(): string {
  return crypto.randomBytes(12).toString('hex');
}
