import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
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
  Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

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

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export type UserAccountStatus = 'active' | 'suspended' | 'banned';

export interface BuilderProfile {
  uid: string;
  displayName: string;
  schoolName?: string;
  gradeLevel?: string;
  primaryInterest?: string;
  avatarUrl?: string;
  avatarColor: string;
  role: 'member' | 'moderator' | 'admin';
  status?: UserAccountStatus;
  acceptedGuidelines: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface CommunityGlobalSettings {
  cooldownSeconds: number;
  disableCooldown: boolean;
  banLinks: boolean;
  enableLinkPreviews: boolean;
  globalChatLocked: boolean;
  updatedBy: string;
  updatedAt?: Timestamp;
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
  cooldownSeconds: number; // -1 means inherit global cooldown
  allowMemberMessages: boolean;
  allowMemberGroups: boolean;
  allowMemberInvites: boolean;
  moderatorIds: string[];
  kickedUserIds: string[];
  createdBy?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface CommunitySubGroup {
  id: string;
  channelId: string;
  name: string;
  description: string;
  isPrivate: boolean;
  createdBy: string;
  memberIds: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export const ADMIN_EMAIL = 'johnrufai242@gmail.com';
export const AVATAR_COLORS = ['#FFF025', '#B11469', '#C15D00', '#38BDF8', '#10B981', '#A855F7'];

export function pickAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export async function ensureBuilderProfile(
  user: User,
  overrides?: {
    displayName?: string;
    schoolName?: string;
    gradeLevel?: string;
    primaryInterest?: string;
    avatarColor?: string;
    acceptedGuidelines?: boolean;
  }
): Promise<BuilderProfile> {
  const userRef = doc(db, 'users', user.uid);
  const privateRef = doc(db, 'users_private', user.uid);

  try {
    const snap = await getDoc(userRef);
    const isAdminUser = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    if (snap.exists()) {
      const existing = snap.data() as BuilderProfile;
      const shouldPromoteToAdmin = isAdminUser && existing.role !== 'admin';

      if (overrides || shouldPromoteToAdmin) {
        const updatedFields: Record<string, unknown> = {
          updatedAt: serverTimestamp(),
        };
        if (overrides?.displayName) updatedFields.displayName = overrides.displayName.slice(0, 60);
        if (overrides?.schoolName) updatedFields.schoolName = overrides.schoolName.slice(0, 100);
        if (overrides?.gradeLevel) updatedFields.gradeLevel = overrides.gradeLevel.slice(0, 40);
        if (overrides?.primaryInterest) updatedFields.primaryInterest = overrides.primaryInterest.slice(0, 60);
        if (overrides?.avatarColor) updatedFields.avatarColor = overrides.avatarColor.slice(0, 30);
        if (typeof overrides?.acceptedGuidelines === 'boolean') {
          updatedFields.acceptedGuidelines = overrides.acceptedGuidelines;
        }
        if (shouldPromoteToAdmin) {
          updatedFields.role = 'admin';
        }
        await updateDoc(userRef, updatedFields);
        return {
          ...existing,
          ...(overrides || {}),
          ...(shouldPromoteToAdmin ? { role: 'admin' } : {}),
        };
      }
      return existing;
    }

    const displayName = (
      overrides?.displayName ||
      user.displayName ||
      (user.email ? user.email.split('@')[0] : 'Builder')
    ).slice(0, 60);

    const avatarColor = overrides?.avatarColor || pickAvatarColor(user.uid);
    const role: 'member' | 'moderator' | 'admin' = isAdminUser ? 'admin' : 'member';
    const status: UserAccountStatus = 'active';
    const acceptedGuidelines = overrides?.acceptedGuidelines ?? true;

    const newProfileData: Record<string, unknown> = {
      uid: user.uid,
      displayName,
      schoolName: (overrides?.schoolName || 'Build Buds Network').slice(0, 100),
      gradeLevel: (overrides?.gradeLevel || 'Student Builder').slice(0, 40),
      primaryInterest: (overrides?.primaryInterest || 'All Creations').slice(0, 60),
      avatarUrl: (user.photoURL || '').slice(0, 2000),
      avatarColor,
      role,
      status,
      acceptedGuidelines,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(userRef, newProfileData);

    if (user.email) {
      try {
        await setDoc(privateRef, {
          uid: user.uid,
          email: user.email.slice(0, 254),
          createdAt: serverTimestamp(),
        });
      } catch {
        // Ignore if private record already exists
      }
    }

    return {
      uid: user.uid,
      displayName,
      schoolName: String(newProfileData.schoolName),
      gradeLevel: String(newProfileData.gradeLevel),
      primaryInterest: String(newProfileData.primaryInterest),
      avatarUrl: String(newProfileData.avatarUrl),
      avatarColor,
      role,
      status,
      acceptedGuidelines,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  doc,
  getDoc,
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
  Timestamp,
};
export type { User };
