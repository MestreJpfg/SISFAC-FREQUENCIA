import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { initializeFirebaseOnServer } from '@/firebase/server-init';
import type { Student, AttendanceRecord } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AttendanceForm } from './AttendanceForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';


export default async function AttendancePage() {
    const todayString = format(new Date(), "eeee, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-4">
                    <div className="bg-primary/20 p-3 rounded-lg">
                        <Users className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="font-headline capitalize">Registro de Frequência Diária</CardTitle>
                        <CardDescription className="mt-1">Marque a frequência dos alunos para a data de hoje: {todayString}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <AttendanceForm />
            </CardContent>
        </Card>
    );
}
