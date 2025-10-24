
"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AttendanceRecord, Student } from "@/lib/types";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";


export function DailyReport() {
    const { firestore } = useFirebase();
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [absences, setAbsences] = useState<AttendanceRecord[]>([]);
    const [isPending, startTransition] = useTransition();
    const [searchedDate, setSearchedDate] = useState<Date | null>(null);

    const [ensino, setEnsino] = useState<string>('all');
    const [grade, setGrade] = useState<string>('all');
    const [studentClass, setStudentClass] = useState<string>('all');
    const [shift, setShift] = useState<string>('all');

    const { data: allStudents } = useCollection<Student>(useMemoFirebase(() => firestore ? query(collection(firestore, 'students'), orderBy('ensino')) : null, [firestore]));

    const { ensinos, grades, classes, shifts } = useMemo(() => {
        if (!allStudents) return { ensinos: [], grades: [], classes: [], shifts: [] };
        const uniqueEnsinos = [...new Set(allStudents.map(s => s.ensino))].sort();
        const uniqueGrades = [...new Set(allStudents.map(s => s.grade))].sort((a,b) => a.localeCompare(b, undefined, { numeric: true }));
        const uniqueClasses = [...new Set(allStudents.map(s => s.class))].sort();
        const uniqueShifts = [...new Set(allStudents.map(s => s.shift))].sort();
        return { ensinos: uniqueEnsinos, grades: uniqueGrades, classes: uniqueClasses, shifts: uniqueShifts };
    }, [allStudents]);

    const getDailyAbsences = async (date: Date): Promise<AttendanceRecord[]> => {
        if (!firestore) return [];
        const dateString = format(date, 'yyyy-MM-dd');
        
        const attendanceRef = collection(firestore, 'attendance');
        const q = query(attendanceRef, where('date', '==', dateString), where('status', '==', 'absent'));
        
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => doc.data() as AttendanceRecord);
    }
    
    const filteredAbsences = useMemo(() => {
        return absences
            .filter(record => ensino === 'all' || record.ensino === ensino)
            .filter(record => grade === 'all' || record.grade === grade)
            .filter(record => studentClass === 'all' || record.class === studentClass)
            .filter(record => shift === 'all' || record.shift === shift)
            .sort((a, b) => a.studentName.localeCompare(b.studentName));
    }, [absences, ensino, grade, studentClass, shift]);


    const handleSearch = () => {
        if (!date) return;
        setSearchedDate(date);
        startTransition(async () => {
            const result = await getDailyAbsences(date);
            setAbsences(result);
        });
    };

    // Auto-search on initial load with today's date
    useEffect(() => {
        if (firestore) {
            handleSearch();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [firestore]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Relatório Diário de Ausências</CardTitle>
                <CardDescription>Selecione uma data e filtre para ver os alunos ausentes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                         <div className="col-span-1 sm:col-span-2 lg:col-span-1">
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
                         <div>
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
                     <Button onClick={handleSearch} disabled={isPending || !date} className="w-full sm:w-auto">
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                            Buscar
                    </Button>
                </div>

                {isPending ? (
                    <div className="flex justify-center items-center h-60">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : searchedDate && (
                    <div className="pt-4">
                        <h3 className="font-semibold mb-2">Ausentes em {format(searchedDate, "dd/MM/yyyy")}: <span className="font-bold">{filteredAbsences.length}</span></h3>
                        {filteredAbsences.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">Nenhum aluno ausente para os filtros selecionados.</p>
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
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAbsences.map((record, index) => (
                                        <TableRow key={`${record.studentId}-${index}`}>
                                            <TableCell className="font-medium">{record.studentName}</TableCell>
                                            <TableCell>{record.ensino}</TableCell>
                                            <TableCell>{record.grade}</TableCell>
                                            <TableCell>{record.class}</TableCell>
                                            <TableCell>{record.shift}</TableCell>
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
