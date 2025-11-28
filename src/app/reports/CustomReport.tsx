
"use client";

import { useState, useTransition, useEffect } from "react";
import { format, startOfMonth, endOfMonth, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Loader2, Search, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AttendanceRecord, Student } from "@/lib/types";
import { useFirebase } from "@/firebase";
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { exportCustomReportToPDF } from "@/lib/pdf-export";
import { Badge } from "@/components/ui/badge";

const daysOfWeek = [
    { id: 1, label: 'Seg' }, // Monday
    { id: 2, label: 'Ter' },
    { id: 3, label: 'Qua' },
    { id: 4, label: 'Qui' },
    { id: 5, label: 'Sex' },
    { id: 6, label: 'Sáb' },
    { id: 0, label: 'Dom' }, // Sunday
];


export function CustomReport() {
    const { firestore } = useFirebase();
    const [absences, setAbsences] = useState<AttendanceRecord[]>([]);
    const [isPending, startTransition] = useTransition();
    const [searchedData, setSearchedData] = useState<{ period: string, days: string } | null>(null);

    const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [selectedDays, setSelectedDays] = useState<number[]>([]);

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


    const handleDayToggle = (dayId: number) => {
        setSelectedDays(prev => 
            prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
        );
    }

    const handleSearch = () => {
        if (!firestore || !dateRange.from || !dateRange.to || selectedDays.length === 0) {
            alert("Por favor, selecione um período e pelo menos um dia da semana.");
            return;
        }
        
        startTransition(async () => {
            const startDate = Timestamp.fromDate(dateRange.from!);
            const endDate = Timestamp.fromDate(dateRange.to!);
            
            const q = query(collection(firestore, 'attendance'), 
                where('date', '>=', startDate),
                where('date', '<=', endDate)
            );
            
            const querySnapshot = await getDocs(q);
            let allRecordsInRange = querySnapshot.docs.map(doc => ({...doc.data(), id: doc.id} as AttendanceRecord));

            // Client-side filtering
            let filteredRecords = allRecordsInRange.filter(record => {
                const recordDate = (record.date as Timestamp).toDate();
                const dayOfWeek = getDay(recordDate); // Sunday = 0, Monday = 1, ...
                
                return selectedDays.includes(dayOfWeek) &&
                       (record.status === 'absent' || record.status === 'justified') &&
                       (ensino === 'all' || record.ensino === ensino) &&
                       (grade === 'all' || record.grade === grade) &&
                       (studentClass === 'all' || record.class === studentClass) &&
                       (shift === 'all' || record.shift === shift);
            });

            filteredRecords.sort((a,b) => (a.date as Timestamp).toMillis() - (b.date as Timestamp).toMillis() || a.studentName.localeCompare(b.studentName));
            
            setAbsences(filteredRecords);
            const periodStr = `${format(dateRange.from!, "dd/MM/yy")} a ${format(dateRange.to!, "dd/MM/yy")}`;
            const daysStr = daysOfWeek.filter(d => selectedDays.includes(d.id)).map(d => d.label).join(', ');
            setSearchedData({ period: periodStr, days: daysStr });
        });
    };

    const handleExport = () => {
        if (!searchedData || !dateRange.from || !dateRange.to) return;
        const filters = { ensino, grade, studentClass, shift };
        exportCustomReportToPDF(dateRange.from, dateRange.to, selectedDays, filters, absences);
    };

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
                <CardTitle>Relatório Personalizado</CardTitle>
                <CardDescription>Filtre as faltas por dias da semana específicos dentro de um período.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
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
                        <div className="space-y-2 md:col-span-2">
                            <Label>Dias da Semana</Label>
                            <div className="flex items-center space-x-4 rounded-md border p-3">
                                {daysOfWeek.map(day => (
                                    <div key={day.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`day-${day.id}`}
                                            checked={selectedDays.includes(day.id)}
                                            onCheckedChange={() => handleDayToggle(day.id)}
                                        />
                                        <Label htmlFor={`day-${day.id}`} className="font-normal">{day.label}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                     <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                        <div className="col-span-1">
                            <Label>Ensino</Label>
                            <Select value={ensino} onValueChange={setEnsino} disabled={isLoadingFilters}>
                                <SelectTrigger><SelectValue placeholder="Ensino" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {ensinoOptions.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Série</Label>
                            <Select value={grade} onValueChange={setGrade} disabled={isLoadingFilters}>
                                <SelectTrigger><SelectValue placeholder="Série" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    {gradeOptions.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div>
                            <Label>Turma</Label>
                            <Select value={studentClass} onValueChange={setStudentClass} disabled={isLoadingFilters}>
                                <SelectTrigger><SelectValue placeholder="Turma" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    {classOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Turno</Label>
                            <Select value={shift} onValueChange={setShift} disabled={isLoadingFilters}>
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
                        <Button onClick={handleExport} disabled={isPending || !searchedData || absences.length === 0} className="w-full sm:w-auto" variant="secondary">
                            <FileDown className="mr-2 h-4 w-4" />
                            Exportar para PDF
                        </Button>
                    </div>
                </div>

                {isPending ? (
                    <div className="flex justify-center items-center h-60">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : searchedData && (
                    <div className="pt-4">
                        <h3 className="font-semibold mb-2">Resultados para: <span className="font-normal">{searchedData.period}</span> | Dias: <span className="font-normal">{searchedData.days}</span> | Total: <span className="font-bold">{absences.length}</span></h3>
                        {absences.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">Nenhuma falta encontrada para os critérios selecionados.</p>
                        ) : (
                            <div className="w-full overflow-x-auto rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Data</TableHead>
                                            <TableHead>Dia da Semana</TableHead>
                                            <TableHead>Aluno</TableHead>
                                            <TableHead>Série/Turma</TableHead>
                                            <TableHead>Turno</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {absences.map((record) => (
                                            <TableRow key={record.id}>
                                                <TableCell className="font-medium">{format((record.date as Timestamp).toDate(), 'dd/MM/yyyy')}</TableCell>
                                                <TableCell>{format((record.date as Timestamp).toDate(), 'eeee', { locale: ptBR })}</TableCell>
                                                <TableCell>{record.studentName}</TableCell>
                                                <TableCell>{record.grade} / {record.class}</TableCell>
                                                <TableCell>{record.shift}</TableCell>
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

