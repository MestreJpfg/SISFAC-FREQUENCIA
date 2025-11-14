
"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth, getYear, getMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Search, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AttendanceRecord, Student } from "@/lib/types";
import { useFirebase } from "@/firebase";
import { collection, getDocs, query, where, DocumentData, Timestamp, Query } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type MonthlyAbsenceSummary = {
    studentId: string;
    studentName: string;
    grade: string;
    class: string;
    shift: string;
    totalAbsences: number;
    justifiedAbsences: number;
    unjustifiedAbsences: number;
}

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: format(new Date(2000, i), 'MMMM', { locale: ptBR })
}));

const currentYear = getYear(new Date());
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

export function MonthlyReport() {
    const { firestore } = useFirebase();
    const [month, setMonth] = useState<number>(getMonth(new Date()));
    const [year, setYear] = useState<number>(currentYear);
    const [absences, setAbsences] = useState<MonthlyAbsenceSummary[]>([]);
    const [isPending, startTransition] = useTransition();
    const [searchedPeriod, setSearchedPeriod] = useState<string | null>(null);

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


    const handleSearch = () => {
        startTransition(async () => {
            if (!firestore) return;
            
            const startDate = startOfMonth(new Date(year, month));
            const endDate = endOfMonth(new Date(year, month));
            setSearchedPeriod(`${months.find(m => m.value === month)?.label} de ${year}`);
            
            let q: Query<DocumentData> = query(collection(firestore, 'attendance'), 
                where('status', 'in', ['absent', 'justified']),
                where('date', '>=', Timestamp.fromDate(startDate)),
                where('date', '<=', Timestamp.fromDate(endDate))
            );

            if (ensino !== 'all') q = query(q, where('ensino', '==', ensino));
            if (grade !== 'all') q = query(q, where('grade', '==', grade));
            if (studentClass !== 'all') q = query(q, where('class', '==', studentClass));
            if (shift !== 'all') q = query(q, where('shift', '==', shift));
            
            const querySnapshot = await getDocs(q);
            const records = querySnapshot.docs.map(doc => doc.data() as AttendanceRecord);

            const summary: Record<string, MonthlyAbsenceSummary> = {};

            records.forEach(record => {
                if (!summary[record.studentId]) {
                    summary[record.studentId] = {
                        studentId: record.studentId,
                        studentName: record.studentName,
                        grade: record.grade,
                        class: record.class,
                        shift: record.shift,
                        totalAbsences: 0,
                        justifiedAbsences: 0,
                        unjustifiedAbsences: 0,
                    };
                }
                summary[record.studentId].totalAbsences++;
                if (record.status === 'justified') {
                    summary[record.studentId].justifiedAbsences++;
                } else {
                    summary[record.studentId].unjustifiedAbsences++;
                }
            });

            const sortedAbsences = Object.values(summary).sort((a, b) => b.totalAbsences - a.totalAbsences);
            setAbsences(sortedAbsences);
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Relatório Mensal de Faltas</CardTitle>
                <CardDescription>Selecione o mês e o ano para ver a contagem de faltas por aluno.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 items-end">
                         <div className="col-span-1">
                             <Label>Mês</Label>
                            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-1">
                             <Label>Ano</Label>
                             <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="col-span-1">
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
                        <Button onClick={handleSearch} disabled={isPending || isLoadingFilters} className="w-full sm:w-auto">
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                Buscar
                        </Button>
                    </div>
                </div>

                {isPending ? (
                    <div className="flex justify-center items-center h-60">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : searchedPeriod && (
                    <div className="pt-4">
                        <h3 className="font-semibold mb-2 text-lg">Resumo de Faltas para <span className="capitalize">{searchedPeriod}</span>: <span className="font-bold">{absences.length}</span> aluno(s) com faltas.</h3>
                        {absences.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">Nenhum aluno com faltas para o período e filtros selecionados.</p>
                        ) : (
                            <div className="w-full overflow-x-auto rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Posição</TableHead>
                                            <TableHead>Nome do Aluno</TableHead>
                                            <TableHead>Série/Turma</TableHead>
                                            <TableHead>Turno</TableHead>
                                            <TableHead className="text-center">Faltas Justificadas</TableHead>
                                            <TableHead className="text-center">Faltas Não Justificadas</TableHead>
                                            <TableHead className="text-center font-bold">Total de Faltas</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {absences.map((record, index) => (
                                            <TableRow key={record.studentId} className={record.totalAbsences > 5 ? 'bg-destructive/10' : ''}>
                                                <TableCell className="font-medium text-center">{index + 1}º</TableCell>
                                                <TableCell className="font-medium">{record.studentName}</TableCell>
                                                <TableCell>{`${record.grade} / ${record.class}`}</TableCell>
                                                <TableCell>{record.shift}</TableCell>
                                                <TableCell className="text-center">{record.justifiedAbsences}</TableCell>
                                                <TableCell className="text-center">{record.unjustifiedAbsences}</TableCell>
                                                <TableCell className="text-center font-bold text-lg">{record.totalAbsences}</TableCell>
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
