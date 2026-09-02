import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, setLogLevel } from 'firebase/firestore';
import bundledConfig from '../firebase-applet-config.json';

// Silence verbose internal logs
try {
  setLogLevel('error');
} catch {}

// Merge config from environment variables (Vercel) or bundled config JSON
const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || bundledConfig.projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || bundledConfig.appId,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || bundledConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || bundledConfig.authDomain,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || bundledConfig.firestoreDatabaseId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || bundledConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || bundledConfig.messagingSenderId,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Connect to the specific provisioned Firestore database ID if present
export const db =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

export { app, firebaseConfig };


