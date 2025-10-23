"use client";

import { useState, useTransition, useMemo, useEffect } from 'react';
import type { Student, AttendanceRecord } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, Loader2, UserCheck, UserX, TriangleAlert } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, writeBatch, doc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import Link from 'next/link';

type GroupedStudents = {
    [groupKey: string]: Student[];
}

export function AttendanceForm() {
    const { firestore } = useFirebase();
    const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({});
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const studentsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'students'), orderBy('grade'), orderBy('class'), orderBy('shift'), orderBy('name'));
    }, [firestore]);

    const { data: students, isLoading: isLoadingStudents } = useCollection<Student>(studentsQuery);

    const todayString = format(new Date(), 'yyyy-MM-dd');
    const attendanceQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'attendance'), where('date', '==', todayString));
    }, [firestore, todayString]);

    const { data: todaysAttendance, isLoading: isLoadingAttendance } = useCollection<AttendanceRecord>(attendanceQuery);

    useEffect(() => {
        if (students) {
            const initialAttendance: Record<string, 'present' | 'absent'> = {};
            const todaysAttendanceMap = todaysAttendance ? new Map(todaysAttendance.map(att => [att.studentId, att.status])) : new Map();

            students.forEach(student => {
                initialAttendance[student.id] = todaysAttendanceMap.get(student.id) || 'present';
            });
            setAttendance(initialAttendance);
        }
    }, [students, todaysAttendance]);

    const groupedStudents = useMemo(() => {
        if (!students) return {};
        
        return students.reduce((acc, student) => {
            const groupKey = `${student.grade} / ${student.class} (${student.shift})`;
            if (!acc[groupKey]) {
                acc[groupKey] = [];
            }
            acc[groupKey].push(student);
            return acc;
        }, {} as GroupedStudents);
    }, [students]);

    const handleToggle = (studentId: string, isPresent: boolean) => {
        setAttendance(prev => ({
            ...prev,
            [studentId]: isPresent ? 'present' : 'absent',
        }));
    };

    const saveAttendance = async (formData: FormData) => {
        if (!firestore || !students) return;
        
        const today = format(new Date(), 'yyyy-MM-dd');
        const attendanceRef = collection(firestore, "attendance");
        const q = query(attendanceRef, where("date", "==", today));

        try {
            const batch = writeBatch(firestore);
            
            // 1. Delete existing records for the day to avoid duplicates
            const existingDocsSnap = await getDocs(q);
            existingDocsSnap.docs.forEach(docToDelete => {
                batch.delete(docToDelete.ref);
            });
            
            // 2. Add new records from the current student list
            students.forEach(student => {
                const status = formData.get(student.id) as 'present' | 'absent' | null;
                const record = {
                    studentId: student.id,
                    studentName: student.name,
                    date: today,
                    status: status || 'absent',
                    grade: student.grade,
                    class: student.class,
                    shift: student.shift,
                };
                const newDocRef = doc(attendanceRef);
                batch.set(newDocRef, record);
            });

            await batch.commit();

            toast({
                title: 'Sucesso',
                description: "Frequência salva com sucesso!",
            });

        } catch (e: any) {
             console.error("Error saving attendance:", e);
             const permissionError = new FirestorePermissionError({
                path: attendanceRef.path,
                operation: 'write',
                requestResourceData: { info: "Batch write for attendance failed." }
            });
            errorEmitter.emit('permission-error', permissionError);
             
             toast({
                 variant: 'destructive',
                 title: 'Erro',
                 description: "Falha ao salvar a frequência. Verifique as permissões e tente novamente.",
             });
        }
    };


    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData();
        Object.entries(attendance).forEach(([studentId, status]) => {
            formData.append(studentId, status);
        });

        startTransition(() => {
            saveAttendance(formData);
        });
    };
    
    if (isLoadingStudents || isLoadingAttendance) {
        return (
            <div className="flex justify-center items-center h-60">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!students || students.length === 0) {
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


    const presentCount = Object.values(attendance).filter(s => s === 'present').length;
    const absentCount = (students?.length || 0) - presentCount;
    const sortedGroups = Object.keys(groupedStudents); // Already sorted by the query

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-end gap-6 text-sm font-medium">
                <div className="flex items-center gap-2" style={{color: 'hsl(142.1 76.2% 36.3%)'}}>
                    <UserCheck className="h-5 w-5" />
                    Presentes: {presentCount}
                </div>
                <div className="flex items-center gap-2" style={{color: 'hsl(0 84.2% 60.2%)'}}>
                    <UserX className="h-5 w-5" />
                    Ausentes: {absentCount}
                </div>
            </div>
            
            <Accordion type="multiple" defaultValue={[]} className="w-full">
                 {sortedGroups.map(groupKey => (
                    <AccordionItem value={groupKey} key={groupKey}>
                        <AccordionTrigger className="text-lg font-bold">{groupKey}</AccordionTrigger>
                        <AccordionContent>
                             <div className="p-1">
                                {groupedStudents[groupKey].map((student, index) => (
                                    <div key={student.id}>
                                        <div className="flex items-center justify-between p-3 rounded-md hover:bg-accent/30 transition-colors">
                                            <Label htmlFor={student.id} className="cursor-pointer">
                                                <p className="text-base font-medium">{student.name}</p>
                                            </Label>
                                            <Switch
                                                id={student.id}
                                                name={student.id}
                                                checked={attendance[student.id] === 'present'}
                                                onCheckedChange={(checked) => handleToggle(student.id, checked)}
                                                aria-label={`Marcar presença para ${student.name}`}
                                            />
                                        </div>
                                        {index < groupedStudents[groupKey].length - 1 && <Separator />}
                                    </div>
                                ))}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>


            <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                ) : (
                    <><Save className="mr-2 h-4 w-4" /> Salvar Frequência</>
                )}
            </Button>
        </form>
    );
}
