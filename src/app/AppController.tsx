
"use client";

import { type ReactElement, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { Loader2 } from "lucide-react";

export function AppController({ children }: { children: ReactElement }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isChecking, setIsChecking] = useState(true);

    const isPublicPage = pathname === '/login';

    useEffect(() => {
        const userProfile = localStorage.getItem('userProfile');
        
        if (!userProfile && !isPublicPage) {
            router.replace('/login');
        } else if (userProfile && isPublicPage) {
            router.replace('/');
        } else {
            setIsChecking(false);
        }
    }, [pathname, router, isPublicPage]);

    if (isChecking) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-background">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        )
    }

    if (isPublicPage) {
        return children;
    }

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
    );
}
