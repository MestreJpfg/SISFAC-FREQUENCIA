import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { AttendanceRecord } from './types';
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
            fillColor: [229, 115, 115], // Cor destrutiva (vermelho claro)
            textColor: [255, 255, 255],
            fontStyle: 'bold',
        },
        theme: 'grid',
    });

    doc.save(fileName);
};
    
