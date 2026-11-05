import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  EmailAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  updatePassword,
  linkWithCredential,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  writeBatch,
  increment,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import firebaseAppletConfig from '../firebase-applet-config.json';
import { getDefaultPresetAvatar } from './utils/avatars.ts';
import type {
  CommunityMembership,
  StudentAccessRequest,
  StudentAccessStatus,
} from './types/community.ts';

// Support VITE_FIREBASE_*, FIREBASE_* (without VITE_), and fallback to firebase-applet-config.json
const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || env.FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || env.FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket,
  messagingSenderId:
    env.VITE_FIREBASE_MESSAGING_SENDER_ID || env.FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || env.FIREBASE_APP_ID || firebaseAppletConfig.appId,
};

const firestoreDatabaseId =
  env.VITE_FIREBASE_DATABASE_ID || env.FIREBASE_DATABASE_ID || firebaseAppletConfig.firestoreDatabaseId;

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Explicitly enforce browser local persistence so returning users stay signed in across sessions
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Auth persistence setup warning:', err);
});

export const db = getFirestore(app, firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export {
  EmailAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  updatePassword,
  linkWithCredential,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  writeBatch,
  increment,
  arrayUnion,
  arrayRemove,
};
export type { User };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const ADMIN_EMAIL = 'johnrufai242@gmail.com';
export const AVATAR_COLORS = ['#FFF025', '#B11469', '#C15D00'];

export type UserAccountStatus = 'active' | 'suspended' | 'banned';

export interface BuilderProfile {
  uid: string;
  displayName: string;
  schoolName: string;
  gradeLevel: string;
  primaryInterest: string;
  avatarUrl?: string;
  avatarColor: string;
  role: 'member' | 'moderator' | 'admin';
  status?: UserAccountStatus;
  accountType?: 'public' | 'student';
  publishingDisabled?: boolean;
  bookmarkedPostIds?: string[];
  acceptedGuidelines: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CommunityGlobalSettings {
  cooldownSeconds: number;
  disableCooldown: boolean;
  banLinks: boolean;
  enableLinkPreviews: boolean;
  globalChatLocked: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

export interface CommunityChannelConfig {
  id: string;
  name: string;
  category: 'INFORMATION' | 'CREATOR SHOWCASES' | 'SOCIAL';
  emoji: string;
  description: string;
  defaultCreationCategory?: 'game' | 'website' | 'video' | 'novel' | 'other';
  isCustom: boolean;
  isLocked: boolean;
  banLinks: boolean;
  enableLinkPreviews: boolean;
  cooldownSeconds: number; // -1 means use global default
  allowMemberMessages: boolean;
  allowMemberGroups: boolean;
  allowMemberInvites: boolean;
  moderatorIds: string[];
  kickedUserIds: string[];
  updatedAt?: string;
}

export interface CommunitySubGroup {
  id: string;
  channelId: string;
  name: string;
  description: string;
  isPrivate: boolean;
  createdBy: string;
  memberIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

export function isSuperAdminUser(user?: User | null, profile?: BuilderProfile | null): boolean {
  if (user?.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  if (profile?.role === 'admin') {
    return true;
  }
  return false;
}

function normalizeIsoTimestamp(val: unknown, fallbackIso: string): string {
  if (typeof val === 'string' && val.trim().length > 0) {
    return val;
  }
  if (
    val &&
    typeof val === 'object' &&
    'toDate' in val &&
    typeof (val as { toDate: () => Date }).toDate === 'function'
  ) {
    try {
      return (val as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return fallbackIso;
    }
  }
  return fallbackIso;
}

/**
 * Determines whether a user is an approved Student Hub member based on their admin status,
 * `communityMemberships/{uid}`, `studentAccessRequests/{uid}`, or pre-existing Student Hub builder profile.
 */
export function isApprovedStudentMember(params: {
  user?: User | null;
  profile?: BuilderProfile | null;
  membership?: CommunityMembership | null;
  studentRequest?: StudentAccessRequest | null;
}): boolean {
  const { user, profile, membership, studentRequest } = params;
  if (!user) return false;
  if (isSuperAdminUser(user, profile)) return true;

  if (membership?.status === 'approved') return true;
  if (membership?.status === 'suspended' || membership?.status === 'revoked') return false;

  if (studentRequest?.status === 'approved') return true;
  if (
    studentRequest?.status === 'pending' ||
    studentRequest?.status === 'rejected' ||
    studentRequest?.status === 'more_information_required' ||
    studentRequest?.status === 'suspended'
  ) {
    return false;
  }

  if (profile && profile.status !== 'banned' && profile.status !== 'suspended') {
    if (
      profile.accountType === 'student' ||
      profile.role === 'moderator' ||
      profile.role === 'admin' ||
      (profile.accountType !== 'public' && Boolean(profile.schoolName?.trim()))
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Builds a complete in-memory BuilderProfile from a Firebase User and optional overrides,
 * guaranteeing that a signed-in user always has a valid profile state even while Firestore syncs.
 */
export function buildFallbackBuilderProfile(
  user: User,
  overrides?: Partial<BuilderProfile>
): BuilderProfile {
  const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const colorIndex = (user.uid ? user.uid.charCodeAt(0) : 0) % AVATAR_COLORS.length;
  const presetAvatar = getDefaultPresetAvatar(user.uid || 'default');
  const nowIso = new Date().toISOString();
  const cleanSchool = overrides?.schoolName?.trim() || '';
  const effectiveRole = isAdmin ? 'admin' : overrides?.role || 'member';

  const inferredAccountType: 'public' | 'student' =
    isAdmin ||
    overrides?.accountType === 'student' ||
    effectiveRole === 'moderator' ||
    effectiveRole === 'admin' ||
    (overrides?.accountType !== 'public' && cleanSchool.length > 0)
      ? 'student'
      : 'public';

  return {
    uid: user.uid,
    displayName:
      overrides?.displayName?.trim() ||
      user.displayName ||
      (user.email ? user.email.split('@')[0] : 'Creator'),
    schoolName: cleanSchool,
    gradeLevel: overrides?.gradeLevel || '',
    primaryInterest: overrides?.primaryInterest || 'Creative Projects',
    avatarUrl: overrides?.avatarUrl || user.photoURL || presetAvatar.id,
    avatarColor: overrides?.avatarColor || AVATAR_COLORS[colorIndex],
    role: effectiveRole,
    status: overrides?.status || 'active',
    accountType: inferredAccountType,
    publishingDisabled: overrides?.publishingDisabled ?? false,
    bookmarkedPostIds: Array.isArray(overrides?.bookmarkedPostIds)
      ? overrides.bookmarkedPostIds
      : [],
    acceptedGuidelines: overrides?.acceptedGuidelines ?? true,
    createdAt: normalizeIsoTimestamp(overrides?.createdAt, nowIso),
    updatedAt: normalizeIsoTimestamp(overrides?.updatedAt, nowIso),
  };
}

// Check if a user already has a registered BuilderProfile in the database without creating one
export async function checkExistingBuilderProfile(user: User): Promise<BuilderProfile | null> {
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const raw = snap.data() as Partial<BuilderProfile>;
      const isAdminEmail = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      const hasLegacySchool = Boolean(raw.schoolName && raw.schoolName.trim().length > 0);
      const inferredType: 'public' | 'student' =
        isAdminEmail ||
        raw.accountType === 'student' ||
        raw.role === 'moderator' ||
        raw.role === 'admin' ||
        (raw.accountType !== 'public' && hasLegacySchool)
          ? 'student'
          : 'public';

      const normalized = buildFallbackBuilderProfile(user, {
        ...raw,
        role: isAdminEmail ? 'admin' : raw.role || 'member',
        status: raw.status || 'active',
        accountType: inferredType,
        acceptedGuidelines: raw.acceptedGuidelines ?? true,
      });

      if (isAdminEmail && raw.role !== 'admin') {
        try {
          await setDoc(userRef, normalized, { merge: true });
        } catch {
          // Non-blocking if merge fails
        }
      }
      return normalized;
    }
    return null;
  } catch (err) {
    console.warn('Could not read existing user profile:', err);
    return null;
  }
}

/**
 * Ensures a basic public user profile exists in `users/{uid}` after Google sign-in.
 * Does NOT overwrite existing accounts and does NOT grant Student Hub access unless overrides are supplied.
 */
export async function ensurePublicUserProfile(
  user: User,
  overrides?: Partial<BuilderProfile>
): Promise<BuilderProfile> {
  const existing = await checkExistingBuilderProfile(user);
  if (existing) {
    if (overrides && Object.keys(overrides).length > 0) {
      const updatedExisting = buildFallbackBuilderProfile(user, {
        ...existing,
        ...overrides,
        role: existing.role,
        status: existing.status,
        accountType: overrides.accountType || existing.accountType,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      });
      try {
        await setDoc(doc(db, 'users', user.uid), updatedExisting, { merge: true });
      } catch (err) {
        console.warn('Could not merge profile updates to Firestore:', err);
      }
      return updatedExisting;
    }
    return existing;
  }

  const userRef = doc(db, 'users', user.uid);
  const privateRef = doc(db, 'users_private', user.uid);
  const newProfile = buildFallbackBuilderProfile(user, overrides);

  try {
    await setDoc(userRef, newProfile);
  } catch (err) {
    console.warn('Could not write new user profile to Firestore, using in-memory profile:', err);
  }

  if (user.email) {
    try {
      await setDoc(
        privateRef,
        {
          uid: user.uid,
          email: user.email,
          createdAt: newProfile.createdAt || new Date().toISOString(),
        },
        { merge: true }
      );
    } catch {
      // Non-fatal
    }
  }

  return newProfile;
}

// Explicitly register or update a user profile in the database during Sign Up
export async function registerBuilderProfile(
  user: User,
  overrides?: Partial<BuilderProfile>
): Promise<BuilderProfile> {
  return ensurePublicUserProfile(user, {
    primaryInterest: 'Games & Simulations',
    ...overrides,
  });
}

export async function ensureBuilderProfile(
  user: User,
  overrides?: Partial<BuilderProfile>
): Promise<BuilderProfile> {
  return ensurePublicUserProfile(user, overrides);
}

/**
 * Checks the user's current Student Hub membership and access request status.
 */
export async function getStudentAccessState(
  user: User,
  profile?: BuilderProfile | null
): Promise<{
  isApprovedForHub: boolean;
  accessStatus: StudentAccessStatus;
  membership: CommunityMembership | null;
  request: StudentAccessRequest | null;
}> {
  if (isSuperAdminUser(user, profile)) {
    return {
      isApprovedForHub: true,
      accessStatus: 'approved',
      membership: {
        uid: user.uid,
        email: user.email || ADMIN_EMAIL,
        displayName: profile?.displayName || user.displayName || 'Admin',
        status: 'approved',
        approvedBy: user.uid,
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      request: null,
    };
  }

  let membership: CommunityMembership | null = null;
  let request: StudentAccessRequest | null = null;
  let resolvedProfile: BuilderProfile | null = profile || null;

  try {
    const membershipSnap = await getDoc(doc(db, 'communityMemberships', user.uid));
    if (membershipSnap.exists()) {
      membership = membershipSnap.data() as CommunityMembership;
    }
  } catch {
    // Ignore permission errors if doc doesn't exist
  }

  try {
    const reqSnap = await getDoc(doc(db, 'studentAccessRequests', user.uid));
    if (reqSnap.exists()) {
      request = reqSnap.data() as StudentAccessRequest;
    }
  } catch {
    // Ignore
  }

  if (!resolvedProfile) {
    resolvedProfile = await checkExistingBuilderProfile(user);
  }

  const approved = isApprovedStudentMember({
    user,
    profile: resolvedProfile,
    membership,
    studentRequest: request,
  });

  if (approved) {
    return {
      isApprovedForHub: true,
      accessStatus: 'approved',
      membership,
      request,
    };
  }

  if (membership?.status === 'suspended' || request?.status === 'suspended') {
    return {
      isApprovedForHub: false,
      accessStatus: 'suspended',
      membership,
      request,
    };
  }

  if (request) {
    return {
      isApprovedForHub: false,
      accessStatus: request.status,
      membership,
      request,
    };
  }

  return {
    isApprovedForHub: false,
    accessStatus: 'not_requested',
    membership: null,
    request: null,
  };
}
