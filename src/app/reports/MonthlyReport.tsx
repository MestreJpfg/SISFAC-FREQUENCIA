"use client";

import { useState, useTransition, useEffect } from "react";
import { format, getMonth, getYear } from "date-fns";
import { ptBR } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getMonthlyAbsences, MonthlyAbsenceData } from "@/actions/report-actions";
import type { Student } from "@/lib/types";
import { Loader2, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const months = Array.from({ length: 12 }, (_, i) => ({ value: i, label: format(new Date(2000, i), 'MMMM', {locale: ptBR}) }));
const currentYear = getYear(new Date());
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

export function MonthlyReport({ students }: { students: Student[] }) {
    const [month, setMonth] = useState<number>(getMonth(new Date()));
    const [year, setYear] = useState<number>(currentYear);
    const [report, setReport] = useState<MonthlyAbsenceData[]>([]);
    const [isPending, startTransition] = useTransition();
    const [searchedPeriod, setSearchedPeriod] = useState<string | null>(null);

    const handleSearch = () => {
        setSearchedPeriod(`${months.find(m => m.value === month)?.label}/${year}`);
        startTransition(async () => {
            const result = await getMonthlyAbsences(month, year, students);
            setReport(result);
        });
    };
    
    useEffect(() => {
        handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (students.length === 0 && !isPending) {
         return (
             <Alert>
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>Nenhum Aluno</AlertTitle>
                <AlertDescription>Não há dados de alunos para gerar o relatório. Por favor, importe os alunos primeiro.</AlertDescription>
            </Alert>
         )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Relatório Mensal de Ausências</CardTitle>
                <CardDescription>Selecione um mês e ano para ver o total de faltas por aluno.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                    <Select value={String(month)} onValueChange={(val) => setMonth(Number(val))}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Mês" />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map(m => <SelectItem key={m.value} value={String(m.value)} className="capitalize">{m.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={String(year)} onValueChange={(val) => setYear(Number(val))}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Ano" />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleSearch} disabled={isPending}>
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
                         {report.every(r => r.absenceCount === 0) ? (
                            <p className="text-muted-foreground text-center py-4">Nenhuma ausência registrada para o período selecionado.</p>
                        ) : (
                            <ScrollArea className="h-96 rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome do Aluno</TableHead>
                                        <TableHead>Turma</TableHead>
                                        <TableHead className="text-right">Total de Faltas</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {report.map((data) => (
                                        <TableRow key={data.studentId}>
                                            <TableCell className="font-medium">{data.studentName}</TableCell>
                                            <TableCell>{data.studentClass}</TableCell>
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
