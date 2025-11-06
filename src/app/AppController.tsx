"use client";

import { type ReactElement, useState, useEffect } from "react";
import { Header } from "@/components/Header";
import type { UserProfile } from "@/lib/types";

export function AppController({ children }: { children: ReactElement }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const handleStorageChange = () => {
            try {
                const storedUser = localStorage.getItem('userProfile');
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                } else {
                    setUser(null);
                }
            } catch (error) {
                console.error("Failed to parse user profile from localStorage on change", error);
                setUser(null);
            }
        };

        // Initial load
        handleStorageChange();
        setIsLoading(false);

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('local-storage-changed', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('local-storage-changed', handleStorageChange);
        };
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p>Carregando...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Header user={user} />
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
