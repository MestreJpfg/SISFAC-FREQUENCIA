import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { Student, AttendanceRecord } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AttendanceForm } from './AttendanceForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

async function getStudentsAndAttendance() {
    const { firestore } = initializeFirebase();
    const studentsRef = collection(firestore, 'students');
    const studentsQuery = query(studentsRef, orderBy('name'));
    const studentsSnap = await getDocs(studentsQuery);
    const students: Student[] = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));

    if (students.length === 0) {
        return { students: [], todaysAttendance: new Map() };
    }

    // This part runs on the server, so new Date() is fine.
    const today = format(new Date(), 'yyyy-MM-dd');
    const attendanceRef = collection(firestore, 'attendance');
    const attendanceQuery = query(attendanceRef, where('date', '==', today));
    const attendanceSnap = await getDocs(attendanceQuery);
    
    const todaysAttendance = new Map<string, 'present' | 'absent'>();
    attendanceSnap.forEach(doc => {
        const record = doc.data() as AttendanceRecord;
        todaysAttendance.set(record.studentId, record.status);
    });

    return { students, todaysAttendance };
}

export default async function AttendancePage() {
    const { students, todaysAttendance } = await getStudentsAndAttendance();
    const todayString = format(new Date(), "eeee, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

    if (students.length === 0) {
        return (
            <div className="max-w-2xl mx-auto">
                <Alert variant="destructive">
                    <TriangleAlert className="h-4 w-4" />
                    <AlertTitle>Nenhum Aluno Encontrado</AlertTitle>
                    <AlertDescription>
                        O banco de dados de alunos está vazio. Por favor, importe um arquivo Excel primeiro.
                        <Button asChild variant="link" className="p-0 h-auto ml-1 text-destructive">
                            <Link href="/import">Ir para importação</Link>
                        </Button>
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

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
                <AttendanceForm students={students} initialAttendance={Object.fromEntries(todaysAttendance)} />
            </CardContent>
        </Card>
    );
}
