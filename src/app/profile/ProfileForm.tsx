"use client";

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';

export function ProfileForm() {
    const { firestore } = useFirebase();
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        const storedUser = localStorage.getItem('userProfile');
        if (storedUser) {
            const parsedUser: UserProfile = JSON.parse(storedUser);
            if (firestore && parsedUser.id) {
                const docRef = doc(firestore, "users", parsedUser.id);
                getDoc(docRef).then(docSnap => {
                    if (docSnap.exists()) {
                        setUserProfile({ id: docSnap.id, ...docSnap.data() } as UserProfile);
                    } else {
                        // User in localStorage but not in DB, force logout
                        localStorage.removeItem('userProfile');
                        window.dispatchEvent(new CustomEvent('local-storage-changed'));
                        setUserProfile(null);
                    }
                    setIsLoading(false);
                });
            } else {
                 setIsLoading(false);
            }
        } else {
            // No user in storage. Don't redirect, just show loading/error state.
            setUserProfile(null);
            setIsLoading(false);
        }
    }, [firestore, router]);

    const handleUpdateProfile = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!firestore || !userProfile) return;

        startTransition(async () => {
            const formData = new FormData(event.currentTarget);
            const updatedData = {
                fullName: formData.get('fullName') as string,
                jobTitle: formData.get('jobTitle') as string,
                age: Number(formData.get('age')),
                avatarUrl: formData.get('avatarUrl') as string,
            };

            try {
                const userRef = doc(firestore, 'users', userProfile.id);
                await updateDoc(userRef, updatedData);

                // Update localStorage
                const updatedProfile = { ...userProfile, ...updatedData };
                const { password, ...userToStore } = updatedProfile;
                localStorage.setItem('userProfile', JSON.stringify(userToStore));
                window.dispatchEvent(new CustomEvent('local-storage-changed'));
                setUserProfile(updatedProfile);

                toast({ title: 'Sucesso', description: 'Seu perfil foi atualizado.' });
            } catch (error) {
                console.error("Profile update error:", error);
                toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar o perfil.' });
            }
        });
    };
    
    const getInitials = (name: string) => {
        if (!name) return "";
        const names = name.split(' ');
        if (names.length > 1) {
            return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }


    if (isLoading) {
        return <div className="flex justify-center items-center h-40"><Loader2 className="animate-spin" /></div>;
    }
    
    if (!userProfile) {
         return (
            <Alert variant="destructive">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>Nenhum Perfil Encontrado</AlertTitle>
                <AlertDescription>
                    Não foi possível carregar os dados do perfil. Por favor, tente fazer o login novamente.
                </AlertDescription>
            </Alert>
        )
    }

    return (
        <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="flex items-center gap-4">
                 <Avatar className="h-20 w-20">
                    <AvatarImage src={userProfile.avatarUrl} alt={userProfile.username} />
                    <AvatarFallback>{getInitials(userProfile.fullName || userProfile.username)}</AvatarFallback>
                </Avatar>
                <div className='space-y-2 w-full'>
                    <Label htmlFor="avatarUrl">URL da Foto de Perfil</Label>
                    <Input 
                        id="avatarUrl" 
                        name="avatarUrl" 
                        defaultValue={userProfile.avatarUrl}
                        placeholder="https://exemplo.com/sua-foto.jpg"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="username">Nome de Usuário</Label>
                    <Input id="username" name="username" value={userProfile.username} disabled />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="fullName">Nome Completo</Label>
                    <Input id="fullName" name="fullName" defaultValue={userProfile.fullName} placeholder="Seu nome completo"/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="jobTitle">Função</Label>
                    <Input id="jobTitle" name="jobTitle" defaultValue={userProfile.jobTitle} placeholder="Sua função na escola" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="age">Idade</Label>
                    <Input id="age" name="age" type="number" defaultValue={userProfile.age} placeholder="Sua idade"/>
                </div>
            </div>
            
            <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin" /> : <Save className="mr-2" />}
                Salvar Alterações
            </Button>
        </form>
    );
}
