'use client';

import React, { useMemo, type ReactNode, useEffect, useState } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';
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
    const initAuth = async () => {
      // We need to make sure we have an authenticated user.
      // Since we enabled Anonymous Auth, let's sign the user in if they aren't already.
      if (firebaseServices.auth.currentUser) {
        setIsReady(true);
        return;
      }
      try {
        await signInAnonymously(firebaseServices.auth);
      } catch (error) {
        console.error("Anonymous sign-in failed:", error);
      } finally {
        setIsReady(true);
      }
    };

    initAuth();
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
