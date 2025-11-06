
"use client";

import Link from 'next/link';
import { useState } from 'react';
import { ClipboardCheck, Users, FileUp, FileText, Menu, UserCog, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import type { UserProfile } from '@/lib/types';


const navLinks: { href: string; label: string; icon: React.ElementType; roles: UserProfile['role'][] }[] = [
    { href: "/import", label: "Importar Dados", icon: FileUp, roles: ['Administrador'] },
    { href: "/attendance", label: "Registrar Frequência", icon: Users, roles: ['Administrador', 'Super Usuario'] },
    { href: "/reports", label: "Relatórios", icon: FileText, roles: ['Administrador', 'Super Usuario', 'Usuario'] },
    { href: "/admin", label: "Admin", icon: UserCog, roles: ['Administrador'] },
];

export function Header({ userProfile }: { userProfile: UserProfile | null }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem('userProfile');
        router.push('/login');
    };
    
    const canViewLink = (linkRoles: string[]) => {
        if (!userProfile) return false;
        return linkRoles.includes(userProfile.role);
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
                           canViewLink(link.roles) && (
                                <Button key={link.href} asChild variant="ghost" className={cn("text-muted-foreground", pathname === link.href && "text-foreground bg-accent/50")}>
                                    <Link href={link.href} className="flex items-center gap-2">
                                        <link.icon className="h-4 w-4" /> {link.label}
                                    </Link>
                                </Button>
                           )
                        ))}
                        <Button onClick={handleLogout} variant="ghost" className="text-muted-foreground">
                            <LogOut className="h-4 w-4 mr-2" /> Sair
                        </Button>
                    </nav>
                    
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
                                                canViewLink(link.roles) && (
                                                    <li key={link.href}>
                                                        <Button asChild variant="ghost" className={cn("w-full justify-start text-lg h-12", pathname === link.href && "text-foreground bg-accent/50")} onClick={() => setIsMobileMenuOpen(false)}>
                                                            <Link href={link.href} className="flex items-center gap-3">
                                                                <link.icon className="h-5 w-5" />
                                                                {link.label}
                                                            </Link>
                                                        </Button>
                                                    </li>
                                                )
                                            ))}
                                        </ul>
                                    </nav>
                                    <div className="p-4 border-t">
                                        <Button onClick={handleLogout} variant="outline" className="w-full text-lg h-12">
                                            <LogOut className="h-5 w-5 mr-3" /> Sair
                                        </Button>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>
        </header>
    );
}
