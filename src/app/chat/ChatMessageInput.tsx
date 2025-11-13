
"use client";

import { useState } from 'react';
import { useFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatMessageInputProps {
    currentUser: UserProfile;
}

export function ChatMessageInput({ currentUser }: ChatMessageInputProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore || !message.trim()) return;

        setIsSending(true);
        const messagesRef = collection(firestore, 'chatMessages');

        try {
            await addDoc(messagesRef, {
                text: message,
                userId: currentUser.id,
                username: currentUser.fullName || currentUser.username,
                avatarUrl: currentUser.avatarUrl || '',
                createdAt: serverTimestamp(),
            });
            setMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
            toast({
                variant: 'destructive',
                title: 'Erro ao Enviar',
                description: 'Não foi possível enviar sua mensagem. Tente novamente.',
            });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                autoComplete="off"
                disabled={isSending}
                className="bg-transparent border-border/50 focus-visible:ring-primary"
            />
            <Button type="submit" size="icon" disabled={isSending || !message.trim()}>
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span className="sr-only">Enviar</span>
            </Button>
        </form>
    );
}
