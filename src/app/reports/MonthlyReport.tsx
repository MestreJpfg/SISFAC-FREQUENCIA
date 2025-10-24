
"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { format, getMonth, getYear, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Student } from "@/lib/types";
import { Loader2, Search, TriangleAlert, FileDown, ArrowUpDown, ArrowDown, ArrowUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, getDocs, query, where, orderBy, DocumentData } from 'firebase/firestore';
import { Label } from "@/components/ui/label";
import { exportMonthlyReportToPDF } from "@/lib/pdf-export";
import { cn } from "@/lib/utils";

type StudentWithId = Student & { id: string };

type AttendanceRecordWithId = DocumentData & {
    id: string;
    studentId: string;
    studentName: string;
    date: string;
    status: 'present' | 'absent';
    grade: string;
    class: string;
    shift: string;
    ensino: string;
};


export interface MonthlyAbsenceData {
    studentId: string;
    studentName: string;
    studentClass: string;
    studentGrade: string;
    studentShift: string;
    studentEnsino: string;
    absenceCount: number;
}

const months = Array.from({ length: 12 }, (_, i) => ({ value: i, label: format(new Date(2000, i), 'MMMM', {locale: ptBR}) }));
const currentYear = getYear(new Date());
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
type SortableKeys = keyof MonthlyAbsenceData;

export function MonthlyReport() {
    const { firestore } = useFirebase();
    const [month, setMonth] = useState<number>(getMonth(new Date()));
    const [year, setYear] = useState<number>(currentYear);
    const [report, setReport] = useState<MonthlyAbsenceData[]>([]);
    const [isPending, startTransition] = useTransition();
    const [searchedPeriod, setSearchedPeriod] = useState<string | null>(null);
    
    const [ensino, setEnsino] = useState<string>('all');
    const [grade, setGrade] = useState<string>('all');
    const [studentClass, setStudentClass] = useState<string>('all');
    const [shift, setShift] = useState<string>('all');
    
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' } | null>({ key: 'absenceCount', direction: 'descending' });


    const studentsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'students'));
    }, [firestore]);

    const { data: allStudents, isLoading: isLoadingAllStudents } = useCollection<StudentWithId>(studentsQuery);
    
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
    }, [ensino]);

    useEffect(() => {
        setStudentClass('all');
    }, [grade]);

    useEffect(() => {
        setShift('all');
    }, [studentClass]);


    const getMonthlyAbsences = async (month: number, year: number): Promise<AttendanceRecordWithId[]> => {
        if (!firestore) return [];
        
        const startDate = format(startOfMonth(new Date(year, month)), 'yyyy-MM-dd');
        const endDate = format(endOfMonth(new Date(year, month)), 'yyyy-MM-dd');

        const q = query(
            collection(firestore, 'attendance'),
            where('date', '>=', startDate),
            where('date', '<=', endDate),
            where('status', '==', 'absent')
        );

        try {
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AttendanceRecordWithId));
        } catch (error) {
            console.error("Error fetching monthly absences:", error);
            // This could be enhanced to show a toast to the user
            return [];
        }
    }

    const handleSearch = () => {
        if (isLoadingAllStudents) return;

        startTransition(async () => {
            const periodLabel = months.find(m => m.value === month)?.label;
            setSearchedPeriod(`${periodLabel ? periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1) : ''}/${year}`);

            const allMonthlyAbsences = await getMonthlyAbsences(month, year);
            
            const filteredAbsences = allMonthlyAbsences
                .filter(record => ensino === 'all' || record.ensino === ensino)
                .filter(record => grade === 'all' || record.grade === grade)
                .filter(record => studentClass === 'all' || record.class === studentClass)
                .filter(record => shift === 'all' || record.shift === shift);

            const absenceCounts = new Map<string, number>();
            filteredAbsences.forEach(record => {
                absenceCounts.set(record.studentId, (absenceCounts.get(record.studentId) || 0) + 1);
            });

            const studentMap = new Map(allStudents?.map(s => [s.id, s]));

            const reportData: MonthlyAbsenceData[] = [];
            absenceCounts.forEach((count, studentId) => {
                const student = studentMap.get(studentId);
                if (student) {
                    reportData.push({
                        studentId: student.id,
                        studentName: student.name,
                        studentClass: student.class,
                        studentGrade: student.grade,
                        studentShift: student.shift,
                        studentEnsino: student.ensino,
                        absenceCount: count,
                    });
                }
            });
            
            setReport(reportData);
        });
    };

    const sortedReport = useMemo(() => {
        let sortableItems = [...report];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                    return 0;
                }
                
                const aStr = String(aValue);
                const bStr = String(bValue);

                const comparison = aStr.localeCompare(bStr, undefined, { numeric: true });
                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            });
        }
        return sortableItems;
    }, [report, sortConfig]);

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortableKeys) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <ArrowUpDown className="ml-2 h-4 w-4" />;
        }
        if (sortConfig.direction === 'ascending') {
            return <ArrowUp className="ml-2 h-4 w-4" />;
        }
        return <ArrowDown className="ml-2 h-4 w-4" />;
    };
    
    const handleExport = () => {
        if (!searchedPeriod) return;
        const filters = { ensino, grade, studentClass, shift };
        const dataToExport = sortedReport.filter(r => r.absenceCount > 0);
        exportMonthlyReportToPDF(searchedPeriod, filters, dataToExport);
    }
    
    if (isLoadingAllStudents && !allStudents) {
         return (
            <div className="flex justify-center items-center h-60">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
         )
    }
    
    if (!allStudents || allStudents.length === 0) {
         return (
            <Card>
                 <CardHeader>
                    <CardTitle>Relatório Mensal de Ausências</CardTitle>
                    <CardDescription>Selecione um período e filtre para ver o total de faltas por aluno.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <Alert variant="destructive">
                        <TriangleAlert className="h-4 w-4" />
                        <AlertTitle>Nenhum Aluno</AlertTitle>
                        <AlertDescription>Não há dados de alunos para gerar o relatório. Por favor, importe os alunos primeiro.</AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
         )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Relatório Mensal de Ausências</CardTitle>
                <CardDescription>Selecione um período e filtre para ver o total de faltas por aluno.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                        <div className="col-span-2 sm:col-span-1">
                            <Label>Mês</Label>
                            <Select value={String(month)} onValueChange={(val) => setMonth(Number(val))}>
                                <SelectTrigger className="capitalize"><SelectValue placeholder="Mês" /></SelectTrigger>
                                <SelectContent>
                                    {months.map(m => <SelectItem key={m.value} value={String(m.value)} className="capitalize">{m.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="col-span-2 sm:col-span-1">
                            <Label>Ano</Label>
                            <Select value={String(year)} onValueChange={(val) => setYear(Number(val))}>
                                <SelectTrigger><SelectValue placeholder="Ano" /></SelectTrigger>
                                <SelectContent>
                                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="col-span-2 sm:col-span-1">
                            <Label>Ensino</Label>
                            <Select value={ensino} onValueChange={setEnsino} disabled={isLoadingAllStudents || ensinos.length === 0}>
                                <SelectTrigger><SelectValue placeholder="Ensino" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Ensinos</SelectItem>
                                    {ensinos.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Série</Label>
                            <Select value={grade} onValueChange={setGrade} disabled={isLoadingAllStudents || grades.length === 0}>
                                <SelectTrigger><SelectValue placeholder="Série" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as Séries</SelectItem>
                                    {grades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div>
                            <Label>Turma</Label>
                            <Select value={studentClass} onValueChange={setStudentClass} disabled={isLoadingAllStudents || classes.length === 0}>
                                <SelectTrigger><SelectValue placeholder="Turma" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as Turmas</SelectItem>
                                    {classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Turno</Label>
                            <Select value={shift} onValueChange={setShift} disabled={isLoadingAllStudents || shifts.length === 0}>
                                <SelectTrigger><SelectValue placeholder="Turno" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Turnos</SelectItem>
                                    {shifts.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="flex flex-col sm:flex-row gap-2">
                        <Button onClick={handleSearch} disabled={isPending} className="w-full sm:w-auto">
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                            Gerar Relatório
                        </Button>
                        <Button onClick={handleExport} disabled={isPending || !searchedPeriod || sortedReport.filter(r => r.absenceCount > 0).length === 0} className="w-full sm:w-auto" variant="secondary">
                            <FileDown className="mr-2 h-4 w-4" />
                            Exportar para PDF
                        </Button>
                    </div>
                </div>


                 {isPending ? (
                    <div className="flex justify-center items-center h-60">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : searchedPeriod && (
                    <div className="pt-4">
                         <h3 className="font-semibold mb-2">Resultados para {searchedPeriod}: <span className="font-bold">{sortedReport.filter(r => r.absenceCount > 0).length}</span> aluno(s) com faltas</h3>
                          {sortedReport.length === 0 || sortedReport.every(r => r.absenceCount === 0) ? (
                            <p className="text-muted-foreground text-center py-4">Nenhuma ausência registrada para o período e filtros selecionados.</p>
                        ) : (
                            <ScrollArea className="h-96 rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>
                                             <Button variant="ghost" onClick={() => requestSort('studentName')} className="px-0">
                                                Nome do Aluno
                                                {getSortIcon('studentName')}
                                            </Button>
                                        </TableHead>
                                        <TableHead>
                                            <Button variant="ghost" onClick={() => requestSort('studentEnsino')} className="px-0">
                                                Ensino
                                                {getSortIcon('studentEnsino')}
                                            </Button>
                                        </TableHead>
                                        <TableHead>
                                            <Button variant="ghost" onClick={() => requestSort('studentGrade')} className="px-0">
                                                Série
                                                {getSortIcon('studentGrade')}
                                            </Button>
                                        </TableHead>
                                        <TableHead>
                                             <Button variant="ghost" onClick={() => requestSort('studentClass')} className="px-0">
                                                Turma
                                                {getSortIcon('studentClass')}
                                            </Button>
                                        </TableHead>
                                        <TableHead>
                                            <Button variant="ghost" onClick={() => requestSort('studentShift')} className="px-0">
                                                Turno
                                                {getSortIcon('studentShift')}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="text-right">
                                            <Button variant="ghost" onClick={() => requestSort('absenceCount')} className="px-0">
                                                Total de Faltas
                                                {getSortIcon('absenceCount')}
                                            </Button>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedReport.filter(r => r.absenceCount > 0).map((data) => (
                                        <TableRow key={data.studentId}>
                                            <TableCell className="font-medium">{data.studentName}</TableCell>
                                            <TableCell>{data.studentEnsino}</TableCell>
                                            <TableCell>{data.studentGrade}</TableCell>
                                            <TableCell>{data.studentClass}</TableCell>
                                            <TableCell>{data.studentShift}</TableCell>
                                            <TableCell className="text-right font-bold">{data.absenceCount}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            </ScrollArea>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

    