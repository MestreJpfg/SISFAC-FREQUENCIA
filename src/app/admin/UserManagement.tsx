
"use client";

import { useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type UserProfileWithId = UserProfile & { id: string };

export function UserManagement() {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    // Note: We are not getting the current user from a hook anymore.
    // Disabling self-edit functionality for simplicity with the new auth system.
    const currentUserProfileString = typeof window !== 'undefined' ? localStorage.getItem('userProfile') : null;
    const currentUser = currentUserProfileString ? JSON.parse(currentUserProfileString) : null;


    const usersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'users');
    }, [firestore]);

    const { data: users, isLoading } = useCollection<UserProfileWithId>(usersQuery);

    const sortedUsers = useMemo(() => {
        if (!users) return [];
        return [...users].sort((a, b) => (a.email || '').localeCompare(b.email || ''));
    }, [users]);


    const handleRoleChange = (userId: string, newRole: 'Administrador' | 'Super Usuario' | 'Usuario') => {
        if (!firestore) return;

        const userRef = doc(firestore, 'users', userId);
        updateDoc(userRef, { role: newRole })
            .then(() => {
                 toast({ title: "Sucesso", description: "Nível de acesso do usuário atualizado." });
            })
            .catch((error) => {
                 console.error("Failed to update role:", error);
                const permissionError = new FirestorePermissionError({
                    path: userRef.path,
                    operation: 'update',
                    requestResourceData: { role: newRole }
                });
                errorEmitter.emit('permission-error', permissionError);
            });
    };

    const handleStatusChange = (userId: string, newStatus: boolean) => {
        if (!firestore) return;
        const userRef = doc(firestore, 'users', userId);
        updateDoc(userRef, { isActive: newStatus })
            .then(() => {
                 toast({ title: "Sucesso", description: "Status do usuário atualizado." });
            })
            .catch((error) => {
                console.error("Failed to update status:", error);
                const permissionError = new FirestorePermissionError({
                    path: userRef.path,
                    operation: 'update',
                    requestResourceData: { isActive: newStatus }
                });
                errorEmitter.emit('permission-error', permissionError);
            });
    };
    
    const isCurrentUser = (uid: string) => currentUser?.uid === uid;

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-60">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
         <div className="w-full overflow-x-auto rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Nível de Acesso</TableHead>
                        <TableHead>Status (Ativo)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedUsers.map((profile) => (
                        <TableRow key={profile.id}>
                            <TableCell className="font-medium">{profile.email}</TableCell>
                            <TableCell>
                                <Select
                                    value={profile.role}
                                    onValueChange={(value: 'Administrador' | 'Super Usuario' | 'Usuario') => handleRoleChange(profile.id, value)}
                                    disabled={isCurrentUser(profile.uid)}
                                >
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Nível de Acesso" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Administrador">Administrador</SelectItem>
                                        <SelectItem value="Super Usuario">Super Usuário</SelectItem>
                                        <SelectItem value="Usuario">Usuário</SelectItem>
                                    </SelectContent>
                                </Select>
                            </TableCell>
                             <TableCell>
                                <Switch
                                    checked={profile.isActive}
                                    onCheckedChange={(checked) => handleStatusChange(profile.id, checked)}
                                    disabled={isCurrentUser(profile.uid)}
                                    aria-label={`Ativar ou desativar usuário ${profile.email}`}
                                />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
