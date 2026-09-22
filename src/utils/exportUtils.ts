import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { Militar, MonthConfig, Unit } from '../types';
import { MONTH_NAMES, DAYS_OF_WEEK_SHORT, getShiftHours, parseShiftCell } from '../data/constants';
import { computeScheduleStats } from './schedulerEngine';

export function exportScheduleToPDF(
  personnel: Militar[],
  schedule: Record<number, Record<string, string>>,
  config: MonthConfig,
  activeUnit?: Unit
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const unit: Unit = activeUnit || {
    id: 'pelbm_ijui',
    name: '1º Pelotão de Bombeiro Militar',
    code: '1º PelBM',
    city: 'Ijuí/RS'
  };

  const { year, month, numDays } = config;
  const monthName = MONTH_NAMES[month - 1].toUpperCase();

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ESTADO DO RIO GRANDE DO SUL', 148.5, 9, { align: 'center' });
  doc.text('SECRETARIA DA SEGURANÇA PÚBLICA', 148.5, 13, { align: 'center' });
  doc.text('CORPO DE BOMBEIROS MILITAR DO RIO GRANDE DO SUL - CBMRS', 148.5, 17, { align: 'center' });
  doc.setFontSize(10.5);
  doc.text(`ESCALA MENSAL DE SERVIÇO - ${unit.name.toUpperCase()} (${unit.city.toUpperCase()}) - ${monthName} DE ${year}`, 148.5, 22, { align: 'center' });

  const headRow1: string[] = ['POSTO/GRAD', 'ID FUNC.', 'NOME DE GUERRA'];
  const headRow2: string[] = ['', '', ''];

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
    const row: string[] = [p.rank, p.matricula || '-', p.warName];
    
    for (let d = 1; d <= numDays; d++) {
      const code = schedule[d]?.[p.id] || '';
      if (code) {
        const parsed = parseShiftCell(code, p);
        row.push(parsed.role ? `${parsed.shiftCode}\n${parsed.role}` : parsed.shiftCode);
      } else {
        row.push('');
      }
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

  const totalRow: string[] = ['TOTAL ME', '-', 'DE SERVIÇO'];
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
    startY: 26,
    styles: {
      fontSize: 5.5,
      cellPadding: 0.6,
      halign: 'center',
      valign: 'middle'
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 16 },
      1: { halign: 'center', cellWidth: 14 },
      2: { halign: 'left', cellWidth: 20 }
    },
    didParseCell: (data) => {
      if (data.section === 'head' && data.column.index >= 3 && data.column.index < 3 + numDays) {
        const d = data.column.index - 2;
        const date = new Date(year, month - 1, d);
        if (date.getDay() === 0 || date.getDay() === 6) {
          data.cell.styles.fillColor = [30, 41, 59];
          data.cell.styles.textColor = [248, 113, 113];
        }
      }

      if (data.section === 'body') {
        const val = String(data.cell.raw);
        if (val.startsWith('J')) {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = 'bold';
        } else if (val.startsWith('FER')) {
          data.cell.styles.fillColor = [254, 240, 138];
          data.cell.styles.textColor = [133, 77, 14];
        } else if (val.startsWith('RSP')) {
          data.cell.styles.fillColor = [209, 250, 229];
          data.cell.styles.textColor = [6, 95, 70];
        } else if (val === 'FALTA') {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 12;
  if (finalY < 195) {
    const sargenteante = personnel.find(p => (p.role || '').toLowerCase().includes('sargenteante'));
    const comandante = personnel.find(p => p.isCommander || p.rank.includes('Tenente'));

    const sargenteanteLabel = sargenteante 
      ? `${sargenteante.rank} ${sargenteante.warName} - Sargenteante`
      : `Sargenteante do ${unit.code}`;

    const comandanteLabel = comandante 
      ? `${comandante.rank} ${comandante.warName} - Comandante`
      : `Comandante do ${unit.code}`;

    doc.setFontSize(8);
    doc.text('___________________________________________', 60, finalY, { align: 'center' });
    doc.text(sargenteanteLabel, 60, finalY + 4, { align: 'center' });

    doc.text('___________________________________________', 230, finalY, { align: 'center' });
    doc.text(comandanteLabel, 230, finalY + 4, { align: 'center' });
  }

  const safeUnitCode = unit.code.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Escala_CBMRS_${safeUnitCode}_${monthName}_${year}.pdf`);
}

export function exportScheduleToExcel(
  personnel: Militar[],
  schedule: Record<number, Record<string, string>>,
  config: MonthConfig,
  activeUnit?: Unit
) {
  const { year, month, numDays } = config;
  const monthName = MONTH_NAMES[month - 1];

  const unit: Unit = activeUnit || {
    id: 'pelbm_ijui',
    name: '1º Pelotão de Bombeiro Militar',
    code: '1º PelBM',
    city: 'Ijuí/RS'
  };

  const headers: string[] = ['Posto/Graduação', 'ID Funcional', 'Nome de Guerra', 'Função Principal'];
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
      'ID Funcional': p.matricula || '-',
      'Nome de Guerra': p.warName,
      'Função Principal': p.role || 'Operacional'
    };

    for (let d = 1; d <= numDays; d++) {
      const code = schedule[d]?.[p.id] || '';
      if (code) {
        const parsed = parseShiftCell(code, p);
        row[`Dia ${d}`] = parsed.role ? `${parsed.shiftCode} (${parsed.role})` : parsed.shiftCode;
      } else {
        row[`Dia ${d}`] = '';
      }
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

  const safeUnitCode = unit.code.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `Escala_CBMRS_${safeUnitCode}_${monthName}_${year}.xlsx`);
}

