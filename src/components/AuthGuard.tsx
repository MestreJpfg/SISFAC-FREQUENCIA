'use client';

import { useEffect, type ReactNode, cloneElement, ReactElement } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { Loader2, ShieldBan } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Header } from './Header';

interface AuthGuardProps {
  children: ReactElement; // Now expecting a single ReactElement child
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
      return; 
    }

    if (!user && !isPublicPath) {
      router.push('/login');
    }

    if (user && isPublicPath) {
      router.push('/');
    }

  }, [isUserLoading, user, pathname, router, isPublicPath]);

  const isLoading = isUserLoading || (user && !isPublicPath && isProfileLoading);

  if (isLoading) {
    return <FullScreenLoader />;
  }
  
  if (isPublicPath) {
      if (!user) {
        return <>{children}</>;
      }
      // If user is logged in on a public path, the useEffect will redirect.
      // Show loader in the meantime.
      return <FullScreenLoader />;
  }

  // --- From here, we are on a protected path with an authenticated user ---

  if (user && userProfile) {
    if (!userProfile.isActive) {
         // This should be handled by the useEffect, but as a fallback:
         router.push('/login?message=account-disabled');
         return <FullScreenLoader />;
    }

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
     // If access is granted, render the structure and clone the children with userProfile prop
    return (
        <AppStructure>
            {cloneElement(children, { userProfile })}
        </AppStructure>
    );

  }
  
  // If user exists but profile is still loading (or doesn't exist), show loader
   if (user && !userProfile) {
    return <FullScreenLoader />;
  }
  
  // Fallback for redirecting unauthenticated users from protected paths
  if (!user && !isPublicPath) {
      router.push('/login');
      return <FullScreenLoader/>
  }

  // This should ideally not be reached, but it's a safe fallback.
  return <FullScreenLoader />;
}
