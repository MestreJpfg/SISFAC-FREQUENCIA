
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

// This function should only be used in server-side code (Server Components, Route Handlers, etc.)
export function initializeFirebaseOnServer() {
  if (!getApps().length) {
    const firebaseApp = initializeApp(firebaseConfig);
    return { firestore: getFirestore(firebaseApp) };
  } else {
    const firebaseApp = getApp();
    return { firestore: getFirestore(firebaseApp) };
  }
}
