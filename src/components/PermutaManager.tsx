import React, { useState } from 'react';
import { 
  ArrowLeftRight, 
  CheckCircle2, 
  AlertTriangle, 
  Printer
} from 'lucide-react';
import type { Militar, MonthConfig } from '../types';
import { getShiftHours, MONTH_NAMES, DAYS_OF_WEEK_SHORT } from '../data/constants';

interface PermutaManagerProps {
  personnel: Militar[];
  schedule: Record<number, Record<string, string>>;
  config: MonthConfig;
  onApplySwap: (militarAId: string, dayA: number, militarBId: string, dayB: number) => void;
}

export const PermutaManager: React.FC<PermutaManagerProps> = ({
  personnel,
  schedule,
  config,
  onApplySwap
}) => {
  const { year, month, numDays } = config;
  const operational = personnel.filter(p => !p.isCommander);

  const [militarAId, setMilitarAId] = useState<string>(operational[0]?.id || '');
  const [dayA, setDayA] = useState<number>(1);
  const [militarBId, setMilitarBId] = useState<string>(operational[1]?.id || '');
  const [dayB, setDayB] = useState<number>(5);
  const [justification, setJustification] = useState<string>('Necessidade de ajuste de escala de serviço.');
  const [swapAppliedSuccess, setSwapAppliedSuccess] = useState(false);

  const militarA = personnel.find(p => p.id === militarAId);
  const militarB = personnel.find(p => p.id === militarBId);

  const shiftA = schedule[dayA]?.[militarAId] || '';
  const shiftB = schedule[dayB]?.[militarBId] || '';

  const validateMilitarAOnDayB = () => {
    if (dayB > 1 && getShiftHours(schedule[dayB - 1]?.[militarAId]) > 0 && dayB - 1 !== dayA) {
      return { valid: false, message: `${militarA?.warName} já trabalha no dia ${dayB - 1} (geraria dobra consecutiva!)` };
    }
    if (dayB < numDays && getShiftHours(schedule[dayB + 1]?.[militarAId]) > 0 && dayB + 1 !== dayA) {
      return { valid: false, message: `${militarA?.warName} já trabalha no dia ${dayB + 1} (geraria dobra consecutiva!)` };
    }
    return { valid: true, message: 'Descanso de interjornada OK' };
  };

  const validateMilitarBOnDayA = () => {
    if (dayA > 1 && getShiftHours(schedule[dayA - 1]?.[militarBId]) > 0 && dayA - 1 !== dayB) {
      return { valid: false, message: `${militarB?.warName} já trabalha no dia ${dayA - 1} (geraria dobra consecutiva!)` };
    }
    if (dayA < numDays && getShiftHours(schedule[dayA + 1]?.[militarBId]) > 0 && dayA + 1 !== dayB) {
      return { valid: false, message: `${militarB?.warName} já trabalha no dia ${dayA + 1} (geraria dobra consecutiva!)` };
    }
    return { valid: true, message: 'Descanso de interjornada OK' };
  };

  const validationA = validateMilitarAOnDayB();
  const validationB = validateMilitarBOnDayA();
  const isSwapValid = validationA.valid && validationB.valid && militarAId !== militarBId;

  const handleExecuteSwap = () => {
    if (!isSwapValid) return;
    onApplySwap(militarAId, dayA, militarBId, dayB);
    setSwapAppliedSuccess(true);
    setTimeout(() => setSwapAppliedSuccess(false), 3000);
  };

  const handlePrintForm = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Simulador de Permuta (Troca de Serviço)</h2>
            <p className="text-xs text-slate-400">Verificação instantânea de descanso regulamentar e atualização da escala</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-red-400 uppercase tracking-wider">
              <span>Militar Proponente (Militar A)</span>
              <span className="bg-red-950/60 border border-red-500/30 px-2 py-0.5 rounded text-[10px]">Passa o serviço</span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Selecione o Militar A</label>
              <select
                value={militarAId}
                onChange={e => setMilitarAId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:ring-2 focus:ring-red-500 outline-none"
              >
                {operational.map(p => (
                  <option key={p.id} value={p.id}>{p.rank} {p.warName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Dia do Serviço a Trocar</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max={numDays}
                  value={dayA}
                  onChange={e => setDayA(parseInt(e.target.value) || 1)}
                  className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white text-center"
                />
                <span className="text-xs text-slate-400 font-medium">
                  {DAYS_OF_WEEK_SHORT[new Date(year, month - 1, dayA).getDay()]} • {dayA} de {MONTH_NAMES[month - 1]}
                </span>
                <span className="ml-auto text-xs font-black text-red-400 bg-red-950/60 px-2 py-1 rounded-lg border border-red-500/30">
                  {shiftA || 'Folga'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-blue-400 uppercase tracking-wider">
              <span>Militar Substituto (Militar B)</span>
              <span className="bg-blue-950/60 border border-blue-500/30 px-2 py-0.5 rounded text-[10px]">Assume o serviço</span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Selecione o Militar B</label>
              <select
                value={militarBId}
                onChange={e => setMilitarBId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {operational.map(p => (
                  <option key={p.id} value={p.id}>{p.rank} {p.warName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Dia em Contrapartida</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max={numDays}
                  value={dayB}
                  onChange={e => setDayB(parseInt(e.target.value) || 1)}
                  className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white text-center"
                />
                <span className="text-xs text-slate-400 font-medium">
                  {DAYS_OF_WEEK_SHORT[new Date(year, month - 1, dayB).getDay()]} • {dayB} de {MONTH_NAMES[month - 1]}
                </span>
                <span className="ml-auto text-xs font-black text-blue-400 bg-blue-950/60 px-2 py-1 rounded-lg border border-blue-500/30">
                  {shiftB || 'Folga'}
                </span>
              </div>
            </div>
          </div>

        </div>

        <div className="mt-6 p-4 rounded-2xl border transition-all">
          {isSwapValid ? (
            <div className="flex items-start gap-3 text-emerald-400 bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-xl">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-sm block text-emerald-300">Permuta Válida e Regulamentar!</span>
                <p className="text-xs text-slate-300 mt-0.5">
                  Nenhum dos bombeiros dobrará serviço em dias consecutivos. Ambos cumprem o descanso interjornada.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 text-red-400 bg-red-950/30 border border-red-500/30 p-4 rounded-xl">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-sm block text-red-300">Atenção: Permuta Irregular</span>
                <p className="text-xs text-slate-300 mt-0.5">
                  {!validationA.valid ? validationA.message : !validationB.valid ? validationB.message : 'Selecione dois militares diferentes.'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={handlePrintForm}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition border border-slate-700"
          >
            <Printer className="w-4 h-4" />
            Imprimir Requerimento de Permuta
          </button>

          <button
            onClick={handleExecuteSwap}
            disabled={!isSwapValid}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-black shadow-lg shadow-red-600/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowLeftRight className="w-4 h-4" />
            {swapAppliedSuccess ? 'Permuta Aplicada com Sucesso!' : 'Confirmar e Aplicar na Escala'}
          </button>
        </div>

      </div>

      <div className="bg-white text-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 space-y-6 print-page">
        <div className="text-center border-b pb-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
            Estado do Rio Grande do Sul • Secretaria da Segurança Pública
          </div>
          <div className="text-sm font-black uppercase text-slate-900">
            Corpo de Bombeiros Militar do Rio Grande do Sul - CBMRS
          </div>
          <div className="text-xs font-bold text-slate-700">
            1º Pelotão de Bombeiro Militar • Quartel de Ijuí/RS
          </div>
          <h3 className="text-base font-black uppercase mt-3 tracking-wide text-red-700">
            REQUERIMENTO DE PERMUTA DE SERVIÇO
          </h3>
        </div>

        <div className="text-xs space-y-4 leading-relaxed">
          <p>
            Ao Senhor <strong>Comandante do 1º Pelotão de Bombeiro Militar</strong>,
          </p>
          <p className="text-justify">
            Os Militares Estaduais abaixo identificados vêm mui respeitosamente requerer a Vossa Senhoria autorização para realizar 
            <strong> PERMUTA DE SERVIÇO</strong> na escala do mês de <strong>{MONTH_NAMES[month - 1]} de {year}</strong>, conforme os seguintes termos:
          </p>

          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="font-bold block text-slate-700">Militar Proponente:</span>
              <p className="font-black text-slate-900">{militarA?.rank} {militarA?.warName}</p>
              <p className="text-slate-600">Serviço no Dia: <strong>{dayA} de {MONTH_NAMES[month - 1]} de {year}</strong></p>
            </div>
            <div>
              <span className="font-bold block text-slate-700">Militar Substituto:</span>
              <p className="font-black text-slate-900">{militarB?.rank} {militarB?.warName}</p>
              <p className="text-slate-600">Serviço no Dia: <strong>{dayB} de {MONTH_NAMES[month - 1]} de {year}</strong></p>
            </div>
          </div>

          <div>
            <span className="font-bold block text-slate-700">Justificativa:</span>
            <input
              type="text"
              value={justification}
              onChange={e => setJustification(e.target.value)}
              className="w-full bg-transparent border-b border-slate-300 py-1 font-medium text-slate-800 outline-none"
            />
          </div>

          <div className="pt-8 grid grid-cols-2 gap-8 text-center">
            <div>
              <div className="border-t border-slate-400 pt-1 font-bold text-[11px]">
                {militarA?.rank} {militarA?.warName}
              </div>
              <span className="text-[10px] text-slate-500">Militar Proponente</span>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-1 font-bold text-[11px]">
                {militarB?.rank} {militarB?.warName}
              </div>
              <span className="text-[10px] text-slate-500">Militar Substituto</span>
            </div>
          </div>

          <div className="pt-8 border-t text-center">
            <div className="w-64 mx-auto border-t border-slate-400 pt-1 font-bold text-[11px]">
              1º Tenente AGNOLETTO
            </div>
            <span className="text-[10px] text-slate-500">Comandante do 1º PelBM - Ijuí/RS</span>
            <div className="mt-2 text-[10px] text-slate-600">
              ( &nbsp; ) DEFERIDO &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ( &nbsp; ) INDEFERIDO
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
