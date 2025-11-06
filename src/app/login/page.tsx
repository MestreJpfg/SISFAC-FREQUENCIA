'use client';

import { useState, useEffect } from 'react';
import { useAuth, useFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  User,
  AuthError,
} from 'firebase/auth';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound } from 'lucide-react';
import { doc, setDoc, getDoc } from 'firebase/firestore';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export default function LoginPage() {
  const { auth, firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  
  // Email/Password State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Phone State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [phoneAuthStep, setPhoneAuthStep] = useState<'input' | 'verify'>('input');


  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  useEffect(() => {
    if (!auth) return;
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response: any) => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        }
      });
    }

    return () => {
        window.recaptchaVerifier?.clear();
    }
  }, [auth]);


  const handleAuthError = (error: AuthError) => {
    console.error(error);
    let description = 'Ocorreu um erro desconhecido.';
    switch (error.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        description = 'Credenciais inválidas.';
        break;
      case 'auth/email-already-in-use':
        description = 'Este endereço de e-mail já está em uso.';
        break;
      case 'auth/weak-password':
        description = 'A senha é muito fraca. Use pelo menos 6 caracteres.';
        break;
      case 'auth/invalid-email':
        description = 'O formato do e-mail é inválido.';
        break;
      case 'auth/popup-closed-by-user':
        description = 'O pop-up de login foi fechado antes da conclusão.';
        break;
      case 'auth/invalid-phone-number':
        description = 'O número de telefone fornecido é inválido.';
        break;
      case 'auth/too-many-requests':
        description = 'Muitas tentativas. Tente novamente mais tarde.';
        break;
      case 'auth/code-expired':
        description = 'O código de verificação expirou. Peça um novo.';
        break;
      case 'auth/invalid-verification-code':
        description = 'O código de verificação está incorreto.';
        break;
      default:
        description = error.message;
        break;
    }
    toast({
      variant: 'destructive',
      title: 'Erro de Autenticação',
      description,
    });
  };

  const createOrUpdateUserProfile = async (user: User) => {
    if (!firestore) return;
    const userRef = doc(firestore, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      const isAdminUser = user.email?.toLowerCase() === 'mestrejpfg@gmail.com';
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        role: isAdminUser ? 'admin' : 'user',
        isActive: isAdminUser,
      });
      if (!isAdminUser) {
        toast({
          title: 'Cadastro realizado com sucesso!',
          description: 'Sua conta foi criada. Um administrador precisa ativá-la para você ter acesso.',
        });
      }
    }
  };

  // --- Email/Password Logic ---
  const handleLogin = async () => {
    if (!auth) return;
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // AuthGuard handles redirection
    } catch (error) {
      handleAuthError(error as AuthError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!auth) return;
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await createOrUpdateUserProfile(userCredential.user);
      setActiveTab('login');
      toast({
          title: 'Cadastro Quase Completo!',
          description: 'Por favor, faça login para continuar.'
      })
      setEmail('');
      setPassword('');
    } catch (error) {
      handleAuthError(error as AuthError);
    } finally {
      setIsLoading(false);
    }
  };
  
  // --- Google Auth Logic ---
  const handleGoogleSignIn = async () => {
    if (!auth) return;
    setIsLoading(true);
    try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        await createOrUpdateUserProfile(result.user);
        // AuthGuard will redirect
    } catch(error) {
        handleAuthError(error as AuthError);
    } finally {
        setIsLoading(false);
    }
  }

  // --- Phone Auth Logic ---
  const handlePhoneSignIn = async () => {
    if (!auth) return;
    setIsLoading(true);
    try {
        const verifier = window.recaptchaVerifier!;
        // Use E.164 format for phone number
        const formattedPhoneNumber = `+55${phoneNumber.replace(/\D/g, '')}`;
        const confirmationResult = await signInWithPhoneNumber(auth, formattedPhoneNumber, verifier);
        window.confirmationResult = confirmationResult;
        setPhoneAuthStep('verify');
        toast({ title: 'Código enviado', description: 'Um código de verificação foi enviado para o seu celular.'});
    } catch (error) {
        handleAuthError(error as AuthError);
    } finally {
        setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!auth) return;
    setIsLoading(true);
    try {
        const confirmationResult = window.confirmationResult;
        if (confirmationResult) {
            const result = await confirmationResult.confirm(verificationCode);
            await createOrUpdateUserProfile(result.user);
            // AuthGuard will redirect
        } else {
            throw new Error("Confirmation result not found.");
        }
    } catch(error) {
        handleAuthError(error as AuthError);
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
       <div id="recaptcha-container"></div>
       <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
            <KeyRound className="h-12 w-12 text-primary"/>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="register">Cadastrar</TabsTrigger>
            <TabsTrigger value="phone">Celular</TabsTrigger>
          </TabsList>
         
          {/* Email/Password Login */}
          <TabsContent value="login">
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
                <Button variant="outline" className="w-full" disabled={isLoading} onClick={handleGoogleSignIn}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 109.8 512 0 402.2 0 261.8 0 120.5 109.8 8.4 244 8.4c77.9 0 144.5 31.2 192.7 78.6L386.4 164c-34.1-32.4-79.6-49.4-142.4-49.4-108.8 0-197.3 88.8-197.3 198.1S136.2 461.3 245 461.3c96.5 0 159.9-54.5 169.5-103.1H245V296.8h238.5c1.3 12.8 2.5 25.8 2.5 39.5z"></path></svg>}
                    Entrar com Google
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Email/Password Register */}
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Cadastro</CardTitle>
                <CardDescription>Crie uma nova conta. Seu acesso será liberado por um administrador.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input id="register-email" type="email" placeholder="email@exemplo.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Senha</Label>
                  <Input id="register-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" disabled={isLoading} onClick={handleSignUp}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cadastrar
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Phone Auth */}
          <TabsContent value="phone">
            <Card>
                <CardHeader>
                    <CardTitle>Login com Celular</CardTitle>
                    <CardDescription>
                        {phoneAuthStep === 'input' 
                            ? 'Insira seu número para receber um código de verificação.' 
                            : 'Insira o código que você recebeu por SMS.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {phoneAuthStep === 'input' ? (
                        <div className="space-y-2">
                            <Label htmlFor="phone-number">Número de Celular (com DDD)</Label>
                            <Input id="phone-number" type="tel" placeholder="11912345678" required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} disabled={isLoading} />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label htmlFor="verification-code">Código de Verificação</Label>
                            <Input id="verification-code" type="text" placeholder="123456" required value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} disabled={isLoading} />
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex-col gap-2">
                     {phoneAuthStep === 'input' ? (
                        <Button className="w-full" disabled={isLoading || !phoneNumber} onClick={handlePhoneSignIn}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enviar Código
                        </Button>
                     ) : (
                        <>
                        <Button className="w-full" disabled={isLoading || !verificationCode} onClick={handleVerifyCode}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Verificar e Entrar
                        </Button>
                        <Button variant="link" size="sm" onClick={() => setPhoneAuthStep('input')} disabled={isLoading}>
                            Voltar e alterar número
                        </Button>
                        </>
                     )}
                </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
        <p className="px-8 text-center text-sm text-muted-foreground mt-6">
            &copy; {new Date().getFullYear()} Desenvolvido por @MestreJp. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
