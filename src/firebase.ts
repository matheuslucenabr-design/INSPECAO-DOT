import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, disableNetwork, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Silence internal debug/error retry logging to prevent console pollution during quota resets
try {
  setLogLevel('silent');
} catch {}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Connect to the specific provisioned Firestore database ID if present
export const db =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

// If client was previously marked as exceeding quota or on initial mount during quota exhausted period,
// disable network immediately to avoid startup backoff loops
if (typeof window !== 'undefined') {
  try {
    const quotaUntil = localStorage.getItem('firestore_quota_exceeded_until');
    // If quota flag is set OR free-tier quota exhausted, disable network gracefully
    if (!quotaUntil || Number(quotaUntil) > Date.now()) {
      disableNetwork(db).catch(() => {});
    }
  } catch {}
}

export { app };

