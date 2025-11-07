"use client";

import { useState, useEffect, useTransition } from 'react';
import { useFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, TriangleAlert, Building, User, Info, Phone, Mail, Home, Calendar as CalendarIcon, Briefcase } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function ProfileForm() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {
        setIsLoading(true);
        const storedUser = localStorage.getItem('userProfile');
        if (storedUser) {
            const parsedUser: UserProfile = JSON.parse(storedUser);
            if (firestore && parsedUser.id) {
                const docRef = doc(firestore, "users", parsedUser.id);
                getDoc(docRef).then(docSnap => {
                    if (docSnap.exists()) {
                        const userData = { id: docSnap.id, ...docSnap.data() } as UserProfile;
                        setUserProfile(userData);
                        if(userData.avatarUrl) {
                            setImagePreview(userData.avatarUrl)
                        }
                    }
                    setIsLoading(false);
                });
            } else {
                 setIsLoading(false);
            }
        } else {
            setUserProfile(null);
            setIsLoading(false);
        }
    }, [firestore]);
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };


    const handleUpdateProfile = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!firestore || !userProfile) return;

        startTransition(async () => {
            const formData = new FormData(event.currentTarget);
            
            let newAvatarUrl = userProfile.avatarUrl;
            if (selectedFile) {
                newAvatarUrl = imagePreview!;
            }

            const updatedData: Partial<UserProfile> = {
                fullName: formData.get('fullName') as string,
                jobTitle: formData.get('jobTitle') as string,
                age: Number(formData.get('age')),
                avatarUrl: newAvatarUrl,
                bio: formData.get('bio') as string,
                dataNascimento: formData.get('dataNascimento') as string,
                telefonePessoal: formData.get('telefonePessoal') as string,
                endereco: {
                    rua: formData.get('endereco.rua') as string,
                    cidade: formData.get('endereco.cidade') as string,
                    estado: formData.get('endereco.estado') as string,
                    cep: formData.get('endereco.cep') as string,
                },
                departamento: formData.get('departamento') as string,
                dataAdmissao: formData.get('dataAdmissao') as string,
                emailProfissional: formData.get('emailProfissional') as string,
            };

            try {
                const userRef = doc(firestore, 'users', userProfile.id);
                await updateDoc(userRef, updatedData);

                const updatedProfileInStorage = { ...userProfile, ...updatedData };
                localStorage.setItem('userProfile', JSON.stringify(updatedProfileInStorage));
                window.dispatchEvent(new CustomEvent('local-storage-changed'));
                setUserProfile(updatedProfileInStorage);

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
            <Card>
                <CardHeader className='flex-row items-center gap-6 space-y-0'>
                     <Avatar className="h-24 w-24">
                        <AvatarImage src={imagePreview || undefined} alt={userProfile.username} />
                        <AvatarFallback>{getInitials(userProfile.fullName || userProfile.username)}</AvatarFallback>
                    </Avatar>
                    <div className='space-y-2 w-full'>
                        <Label htmlFor="avatarFile">Foto de Perfil</Label>
                        <Input 
                            id="avatarFile" 
                            name="avatarFile" 
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                         <p className="text-xs text-muted-foreground">Selecione uma imagem para seu perfil (formato Base64).</p>
                    </div>
                </CardHeader>
                <CardContent>
                     <div className="space-y-2">
                        <Label htmlFor="username">Nome de Usuário</Label>
                        <Input id="username" name="username" value={userProfile.username} disabled />
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="pessoal" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="pessoal"><User className="mr-2"/> Informações Pessoais</TabsTrigger>
                    <TabsTrigger value="profissional"><Building className="mr-2"/> Informações Profissionais</TabsTrigger>
                </TabsList>
                <TabsContent value="pessoal">
                    <Card>
                        <CardHeader><CardTitle>Dados Pessoais</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="fullName">Nome Completo</Label>
                                    <Input id="fullName" name="fullName" defaultValue={userProfile.fullName} placeholder="Seu nome completo"/>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="age">Idade</Label>
                                    <Input id="age" name="age" type="number" defaultValue={userProfile.age} placeholder="Sua idade"/>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                                    <Input id="dataNascimento" name="dataNascimento" type="date" defaultValue={userProfile.dataNascimento}/>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="telefonePessoal">Telefone Pessoal</Label>
                                    <Input id="telefonePessoal" name="telefonePessoal" defaultValue={userProfile.telefonePessoal} placeholder="(00) 90000-0000"/>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="bio">Biografia</Label>
                                <Textarea id="bio" name="bio" defaultValue={userProfile.bio} placeholder="Conte um pouco sobre você..." />
                            </div>
                             <h4 className="text-md font-semibold pt-4 border-b">Endereço</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div className="space-y-2 md:col-span-2">
                                     <Label htmlFor="endereco.rua">Rua e Número</Label>
                                     <Input id="endereco.rua" name="endereco.rua" defaultValue={userProfile.endereco?.rua} placeholder="Ex: Rua das Flores, 123"/>
                                 </div>
                                 <div className="space-y-2">
                                     <Label htmlFor="endereco.cidade">Cidade</Label>
                                     <Input id="endereco.cidade" name="endereco.cidade" defaultValue={userProfile.endereco?.cidade} placeholder="Sua cidade"/>
                                 </div>
                                 <div className="space-y-2">
                                     <Label htmlFor="endereco.estado">Estado</Label>
                                     <Input id="endereco.estado" name="endereco.estado" defaultValue={userProfile.endereco?.estado} placeholder="Seu estado"/>
                                 </div>
                                  <div className="space-y-2">
                                     <Label htmlFor="endereco.cep">CEP</Label>
                                     <Input id="endereco.cep" name="endereco.cep" defaultValue={userProfile.endereco?.cep} placeholder="00000-000"/>
                                 </div>
                             </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="profissional">
                    <Card>
                        <CardHeader><CardTitle>Dados Profissionais</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="jobTitle">Função</Label>
                                    <Input id="jobTitle" name="jobTitle" defaultValue={userProfile.jobTitle} placeholder="Sua função na escola" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="departamento">Departamento</Label>
                                    <Input id="departamento" name="departamento" defaultValue={userProfile.departamento} placeholder="Ex: Coordenação Pedagógica" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dataAdmissao">Data de Admissão</Label>
                                    <Input id="dataAdmissao" name="dataAdmissao" type="date" defaultValue={userProfile.dataAdmissao}/>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="emailProfissional">Email Profissional</Label>
                                    <Input id="emailProfissional" name="emailProfissional" type="email" defaultValue={userProfile.emailProfissional} placeholder="seu.nome@escola.com"/>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            
            <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin" /> : <Save className="mr-2" />}
                Salvar Alterações
            </Button>
        </form>
    );
}
