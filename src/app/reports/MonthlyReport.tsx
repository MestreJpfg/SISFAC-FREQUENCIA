"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { format, getMonth, getYear, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Student, AttendanceRecord } from "@/lib/types";
import { Loader2, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, getDocs, query, where, orderBy, QueryConstraint } from 'firebase/firestore';

export interface MonthlyAbsenceData {
    studentId: string;
    studentName: string;
    studentClass: string;
    studentGrade: string;
    studentShift: string;
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

    const [grade, setGrade] = useState<string>('all');
    const [studentClass, setStudentClass] = useState<string>('all');
    const [shift, setShift] = useState<string>('all');

    const studentsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        let q = query(collection(firestore, 'students'));
        const constraints: QueryConstraint[] = [];
        if (grade !== 'all') constraints.push(where('grade', '==', grade));
        if (studentClass !== 'all') constraints.push(where('class', '==', studentClass));
        if (shift !== 'all') constraints.push(where('shift', '==', shift));
        
        if (constraints.length > 0) {
            q = query(q, ...constraints);
        }
        q = query(q, orderBy('name'));

        return q;
    }, [firestore, grade, studentClass, shift]);

    const { data: students, isLoading: isLoadingStudents } = useCollection<Student>(studentsQuery);
    const { data: allStudents } = useCollection<Student>(useMemoFirebase(() => firestore ? collection(firestore, 'students') : null, [firestore]));

    const { grades, classes, shifts } = useMemo(() => {
        if (!allStudents) return { grades: [], classes: [], shifts: [] };
        const grades = [...new Set(allStudents.map(s => s.grade))].sort((a,b) => a.localeCompare(b, undefined, { numeric: true }));
        const classes = [...new Set(allStudents.map(s => s.class))].sort();
        const shifts = [...new Set(allStudents.map(s => s.shift))].sort();
        return { grades, classes, shifts };
    }, [allStudents]);


    const getMonthlyAbsences = async (month: number, year: number, students: Student[]): Promise<MonthlyAbsenceData[]> => {
        if (!firestore || students.length === 0) return [];
        
        const startDate = startOfMonth(new Date(year, month));
        const endDate = endOfMonth(new Date(year, month));

        const studentIdSet = new Set(students.map(s => s.id));

        const attendanceRef = collection(firestore, 'attendance');
        
        // Simplified query: Fetch all records for the month. Filtering by status happens on the client.
        const q = query(
            attendanceRef,
            where('date', '>=', format(startDate, 'yyyy-MM-dd')),
            where('date', '<=', format(endDate, 'yyyy-MM-dd'))
        );

        const querySnapshot = await getDocs(q);
        const absenceCounts = new Map<string, number>();

        querySnapshot.forEach(doc => {
            const record = doc.data() as AttendanceRecord;
            // Client-side filtering
            if (record.status === 'absent' && studentIdSet.has(record.studentId)) {
                 absenceCounts.set(record.studentId, (absenceCounts.get(record.studentId) || 0) + 1);
            }
        });


        const reportData: MonthlyAbsenceData[] = students.map(student => ({
            studentId: student.id,
            studentName: student.name,
            studentClass: student.class,
            studentGrade: student.grade,
            studentShift: student.shift,
            absenceCount: absenceCounts.get(student.id) || 0,
        }))
         .sort((a, b) => b.absenceCount - a.absenceCount || a.studentName.localeCompare(b.studentName));

        return reportData;
    }

    const handleSearch = () => {
        if (!students) return;
        setSearchedPeriod(`${months.find(m => m.value === month)?.label}/${year}`);
        startTransition(async () => {
            const result = await getMonthlyAbsences(month, year, students);
            setReport(result);
        });
    };
    
    if (isLoadingStudents) {
         return (
            <div className="flex justify-center items-center h-60">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
         )
    }
    
    if ((!allStudents || allStudents.length === 0) && !isPending) {
         return (
            <Card>
                 <CardHeader>
                    <CardTitle>Relatório Mensal de Ausências</CardTitle>
                    <CardDescription>Selecione um mês e ano para ver o total de faltas por aluno.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <Alert>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <Select value={String(month)} onValueChange={(val) => setMonth(Number(val))}>
                        <SelectTrigger className="capitalize"><SelectValue placeholder="Mês" /></SelectTrigger>
                        <SelectContent>
                            {months.map(m => <SelectItem key={m.value} value={String(m.value)} className="capitalize">{m.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={String(year)} onValueChange={(val) => setYear(Number(val))}>
                        <SelectTrigger><SelectValue placeholder="Ano" /></SelectTrigger>
                        <SelectContent>
                            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Select value={grade} onValueChange={setGrade}>
                        <SelectTrigger><SelectValue placeholder="Série" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Séries</SelectItem>
                            {grades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Select value={studentClass} onValueChange={setStudentClass}>
                        <SelectTrigger><SelectValue placeholder="Turma" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Turmas</SelectItem>
                            {classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={shift} onValueChange={setShift}>
                        <SelectTrigger><SelectValue placeholder="Turno" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Turnos</SelectItem>
                            {shifts.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <Button onClick={handleSearch} disabled={isPending} className="w-full sm:w-auto">
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                    Gerar Relatório
                </Button>

                 {isPending ? (
                    <div className="flex justify-center items-center h-60">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : searchedPeriod && (
                    <div className="pt-4">
                         <h3 className="font-semibold mb-2 capitalize">Total de ausências em {searchedPeriod}:</h3>
                         {(!students || students.length === 0) ? (
                            <p className="text-muted-foreground text-center py-4">Nenhum aluno encontrado para os filtros selecionados.</p>
                         ) : report.every(r => r.absenceCount === 0) ? (
                            <p className="text-muted-foreground text-center py-4">Nenhuma ausência registrada para o período e filtros selecionados.</p>
                        ) : (
                            <ScrollArea className="h-96 rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome do Aluno</TableHead>
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
