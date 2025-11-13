
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, AlertTriangle } from 'lucide-react';
import { ChatMessageList } from './ChatMessageList';
import { ChatMessageInput } from './ChatMessageInput';
import { type UserProfile } from '@/lib/types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function ChatPage() {
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('userProfile');
        if (storedUser) {
            setCurrentUser(JSON.parse(storedUser));
        }
    }, []);

    if (!currentUser) {
        // This is a fallback for the case where AppController might not have redirected yet.
        return (
            <div className="flex items-center justify-center h-full">
                <Alert variant="destructive" className="max-w-md">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Acesso Negado</AlertTitle>
                    <AlertDescription>
                        Você precisa estar logado para acessar o chat.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-150px)] max-w-4xl mx-auto">
             <CardHeader className="p-4 border-b">
                <div className="flex items-center gap-4">
                    <div className="bg-primary/20 p-3 rounded-lg">
                        <MessageSquare className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="font-headline capitalize">Chat Geral</CardTitle>
                        <CardDescription className="mt-1">Converse em tempo real com outros usuários do sistema.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
                <ChatMessageList currentUser={currentUser} />
            </CardContent>
            <div className="p-4 border-t">
                <ChatMessageInput currentUser={currentUser} />
            </div>
        </div>
    );
}
