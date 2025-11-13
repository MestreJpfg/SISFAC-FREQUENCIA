
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { MessageSquare, AlertTriangle, X } from 'lucide-react';
import { ChatMessageList } from './ChatMessageList';
import { ChatMessageInput } from './ChatMessageInput';
import type { UserProfile } from '@/lib/types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export function ChatWidget() {
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('userProfile');
        if (storedUser) {
            setCurrentUser(JSON.parse(storedUser));
        } else {
            setCurrentUser(null);
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="fixed bottom-24 right-6 h-16 w-16 rounded-full shadow-lg" size="icon">
                    <MessageSquare className="h-8 w-8" />
                    <span className="sr-only">Abrir Chat</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] h-[70vh] flex flex-col p-0 gap-0">
                 <DialogHeader className="p-4 border-b">
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquare className="w-6 h-6" /> Chat Geral
                    </DialogTitle>
                    <DialogDescription>Converse em tempo real com outros usuários.</DialogDescription>
                </DialogHeader>
                
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
                    <>
                        <div className="flex-1 overflow-y-auto">
                            <ChatMessageList currentUser={currentUser} />
                        </div>
                        <div className="p-4 border-t">
                            <ChatMessageInput currentUser={currentUser} />
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
