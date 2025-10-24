import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { AttendanceRecord } from './types';
import type { MonthlyAbsenceData } from '@/app/reports/MonthlyReport';
import { logoBase64 } from './logo-image';

type Filters = {
    ensino: string;
    grade: string;
    studentClass: string;
    shift: string;
}

export type DailyAbsenceWithConsecutive = AttendanceRecord & {
    isConsecutive: boolean;
};


const formatDate = (date: Date) => format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
const formatPeriod = (period: string) => period.charAt(0).toUpperCase() + period.slice(1);
const formatFilter = (filter: string) => filter === 'all' ? 'Todos' : filter;

const addBackgroundImage = (doc: jsPDF) => {
    if (!logoBase64) return;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const logoWidth = 100; // Adjust as needed
    const logoHeight = 100; // Adjust as needed
    const x = (pageWidth - logoWidth) / 2;
    const y = (pageHeight - logoHeight) / 2;

    try {
        doc.saveGraphicsState();
        doc.setGState(new (doc as any).GState({ opacity: 0.1 })); // 90% transparent -> 0.1 opacity
        doc.addImage(logoBase64, 'PNG', x, y, logoWidth, logoHeight);
        doc.restoreGraphicsState();
    } catch (error) {
        console.error("Could not add background image to PDF: ", error);
    }
}

export const exportDailyReportToPDF = (date: Date, filters: Filters, absences: DailyAbsenceWithConsecutive[]) => {
    const doc = new jsPDF();
    
    addBackgroundImage(doc);

    const title = 'Relatório Diário de Ausências';
    const reportDate = formatDate(date);
    const fileName = `Relatorio_Diario_Ausencias_${format(date, 'yyyy-MM-dd')}.pdf`;

    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.text(`Data: ${reportDate}`, 14, 30);
    doc.text(`Total de Ausentes: ${absences.length}`, 14, 36);

    let filterText = `Filtros Aplicados: Ensino: ${formatFilter(filters.ensino)}, Série: ${formatFilter(filters.grade)}, Turma: ${formatFilter(filters.studentClass)}, Turno: ${formatFilter(filters.shift)}`;
    const splitFilters = doc.splitTextToSize(filterText, 180);
    doc.text(splitFilters, 14, 44);

    const tableColumn = ["Nome do Aluno", "Ensino", "Série", "Turma", "Turno", "Falta Consecutiva"];
    const tableRows: (string | number)[][] = [];

    absences.forEach(record => {
        const row = [
            record.studentName,
            record.ensino,
            record.grade,
            record.class,
            record.shift,
            record.isConsecutive ? "Sim" : "Não",
        ];
        tableRows.push(row);
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 54,
        headStyles: {
            fillColor: [242, 185, 209], // Cor primária (rosa)
            textColor: [255, 255, 255], // Branco
            fontStyle: 'bold',
        },
        theme: 'grid',
    });

    doc.save(fileName);
};


export const exportMonthlyReportToPDF = (period: string, filters: Filters, reportData: MonthlyAbsenceData[]) => {
    const doc = new jsPDF();
    addBackgroundImage(doc);

    const formattedPeriod = formatPeriod(period);

    const title = 'Relatório Mensal de Ausências';
    const fileName = `Relatorio_Mensal_Ausencias_${period.replace('/', '-')}.pdf`;

    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.text(`Período: ${formattedPeriod}`, 14, 30);
    
    const totalAbsences = reportData.reduce((acc, item) => acc + item.absenceCount, 0);
    const totalStudentsWithAbsences = reportData.length;
    doc.text(`Total de Alunos com Faltas: ${totalStudentsWithAbsences}`, 14, 36);


    let filterText = `Filtros Aplicados: Ensino: ${formatFilter(filters.ensino)}, Série: ${formatFilter(filters.grade)}, Turma: ${formatFilter(filters.studentClass)}, Turno: ${formatFilter(filters.shift)}`;
    const splitFilters = doc.splitTextToSize(filterText, 180);
    doc.text(splitFilters, 14, 44);
    
    const tableColumn = ["Nome do Aluno", "Ensino", "Série", "Turma", "Turno", "Total de Faltas"];
    const tableRows: (string | number)[][] = [];

    reportData.forEach(item => {
        const row = [
            item.studentName,
            item.studentEnsino,
            item.studentGrade,
            item.studentClass,
            item.studentShift,
            item.absenceCount,
        ];
        tableRows.push(row);
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 54,
        headStyles: {
            fillColor: [242, 185, 209], // Cor primária (rosa)
            textColor: [255, 255, 255], // Branco
            fontStyle: 'bold',
        },
        theme: 'grid',
    });
    
    doc.save(fileName);
};
