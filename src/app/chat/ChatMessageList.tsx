
"use client";

import { useRef, useEffect } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { ChatMessage, UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ChatMessageListProps {
    currentUser: UserProfile;
}

const getInitials = (name?: string) => {
    if (!name) return "";
    const names = name.split(' ');
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}


export function ChatMessageList({ currentUser }: ChatMessageListProps) {
    const { firestore } = useFirebase();
    const scrollRef = useRef<HTMLDivElement>(null);

    const messagesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'chatMessages'), orderBy('createdAt', 'asc'), limit(50));
    }, [firestore]);

    const { data: messages, isLoading } = useCollection<ChatMessage>(messagesQuery);

    useEffect(() => {
        // Scroll to the bottom when new messages arrive
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div>
    }

    return (
        <div ref={scrollRef} className="p-4 space-y-4 h-full overflow-y-auto">
            {messages && messages.map(msg => {
                const isCurrentUser = msg.userId === currentUser.id;
                return (
                    <div key={msg.id} className={cn("flex items-start gap-3", isCurrentUser ? "justify-end" : "justify-start")}>
                        {!isCurrentUser && (
                             <Avatar className="h-8 w-8">
                                <AvatarImage src={msg.avatarUrl} />
                                <AvatarFallback>{getInitials(msg.username)}</AvatarFallback>
                            </Avatar>
                        )}
                        <div className={cn(
                            "max-w-xs md:max-w-md rounded-lg px-3 py-2",
                            isCurrentUser ? "text-primary-foreground" : ""
                        )}>
                            <div className="flex items-baseline gap-2">
                                <p className="text-xs font-semibold">{!isCurrentUser ? msg.username : 'Você'}</p>
                                <p className="text-xs opacity-75">
                                    {msg.createdAt ? format(msg.createdAt.toDate(), 'HH:mm', { locale: ptBR }) : ''}
                                </p>
                            </div>
                            <p className={cn("text-sm break-words", isCurrentUser ? "font-bold" : "")}>{msg.text}</p>
                        </div>
                         {isCurrentUser && (
                             <Avatar className="h-8 w-8">
                                <AvatarImage src={msg.avatarUrl} />
                                <AvatarFallback>{getInitials(currentUser.fullName || currentUser.username)}</AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                )
            })}
             {messages && messages.length === 0 && (
                <div className="flex justify-center items-center h-full">
                    <p className="text-muted-foreground">Nenhuma mensagem ainda. Seja o primeiro a enviar!</p>
                </div>
            )}
        </div>
    );
}
