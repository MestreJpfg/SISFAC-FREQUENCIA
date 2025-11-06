
"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, Users, FileUp, FileText, Menu, UserCog, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import type { UserProfile } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const navLinks: { href: string; label: string; icon: React.ElementType }[] = [
    { href: "/import", label: "Importar Dados", icon: FileUp },
    { href: "/attendance", label: "Registrar Frequência", icon: Users },
    { href: "/reports", label: "Relatórios", icon: FileText },
];

export function Header() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);

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
                console.error("Failed to parse user profile from localStorage", error);
                setUser(null);
            }
        };

        handleStorageChange(); // Initial check
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('local-storage-changed', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('local-storage-changed', handleStorageChange);
        };
    }, []);


    const handleLogout = () => {
        localStorage.removeItem('userProfile');
        // Dispatch a custom event to notify other components if needed
        window.dispatchEvent(new CustomEvent('local-storage-changed'));
        router.push('/login');
    };

    const getInitials = (name?: string) => {
        if (!name) return "";
        const names = name.split(' ');
        if (names.length > 1) {
            return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    return (
        <header className="bg-card border-b sticky top-0 z-30">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    <Link href="/" className="flex items-center gap-3 text-lg font-bold font-headline text-foreground">
                        <ClipboardCheck className="h-7 w-7 text-primary" />
                        <span className="hidden sm:inline">SISFAC - FREQUÊNCIA</span>
                    </Link>
                    
                    <nav className="hidden md:flex items-center gap-1">
                        {navLinks.map((link) => (
                           <Button key={link.href} asChild variant="ghost" className={cn("text-muted-foreground", pathname === link.href && "text-foreground bg-accent/50")}>
                               <Link href={link.href} className="flex items-center gap-2">
                                   <link.icon className="h-4 w-4" /> {link.label}
                               </Link>
                           </Button>
                        ))}
                    </nav>
                    
                    <div className="flex items-center gap-4">
                        {user ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                                        <Avatar>
                                            <AvatarImage src={user.avatarUrl} alt={user.username} />
                                            <AvatarFallback>{getInitials(user.fullName || user.username)}</AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56" align="end" forceMount>
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">{user.fullName || user.username}</p>
                                            <p className="text-xs leading-none text-muted-foreground">{user.username}</p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild className="cursor-pointer">
                                        <Link href="/profile">
                                            <UserCog className="mr-2 h-4 w-4" />
                                            <span>Perfil</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>Sair</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                             <Button asChild variant="default">
                                <Link href="/login">Entrar</Link>
                            </Button>
                        )}
                        <div className="md:hidden">
                            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <Menu className="h-6 w-6" />
                                        <span className="sr-only">Abrir menu</span>
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="right" className="p-0">
                                    <div className="flex flex-col h-full">
                                        <div className="flex items-center p-4 border-b">
                                            <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 text-lg font-bold font-headline text-foreground">
                                                <ClipboardCheck className="h-7 w-7 text-primary" />
                                                <span>SISFAC - FREQUÊNCIA</span>
                                            </Link>
                                        </div>
                                        <nav className="flex-grow p-4">
                                            <ul className="space-y-2">
                                                {navLinks.map((link) => (
                                                    <li key={link.href}>
                                                        <Button asChild variant="ghost" className={cn("w-full justify-start text-lg h-12", pathname === link.href && "text-foreground bg-accent/50")} onClick={() => setIsMobileMenuOpen(false)}>
                                                            <Link href={link.href} className="flex items-center gap-3">
                                                                <link.icon className="h-5 w-5" />
                                                                {link.label}
                                                            </Link>
                                                        </Button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </nav>
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
