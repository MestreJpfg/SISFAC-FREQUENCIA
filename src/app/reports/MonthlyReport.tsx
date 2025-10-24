
"use client";

import { useState, useTransition, useMemo } from "react";
import { format, getMonth, getYear, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Student, AttendanceRecord } from "@/lib/types";
import { Loader2, Search, TriangleAlert } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { Label } from "@/components/ui/label";

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

    const studentsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'students'), orderBy('name'));
    }, [firestore]);

    const { data: allStudents, isLoading: isLoadingAllStudents } = useCollection<Student>(studentsQuery);

    const { ensinos, grades, classes, shifts } = useMemo(() => {
        if (!allStudents) return { ensinos: [], grades: [], classes: [], shifts: [] };
        const uniqueEnsinos = [...new Set(allStudents.map(s => s.ensino))].sort();
        const uniqueGrades = [...new Set(allStudents.map(s => s.grade))].sort((a,b) => a.localeCompare(b, undefined, { numeric: true }));
        const uniqueClasses = [...new Set(allStudents.map(s => s.class))].sort();
        const uniqueShifts = [...new Set(allStudents.map(s => s.shift))].sort();
        return { ensinos: uniqueEnsinos, grades: uniqueGrades, classes: uniqueClasses, shifts: uniqueShifts };
    }, [allStudents]);

    const filteredStudents = useMemo(() => {
        if (!allStudents) return [];
        return allStudents
            .filter(s => ensino === 'all' || s.ensino === ensino)
            .filter(s => grade === 'all' || s.grade === grade)
            .filter(s => studentClass === 'all' || s.class === studentClass)
            .filter(s => shift === 'all' || s.shift === shift);
    }, [allStudents, ensino, grade, studentClass, shift]);


    const getMonthlyAbsences = async (month: number, year: number, studentsToReport: Student[]): Promise<MonthlyAbsenceData[]> => {
        if (!firestore || studentsToReport.length === 0) return [];
        
        const startDate = startOfMonth(new Date(year, month));
        const endDate = endOfMonth(new Date(year, month));
        const studentIdsSet = new Set(studentsToReport.map(s => s.id));

        const q = query(
            collection(firestore, 'attendance'),
            where('date', '>=', format(startDate, 'yyyy-MM-dd')),
            where('date', '<=', format(endDate, 'yyyy-MM-dd')),
            where('status', '==', 'absent')
        );

        const absenceCounts = new Map<string, number>();
        
        try {
            const querySnapshot = await getDocs(q);

            querySnapshot.forEach(doc => {
                const record = doc.data() as AttendanceRecord;
                // Only count the absence if the student is in the filtered group
                if (studentIdsSet.has(record.studentId)) {
                    absenceCounts.set(record.studentId, (absenceCounts.get(record.studentId) || 0) + 1);
                }
            });
        } catch (error) {
            console.error("Error fetching monthly absences:", error);
            // In a real app, you might want to show a toast to the user
            return []; // Return empty array on error
        }

        return studentsToReport.map(student => ({
            studentId: student.id,
            studentName: student.name,
            studentClass: student.class,
            studentGrade: student.grade,
            studentShift: student.shift,
            studentEnsino: student.ensino,
            absenceCount: absenceCounts.get(student.id) || 0,
        }))
         .sort((a, b) => b.absenceCount - a.absenceCount || a.studentName.localeCompare(b.studentName));
    }

    const handleSearch = () => {
        startTransition(async () => {
            setSearchedPeriod(`${months.find(m => m.value === month)?.label}/${year}`);
            if (filteredStudents.length > 0) {
              const result = await getMonthlyAbsences(month, year, filteredStudents);
              setReport(result);
            } else {
              setReport([]);
            }
        });
    };

     // Auto-run search when filters change and students are loaded
    useEffect(() => {
        if (!isLoadingAllStudents && allStudents && allStudents.length > 0) {
            handleSearch();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredStudents, month, year]); // Re-run when these dependencies change
    
    if (isLoadingAllStudents) {
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
                        <div className="col-span-1">
                            <Label>Mês</Label>
                            <Select value={String(month)} onValueChange={(val) => setMonth(Number(val))}>
                                <SelectTrigger className="capitalize"><SelectValue placeholder="Mês" /></SelectTrigger>
                                <SelectContent>
                                    {months.map(m => <SelectItem key={m.value} value={String(m.value)} className="capitalize">{m.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="col-span-1">
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
                            <Select value={ensino} onValueChange={setEnsino}>
                                <SelectTrigger><SelectValue placeholder="Ensino" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Ensinos</SelectItem>
                                    {ensinos.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Série</Label>
                            <Select value={grade} onValueChange={setGrade}>
                                <SelectTrigger><SelectValue placeholder="Série" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as Séries</SelectItem>
                                    {grades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div>
                            <Label>Turma</Label>
                            <Select value={studentClass} onValueChange={setStudentClass}>
                                <SelectTrigger><SelectValue placeholder="Turma" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as Turmas</SelectItem>
                                    {classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Turno</Label>
                            <Select value={shift} onValueChange={setShift}>
                                <SelectTrigger><SelectValue placeholder="Turno" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Turnos</SelectItem>
                                    {shifts.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <Button onClick={handleSearch} disabled={isPending} className="w-full sm:w-auto">
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                        Gerar Relatório
                    </Button>
                </div>


                 {isPending ? (
                    <div className="flex justify-center items-center h-60">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : searchedPeriod && (
                    <div className="pt-4">
                         <h3 className="font-semibold mb-2 capitalize">Total de ausências em {searchedPeriod}:</h3>
                         {filteredStudents.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">Nenhum aluno encontrado para os filtros selecionados.</p>
                         ) : report.every(r => r.absenceCount === 0) ? (
                            <p className="text-muted-foreground text-center py-4">Nenhuma ausência registrada para o período e filtros selecionados.</p>
                        ) : (
                            <ScrollArea className="h-96 rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome do Aluno</TableHead>
                                        <TableHead>Ensino</TableHead>
                                        <TableHead>Série</TableHead>
                                        <TableHead>Turma</TableHead>
                                        <TableHead>Turno</TableHead>
                                        <TableHead className="text-right">Total de Faltas</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {report.map((data) => (
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

