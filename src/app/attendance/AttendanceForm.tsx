
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


type GroupedStudents = {
    [groupKey: string]: Student[];
}

export function AttendanceForm() {
    const { firestore } = useFirebase();
    const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({});
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [selectedEnsino, setSelectedEnsino] = useState('all');
    const [openAccordion, setOpenAccordion] = useState<string | undefined>();

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

    const sortedStudents = useMemo(() => {
        if (!students) return [];
        return [...students].sort((a, b) => {
            const aEnsino = a.ensino || '';
            const bEnsino = b.ensino || '';
            const aGrade = a.grade || '';
            const bGrade = b.grade || '';
            const aClass = a.class || '';
            const bClass = b.class || '';
            const aShift = a.shift || '';
            const bShift = b.shift || '';
            const aName = a.name || '';
            const bName = b.name || '';

            const ensinoCompare = aEnsino.localeCompare(bEnsino);
            if (ensinoCompare !== 0) return ensinoCompare;

            const gradeCompare = aGrade.localeCompare(bGrade, undefined, { numeric: true });
            if (gradeCompare !== 0) return gradeCompare;

            const classCompare = aClass.localeCompare(bClass);
            if (classCompare !== 0) return classCompare;

            const shiftCompare = aShift.localeCompare(bShift);
            if (shiftCompare !== 0) return shiftCompare;

            return aName.localeCompare(bName);
        });
    }, [students]);

    const uniqueEnsinos = useMemo(() => {
        if (!students) return [];
        return [...new Set(students.map(s => s.ensino || 'N/A'))].sort();
    }, [students]);

    const filteredStudents = useMemo(() => {
        if (selectedEnsino === 'all') {
            return sortedStudents;
        }
        return sortedStudents.filter(student => student.ensino === selectedEnsino);
    }, [sortedStudents, selectedEnsino]);

    const groupedStudents = useMemo(() => {
        return filteredStudents.reduce((acc, student) => {
            const groupKey = `${student.grade || 'N/A'} / ${student.class || 'N/A'} (${student.shift || 'N/A'})`;
            if (!acc[groupKey]) {
                acc[groupKey] = [];
            }
            acc[groupKey].push(student);
            return acc;
        }, {} as GroupedStudents);
    }, [filteredStudents]);
    
    const sortedGroups = useMemo(() => Object.keys(groupedStudents).sort((a, b) => {
         const [aGrade, aRest] = a.split(' / ');
         const [bGrade, bRest] = b.split(' / ');

         const gradeCompare = aGrade.localeCompare(bGrade, undefined, { numeric: true });
         if (gradeCompare !== 0) return gradeCompare;

         return aRest.localeCompare(bRest);
    }), [groupedStudents]);

    useEffect(() => {
        setOpenAccordion(sortedGroups[0]);
    }, [sortedGroups]);

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
            
            const existingDocsSnap = await getDocs(q);
            existingDocsSnap.docs.forEach(docToDelete => {
                batch.delete(docToDelete.ref);
            });
            
            students.forEach(student => {
                const status = formData.get(student.id) as 'present' | 'absent' | null;
                if (status) { // Only write if student has a status (i.e. is visible in the form)
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
        const formData = new FormData();
        Object.entries(attendance).forEach(([studentId, status]) => {
            // Check if the student is part of the currently filtered students
            if (filteredStudents.some(s => s.id === studentId)) {
                 formData.append(studentId, status);
            }
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

    const presentCount = Object.entries(attendance).filter(([id, status]) => status === 'present' && filteredStudents.some(s => s.id === id)).length;
    const absentCount = filteredStudents.length - presentCount;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
             <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="grid gap-1.5 w-full sm:w-auto sm:max-w-xs">
                    <Label htmlFor="ensino-filter">Filtrar por Ensino</Label>
                    <Select value={selectedEnsino} onValueChange={setSelectedEnsino}>
                        <SelectTrigger id="ensino-filter">
                            <SelectValue placeholder="Selecione o Ensino" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Ensinos</SelectItem>
                            {uniqueEnsinos.map(ensino => (
                                <SelectItem key={ensino} value={ensino}>{ensino}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
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
            </div>
            
            <Accordion 
                type="single" 
                collapsible 
                value={openAccordion}
                onValueChange={setOpenAccordion}
                className="w-full"
            >
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

    