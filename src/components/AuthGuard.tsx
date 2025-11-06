'use client';

import { type ReactNode, cloneElement, ReactElement, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { Loader2, ShieldBan } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Header } from './Header';

interface AuthGuardProps {
  children: ReactElement;
}

const PUBLIC_PATHS = ['/login'];

const PATH_ROLES: Record<string, ('admin' | 'superUser' | 'user')[]> = {
    '/': ['admin', 'superUser', 'user'],
    '/import': ['admin'],
    '/attendance': ['admin', 'superUser'],
    '/reports': ['admin', 'superUser', 'user'],
    '/admin': ['admin'],
};

function AppStructure({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow container mx-auto p-4 md:p-8">
                {children}
            </main>
            <footer className="py-4 md:py-6 border-t">
                <div className="container mx-auto px-4 md:px-8 text-center text-sm text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} Desenvolvido por @MestreJp. Todos os direitos reservados.</p>
                </div>
            </footer>
        </div>
    )
}

function FullScreenLoader() {
    return (
        <div className="flex justify-center items-center h-screen w-screen bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
}

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

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (isUserLoading) {
      return; // Don't do anything while loading
    }
    if (!user && !isPublicPath) {
      router.push('/login');
    }
    if (user && isPublicPath) {
      router.push('/');
    }
  }, [isUserLoading, user, isPublicPath, pathname, router]);


  // 1. Handle initial authentication loading
  if (isUserLoading) {
    return <FullScreenLoader />;
  }

  // 2. Allow public paths for unauthenticated users
  if (!user && isPublicPath) {
      return <>{children}</>;
  }

  // 3. For authenticated users, we need to wait for profile
  if (user && !isPublicPath) {
      // Show loader while profile is loading
      if (isProfileLoading) {
          return <FullScreenLoader />;
      }

      // Handle cases where profile doesn't exist or user is inactive
      if (!userProfile) {
        // This could happen if the user document is deleted.
        // The useEffect will handle redirecting to login.
        return <FullScreenLoader />;
      }
      
      if (!userProfile.isActive) {
          // The useEffect will handle redirecting to login.
          return <FullScreenLoader />;
      }

      // 7. Check role-based access control
      const basePath = `/${pathname.split('/')[1]}`;
      const allowedRoles = PATH_ROLES[basePath];

      if (allowedRoles && !allowedRoles.includes(userProfile.role)) {
        return (
          <AppStructure>
            <div className="flex justify-center items-center h-full">
              <Alert variant="destructive" className="max-w-md">
                <ShieldBan className="h-4 w-4" />
                <AlertTitle>Acesso Negado</AlertTitle>
                <AlertDescription>
                  Você não tem permissão para acessar esta página.
                </AlertDescription>
              </Alert>
            </div>
          </AppStructure>
        );
      }

      // 8. If all checks pass, render the page
      return (
          <AppStructure>
              {cloneElement(children, { userProfile })}
          </AppStructure>
      );
  }

  // Fallback for any other state (e.g. authenticated user on public path before redirect)
  return <FullScreenLoader />;
}
