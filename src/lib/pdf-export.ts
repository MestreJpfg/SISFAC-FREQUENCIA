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

const addHeader = (doc: jsPDF) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;

    if (logoBase64) {
        try {
            doc.addImage(logoBase64, 'PNG', margin, 12, 25, 25);
        } catch (error) {
            console.error("Could not add logo to PDF header: ", error);
        }
    }
    
    const titleX = logoBase64 ? 40 : margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('Relatório Diário de Ausências', titleX, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text('INSTITUIÇÃO DE ENSINO', titleX, 28);
    
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, 40, pageWidth - margin, 40);
};

const addFooter = (doc: jsPDF) => {
    const pageCount = (doc as any).internal.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const footerText = `Página ${i} de ${pageCount}`;
        const generatedAtText = `Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}`;
        
        doc.text(generatedAtText, margin, pageHeight - 10);
        doc.text(footerText, pageWidth - margin - doc.getTextWidth(footerText), pageHeight - 10);
    }
};

const addWatermark = (doc: jsPDF) => {
    if (!logoBase64) return;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const logoWidth = 100;
    const logoHeight = 100;
    const x = (pageWidth - logoWidth) / 2;
    const y = (pageHeight - logoHeight) / 2;

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        try {
            doc.saveGraphicsState();
            doc.setGState(new (doc as any).GState({ opacity: 0.1 })); 
            doc.addImage(logoBase64, 'PNG', x, y, logoWidth, logoHeight);
            doc.restoreGraphicsState();
        } catch (error) {
            console.error("Could not add background image to PDF: ", error);
        }
    }
}


export const exportDailyReportToPDF = (date: Date, filters: Filters, absences: DailyAbsenceWithConsecutive[]) => {
    const doc = new jsPDF({ orientation: 'p' }); // p for portrait
    const reportDate = formatDate(date);
    const fileName = `Relatorio_Diario_Ausencias_${format(date, 'yyyy-MM-dd')}.pdf`;
    const margin = 10;
    
    addHeader(doc);

    // Seção de Detalhes do Relatório
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalhes do Relatório', margin, 50);

    const detailsBody = [
        ['Data do Relatório:', reportDate],
        ['Total de Alunos Ausentes:', `${absences.length}`],
        ['Ensino:', formatFilter(filters.ensino)],
        ['Série:', formatFilter(filters.grade)],
        ['Turma:', formatFilter(filters.studentClass)],
        ['Turno:', formatFilter(filters.shift)],
    ];

    autoTable(doc, {
        body: detailsBody,
        startY: 54,
        theme: 'plain',
        tableWidth: 'auto',
        styles: {
            cellPadding: { top: 1, right: 2, bottom: 1, left: 0 },
            fontSize: 10,
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 50 },
            1: { cellWidth: 'auto' },
        }
    });

    const tableStartY = (doc as any).lastAutoTable.finalY + 10;

    const tableColumn = ["Nome do Aluno", "Telefone", "Série", "Turma", "Turno", "Falta Consecutiva"];
    const tableRows: (string | number)[][] = [];

    absences.forEach(record => {
        const row = [
            record.studentName,
            record.telefone || '-',
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
        startY: tableStartY,
        headStyles: {
            fillColor: [41, 128, 185], // Um tom de azul profissional
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
            cellPadding: 2,
        },
        styles: {
            fontSize: 8,
            cellPadding: 2,
            overflow: 'linebreak', // Ensure it breaks line if absolutely necessary
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        },
        theme: 'grid',
        didDrawPage: (data) => {
            if (data.pageNumber > 1) {
                addHeader(doc);
            }
        },
        margin: { top: 45, left: margin, right: margin }
    });
    
    addWatermark(doc);
    addFooter(doc);

    doc.save(fileName);
};
