'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound } from 'lucide-react';
import type { UserProfile } from '@/lib/types';

export default function LoginPage() {
  const { firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuthError = (description: string) => {
    toast({
      variant: 'destructive',
      title: 'Erro de Autenticação',
      description,
    });
  };

  const handleLogin = async () => {
    if (!firestore) {
      handleAuthError("O serviço de banco de dados não está disponível.");
      return;
    }
    if (!email || !password) {
      handleAuthError("Por favor, preencha o email e a senha.");
      return;
    }

    setIsLoading(true);
    
    try {
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where("email", "==", email), where("password", "==", password));
      
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        handleAuthError("Email ou senha inválidos.");
        setIsLoading(false);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data() as UserProfile;

      // Salvar informações do usuário no localStorage para simular a sessão
      localStorage.setItem('userProfile', JSON.stringify({ ...userData, uid: userDoc.id }));
      
      toast({
        title: "Login bem-sucedido!",
        description: `Bem-vindo(a), ${userData.email}.`,
      });

      router.push('/');

    } catch (error) {
      console.error("Erro durante o login: ", error);
      handleAuthError("Ocorreu um erro ao tentar fazer login. Verifique o console para mais detalhes.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
       <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
            <KeyRound className="h-12 w-12 text-primary"/>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Acesse sua conta para continuar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input id="login-email" type="email" placeholder="email@exemplo.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Senha</Label>
              <Input id="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <Button className="w-full" disabled={isLoading} onClick={handleLogin}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </CardFooter>
        </Card>
        <p className="px-8 text-center text-sm text-muted-foreground mt-6">
            &copy; {new Date().getFullYear()} Desenvolvido por @MestreJp. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
