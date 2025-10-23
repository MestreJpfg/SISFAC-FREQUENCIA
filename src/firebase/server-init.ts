import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';

// This function should only be used in server-side code (Server Components, API Routes, Server Actions)
export function initializeFirebaseOnServer() {
  if (getApps().length === 0) {
    const app = initializeApp(firebaseConfig);
    return {
      firebaseApp: app,
      firestore: getFirestore(app),
      auth: getAuth(app),
    };
  } else {
    const app = getApp();
    return {
      firebaseApp: app,
      firestore: getFirestore(app),
      auth: getAuth(app),
    };
  }
}
