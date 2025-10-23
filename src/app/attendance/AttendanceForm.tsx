
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
import { collection, writeBatch, doc, getDocs, query, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


type GroupedStudents = {
    [groupKey: string]: Student[];
}

export function AttendanceForm() {
    const { firestore } = useFirebase();
    const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({});
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<string | undefined>();
    const [openAccordions, setOpenAccordions] = useState<string[]>([]);

    const studentsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'students'));
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

    const studentsByEnsino = useMemo(() => {
        if (!students) return {};
        return students.reduce((acc, student) => {
            const ensino = student.ensino || 'N/A';
            if (!acc[ensino]) {
                acc[ensino] = [];
            }
            acc[ensino].push(student);
            return acc;
        }, {} as Record<string, Student[]>);
    }, [students]);

    const uniqueEnsinos = useMemo(() => Object.keys(studentsByEnsino).sort(), [studentsByEnsino]);

    useEffect(() => {
        if (uniqueEnsinos.length > 0 && !activeTab) {
            setActiveTab(uniqueEnsinos[0]);
        }
    }, [uniqueEnsinos, activeTab]);

    const groupedAndSortedStudents = useMemo(() => {
        const result: Record<string, { key: string, students: Student[] }[]> = {};
        for (const ensino of uniqueEnsinos) {
            const groups = (studentsByEnsino[ensino] || []).reduce((acc, student) => {
                const groupKey = `${student.grade || 'N/A'} / ${student.class || 'N/A'} (${student.shift || 'N/A'})`;
                if (!acc[groupKey]) {
                    acc[groupKey] = [];
                }
                acc[groupKey].push(student);
                return acc;
            }, {} as GroupedStudents);

            result[ensino] = Object.entries(groups)
                .map(([key, students]) => ({
                    key,
                    students: students.sort((a,b) => a.name.localeCompare(b.name))
                }))
                .sort((a, b) => {
                    const [aGrade] = a.key.split(' / ');
                    const [bGrade] = b.key.split(' / ');
                    const gradeCompare = aGrade.localeCompare(bGrade, undefined, { numeric: true });
                    if (gradeCompare !== 0) return gradeCompare;
                    return a.key.localeCompare(b.key);
                });
        }
        return result;
    }, [studentsByEnsino, uniqueEnsinos]);

    useEffect(() => {
        if (activeTab && groupedAndSortedStudents[activeTab]?.length > 0) {
            setOpenAccordions([groupedAndSortedStudents[activeTab][0].key]);
        } else {
            setOpenAccordions([]);
        }
    }, [activeTab, groupedAndSortedStudents]);


    const handleToggle = (studentId: string, isPresent: boolean) => {
        setAttendance(prev => ({
            ...prev,
            [studentId]: isPresent ? 'present' : 'absent',
        }));
    };

    const saveAttendance = async () => {
        if (!firestore || !students) return;
        
        const today = format(new Date(), 'yyyy-MM-dd');
        const attendanceRef = collection(firestore, "attendance");

        try {
            const batch = writeBatch(firestore);
            
            const q = query(collection(firestore, "attendance"), where("date", "==", today));
            const existingDocsSnap = await getDocs(q);
            existingDocsSnap.docs.forEach(docToDelete => {
                batch.delete(docToDelete.ref);
            });
            
            Object.entries(attendance).forEach(([studentId, status]) => {
                const student = students.find(s => s.id === studentId);
                if (student) {
                     const record = {
                        studentId: student.id,
                        studentName: student.name,
                        date: today,
                        status: status,
                        grade: student.grade,
                        class: student.class,
                        shift: student.shift,
                        ensino: student.ensino,
                    };
                    const newDocRef = doc(attendanceRef);
                    batch.set(newDocRef, record);
                }
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
        startTransition(() => {
            saveAttendance();
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

    const presentCount = Object.values(attendance).filter(status => status === 'present').length;
    const absentCount = Object.values(attendance).length - presentCount;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <TabsList>
                        {uniqueEnsinos.map(ensino => (
                            <TabsTrigger key={ensino} value={ensino}>{ensino}</TabsTrigger>
                        ))}
                    </TabsList>
                    <div className="flex justify-end gap-6 text-sm font-medium">
                        <div className="flex items-center gap-2" style={{color: 'hsl(142.1 76.2% 36.3%)'}}>
                            <UserCheck className="h-5 w-5" />
                            Presentes (Total): {presentCount}
                        </div>
                        <div className="flex items-center gap-2" style={{color: 'hsl(0 84.2% 60.2%)'}}>
                            <UserX className="h-5 w-5" />
                            Ausentes (Total): {absentCount}
                        </div>
                    </div>
                </div>

                {uniqueEnsinos.map(ensino => (
                    <TabsContent key={ensino} value={ensino} className="mt-4">
                        <Accordion 
                            type="single" 
                            collapsible 
                            value={openAccordions[0]}
                            onValueChange={(value) => setOpenAccordions(value ? [value] : [])}
                            className="w-full"
                        >
                            {(groupedAndSortedStudents[ensino] || []).map(group => (
                                <AccordionItem value={group.key} key={group.key}>
                                    <AccordionTrigger className="text-lg font-bold">{group.key}</AccordionTrigger>
                                    <AccordionContent>
                                        <div className="p-1">
                                            {group.students.map((student, index) => (
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
                                                    {index < group.students.length - 1 && <Separator />}
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                             {(groupedAndSortedStudents[ensino] || []).length === 0 && (
                                <p className="text-center text-muted-foreground py-8">Nenhuma turma encontrada para este nível de ensino.</p>
                            )}
                        </Accordion>
                    </TabsContent>
                ))}
            </Tabs>

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
