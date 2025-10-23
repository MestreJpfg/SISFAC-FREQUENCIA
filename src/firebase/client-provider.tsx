'use client';

import React, { useMemo, type ReactNode, useEffect, useState } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
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
    const unsubscribe = onAuthStateChanged(firebaseServices.auth, async (user) => {
      if (user) {
        // User is signed in.
        setIsReady(true);
      } else {
        // User is signed out. Try to sign in anonymously.
        try {
          await signInAnonymously(firebaseServices.auth);
          // The onAuthStateChanged listener will be called again with the new user,
          // at which point isReady will be set to true.
        } catch (error) {
          console.error("Anonymous sign-in failed:", error);
          // If sign-in fails, we might still want to render the app,
          // but parts that require auth will fail.
          setIsReady(true);
        }
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
