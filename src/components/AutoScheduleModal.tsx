import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  ShieldCheck, 
  Clock, 
  Calendar, 
  AlertCircle, 
  Users
} from 'lucide-react';
import type { Militar, MonthConfig } from '../types';
import { MONTH_NAMES } from '../data/constants';

interface AutoScheduleModalProps {
  config: MonthConfig;
  personnel: Militar[];
  onGenerate: (newConfig: MonthConfig) => void;
  onClose: () => void;
}

export const AutoScheduleModal: React.FC<AutoScheduleModalProps> = ({
  config,
  personnel,
  onGenerate,
  onClose
}) => {
  const [maxHESgt, setMaxHESgt] = useState(config.maxOvertimeSgt || 24);
  const [maxHESd, setMaxHESd] = useState(config.maxOvertimeSd || 48);
  const [maxWeekends, setMaxWeekends] = useState(config.maxWeekends || 3);
  const [defaultStaff, setDefaultStaff] = useState(4);
  const [selectedPrevWorkers, setSelectedPrevWorkers] = useState<string[]>(config.lastMonthDay31Workers || []);
  const [isProcessing, setIsProcessing] = useState(false);

  const operationalPersonnel = personnel.filter(p => !p.isCommander);

  const toggleWorker = (name: string) => {
    setSelectedPrevWorkers(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const handleRun = () => {
    setIsProcessing(true);

    const updatedDailyRequired: { [day: number]: number } = {};
    for (let d = 1; d <= config.numDays; d++) {
      updatedDailyRequired[d] = config.dailyRequiredStaff[d] || defaultStaff;
    }

    const newConfig: MonthConfig = {
      ...config,
      maxOvertimeSgt: maxHESgt,
      maxOvertimeSd: maxHESd,
      maxWeekends: maxWeekends,
      dailyRequiredStaff: updatedDailyRequired,
      lastMonthDay31Workers: selectedPrevWorkers
    };

    setTimeout(() => {
      onGenerate(newConfig);
      setIsProcessing(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-red-950/80 via-slate-900 to-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/30 border border-red-500/40 flex items-center justify-center text-red-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">
                Gerador Inteligente de Escala (24x72h)
              </h2>
              <p className="text-xs text-slate-400">
                {MONTH_NAMES[config.month - 1]} de {config.year} • {config.numDays} dias ({config.baseHours}h base)
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1 text-slate-300">
              <span className="font-bold text-white block">Regras CBMRS Ativas:</span>
              <p>• <strong>Equipes Sortidas:</strong> Guarnição diária balanceada com 1 a 2 Sargentos + Soldados.</p>
              <p>• <strong>Rotação dos Chefes:</strong> Distribuição dos 4 sargentos mais antigos nas 4 equipes de serviço.</p>
              <p>• <strong>Eliminação de Faltas:</strong> Reforço inteligente de guarnição para quem tiver horas a cumprir.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-400" />
                  Teto HE Sargentos (FE1)
                </span>
                <span className="font-black text-blue-400 bg-blue-950/60 border border-blue-500/30 px-2 py-0.5 rounded-lg text-sm">
                  {maxHESgt}h
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="96"
                step="6"
                value={maxHESgt}
                onChange={e => setMaxHESgt(parseInt(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0h</span>
                <span>24h (Padrão)</span>
                <span>48h</span>
                <span>96h</span>
              </div>
            </div>

            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  Teto HE Soldados (FF1)
                </span>
                <span className="font-black text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-lg text-sm">
                  {maxHESd}h
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="96"
                step="6"
                value={maxHESd}
                onChange={e => setMaxHESd(parseInt(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0h</span>
                <span>24h</span>
                <span>48h (Padrão)</span>
                <span>96h</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  Máx. Fins de Semana
                </span>
                <span className="font-black text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-lg text-sm">
                  {maxWeekends} FDS
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="4"
                value={maxWeekends}
                onChange={e => setMaxWeekends(parseInt(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">Garante descanso familiar (máximo 3 FDS por militar).</p>
            </div>

            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-purple-400" />
                  Guarnição Base Diária
                </span>
                <span className="font-black text-purple-400 bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded-lg text-sm">
                  {defaultStaff} Militares
                </span>
              </div>
              <div className="flex gap-2">
                {[4, 5].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setDefaultStaff(num)}
                    className={`flex-1 py-1.5 rounded-xl border text-xs font-bold transition ${
                      defaultStaff === num 
                        ? 'bg-purple-600/30 border-purple-500 text-white' 
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {num} ME / dia
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400">Tamanho mínimo da guarnição diária.</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-400" />
                Quem trabalhou no dia 31 do Mês Anterior? (Proteção Dia 1)
              </label>
              <span className="text-[10px] text-slate-500">{selectedPrevWorkers.length} selecionados</span>
            </div>
            
            <p className="text-[11px] text-slate-400">
              Estes militares <strong>NÃO</strong> serão escalados no Dia 1 para evitar dobra de serviço na virada de mês.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-950/60 rounded-xl border border-slate-800">
              {operationalPersonnel.map(p => {
                const isChecked = selectedPrevWorkers.includes(p.warName);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleWorker(p.warName)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-left truncate transition border ${
                      isChecked 
                        ? 'bg-red-600/30 border-red-500/60 text-red-300' 
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {p.warName}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
          >
            Cancelar
          </button>

          <button
            onClick={handleRun}
            disabled={isProcessing}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-sm font-black shadow-lg shadow-red-600/30 transition transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>{isProcessing ? 'Processando Escala...' : 'Gerar Escala Completa'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
