import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { Militar, MonthConfig } from '../types';
import { MONTH_NAMES, DAYS_OF_WEEK_SHORT, getShiftHours } from '../data/constants';
import { computeScheduleStats } from './schedulerEngine';

export function exportScheduleToPDF(
  personnel: Militar[],
  schedule: Record<number, Record<string, string>>,
  config: MonthConfig
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const { year, month, numDays } = config;
  const monthName = MONTH_NAMES[month - 1].toUpperCase();

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ESTADO DO RIO GRANDE DO SUL', 148.5, 10, { align: 'center' });
  doc.text('SECRETARIA DA SEGURANÇA PÚBLICA', 148.5, 14, { align: 'center' });
  doc.text('CORPO DE BOMBEIROS MILITAR DO RIO GRANDE DO SUL - CBMRS', 148.5, 18, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`ESCALA MENSAL DE SERVIÇO - 1º PELOTÃO DE BOMBEIRO MILITAR (IJUÍ/RS) - ${monthName} DE ${year}`, 148.5, 23, { align: 'center' });

  const headRow1: string[] = ['POSTO/GRAD', 'NOME DE GUERRA'];
  const headRow2: string[] = ['', ''];

  for (let d = 1; d <= numDays; d++) {
    const date = new Date(year, month - 1, d);
    headRow1.push(String(d));
    headRow2.push(DAYS_OF_WEEK_SHORT[date.getDay()].toUpperCase());
  }

  headRow1.push('META', 'TRAB.', 'SALDO');
  headRow2.push('HORAS', 'HORAS', 'HE/FALTA');

  const stats = computeScheduleStats(personnel, schedule, config);
  const statsMap = stats.reduce((acc, s) => {
    acc[s.militarId] = s;
    return acc;
  }, {} as Record<string, typeof stats[0]>);

  const bodyData = personnel.map(p => {
    const row: string[] = [p.rank, p.warName];
    for (let d = 1; d <= numDays; d++) {
      row.push(schedule[d]?.[p.id] || '');
    }

    const s = statsMap[p.id];
    if (p.isCommander) {
      row.push('-', '-', 'CMTE');
    } else if (s) {
      row.push(String(s.targetHours), String(s.workedHours), s.isDeficit ? 'FALTA' : `+${s.balanceHours}`);
    } else {
      row.push('-', '-', '-');
    }

    return row;
  });

  const totalRow: string[] = ['TOTAL ME', 'DE SERVIÇO'];
  for (let d = 1; d <= numDays; d++) {
    let count = 0;
    personnel.forEach(p => {
      if (!p.isCommander && getShiftHours(schedule[d]?.[p.id]) > 0) count++;
    });
    totalRow.push(String(count));
  }
  totalRow.push('-', '-', '-');
  bodyData.push(totalRow);

  autoTable(doc, {
    head: [headRow1, headRow2],
    body: bodyData,
    startY: 28,
    styles: {
      fontSize: 6,
      cellPadding: 0.8,
      halign: 'center',
      valign: 'middle'
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 20 },
      1: { halign: 'left', cellWidth: 24 }
    },
    didParseCell: (data) => {
      if (data.section === 'head' && data.column.index >= 2 && data.column.index < 2 + numDays) {
        const d = data.column.index - 1;
        const date = new Date(year, month - 1, d);
        if (date.getDay() === 0 || date.getDay() === 6) {
          data.cell.styles.fillColor = [30, 41, 59];
        }
      }

      if (data.section === 'body') {
        const val = String(data.cell.raw);
        if (val === 'J') {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'FER') {
          data.cell.styles.fillColor = [254, 240, 138];
          data.cell.styles.textColor = [133, 77, 14];
        } else if (val === 'RSP') {
          data.cell.styles.fillColor = [209, 250, 229];
          data.cell.styles.textColor = [6, 95, 70];
        } else if (val === 'FALTA') {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 14;
  if (finalY < 195) {
    doc.setFontSize(8);
    doc.text('___________________________________________', 60, finalY, { align: 'center' });
    doc.text('Sargenteante do 1º PelBM', 60, finalY + 4, { align: 'center' });

    doc.text('___________________________________________', 230, finalY, { align: 'center' });
    doc.text('1º Tenente - Comandante do 1º PelBM', 230, finalY + 4, { align: 'center' });
  }

  doc.save(`Escala_CBMRS_Ijui_${monthName}_${year}.pdf`);
}

export function exportScheduleToExcel(
  personnel: Militar[],
  schedule: Record<number, Record<string, string>>,
  config: MonthConfig
) {
  const { year, month, numDays } = config;
  const monthName = MONTH_NAMES[month - 1];

  const headers: string[] = ['Posto/Graduação', 'Nome de Guerra'];
  for (let d = 1; d <= numDays; d++) {
    headers.push(`Dia ${d}`);
  }
  headers.push('Carga Mensal', 'Horas Trabalhadas', 'Horas Extras / Saldo');

  const stats = computeScheduleStats(personnel, schedule, config);
  const statsMap = stats.reduce((acc, s) => {
    acc[s.militarId] = s;
    return acc;
  }, {} as Record<string, typeof stats[0]>);

  const rows = personnel.map(p => {
    const row: any = {
      'Posto/Graduação': p.rank,
      'Nome de Guerra': p.warName
    };

    for (let d = 1; d <= numDays; d++) {
      row[`Dia ${d}`] = schedule[d]?.[p.id] || '';
    }

    const s = statsMap[p.id];
    if (p.isCommander) {
      row['Carga Mensal'] = '-';
      row['Horas Trabalhadas'] = '-';
      row['Horas Extras / Saldo'] = 'COMANDANTE';
    } else if (s) {
      row['Carga Mensal'] = s.targetHours;
      row['Horas Trabalhadas'] = s.workedHours;
      row['Horas Extras / Saldo'] = s.isDeficit ? 'FALTA' : s.balanceHours;
    }

    return row;
  });

  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Escala ${monthName}`);

  XLSX.writeFile(wb, `Escala_CBMRS_Ijui_${monthName}_${year}.xlsx`);
}
