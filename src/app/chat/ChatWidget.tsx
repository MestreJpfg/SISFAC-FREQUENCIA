
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
import type { UserProfile, ChatMessage } from '@/lib/types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';

const LAST_READ_KEY = 'chatLastReadTimestamp';

const playNotificationSound = () => {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        console.error("Could not play notification sound", e);
    }
};


export function ChatWidget() {
    const { firestore } = useFirebase();
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const contentRef = useRef<HTMLDivElement>(null);
    const [lastReadTimestamp, setLastReadTimestamp] = useState<Timestamp | null>(() => {
        if (typeof window !== 'undefined') {
            const savedTimestamp = localStorage.getItem(LAST_READ_KEY);
            return savedTimestamp ? new Timestamp(parseInt(savedTimestamp, 10), 0) : null;
        }
        return null;
    });

    const messagesQuery = useMemoFirebase(() => {
        if (!firestore || !lastReadTimestamp || isOpen) return null; // Only query when closed
        return query(
            collection(firestore, 'chatMessages'),
            where('createdAt', '>', lastReadTimestamp)
        );
    }, [firestore, lastReadTimestamp, isOpen]);

    const { data: newMessages } = useCollection<ChatMessage>(messagesQuery);

    useEffect(() => {
        const storedUser = localStorage.getItem('userProfile');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setCurrentUser(parsedUser);
        } else {
            setCurrentUser(null);
        }
    }, [isOpen]);

    useEffect(() => {
        if (newMessages && currentUser) {
            const newUnreadMessages = newMessages.filter(msg => msg.userId !== currentUser.id);
            if (newUnreadMessages.length > 0) {
                // Check if the count is actually increasing before playing sound
                const newCount = newUnreadMessages.length;
                if (newCount > unreadCount) {
                    playNotificationSound();
                }
                setUnreadCount(newCount);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [newMessages, currentUser]);

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (open) {
            // When chat opens, reset unread count and update timestamp
            setUnreadCount(0);
            const now = Timestamp.now();
            setLastReadTimestamp(now);
            if (typeof window !== 'undefined') {
                localStorage.setItem(LAST_READ_KEY, now.seconds.toString());
            }
        }
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
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-6 w-6 justify-center rounded-full p-0"
                        >
                            {unreadCount}
                        </Badge>
                    )}
                    <span className="sr-only">Abrir Chat</span>
                </Button>
            </SheetTrigger>
            <SheetContent 
                className="flex flex-col p-0 gap-0 w-4/5 sm:max-w-sm"
                onOpenAutoFocus={handleOpenAutoFocus}
            >
                 <SheetHeader className="p-4">
                    <SheetTitle className="flex items-center gap-2">
                        <MessageSquare className="w-6 h-6" /> Chat Geral
                    </SheetTitle>
                    <SheetDescription className="text-white/90">Converse em tempo real com outros usuários.</SheetDescription>
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
                        <div className="p-4">
                            <ChatMessageInput currentUser={currentUser} />
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
