'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { Loader2, ShieldBan } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface AuthGuardProps {
  children: ReactNode;
}

const PUBLIC_PATHS = ['/login'];

const PATH_ROLES: Record<string, ('admin' | 'superUser' | 'user')[]> = {
    '/': ['admin', 'superUser', 'user'],
    '/import': ['admin'],
    '/attendance': ['admin', 'superUser'],
    '/reports': ['admin', 'superUser', 'user'],
    '/admin': ['admin'],
};

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    // Wait until loading is complete
    if (isUserLoading || (user && isProfileLoading)) {
      return;
    }

    const isPublicPath = PUBLIC_PATHS.includes(pathname);

    // If user is not logged in and path is not public, redirect to login
    if (!user && !isPublicPath) {
      router.push('/login');
      return;
    }

    // If user is logged in
    if (user) {
        // If profile is loaded
        if(userProfile) {
            // If user is not active, log them out and show message
            if (!userProfile.isActive) {
                // Consider signing out the user here before redirecting
                // signOut(auth); 
                router.push('/login?message=account-disabled');
                return;
            }

            // If user is on login page, redirect to home
            if (isPublicPath) {
                router.push('/');
                return;
            }

            // Check role-based access
            const allowedRoles = PATH_ROLES[pathname];
            if (allowedRoles && !allowedRoles.includes(userProfile.role)) {
                // Redirect to a 'not-authorized' page or home
                router.push('/?error=not-authorized');
                return;
            }
        }
        // If there's a user but no profile (e.g., just created), and not on a public path
        else if (!isProfileLoading && !isPublicPath) {
            // This might happen for a brief moment after signup.
            // Or if profile creation failed. Redirect to login to be safe.
            router.push('/login?message=profile-not-found');
        }
    }
  }, [user, userProfile, isUserLoading, isProfileLoading, pathname, router]);

  const isLoading = isUserLoading || (user && isProfileLoading);
  
  if (isLoading && !PUBLIC_PATHS.includes(pathname)) {
    return (
      <div className="flex justify-center items-center h-screen w-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Handle unauthorized access display after checks
  if (user && userProfile && !PUBLIC_PATHS.includes(pathname)) {
     const allowedRoles = PATH_ROLES[pathname];
     if (allowedRoles && !allowedRoles.includes(userProfile.role)) {
         return (
            <div className="flex justify-center items-center h-full">
                <Alert variant="destructive" className="max-w-md">
                    <ShieldBan className="h-4 w-4" />
                    <AlertTitle>Acesso Negado</AlertTitle>
                    <AlertDescription>
                        Você não tem permissão para acessar esta página. Entre em contato com um administrador se você acha que isso é um erro.
                    </AlertDescription>
                </Alert>
            </div>
         );
     }
  }


  return <>{children}</>;
}
