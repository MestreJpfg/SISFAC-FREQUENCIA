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
        // If user is on login page, redirect to home immediately
        if (isPublicPath) {
            router.push('/');
            return;
        }

        // If profile is loaded, perform further checks
        if(userProfile) {
            // If user is not active, log them out and show message
            if (!userProfile.isActive) {
                // Consider signing out the user here before redirecting
                // signOut(auth); 
                router.push('/login?message=account-disabled');
                return;
            }

            // Check role-based access for the current path, excluding base path
            const basePath = pathname.split('/')[1];
            const currentPath = `/${basePath}`;
            const allowedRoles = PATH_ROLES[currentPath];
            
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
  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  
  if (isLoading && !isPublicPath) {
    return (
      <div className="flex justify-center items-center h-screen w-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Handle unauthorized access display after checks
  if (user && userProfile && !isPublicPath) {
     const basePath = pathname.split('/')[1];
     const currentPath = `/${basePath}`;
     const allowedRoles = PATH_ROLES[currentPath];
     if (allowedRoles && !allowedRoles.includes(userProfile.role)) {
         return (
             <AppStructure>
                <div className="flex justify-center items-center h-full">
                    <Alert variant="destructive" className="max-w-md">
                        <ShieldBan className="h-4 w-4" />
                        <AlertTitle>Acesso Negado</AlertTitle>
                        <AlertDescription>
                            Você não tem permissão para acessar esta página. Entre em contato com um administrador se você acha que isso é um erro.
                        </AlertDescription>
                    </Alert>
                </div>
             </AppStructure>
         );
     }
  }
  
  // Don't show header/footer on public pages like login
  if (isPublicPath) {
    return <>{children}</>;
  }

  return <AppStructure>{children}</AppStructure>;
}
