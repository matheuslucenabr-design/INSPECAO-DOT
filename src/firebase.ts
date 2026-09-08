import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel,
  Firestore,
} from 'firebase/firestore';
import bundledConfig from '../firebase-applet-config.json';

// Silence verbose internal logs
try {
  setLogLevel('error');
} catch {}

// Allow custom config from localStorage if configured via UI
function getStoredCustomConfig() {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('inspeopronto_custom_firebase_config');
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch {}
  return null;
}

const customConfig = getStoredCustomConfig();

// Merge config from environment variables (Vercel), custom UI config, or bundled config JSON
const firebaseConfig = {
  projectId: customConfig?.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || bundledConfig.projectId,
  appId: customConfig?.appId || import.meta.env.VITE_FIREBASE_APP_ID || bundledConfig.appId,
  apiKey: customConfig?.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || bundledConfig.apiKey,
  authDomain: customConfig?.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || bundledConfig.authDomain,
  firestoreDatabaseId:
    customConfig?.firestoreDatabaseId ||
    import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID ||
    bundledConfig.firestoreDatabaseId,
  storageBucket:
    customConfig?.storageBucket ||
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    bundledConfig.storageBucket,
  messagingSenderId:
    customConfig?.messagingSenderId ||
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    bundledConfig.messagingSenderId,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Connect with persistent multi-tab local cache for instant loading & resilience on Vercel
let db: Firestore;
try {
  const targetDbId =
    firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
      ? firebaseConfig.firestoreDatabaseId
      : undefined;

  if (typeof window !== 'undefined') {
    db = initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      },
      targetDbId
    );
  } else {
    db = targetDbId ? getFirestore(app, targetDbId) : getFirestore(app);
  }
} catch {
  // If already initialized or fallback needed
  const targetDbId =
    firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
      ? firebaseConfig.firestoreDatabaseId
      : undefined;
  db = targetDbId ? getFirestore(app, targetDbId) : getFirestore(app);
}

export { db, app, firebaseConfig };



