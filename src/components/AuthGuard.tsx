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
    if (isUserLoading) {
      return; // Aguarde a verificação inicial de autenticação terminar
    }

    const isPublicPath = PUBLIC_PATHS.includes(pathname);

    if (user) {
      // Se o usuário está logado e na página de login, redirecione para a home.
      if (isPublicPath) {
        router.push('/');
        return;
      }

      // Se o perfil está carregando, não faça nada ainda. O return do `isLoading` abaixo cuidará disso.
      if (isProfileLoading) {
        return;
      }

      // Se o perfil não existe ou o usuário não está ativo, deslogue e mande para o login.
      if (!userProfile || !userProfile.isActive) {
        router.push('/login?message=account-disabled');
        return;
      }

      // Verificação de permissão baseada na rota
      const basePath = `/${pathname.split('/')[1]}`;
      const allowedRoles = PATH_ROLES[basePath];
      if (allowedRoles && !allowedRoles.includes(userProfile.role)) {
        router.push('/?error=not-authorized'); // Redireciona para home com erro
      }

    } else {
      // Se não há usuário e a página não é pública, redirecione para o login.
      if (!isPublicPath) {
        router.push('/login');
      }
    }
  }, [user, userProfile, isUserLoading, isProfileLoading, pathname, router]);

  const isLoading = isUserLoading || (user && isProfileLoading);
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (isPublicPath) {
    // Se o usuário já está logado, mostra um loader enquanto redireciona.
    if(user) {
         return (
            <div className="flex justify-center items-center h-screen w-screen">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    // Se não, mostra a página pública (login)
    return <>{children}</>;
  }
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen w-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Se chegou até aqui, o usuário está logado, o perfil carregou, e ele não está em uma página pública
  // Agora, fazemos a verificação final de permissão para renderizar a página ou a mensagem de erro.
  if (user && userProfile) {
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
  } else if (!user) {
    // Se por algum motivo o usuário se tornou nulo, mostre o loader para o useEffect redirecionar
     return (
      <div className="flex justify-center items-center h-screen w-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return <AppStructure>{children}</AppStructure>;
}
