import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCog } from 'lucide-react';
import { UserManagement } from './UserManagement';

export default async function AdminPage() {

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-4">
                    <div className="bg-primary/20 p-3 rounded-lg">
                        <UserCog className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="font-headline capitalize">Gerenciamento de Usuários</CardTitle>
                        <CardDescription className="mt-1">Gerencie os níveis de acesso e status dos usuários do sistema.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <UserManagement />
            </CardContent>
        </Card>
    );
}
