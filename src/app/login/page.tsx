"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { UserProfile } from '@/lib/types';

export default function LoginPage() {
    const { firestore } = useFirebase();
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);

        if (!firestore) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Serviço de banco de dados não disponível.' });
            setIsLoading(false);
            return;
        }

        const formData = new FormData(event.currentTarget);
        const username = formData.get('username') as string;
        const password = formData.get('password') as string;

        try {
            const usersRef = collection(firestore, 'users');
            const q = query(usersRef, where('username', '==', username), where('password', '==', password));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                toast({ variant: 'destructive', title: 'Erro de Login', description: 'Nome de usuário ou senha inválidos.' });
            } else {
                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data() as Omit<UserProfile, 'id'>;
                const userProfile: UserProfile = { ...userData, id: userDoc.id };

                // Don't store password in localStorage
                const { password: _, ...userToStore } = userProfile;

                localStorage.setItem('userProfile', JSON.stringify(userToStore));
                window.dispatchEvent(new CustomEvent('local-storage-changed'));
                
                toast({ title: 'Sucesso', description: 'Login realizado com sucesso!' });
                router.push('/');
            }
        } catch (error) {
            console.error('Login error:', error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Ocorreu um erro durante o login.' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);

        if (!firestore) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Serviço de banco de dados não disponível.' });
            setIsLoading(false);
            return;
        }

        const formData = new FormData(event.currentTarget);
        const username = formData.get('username') as string;
        const password = formData.get('password') as string;
        const fullName = formData.get('fullName') as string;

        if (password.length < 6) {
            toast({ variant: 'destructive', title: 'Erro de Cadastro', description: 'A senha deve ter pelo menos 6 caracteres.' });
            setIsLoading(false);
            return;
        }

        try {
            // Check if username already exists
            const usersRef = collection(firestore, 'users');
            const q = query(usersRef, where('username', '==', username));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                toast({ variant: 'destructive', title: 'Erro de Cadastro', description: 'Este nome de usuário já está em uso.' });
                setIsLoading(false);
                return;
            }

            // Create new user
            await addDoc(usersRef, {
                username,
                password,
                fullName,
                jobTitle: 'Novo Usuário',
                age: 0,
                avatarUrl: ''
            });

            toast({ title: 'Sucesso', description: 'Usuário cadastrado com sucesso! Por favor, faça o login.' });
            // Switch to login tab - this needs to be handled by the Tabs component value state
        } catch (error) {
            console.error('Registration error:', error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Ocorreu um erro durante o cadastro.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-[calc(100vh-150px)] items-center justify-center">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Bem-vindo(a) de volta!</CardTitle>
                    <CardDescription>Acesse seu perfil para uma experiência personalizada.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="login" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="login">Entrar</TabsTrigger>
                            <TabsTrigger value="register">Cadastrar</TabsTrigger>
                        </TabsList>
                        <TabsContent value="login">
                            <form onSubmit={handleLogin} className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="login-username">Nome de Usuário</Label>
                                    <Input id="login-username" name="username" placeholder="seu.usuario" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="login-password">Senha</Label>
                                    <Input id="login-password" name="password" type="password" required />
                                </div>
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="animate-spin" /> : <LogIn className="mr-2" />}
                                    Entrar
                                </Button>
                            </form>
                        </TabsContent>
                        <TabsContent value="register">
                            <form onSubmit={handleRegister} className="space-y-4 pt-4">
                                 <div className="space-y-2">
                                    <Label htmlFor="reg-fullname">Nome Completo</Label>
                                    <Input id="reg-fullname" name="fullName" placeholder="Seu Nome Completo" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="reg-username">Nome de Usuário</Label>
                                    <Input id="reg-username" name="username" placeholder="seu.usuario" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="reg-password">Senha</Label>
                                    <Input id="reg-password" name="password" type="password" required />
                                </div>
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="animate-spin" /> : <UserPlus className="mr-2" />}
                                    Cadastrar
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
