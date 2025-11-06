
"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactElement, useEffect, useState, cloneElement } from "react";
import { Header } from "./Header";
import type { UserProfile } from "@/lib/types";

const PUBLIC_PATHS = ['/login'];

const PATH_ROLES: Record<string, ('Administrador' | 'Super Usuario' | 'Usuario')[]> = {
    '/': ['Administrador', 'Super Usuario', 'Usuario'],
    '/import': ['Administrador'],
    '/attendance': ['Administrador', 'Super Usuario'],
    '/reports': ['Administrador', 'Super Usuario', 'Usuario'],
    '/admin': ['Administrador'],
};

function AppStructure({ children, userProfile }: { children: ReactElement, userProfile: UserProfile | null }) {
    const basePath = `/${usePathname().split('/')[1]}`;
    const allowedRoles = PATH_ROLES[basePath] || [];

    const canAccess = userProfile && allowedRoles.includes(userProfile.role);

    return (
        <div className="min-h-screen flex flex-col">
            <Header userProfile={userProfile} />
            <main className="flex-grow container mx-auto p-4 md:p-8">
                {canAccess ? cloneElement(children, { userProfile }) : (
                     <div className="flex justify-center items-center h-full">
                        <div className="text-center p-8 border rounded-lg bg-card">
                            <h1 className="text-2xl font-bold text-destructive">Acesso Negado</h1>
                            <p className="text-muted-foreground mt-2">Você não tem permissão para acessar esta página.</p>
                        </div>
                    </div>
                )}
            </main>
            <footer className="py-4 md:py-6 border-t">
                <div className="container mx-auto px-4 md:px-8 text-center text-sm text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} Desenvolvido por @MestreJp. Todos os direitos reservados.</p>
                </div>
            </footer>
        </div>
    );
}


export function AppController({ children }: { children: ReactElement }) {
    const router = useRouter();
    const pathname = usePathname();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const profileString = localStorage.getItem('userProfile');
        const isPublicPath = PUBLIC_PATHS.includes(pathname);
        let profile: UserProfile | null = null;
        
        try {
            if (profileString) {
                profile = JSON.parse(profileString);
            }
        } catch (error) {
            console.error("Failed to parse user profile from localStorage", error);
            localStorage.removeItem('userProfile');
        }

        setUserProfile(profile);

        if (!profile && !isPublicPath) {
            router.push('/login');
        } else if (profile && isPublicPath) {
            router.push('/');
        }
        
        setIsLoading(false);
    }, [pathname, router]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen w-screen bg-background">Carregando...</div>;
    }
    
    if (PUBLIC_PATHS.includes(pathname)) {
        return children;
    }

    return (
        <AppStructure userProfile={userProfile}>
            {children}
        </AppStructure>
    );
}
