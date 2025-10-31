
"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Loader2, Search, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AttendanceRecord } from "@/lib/types";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, getDocs, query, where, DocumentData, Timestamp } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { exportDailyReportToPDF, type DailyAbsenceWithConsecutive } from "@/lib/pdf-export";
import { cn } from "@/lib/utils";

type Student = { id: string; name: string; ensino: string; grade: string; class: string; shift: string; telefone?: string };

export function DailyReport() {
    const { firestore } = useFirebase();
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [absences, setAbsences] = useState<DailyAbsenceWithConsecutive[]>([]);
    const [isPending, startTransition] = useTransition();
    const [searchedDate, setSearchedDate] = useState<Date | null>(null);

    const [ensino, setEnsino] = useState<string>('all');
    const [grade, setGrade] = useState<string>('all');
    const [studentClass, setStudentClass] = useState<string>('all');
    const [shift, setShift] = useState<string>('all');
    
    const { data: allStudents, isLoading: isLoadingAllStudents } = useCollection<Student>(useMemoFirebase(() => firestore ? query(collection(firestore, 'students')) : null, [firestore]));

    const { ensinos, grades, classes, shifts } = useMemo(() => {
        if (!allStudents) return { ensinos: [], grades: [], classes: [], shifts: [] };

        const filteredByEnsino = ensino === 'all' ? allStudents : allStudents.filter(s => s.ensino === ensino);
        const uniqueEnsinos = [...new Set(allStudents.map(s => s.ensino))].sort();

        const filteredByGrade = grade === 'all' ? filteredByEnsino : filteredByEnsino.filter(s => s.grade === grade);
        const uniqueGrades = [...new Set(filteredByEnsino.map(s => s.grade))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

        const filteredByClass = studentClass === 'all' ? filteredByGrade : filteredByGrade.filter(s => s.class === studentClass);
        const uniqueClasses = [...new Set(filteredByGrade.map(s => s.class))].sort();

        const uniqueShifts = [...new Set(filteredByClass.map(s => s.shift))].sort();

        return { ensinos: uniqueEnsinos, grades: uniqueGrades, classes: uniqueClasses, shifts: uniqueShifts };
    }, [allStudents, ensino, grade, studentClass]);
    
    useEffect(() => {
        setGrade('all');
        setStudentClass('all');
        setShift('all');
    }, [ensino]);
    
    useEffect(() => {
        setStudentClass('all');
        setShift('all');
    }, [grade]);

    useEffect(() => {
        setShift('all');
    }, [studentClass]);

    const getAbsencesForDate = async (targetDate: Date): Promise<AttendanceRecord[]> => {
        if (!firestore) return [];
        const dateStart = new Date(targetDate);
        dateStart.setHours(0, 0, 0, 0);

        const startTimestamp = Timestamp.fromDate(dateStart);
        
        let q = query(collection(firestore, 'attendance'), 
            where('status', '==', 'absent'),
            where('date', '==', startTimestamp)
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ ...(doc.data() as Omit<AttendanceRecord, 'id'>), id: doc.id }));
    }

    const filteredAndSortedAbsences = useMemo(() => {
        let filteredItems = [...absences];

        // Apply filters locally
        if (ensino !== 'all') {
            filteredItems = filteredItems.filter(item => item.ensino === ensino);
        }
        if (grade !== 'all') {
            filteredItems = filteredItems.filter(item => item.grade === grade);
        }
        if (studentClass !== 'all') {
            filteredItems = filteredItems.filter(item => item.class === studentClass);
        }
        if (shift !== 'all') {
            filteredItems = filteredItems.filter(item => item.shift === shift);
        }
        
        // Apply multi-level sorting
        return filteredItems.sort((a, b) => {
            const compare = (key: keyof DailyAbsenceWithConsecutive, numeric = false) => {
                const valA = a[key] || '';
                const valB = b[key] || '';
                if (typeof valA === 'string' && typeof valB === 'string') {
                    return valA.localeCompare(valB, undefined, { numeric });
                }
                return 0;
            };

            return (
                compare('ensino') ||
                compare('grade', true) ||
                compare('class') ||
                compare('shift') ||
                compare('studentName')
            );
        });
    }, [absences, ensino, grade, studentClass, shift]);


    const handleSearch = () => {
        if (!date || !allStudents) return;
        
        startTransition(async () => {
            setSearchedDate(date);
            const [currentAbsences, prevDayAbsences] = await Promise.all([
                getAbsencesForDate(date),
                getAbsencesForDate(subDays(date, 1))
            ]);
            
            const prevDayAbsenceSet = new Set(prevDayAbsences.map(a => a.studentId));
            const studentsMap = new Map(allStudents.map(s => [s.id, s]));

            const absencesWithDetails: DailyAbsenceWithConsecutive[] = currentAbsences.map(absence => {
                const student = studentsMap.get(absence.studentId);
                return {
                    ...absence,
                    telefone: student?.telefone || absence.telefone || '-', // Fallback
                    isConsecutive: prevDayAbsenceSet.has(absence.studentId)
                };
            });
            
            setAbsences(absencesWithDetails);
        });
    };

    const handleExport = () => {
        if (!searchedDate) return;
        const filters = { ensino, grade, studentClass, shift };
        exportDailyReportToPDF(searchedDate, filters, filteredAndSortedAbsences);
    }
    
    // Auto-search on initial load with today's date
    useEffect(() => {
        if (firestore && allStudents && !searchedDate) {
            handleSearch();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [firestore, allStudents]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Relatório Diário de Ausências</CardTitle>
                <CardDescription>Selecione uma data e filtre para ver os alunos ausentes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
                         <div className="col-span-2 sm:col-span-1 lg:col-span-2">
                             <Label>Data</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                         <div className="col-span-2 sm:col-span-1 lg:col-span-1">
                            <Label>Ensino</Label>
                            <Select value={ensino} onValueChange={setEnsino} disabled={isLoadingAllStudents || ensinos.length === 0}>
                                <SelectTrigger><SelectValue placeholder="Ensino" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {ensinos.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Série</Label>
                            <Select value={grade} onValueChange={setGrade} disabled={isLoadingAllStudents || grades.length === 0}>
                                <SelectTrigger><SelectValue placeholder="Série" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    {grades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div>
                            <Label>Turma</Label>
                            <Select value={studentClass} onValueChange={setStudentClass} disabled={isLoadingAllStudents || classes.length === 0}>
                                <SelectTrigger><SelectValue placeholder="Turma" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    {classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Turno</Label>
                            <Select value={shift} onValueChange={setShift} disabled={isLoadingAllStudents || shifts.length === 0}>
                                <SelectTrigger><SelectValue placeholder="Turno" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {shifts.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="flex flex-col sm:flex-row gap-2">
                        <Button onClick={handleSearch} disabled={isPending || !date} className="w-full sm:w-auto">
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                Buscar
                        </Button>
                        <Button onClick={handleExport} disabled={isPending || !searchedDate || filteredAndSortedAbsences.length === 0} className="w-full sm:w-auto" variant="secondary">
                            <FileDown className="mr-2 h-4 w-4" />
                            Exportar para PDF
                        </Button>
                    </div>
                </div>

                {isPending || (isLoadingAllStudents && !searchedDate) ? (
                    <div className="flex justify-center items-center h-60">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : searchedDate && (
                    <div className="pt-4">
                        <h3 className="font-semibold mb-2">Ausentes em {format(searchedDate, "dd/MM/yyyy")}: <span className="font-bold">{filteredAndSortedAbsences.length}</span></h3>
                        {filteredAndSortedAbsences.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">Nenhum aluno ausente para os filtros selecionados.</p>
                        ) : (
                            <div className="w-full overflow-x-auto rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nome do Aluno</TableHead>
                                            <TableHead>Telefone</TableHead>
                                            <TableHead>Série</TableHead>
                                            <TableHead>Turma</TableHead>
                                            <TableHead>Turno</TableHead>
                                            <TableHead>Falta Consecutiva</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredAndSortedAbsences.map((record) => (
                                            <TableRow key={record.id}>
                                                <TableCell className="font-medium">{record.studentName}</TableCell>
                                                <TableCell>{record.telefone || '-'}</TableCell>
                                                <TableCell>{record.grade}</TableCell>
                                                <TableCell>{record.class}</TableCell>
                                                <TableCell>{record.shift}</TableCell>
                                                <TableCell>{record.isConsecutive ? 'Sim' : 'Não'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

    