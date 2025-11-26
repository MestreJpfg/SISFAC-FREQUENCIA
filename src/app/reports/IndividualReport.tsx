
"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Loader2, Search, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { type Student, type AttendanceRecord } from "@/lib/types";
import { useFirebase } from "@/firebase";
import { collection, getDocs, query, where, DocumentData, Timestamp, orderBy } from 'firebase/firestore';
import { Label } from "@/components/ui/label";
import { exportIndividualReportToPDF } from "@/lib/pdf-export";
import { Badge } from "@/components/ui/badge";

type StudentWithId = Student & { id: string };

export function IndividualReport() {
    const { firestore } = useFirebase();
    const [isPending, startTransition] = useTransition();
    const [isLoadingStudents, setIsLoadingStudents] = useState(true);

    const [students, setStudents] = useState<StudentWithId[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<StudentWithId | null>(null);
    const [absences, setAbsences] = useState<AttendanceRecord[]>([]);
    const [searchedStudent, setSearchedStudent] = useState<StudentWithId | null>(null);
    
    const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });

    useEffect(() => {
        if (!firestore) return;

        const fetchStudents = async () => {
            setIsLoadingStudents(true);
            const studentsCollection = collection(firestore, 'students');
            const snapshot = await getDocs(query(studentsCollection, orderBy('name')));
            const studentList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentWithId));
            setStudents(studentList);
            setIsLoadingStudents(false);
        };

        fetchStudents();
    }, [firestore]);


    const handleSearch = () => {
        if (!firestore || !selectedStudent || !dateRange.from || !dateRange.to) return;
        
        startTransition(async () => {
            setSearchedStudent(selectedStudent);
            const startDate = Timestamp.fromDate(dateRange.from!);
            const endDate = Timestamp.fromDate(dateRange.to!);
            
            const q = query(
                collection(firestore, 'attendance'),
                where('studentId', '==', selectedStudent.id),
                where('date', '>=', startDate),
                where('date', '<=', endDate)
                // orderBy('date', 'asc') was removed to prevent index error
            );
            
            const querySnapshot = await getDocs(q);
            const results = querySnapshot.docs.map(doc => {
                 const data = doc.data();
                 return {
                     ...data,
                     id: doc.id,
                     date: (data.date as Timestamp).toDate(),
                 } as unknown as AttendanceRecord;
            });

            // Filter for absences on the client-side
            const studentAbsences = results.filter(record => record.status === 'absent' || record.status === 'justified');

            // Sort on the client-side
            studentAbsences.sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime());

            setAbsences(studentAbsences);
        });
    };
    
    const handleExport = () => {
        if (!searchedStudent || !dateRange.from || !dateRange.to) return;
        exportIndividualReportToPDF(searchedStudent, dateRange.from, dateRange.to, absences);
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
    
    const totalAbsences = absences.length;
    const justifiedAbsences = absences.filter(a => a.status === 'justified').length;
    const unjustifiedAbsences = totalAbsences - justifiedAbsences;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Relatório Individual de Aluno</CardTitle>
                <CardDescription>Busque por um aluno e selecione um período para ver seu histórico de faltas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-1 space-y-2">
                        <Label>Buscar Aluno</Label>
                        {isLoadingStudents ? <Loader2 className="animate-spin mt-2" /> : (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start">
                                        {selectedStudent ? <>{selectedStudent.name}</> : <>Selecione um aluno</>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                                    <Command>
                                        <CommandInput placeholder="Buscar aluno..." />
                                        <CommandList>
                                            <CommandEmpty>Nenhum aluno encontrado.</CommandEmpty>
                                            <CommandGroup>
                                                {students.map((student) => (
                                                <CommandItem
                                                    key={student.id}
                                                    value={student.name}
                                                    onSelect={() => {
                                                        setSelectedStudent(student);
                                                        setSearchedStudent(null);
                                                        setAbsences([]);
                                                    }}
                                                >
                                                    {student.name}
                                                </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>
                     <div className="md:col-span-1 space-y-2">
                        <Label htmlFor="date">Período</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button id="date" variant={"outline"} className="w-full justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                        <>
                                            {format(dateRange.from, "LLL dd, y", { locale: ptBR })} -{" "}
                                            {format(dateRange.to, "LLL dd, y", { locale: ptBR })}
                                        </>
                                        ) : (
                                        format(dateRange.from, "LLL dd, y")
                                        )
                                    ) : (
                                        <span>Escolha um período</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange?.from}
                                    selected={dateRange}
                                    onSelect={setDateRange}
                                    numberOfMonths={2}
                                    locale={ptBR}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                     <div className="flex flex-col sm:flex-row gap-2">
                        <Button onClick={handleSearch} disabled={isPending || !selectedStudent || !dateRange.from || !dateRange.to} className="w-full">
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                Buscar
                        </Button>
                        <Button onClick={handleExport} disabled={isPending || !searchedStudent || absences.length === 0} className="w-full" variant="secondary">
                            <FileDown className="mr-2 h-4 w-4" />
                            Exportar
                        </Button>
                    </div>
                </div>

                {isPending ? (
                    <div className="flex justify-center items-center h-60">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : searchedStudent && (
                    <div className="pt-4">
                        <div className="mb-4 p-4 border rounded-lg">
                             <h3 className="font-semibold text-lg mb-2">Resumo para: <span className="text-primary">{searchedStudent.name}</span></h3>
                             <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                                <p><span className="font-semibold">Série/Turma:</span> {searchedStudent.grade} / {searchedStudent.class}</p>
                                <p><span className="font-semibold">Turno:</span> {searchedStudent.shift}</p>
                                <p><span className="font-semibold text-destructive">Total de Faltas:</span> {totalAbsences}</p>
                                <p><span className="font-semibold text-blue-600">Faltas Justificadas:</span> {justifiedAbsences}</p>
                                <p><span className="font-semibold text-red-600">Faltas Não Justificadas:</span> {unjustifiedAbsences}</p>
                             </div>
                        </div>

                        {absences.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">Nenhuma falta registrada para este aluno no período selecionado.</p>
                        ) : (
                            <div className="w-full overflow-x-auto rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Data</TableHead>
                                            <TableHead>Dia da Semana</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {absences.map((record) => (
                                            <TableRow key={record.id}>
                                                <TableCell className="font-medium">{format(record.date as Date, 'dd/MM/yyyy')}</TableCell>
                                                <TableCell className="capitalize">{format(record.date as Date, 'eeee', { locale: ptBR })}</TableCell>
                                                <TableCell>{getStatusBadge(record.status)}</TableCell>
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
