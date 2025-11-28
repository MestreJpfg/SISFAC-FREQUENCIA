
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { AttendanceRecord, Student } from './types';
import { logoBase64 } from './logo-image';

type Filters = {
    ensino: string;
    grade: string;
    studentClass: string;
    shift: string;
}

export type MonthlyAbsenceSummary = {
    studentId: string;
    studentName: string;
    grade: string;
    class: string;
    shift: string;
    telefone: string;
    totalAbsences: number;
    justifiedAbsences: number;
    unjustifiedAbsences: number;
}

export type DailyAbsenceWithConsecutive = AttendanceRecord & {
    isConsecutive: boolean;
};


const formatDate = (date: Date) => format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
const formatFilter = (filter: string) => filter === 'all' ? 'Todos' : filter;

const addHeader = (doc: jsPDF, title: string) => {
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
    doc.text(title, titleX, 20);

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

const formatTelefone = (telefone?: string) => {
    if (!telefone) return '-';
    return telefone.split(',').slice(0, 2).join(', ');
}

const formatStatus = (status: 'present' | 'absent' | 'justified') => {
    switch(status) {
        case 'absent': return 'Falta';
        case 'justified': return 'Justificada';
        default: return 'Presente';
    }
}

export const exportDailyReportToPDF = (date: Date, filters: Filters, absences: DailyAbsenceWithConsecutive[]) => {
    const doc = new jsPDF({ orientation: 'p' }); // p for portrait
    const reportDate = formatDate(date);
    const fileName = `Relatorio_Diario_Ausencias_${format(date, 'yyyy-MM-dd')}.pdf`;
    const margin = 10;
    
    addHeader(doc, 'Relatório Diário de Ausências');

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

    const tableColumn = ["Nome", "Série", "Turma", "Turno", "Status", "Consecutiva?", "Telefone"];
    const tableRows: (string | number)[][] = [];

    absences.forEach(record => {
        const row = [
            record.studentName,
            record.grade,
            record.class,
            record.shift,
            formatStatus(record.status),
            record.isConsecutive ? "Sim" : "Não",
            formatTelefone(record.telefone),
        ];
        tableRows.push(row);
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: tableStartY,
        headStyles: {
            fillColor: [41, 128, 185],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
            cellPadding: 2,
        },
        styles: {
            fontSize: 8,
            cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 },
            overflow: 'linebreak',
        },
        columnStyles: {
            0: { cellWidth: 'auto' }, // Nome
            1: { cellWidth: 18 },    // Série
            2: { cellWidth: 15 },    // Turma
            3: { cellWidth: 18 },    // Turno
            4: { cellWidth: 20 },    // Status
            5: { cellWidth: 23 },    // Consecutiva
            6: { cellWidth: 35 },    // Telefone
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        },
        theme: 'grid',
        didDrawPage: (data) => {
            if (data.pageNumber > 1) {
                addHeader(doc, 'Relatório Diário de Ausências');
            }
        },
        margin: { top: 45, left: margin, right: margin }
    });
    
    addWatermark(doc);
    addFooter(doc);

    doc.save(fileName);
};


export const exportMonthlyReportToPDF = (period: string, filters: Filters, absences: MonthlyAbsenceSummary[]) => {
    const doc = new jsPDF({ orientation: 'p' });
    const fileName = `Relatorio_Mensal_Faltas_${period.replace(/ /g, '_')}.pdf`;
    const margin = 10;

    addHeader(doc, 'Relatório Mensal de Faltas');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalhes do Relatório', margin, 50);

    const detailsBody = [
        ['Período do Relatório:', period],
        ['Total de Alunos com Faltas:', `${absences.length}`],
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

    const tableColumn = ["Pos.", "Nome", "Série/Turma", "Telefone", "Justificadas", "Não Justif.", "Total"];
    const tableRows: (string | number)[][] = [];

    absences.forEach((record, index) => {
        const row = [
            `${index + 1}º`,
            record.studentName,
            `${record.grade} / ${record.class}`,
            formatTelefone(record.telefone),
            record.justifiedAbsences,
            record.unjustifiedAbsences,
            record.totalAbsences,
        ];
        tableRows.push(row);
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: tableStartY,
        headStyles: {
            fillColor: [200, 80, 80],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
            cellPadding: 2,
        },
        styles: {
            fontSize: 8,
            cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 },
            overflow: 'linebreak',
            valign: 'middle',
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' }, // Posição
            1: { cellWidth: 'auto' },               // Nome
            2: { cellWidth: 20 },                   // Série/Turma
            3: { cellWidth: 30 },                   // Telefone
            4: { cellWidth: 20, halign: 'center' }, // Justificadas
            5: { cellWidth: 20, halign: 'center' }, // Não Justif.
            6: { cellWidth: 15, halign: 'center', fontStyle: 'bold' }, // Total
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        },
        theme: 'grid',
        didDrawPage: (data) => {
            if (data.pageNumber > 1) {
                addHeader(doc, 'Relatório Mensal de Faltas');
            }
        },
        margin: { top: 45, left: margin, right: margin }
    });
    
    addWatermark(doc);
    addFooter(doc);

    doc.save(fileName);
}


export const exportIndividualReportToPDF = (student: Student, from: Date, to: Date, absences: AttendanceRecord[]) => {
    const doc = new jsPDF({ orientation: 'p' });
    const period = `${format(from, 'dd/MM/yyyy')} a ${format(to, 'dd/MM/yyyy')}`;
    const fileName = `Relatorio_Individual_${student.name.replace(/ /g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    const margin = 10;

    addHeader(doc, 'Relatório Individual de Faltas');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalhes do Relatório', margin, 50);

    const totalAbsences = absences.length;
    const justifiedAbsences = absences.filter(a => a.status === 'justified').length;
    const unjustifiedAbsences = totalAbsences - justifiedAbsences;

    const detailsBody = [
        ['Aluno(a):', student.name],
        ['Série/Turma:', `${student.grade} / ${student.class}`],
        ['Período de Consulta:', period],
        ['Total de Faltas no Período:', `${totalAbsences}`],
        ['Faltas Justificadas:', `${justifiedAbsences}`],
        ['Faltas Não Justificadas:', `${unjustifiedAbsences}`],
        ['Telefone para Contato:', formatTelefone(student.telefone)],
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

    if (absences.length > 0) {
        const tableColumn = ["Data", "Dia da Semana", "Status"];
        const tableRows: (string | number)[][] = [];

        absences.forEach(record => {
            const row = [
                format(record.date as Date, 'dd/MM/yyyy', { locale: ptBR }),
                format(record.date as Date, 'eeee', { locale: ptBR }),
                formatStatus(record.status),
            ];
            tableRows.push(row);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: tableStartY,
            headStyles: {
                fillColor: [80, 80, 80],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 10,
            },
            styles: {
                fontSize: 9,
                overflow: 'linebreak',
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            theme: 'grid',
            didDrawPage: (data) => {
                if (data.pageNumber > 1) {
                    addHeader(doc, 'Relatório Individual de Faltas');
                }
            },
            margin: { top: 45, left: margin, right: margin }
        });
    } else {
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text('Nenhum registro de falta para este aluno no período selecionado.', margin, tableStartY);
    }
    
    addWatermark(doc);
    addFooter(doc);

    doc.save(fileName);
};


export const exportCustomReportToPDF = (from: Date, to: Date, days: number[], filters: Filters, absences: AttendanceRecord[]) => {
    const doc = new jsPDF({ orientation: 'p' });
    const period = `${format(from, 'dd/MM/yyyy')} a ${format(to, 'dd/MM/yyyy')}`;
    const daysOfWeek = [ 'Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const selectedDays = days.map(d => daysOfWeek[d]).join(', ');
    const fileName = `Relatorio_Personalizado_Faltas_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    const margin = 10;

    addHeader(doc, 'Relatório Personalizado de Faltas');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalhes do Relatório', margin, 50);

    const detailsBody = [
        ['Período de Consulta:', period],
        ['Dias da Semana:', selectedDays],
        ['Total de Faltas Encontradas:', `${absences.length}`],
        ['Ensino:', formatFilter(filters.ensino)],
        ['Série:', formatFilter(filters.grade)],
        ['Turma:', formatFilter(filters.studentClass)],
        ['Turno:', formatFilter(filters.shift)],
    ];

    autoTable(doc, {
        body: detailsBody,
        startY: 54,
        theme: 'plain',
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

    if (absences.length > 0) {
        const tableColumn = ["Data", "Dia da Semana", "Aluno", "Série/Turma", "Status"];
        const tableRows: (string | number)[][] = [];

        absences.forEach(record => {
            const date = (record.date as any).toDate();
            const row = [
                format(date, 'dd/MM/yyyy', { locale: ptBR }),
                format(date, 'eeee', { locale: ptBR }),
                record.studentName,
                `${record.grade} / ${record.class}`,
                formatStatus(record.status),
            ];
            tableRows.push(row);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: tableStartY,
            headStyles: {
                fillColor: [60, 60, 60],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9,
            },
            styles: {
                fontSize: 8,
                overflow: 'linebreak',
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            theme: 'grid',
            didDrawPage: (data) => {
                if (data.pageNumber > 1) {
                    addHeader(doc, 'Relatório Personalizado de Faltas');
                }
            },
            margin: { top: 45, left: margin, right: margin }
        });
    } else {
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text('Nenhum registro de falta encontrado para os critérios selecionados.', margin, tableStartY);
    }
    
    addWatermark(doc);
    addFooter(doc);

    doc.save(fileName);
};
