'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { Loader2, ShieldBan } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Header } from './Header';

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
        <div className="flex justify-center items-center h-screen w-screen">
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

  useEffect(() => {
    if (isUserLoading) {
      return; 
    }

    const isPublicPath = PUBLIC_PATHS.includes(pathname);

    if (!user && !isPublicPath) {
      router.push('/login');
    }

    if (user && isPublicPath) {
      router.push('/');
    }

  }, [isUserLoading, user, pathname, router]);

  const isLoading = isUserLoading || (user && isProfileLoading);
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (isLoading && !isPublicPath) {
    return <FullScreenLoader />;
  }

  if (!user && isPublicPath) {
    return <>{children}</>;
  }
  
  if (user && userProfile) {
    const basePath = `/${pathname.split('/')[1]}`;
    const allowedRoles = PATH_ROLES[basePath];

    if (!userProfile.isActive) {
         router.push('/login?message=account-disabled');
         return <FullScreenLoader />;
    }

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
  }

  // If user is logged in and path is not public, render the protected content
  if (user && !isPublicPath) {
    return <AppStructure>{children}</AppStructure>;
  }

  // If we are on a public path and the user is not yet loaded, show a loader
  if (isPublicPath && isUserLoading) {
    return <FullScreenLoader />;
  }

  // If we are on a public path, and we have a user, the useEffect will redirect.
  // In the meantime show a loader.
  if (isPublicPath && user) {
      return <FullScreenLoader />;
  }
  
  // Default case for public paths when no user is logged in
  return <>{children}</>;
}
