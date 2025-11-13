
"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Loader2, Search, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AttendanceRecord, Student } from "@/lib/types";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, getDocs, query, where, DocumentData, Timestamp, Query, orderBy, limit, startAfter } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { exportDailyReportToPDF, type DailyAbsenceWithConsecutive } from "@/lib/pdf-export";
import { EditablePhoneCell } from "./EditablePhoneCell";
import { Badge } from "@/components/ui/badge";

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
    
    const [ensinoOptions, setEnsinoOptions] = useState<string[]>([]);
    const [gradeOptions, setGradeOptions] = useState<string[]>([]);
    const [classOptions, setClassOptions] = useState<string[]>([]);
    const [shiftOptions, setShiftOptions] = useState<string[]>([]);
    const [isLoadingFilters, setIsLoadingFilters] = useState(true);

    useEffect(() => {
        if (!firestore) return;

        const fetchFilters = async () => {
            setIsLoadingFilters(true);
            const studentsRef = collection(firestore, 'students');
            const snapshot = await getDocs(studentsRef);
            const students = snapshot.docs.map(doc => doc.data() as Student);
            
            setEnsinoOptions([...new Set(students.map(s => s.ensino))].sort());
            setGradeOptions([...new Set(students.map(s => s.grade))].sort((a,b) => a.localeCompare(b, undefined, { numeric: true })));
            setClassOptions([...new Set(students.map(s => s.class))].sort());
            setShiftOptions([...new Set(students.map(s => s.shift))].sort());
            
            setIsLoadingFilters(false);
        };

        fetchFilters();
    }, [firestore]);


    const getAbsencesForDate = async (targetDate: Date, filters: Record<string, string>): Promise<AttendanceRecord[]> => {
        if (!firestore) return [];
        const dateStart = startOfDay(targetDate);
        const startTimestamp = Timestamp.fromDate(dateStart);
        
        let q: Query<DocumentData> = query(collection(firestore, 'attendance'), 
            where('status', 'in', ['absent', 'justified']),
            where('date', '==', startTimestamp)
        );

        if (filters.ensino && filters.ensino !== 'all') {
            q = query(q, where('ensino', '==', filters.ensino));
        }
        if (filters.grade && filters.grade !== 'all') {
            q = query(q, where('grade', '==', filters.grade));
        }
        if (filters.studentClass && filters.studentClass !== 'all') {
            q = query(q, where('class', '==', filters.studentClass));
        }
        if (filters.shift && filters.shift !== 'all') {
            q = query(q, where('shift', '==', filters.shift));
        }

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ ...(doc.data() as Omit<AttendanceRecord, 'id'>), id: doc.id }));
    }

    const handleSearch = () => {
        if (!date) return;
        
        startTransition(async () => {
            setSearchedDate(date);
            
            const prevDay = startOfDay(subDays(date, 1));
            const currentFilters = { ensino, grade, studentClass, shift };
            
            const [currentAbsencesResult, prevDayAbsencesResult] = await Promise.all([
                getAbsencesForDate(date, currentFilters),
                getAbsencesForDate(prevDay, { ...currentFilters, grade: 'all', studentClass: 'all', shift: 'all' })
            ]);
            
            const prevDayAbsenceSet = new Set(prevDayAbsencesResult.map(a => a.studentId));
            
            const absencesWithDetails: DailyAbsenceWithConsecutive[] = currentAbsencesResult.map(absence => ({
                ...absence,
                telefone: absence.telefone || '-',
                isConsecutive: prevDayAbsenceSet.has(absence.studentId)
            }));
            
            setAbsences(absencesWithDetails);
        });
    };

    const handlePhoneUpdate = (studentId: string, newPhone: string) => {
        setAbsences(currentAbsences => 
            currentAbsences.map(absence => 
                absence.studentId === studentId 
                ? { ...absence, telefone: newPhone } 
                : absence
            )
        );
    }

    const filteredAndSortedAbsences = useMemo(() => {
        return [...absences].sort((a, b) => {
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
    }, [absences]);


    const handleExport = () => {
        if (!searchedDate) return;
        const filters = { ensino, grade, studentClass, shift };
        exportDailyReportToPDF(searchedDate, filters, filteredAndSortedAbsences);
    }
    
    const getStatusBadge = (status: 'present' | 'absent' | 'justified') => {
        switch (status) {
            case 'absent':
                return <Badge variant="destructive">Falta</Badge>;
            case 'justified':
                return <Badge variant="secondary">Justificada</Badge>;
            default:
                return null;
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Relatório Diário de Ausências</CardTitle>
                <CardDescription>Selecione uma data e filtre para ver os alunos ausentes. Clique no telefone para editar.</CardDescription>
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
                            <Select value={ensino} onValueChange={setEnsino} disabled={isLoadingFilters || ensinoOptions.length === 0}>
                                <SelectTrigger><SelectValue placeholder="Ensino" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {ensinoOptions.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Série</Label>
                            <Select value={grade} onValueChange={setGrade} disabled={isLoadingFilters || gradeOptions.length === 0}>
                                <SelectTrigger><SelectValue placeholder="Série" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    {gradeOptions.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div>
                            <Label>Turma</Label>
                            <Select value={studentClass} onValueChange={setStudentClass} disabled={isLoadingFilters || classOptions.length === 0}>
                                <SelectTrigger><SelectValue placeholder="Turma" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    {classOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Turno</Label>
                            <Select value={shift} onValueChange={setShift} disabled={isLoadingFilters || shiftOptions.length === 0}>
                                <SelectTrigger><SelectValue placeholder="Turno" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {shiftOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="flex flex-col sm:flex-row gap-2">
                        <Button onClick={handleSearch} disabled={isPending || !date || isLoadingFilters} className="w-full sm:w-auto">
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                Buscar
                        </Button>
                        <Button onClick={handleExport} disabled={isPending || !searchedDate || filteredAndSortedAbsences.length === 0} className="w-full sm:w-auto" variant="secondary">
                            <FileDown className="mr-2 h-4 w-4" />
                            Exportar para PDF
                        </Button>
                    </div>
                </div>

                {isPending ? (
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
                                            <TableHead>Série</TableHead>
                                            <TableHead>Turma</TableHead>
                                            <TableHead>Turno</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Falta Consecutiva?</TableHead>
                                            <TableHead>Telefone</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredAndSortedAbsences.map((record) => (
                                            <TableRow key={record.id}>
                                                <TableCell className="font-medium">{record.studentName}</TableCell>
                                                <TableCell>{record.grade}</TableCell>
                                                <TableCell>{record.class}</TableCell>
                                                <TableCell>{record.shift}</TableCell>
                                                <TableCell>{getStatusBadge(record.status)}</TableCell>
                                                <TableCell>{record.isConsecutive ? 'Sim' : 'Não'}</TableCell>
                                                <TableCell>
                                                    <EditablePhoneCell 
                                                        studentId={record.studentId}
                                                        initialPhone={record.telefone || ''}
                                                        onPhoneUpdate={handlePhoneUpdate}
                                                    />
                                                </TableCell>
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
