
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
    const [pendingGroups, setPendingGroups] = useState<Record<string, boolean>>({});
    const { toast } = useToast();
    const [activeEnsinoTab, setActiveEnsinoTab] = useState<string | undefined>();
    const [activeTurnoTab, setActiveTurnoTab] = useState<string | undefined>();
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

    const { uniqueEnsinos, uniqueTurnos } = useMemo(() => {
        if (!students) return { uniqueEnsinos: [], uniqueTurnos: [] };
        const ensinos = [...new Set(students.map(s => s.ensino || 'N/A'))].sort();
        const turnos = [...new Set(students.map(s => s.shift || 'N/A'))].sort();
        return { uniqueEnsinos: ensinos, uniqueTurnos: turnos };
    }, [students]);

    useEffect(() => {
        if (uniqueEnsinos.length > 0 && !activeEnsinoTab) {
            setActiveEnsinoTab(uniqueEnsinos[0]);
        }
        if (uniqueTurnos.length > 0 && !activeTurnoTab) {
            setActiveTurnoTab(uniqueTurnos[0]);
        }
    }, [uniqueEnsinos, activeEnsinoTab, uniqueTurnos, activeTurnoTab]);

    const groupedAndSortedStudents = useMemo(() => {
        if (!students || !activeEnsinoTab || !activeTurnoTab) return [];
        
        const filteredStudents = students
            .filter(student => student.ensino === activeEnsinoTab)
            .filter(student => student.shift === activeTurnoTab);
        
        const groups = filteredStudents.reduce((acc, student) => {
            const groupKey = `${student.grade || 'N/A'} / ${student.class || 'N/A'}`;
            if (!acc[groupKey]) {
                acc[groupKey] = [];
            }
            acc[groupKey].push(student);
            return acc;
        }, {} as GroupedStudents);

        return Object.entries(groups)
            .map(([key, students]) => ({
                key,
                students: students.sort((a,b) => (a.name || '').localeCompare(b.name || ''))
            }))
            .sort((a, b) => {
                const [aGrade] = a.key.split(' / ');
                const [bGrade] = b.key.split(' / ');
                const gradeCompare = aGrade.localeCompare(bGrade, undefined, { numeric: true });
                if (gradeCompare !== 0) return gradeCompare;
                return a.key.localeCompare(b.key);
            });
    }, [students, activeEnsinoTab, activeTurnoTab]);

    useEffect(() => {
        setOpenAccordions([]);
    }, [activeEnsinoTab, activeTurnoTab]);


    const handleToggle = (studentId: string, isPresent: boolean) => {
        setAttendance(prev => ({
            ...prev,
            [studentId]: isPresent ? 'present' : 'absent',
        }));
    };

    const saveAttendance = async (groupKey: string, studentsToSave: Student[]) => {
        if (!firestore) return;

        setPendingGroups(prev => ({ ...prev, [groupKey]: true }));
        
        const today = format(new Date(), 'yyyy-MM-dd');
        const attendanceRef = collection(firestore, "attendance");
        const studentIdsToSave = studentsToSave.map(s => s.id);

        try {
            const batch = writeBatch(firestore);
            
            // Delete only existing records for the students in this group for today
            const q = query(collection(firestore, "attendance"), where("date", "==", today), where("studentId", "in", studentIdsToSave));
            const existingDocsSnap = await getDocs(q);
            existingDocsSnap.docs.forEach(docToDelete => {
                batch.delete(docToDelete.ref);
            });
            
            // Add new records for the students in this group
            studentsToSave.forEach((student) => {
                const status = attendance[student.id];
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
            });

            await batch.commit();

            toast({
                title: 'Sucesso',
                description: `Frequência para a turma ${groupKey} salva com sucesso!`,
            });

        } catch (e: any) {
             console.error("Error saving attendance:", e);
             const permissionError = new FirestorePermissionError({
                path: attendanceRef.path,
                operation: 'write',
                requestResourceData: { info: `Batch write for attendance failed for group ${groupKey}.` }
            });
            errorEmitter.emit('permission-error', permissionError);
             
             toast({
                 variant: 'destructive',
                 title: 'Erro',
                 description: `Falha ao salvar a frequência para ${groupKey}.`,
             });
        } finally {
            setPendingGroups(prev => ({ ...prev, [groupKey]: false }));
        }
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
        <div className="space-y-6">
            <div className="space-y-4">
                 <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <Tabs value={activeEnsinoTab} onValueChange={setActiveEnsinoTab} className="w-full sm:w-auto">
                        <TabsList>
                            {uniqueEnsinos.map(ensino => (
                                <TabsTrigger key={ensino} value={ensino}>{ensino}</TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
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

                <Tabs value={activeTurnoTab} onValueChange={setActiveTurnoTab} className="w-full sm:w-auto">
                    <TabsList>
                        {uniqueTurnos.map(turno => (
                            <TabsTrigger key={turno} value={turno}>{turno}</TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </div>
           
             <Accordion 
                type="single" 
                collapsible 
                value={openAccordions[0]}
                onValueChange={(value) => setOpenAccordions(value ? [value] : [])}
                className="w-full"
            >
                {groupedAndSortedStudents.map(group => (
                    <AccordionItem value={group.key} key={group.key}>
                        <AccordionTrigger className="text-lg font-bold">{group.key}</AccordionTrigger>
                        <AccordionContent>
                            <div className="p-1 space-y-4">
                                <div>
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
                                <Button 
                                    onClick={() => saveAttendance(group.key, group.students)}
                                    disabled={pendingGroups[group.key]} 
                                    className="w-full"
                                >
                                    {pendingGroups[group.key] ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                                    ) : (
                                        <><Save className="mr-2 h-4 w-4" /> Salvar Frequência ({group.key})</>
                                    )}
                                </Button>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
            
            {groupedAndSortedStudents.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Nenhuma turma encontrada para os filtros selecionados.</p>
            )}

        </div>
    );

    