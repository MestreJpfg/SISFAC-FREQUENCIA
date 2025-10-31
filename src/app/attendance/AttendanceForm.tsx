
"use client";

import { useState, useMemo, useEffect } from 'react';
import type { Student } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, Loader2, UserCheck, UserX, TriangleAlert } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, writeBatch, doc, getDocs, query, where, DocumentData, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Definindo o tipo para os alunos com ID
type StudentWithId = Student & { id: string };

type AttendanceRecordForSave = {
    studentId: string;
    studentName: string;
    date: Timestamp; // Changed to Timestamp
    status: 'present' | 'absent';
    grade: string;
    class: string;
    shift: string;
    ensino: string;
    telefone?: string;
};

type AttendanceRecordFromDB = Omit<AttendanceRecordForSave, 'date'> & {
    id: string;
    date: Timestamp; // From Firestore
};

type GroupedStudents = {
    [groupKey: string]: StudentWithId[];
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

    const todayStart = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return Timestamp.fromDate(d);
    }, []);

    const attendanceQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'attendance'), where('date', '==', todayStart));
    }, [firestore, todayStart]);

    const { data: todaysAttendance, isLoading: isLoadingAttendance } = useCollection<AttendanceRecordFromDB>(attendanceQuery);

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

    const { uniqueEnsinos } = useMemo(() => {
        if (!students) return { uniqueEnsinos: [] };
        const ensinos = [...new Set(students.map(s => s.ensino || 'N/A'))].sort();
        return { uniqueEnsinos: ensinos };
    }, [students]);

    useEffect(() => {
        if (uniqueEnsinos.length > 0 && !activeEnsinoTab) {
            setActiveEnsinoTab(uniqueEnsinos[0]);
        }
    }, [uniqueEnsinos, activeEnsinoTab]);

     useEffect(() => {
        if (activeEnsinoTab && students) {
             const turnosForEnsino = [...new Set(students.filter(s => s.ensino === activeEnsinoTab).map(s => s.shift || 'N/A'))].sort();
             if (turnosForEnsino.length > 0) {
                setActiveTurnoTab(turnosForEnsino[0]);
             } else {
                setActiveTurnoTab(undefined);
             }
        }
    }, [activeEnsinoTab, students]);


    const turnosForSelectedEnsino = useMemo(() => {
        if (!students || !activeEnsinoTab) return [];
        return [...new Set(students.filter(s => s.ensino === activeEnsinoTab).map(s => s.shift || 'N/A'))].sort();
    }, [students, activeEnsinoTab]);


    const groupedAndSortedStudents = useMemo(() => {
        if (!students || !activeEnsinoTab || !activeTurnoTab) return [];
        
        const filteredStudents = students.filter(student => student.ensino === activeEnsinoTab && student.shift === activeTurnoTab);
        
        const groups = filteredStudents.reduce((acc, student) => {
            const groupKey = `${student.grade || 'N/A'} / ${student.class || 'N/A'}`;
            if (!acc[groupKey]) {
                acc[groupKey] = [];
            }
            acc[groupKey].push(student);
            return acc;
        }, {} as GroupedStudents);

        Object.values(groups).forEach(group => {
            group.sort((a,b) => (a.name || '').localeCompare(b.name || ''))
        });

        return Object.entries(groups)
            .sort((a, b) => {
                const [aGrade, aClass] = a[0].split(' / ');
                const [bGrade, bClass] = b[0].split(' / ');
                
                // Comparar 'Série' (grade)
                const gradeCompare = aGrade.localeCompare(bGrade, undefined, { numeric: true });
                if (gradeCompare !== 0) return gradeCompare;

                // Se a série for a mesma, comparar 'Turma' (class)
                return aClass.localeCompare(bClass, undefined, { numeric: true });
            })
            .map(([key, students]) => ({ key, students }));
    }, [students, activeEnsinoTab, activeTurnoTab]);

    useEffect(() => {
        // Automatically open the first accordion for the new set of groups
        if (groupedAndSortedStudents.length > 0) {
            setOpenAccordions([groupedAndSortedStudents[0].key]);
        } else {
            setOpenAccordions([]);
        }
    }, [groupedAndSortedStudents]);


    const handleToggle = (studentId: string, isPresent: boolean) => {
        setAttendance(prev => ({
            ...prev,
            [studentId]: isPresent ? 'present' : 'absent',
        }));
    };

    const saveAttendance = (groupKey: string, studentsToSave: StudentWithId[]) => {
        if (!firestore) return;

        setPendingGroups(prev => ({ ...prev, [groupKey]: true }));
        
        const attendanceRef = collection(firestore, "attendance");
        const studentIdsToSave = studentsToSave.map(s => s.id);
        
        const batch = writeBatch(firestore);
        
        // Firestore 'in' query supports a maximum of 30 elements
        const idChunks: string[][] = [];
        for (let i = 0; i < studentIdsToSave.length; i += 30) {
            idChunks.push(studentIdsToSave.slice(i, i + 30));
        }

        const deletionPromises = idChunks.map(chunk => {
            const q = query(collection(firestore, "attendance"), where("date", "==", todayStart), where("studentId", "in", chunk));
            return getDocs(q);
        });

        Promise.all(deletionPromises).then(snapshots => {
            snapshots.forEach(snapshot => {
                snapshot.docs.forEach(docToDelete => {
                    batch.delete(docToDelete.ref);
                });
            });

            studentsToSave.forEach((student) => {
                const status = attendance[student.id];
                 const record: AttendanceRecordForSave = {
                    studentId: student.id,
                    studentName: student.name,
                    date: todayStart,
                    status: status,
                    grade: student.grade,
                    class: student.class,
                    shift: student.shift,
                    ensino: student.ensino,
                    telefone: student.telefone,
                };
                const newDocRef = doc(attendanceRef);
                batch.set(newDocRef, record);
            });

            return batch.commit();
        })
        .then(() => {
            toast({
                title: 'Sucesso',
                description: `Frequência para a turma ${groupKey} salva com sucesso!`,
            });
        })
        .catch(e => {
            const permissionError = new FirestorePermissionError({
                path: attendanceRef.path,
                operation: 'write',
                requestResourceData: { info: `Batch write for attendance failed for group ${groupKey}.` }
            });
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setPendingGroups(prev => ({ ...prev, [groupKey]: false }));
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
                        {turnosForSelectedEnsino.map(turno => (
                            <TabsTrigger key={turno} value={turno}>{turno}</TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </div>
           
             <Accordion 
                type="multiple" 
                value={openAccordions}
                onValueChange={setOpenAccordions}
                className="w-full"
            >
                {groupedAndSortedStudents.map(({ key, students: groupStudents }) => (
                    <AccordionItem value={key} key={key}>
                        <AccordionTrigger className="text-lg font-bold">{key}</AccordionTrigger>
                        <AccordionContent>
                            <div className="p-1 space-y-4">
                                <div>
                                    {groupStudents.map((student, index) => (
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
                                            {index < groupStudents.length - 1 && <Separator />}
                                        </div>
                                    ))}
                                </div>
                                <Button 
                                    onClick={() => saveAttendance(key, groupStudents)}
                                    disabled={pendingGroups[key]} 
                                    className="w-full"
                                >
                                    {pendingGroups[key] ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                                    ) : (
                                        <><Save className="mr-2 h-4 w-4" /> Salvar Frequência ({key})</>
                                    )}
                                </Button>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
            
            {groupedAndSortedStudents.length === 0 && activeEnsinoTab && activeTurnoTab && (
                <p className="text-center text-muted-foreground py-8">Nenhuma turma encontrada para os filtros selecionados.</p>
            )}

        </div>
    );
}

    

    

    
