import React from 'react';
import { 
  Flame, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  FileDown, 
  FileSpreadsheet, 
  Moon, 
  Sun,
  ShieldAlert,
  Users,
  Clock
} from 'lucide-react';
import type { MonthConfig } from '../types';
import { MONTH_NAMES } from '../data/constants';
import { Database } from 'lucide-react';

interface HeaderProps {
  config: MonthConfig;
  onChangeMonth: (month: number, year: number) => void;
  onOpenAutoSchedule: () => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
  totalPersonnel: number;
  totalAvailableHours: number;
  totalRequiredHours: number;
  totalOvertimeHours: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  dbStatus?: 'online' | 'offline';
}

export const Header: React.FC<HeaderProps> = ({
  config,
  onChangeMonth,
  onOpenAutoSchedule,
  onExportPDF,
  onExportExcel,
  totalPersonnel,
  totalAvailableHours,
  totalRequiredHours,
  totalOvertimeHours,
  darkMode,
  onToggleDarkMode,
  dbStatus = 'online'
}) => {
  const { year, month } = config;

  const handlePrevMonth = () => {
    if (month === 1) {
      onChangeMonth(12, year - 1);
    } else {
      onChangeMonth(month - 1, year);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      onChangeMonth(1, year + 1);
    } else {
      onChangeMonth(month + 1, year);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-xl px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-600/30 text-white font-black text-xl">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-red-600/20 text-red-400 border border-red-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                CBMRS
              </span>
              <h1 className="text-lg font-black text-white tracking-wide">
                1º Pelotão de Bombeiro Militar
              </h1>
              <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                dbStatus === 'online' 
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30' 
                  : 'bg-amber-950/60 text-amber-400 border-amber-500/30'
              }`}>
                <Database className="w-3 h-3" />
                <span>{dbStatus === 'online' ? 'SQLite: escala_cbmrs.db' : 'Modo Offline / Local'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Quartel de Ijuí/RS • Sistema de Gestão de Escala
            </p>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl p-1 shadow-inner">
          <button 
            onClick={handlePrevMonth}
            className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
            title="Mês Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2 px-3 py-1 text-sm font-bold text-white min-w-[150px] justify-center">
            <Calendar className="w-4 h-4 text-red-400" />
            <span>{MONTH_NAMES[month - 1]} {year}</span>
          </div>

          <button 
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
            title="Próximo Mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Stats Badges */}
        <div className="hidden xl:flex items-center gap-4 text-xs">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <div>
              <div className="text-slate-400 font-medium">Efetivo</div>
              <div className="text-white font-bold">{totalPersonnel} Militares</div>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-slate-400 font-medium">Carga Disponível / Prevista</div>
              <div className="text-white font-bold">{totalAvailableHours}h / {totalRequiredHours}h</div>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-slate-400 font-medium">Saldo de HE</div>
              <div className="text-emerald-400 font-bold">+{totalOvertimeHours}h</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleDarkMode}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition"
            title={darkMode ? 'Modo Claro' : 'Modo Escuro'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
          </button>

          <button
            onClick={onExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 rounded-xl text-xs font-bold transition shadow-sm"
            title="Exportar para Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          <button
            onClick={onExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/40 rounded-xl text-xs font-bold transition shadow-sm"
            title="Exportar PDF Oficial"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">PDF Oficial</span>
          </button>

          <button
            onClick={onOpenAutoSchedule}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-black shadow-lg shadow-red-600/30 hover:shadow-red-600/50 transition transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Sparkles className="w-4 h-4 animate-spin-slow" />
            <span>Gerar Escala</span>
          </button>
        </div>

      </div>
    </header>
  );
};
