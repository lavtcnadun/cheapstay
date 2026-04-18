import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, getDocFromServer, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfigLocal from '../firebase-applet-config.json';

// Use environment variables if available (for production), otherwise fallback to the local config file
const firebaseConfig: any = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || (firebaseConfigLocal && firebaseConfigLocal.apiKey) || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (firebaseConfigLocal && firebaseConfigLocal.authDomain) || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || (firebaseConfigLocal && firebaseConfigLocal.projectId) || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || (firebaseConfigLocal && firebaseConfigLocal.storageBucket) || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || (firebaseConfigLocal && firebaseConfigLocal.messagingSenderId) || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || (firebaseConfigLocal && firebaseConfigLocal.appId) || '',
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || (firebaseConfigLocal && firebaseConfigLocal.firestoreDatabaseId) || ''
};

if (!firebaseConfig.apiKey) {
  console.warn("Firebase configuration is missing! Deployment might show a white screen if keys are not set as environment variables.");
}

let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.error("Firebase initialization failed:", error);
  // Default fallback to prevent undefined app if possible, or handle gracefully in hooks
  app = { options: {} } as any; 
}

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();

export { signInWithPopup, signOut, onAuthStateChanged, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, ref, uploadBytes, getDownloadURL, setDoc, where };
export type { User };
