"use client";

import { useState, useTransition, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDailyAbsences } from "@/actions/report-actions";
import { AttendanceRecord } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";

type DailyAbsenceRecord = AttendanceRecord & { studentClass: string };

export function DailyReport() {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [absences, setAbsences] = useState<DailyAbsenceRecord[]>([]);
    const [isPending, startTransition] = useTransition();
    const [searchedDate, setSearchedDate] = useState<Date | null>(null);

    const handleSearch = () => {
        if (!date) return;
        setSearchedDate(date);
        startTransition(async () => {
            const result = await getDailyAbsences(date);
            setAbsences(result);
        });
    };

    useEffect(() => {
        handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Relatório Diário de Ausências</CardTitle>
                <CardDescription>Selecione uma data para ver os alunos ausentes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className="w-[280px] justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                        </PopoverContent>
                    </Popover>
                    <Button onClick={handleSearch} disabled={isPending || !date}>
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
                        <h3 className="font-semibold mb-2">Ausentes em {format(searchedDate, "dd/MM/yyyy")}:</h3>
                        {absences.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">Nenhum aluno ausente na data selecionada.</p>
                        ) : (
                            <ScrollArea className="h-96 rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome do Aluno</TableHead>
                                        <TableHead>Turma</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {absences.map((record) => (
                                        <TableRow key={record.studentId}>
                                            <TableCell className="font-medium">{record.studentName}</TableCell>
                                            <TableCell>{record.studentClass}</TableCell>
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
