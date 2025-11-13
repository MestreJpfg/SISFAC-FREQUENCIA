
"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { MessageSquare, AlertTriangle } from 'lucide-react';
import { ChatMessageList } from './ChatMessageList';
import { ChatMessageInput } from './ChatMessageInput';
import type { UserProfile } from '@/lib/types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export function ChatWidget() {
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // This effect runs when the sheet is opened/closed.
        // It ensures we have the latest user profile info.
        if (isOpen) {
            const storedUser = localStorage.getItem('userProfile');
            if (storedUser) {
                setCurrentUser(JSON.parse(storedUser));
            } else {
                setCurrentUser(null);
            }
        }
    }, [isOpen]);

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
    }

    const handleOpenAutoFocus = (e: Event) => {
      e.preventDefault();
      // Manually focus the content area to prevent auto-focus on input
      contentRef.current?.focus();
    }


    return (
        <Sheet open={isOpen} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                <Button className="fixed bottom-24 right-6 h-16 w-16 rounded-full shadow-lg" size="icon">
                    <MessageSquare className="h-8 w-8" />
                    <span className="sr-only">Abrir Chat</span>
                </Button>
            </SheetTrigger>
            <SheetContent 
                className="flex flex-col p-0 gap-0 w-4/5 sm:max-w-sm"
                onOpenAutoFocus={handleOpenAutoFocus}
            >
                 <SheetHeader className="p-4 border-b">
                    <SheetTitle className="flex items-center gap-2">
                        <MessageSquare className="w-6 h-6" /> Chat Geral
                    </SheetTitle>
                    <SheetDescription>Converse em tempo real com outros usuários.</SheetDescription>
                </SheetHeader>
                
                {!currentUser ? (
                     <div className="flex items-center justify-center h-full p-4">
                        <Alert variant="destructive" className="max-w-md">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Acesso Negado</AlertTitle>
                            <AlertDescription>
                                Você precisa estar logado para acessar o chat.
                            </AlertDescription>
                        </Alert>
                    </div>
                ) : (
                    <div ref={contentRef} tabIndex={-1} className="flex flex-col flex-1 h-full outline-none">
                        <div className="flex-1 overflow-y-auto">
                            <ChatMessageList currentUser={currentUser} />
                        </div>
                        <div className="p-4 border-t bg-background/80">
                            <ChatMessageInput currentUser={currentUser} />
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
