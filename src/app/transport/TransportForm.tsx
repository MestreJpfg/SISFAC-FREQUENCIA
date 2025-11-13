
"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import type { Student, TransportRecord } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Save, Loader2, TriangleAlert, Bus, Ban } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, writeBatch, doc, getDocs, query, serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type StudentWithId = Student & { id: string };
type Route = '' | 'ROTA CURIÓ' | 'ROTA BARRO DURO' | 'ROTA ABREULÂNDIA';
const routes: Route[] = ['ROTA CURIÓ', 'ROTA BARRO DURO', 'ROTA ABREULÂNDIA'];

type TransportState = {
    usesTransport: boolean;
    route: Route;
}

type GroupedStudents = {
    [groupKey: string]: StudentWithId[];
}

const getEnsinoContraction = (ensino: string): string => {
    const upperEnsino = ensino.toUpperCase();
    if (upperEnsino.includes('INFANTIL')) return 'INFANTIL';
    if (upperEnsino.includes('FUNDAMENTAL 1') || upperEnsino.includes('FUNDAMENTAL I')) return 'FUND. I';
    if (upperEnsino.includes('FUNDAMENTAL 2') || upperEnsino.includes('FUNDAMENTAL II')) return 'FUND. II';
    if (upperEnsino.includes('MÉDIO')) return 'MÉDIO';
    return ensino;
}

export function TransportForm() {
    const { firestore } = useFirebase();
    const [transportData, setTransportData] = useState<Record<string, TransportState>>({});
    const [pendingGroups, setPendingGroups] = useState<Record<string, boolean>>({});
    const { toast } = useToast();
    const [activeEnsinoTab, setActiveEnsinoTab] = useState<string | undefined>();
    const [activeTurnoTab, setActiveTurnoTab] = useState<string | undefined>();
    const [openAccordions, setOpenAccordions] = useState<string[]>([]);
    const isInitialized = useRef(false);

    const studentsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'students'));
    }, [firestore]);

    const { data: students, isLoading: isLoadingStudents } = useCollection<Student>(studentsQuery);

    const transportQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'transport'));
    }, [firestore]);

    const { data: existingTransportData, isLoading: isLoadingTransport } = useCollection<TransportRecord>(transportQuery);

    useEffect(() => {
        if (students && existingTransportData && !isInitialized.current) {
            const initialTransportData: Record<string, TransportState> = {};
            const transportMap = new Map(existingTransportData.map(t => [t.studentId, { usesTransport: t.usesTransport, route: t.route }]));

            students.forEach(student => {
                const record = transportMap.get(student.id);
                initialTransportData[student.id] = record || { usesTransport: false, route: '' };
            });
            setTransportData(initialTransportData);
            isInitialized.current = true;
        }
    }, [students, existingTransportData]);

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
                
                const gradeCompare = aGrade.localeCompare(bGrade, undefined, { numeric: true });
                if (gradeCompare !== 0) return gradeCompare;

                return aClass.localeCompare(bClass, undefined, { numeric: true });
            })
            .map(([key, students]) => ({ key, students }));
    }, [students, activeEnsinoTab, activeTurnoTab]);

    useEffect(() => {
        if (groupedAndSortedStudents.length > 0) {
            setOpenAccordions([groupedAndSortedStudents[0].key]);
        } else {
            setOpenAccordions([]);
        }
    }, [groupedAndSortedStudents]);


    const handleTransportChange = (studentId: string, uses: boolean) => {
        setTransportData(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                usesTransport: uses,
                route: uses ? prev[studentId]?.route || '' : '',
            },
        }));
    };

    const handleRouteChange = (studentId: string, route: Route) => {
        setTransportData(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                route: route,
            },
        }));
    };

    const saveTransportData = (groupKey: string, studentsToSave: StudentWithId[]) => {
        if (!firestore) return;

        setPendingGroups(prev => ({ ...prev, [groupKey]: true }));
        
        const batch = writeBatch(firestore);
        
        studentsToSave.forEach((student) => {
            const studentTransportData = transportData[student.id];
            if (studentTransportData) {
                const transportRef = doc(firestore, "transport", student.id); // Use student ID as document ID
                const record: Omit<TransportRecord, 'id'> = {
                    studentId: student.id,
                    studentName: student.name,
                    usesTransport: studentTransportData.usesTransport,
                    route: studentTransportData.usesTransport ? studentTransportData.route : '',
                    ensino: student.ensino,
                    grade: student.grade,
                    class: student.class,
                    shift: student.shift,
                    updatedAt: serverTimestamp() as any,
                };
                batch.set(transportRef, record, { merge: true });
            }
        });

        batch.commit()
        .then(() => {
            toast({
                title: 'Sucesso',
                description: `Dados de transporte para a turma ${groupKey} salvos com sucesso!`,
            });
        })
        .catch(e => {
            console.error("Error saving transport data: ", e);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: `Não foi possível salvar os dados de transporte para a turma ${groupKey}.`,
            });
        })
        .finally(() => {
            setPendingGroups(prev => ({ ...prev, [groupKey]: false }));
        });
    };
    
    if (isLoadingStudents || isLoadingTransport || !isInitialized.current) {
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

    const usingTransportCount = Object.values(transportData).filter(t => t.usesTransport).length;
    const notUsingTransportCount = Object.values(transportData).length - usingTransportCount;

    return (
        <div className="space-y-6">
            <div className="flex flex-row justify-center items-center gap-4 text-sm font-medium w-full flex-wrap border-b pb-4">
                <div className="flex items-center gap-2 text-green-600">
                    <Bus className="h-5 w-5" />
                    Utilizando Transporte: {usingTransportCount}
                </div>
                <div className="flex items-center gap-2 text-red-600">
                    <Ban className="h-5 w-5" />
                    Não Utilizando: {notUsingTransportCount}
                </div>
            </div>

            <div className="flex flex-col items-center gap-4">
                 <Tabs value={activeEnsinoTab} onValueChange={setActiveEnsinoTab} className="w-full sm:w-auto">
                    <TabsList>
                        {uniqueEnsinos.map(ensino => (
                            <TabsTrigger key={ensino} value={ensino}>{getEnsinoContraction(ensino)}</TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
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
                                    {groupStudents.map((student, index) => {
                                        const studentTransport = transportData[student.id] || { usesTransport: false, route: '' };
                                        return (
                                            <div key={student.id}>
                                                <div className="grid grid-cols-3 items-center p-3 rounded-md hover:bg-accent/30 transition-colors">
                                                    <p className="text-base font-medium col-span-1">{student.name}</p>
                                                    <div className="flex items-center justify-center gap-4 col-span-1">
                                                        <Label htmlFor={`transport-switch-${student.id}`}>Utiliza?</Label>
                                                        <Switch
                                                            id={`transport-switch-${student.id}`}
                                                            checked={studentTransport.usesTransport}
                                                            onCheckedChange={(checked) => handleTransportChange(student.id, checked)}
                                                        />
                                                    </div>
                                                    <div className="col-span-1">
                                                        {studentTransport.usesTransport && (
                                                            <Select
                                                                value={studentTransport.route}
                                                                onValueChange={(value: Route) => handleRouteChange(student.id, value)}
                                                            >
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder="Selecione a Rota" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {routes.map(r => (
                                                                        <SelectItem key={r} value={r}>{r}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        )}
                                                    </div>
                                                </div>
                                                {index < groupStudents.length - 1 && <Separator />}
                                            </div>
                                        )
                                    })}
                                </div>
                                <Button 
                                    onClick={() => saveTransportData(key, groupStudents)}
                                    disabled={pendingGroups[key]} 
                                    className="w-full"
                                >
                                    {pendingGroups[key] ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                                    ) : (
                                        <><Save className="mr-2 h-4 w-4" /> Salvar Dados de Transporte ({key})</>
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
