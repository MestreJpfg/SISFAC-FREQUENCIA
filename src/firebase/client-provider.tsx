
'use client';

import React, { useMemo, type ReactNode, useEffect, useState } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [isReady, setIsReady] = useState(false);

  const firebaseServices = useMemo(() => {
    return initializeFirebase();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseServices.auth, (user) => {
      if (user) {
        // User is signed in and ready.
        setIsReady(true);
      } else {
        // No user is signed in, attempt anonymous sign-in.
        signInAnonymously(firebaseServices.auth).catch((error) => {
          console.error("Anonymous sign-in failed:", error);
          // If sign-in fails, we do not mark as ready to prevent the app from
          // running in a broken state.
        });
        // The onAuthStateChanged listener will be called again once the anonymous
        // user is signed in, at which point isReady will be set to true.
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [firebaseServices.auth]);

  if (!isReady) {
    return (
      <div className="flex justify-center items-center h-screen w-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
