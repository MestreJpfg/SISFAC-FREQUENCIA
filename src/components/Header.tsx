"use client";

import Link from 'next/link';
import { useState } from 'react';
import { ClipboardCheck, Users, FileUp, FileText, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

const navLinks = [
    { href: "/import", label: "Importar Dados", icon: FileUp },
    { href: "/attendance", label: "Registrar Frequência", icon: Users },
    { href: "/reports", label: "Relatórios", icon: FileText },
];

export function Header() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const pathname = usePathname();

    return (
        <header className="bg-card border-b sticky top-0 z-30">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    <Link href="/" className="flex items-center gap-3 text-lg font-bold font-headline text-foreground">
                        <ClipboardCheck className="h-7 w-7 text-primary" />
                        <span className="hidden sm:inline">School Attendance</span>
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
                                            <span>School Attendance</span>
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
        </header>
    );
}
