import React, { useState, useRef, useEffect } from 'react';
import { X, Trash2, Search, CornerDownLeft, Sparkles } from 'lucide-react';
import { SHIFTS, getShiftHours } from '../data/constants';
import type { Militar, ShiftDefinition } from '../types';

interface ShiftPopoverProps {
  militar: Militar;
  day: number;
  currentCode: string;
  onSelectCode: (code: string) => void;
  onClose: () => void;
}

export const ShiftPopover: React.FC<ShiftPopoverProps> = ({
  militar,
  day,
  currentCode,
  onSelectCode,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Filtra as siglas pelo termo de busca
  const cleanTerm = searchTerm.trim().toUpperCase();

  const filteredShifts = SHIFTS.filter(shift => 
    shift.code.toUpperCase().includes(cleanTerm) ||
    shift.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(shift.hours).includes(cleanTerm)
  );

  // Checa se o usuário digitou uma sigla customizada válida (ex: CM5, OS8, EXP4)
  const isCustomCode = cleanTerm.length > 0 && !SHIFTS.some(s => s.code.toUpperCase() === cleanTerm);
  const customHours = isCustomCode ? getShiftHours(cleanTerm) : 0;

  // Seleção com tecla ENTER
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredShifts.length > 0) {
        onSelectCode(filteredShifts[0].code);
        onClose();
      } else if (cleanTerm) {
        onSelectCode(cleanTerm);
        onClose();
      }
    }
  };

  const renderShiftButton = (shift: ShiftDefinition) => {
    const isSelected = currentCode === shift.code;
    return (
      <button
        key={shift.code}
        onClick={() => { onSelectCode(shift.code); onClose(); }}
        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all group ${
          isSelected 
            ? 'bg-red-600/30 border-red-500 text-white shadow-lg shadow-red-600/20 ring-2 ring-red-500/50' 
            : 'bg-slate-800/70 hover:bg-slate-800 border-slate-700/70 text-slate-200 hover:border-slate-500'
        }`}
      >
        <div className="flex items-center justify-between w-full">
          <span className={`font-black text-base ${shift.textColor || 'text-white'}`}>
            {shift.code}
          </span>
          {shift.hours > 0 ? (
            <span className="text-[11px] font-bold text-slate-400 bg-slate-900/90 border border-slate-700 px-1.5 py-0.5 rounded-md">
              {shift.hours}h
            </span>
          ) : (
            <span className="text-[10px] font-bold text-yellow-400/80 bg-yellow-950/40 border border-yellow-700/40 px-1.5 py-0.5 rounded-md">
              Folga
            </span>
          )}
        </div>
        <span className="text-[11px] text-slate-400 truncate mt-1 group-hover:text-slate-200">
          {shift.label}
        </span>
      </button>
    );
  };

  const operacionais = filteredShifts.filter(s => s.category === 'OPERACIONAL');
  const expedientes = filteredShifts.filter(s => s.category === 'EXPEDIENTE');
  const afastamentos = filteredShifts.filter(s => s.category === 'AFASTAMENTO');
  const cursos = filteredShifts.filter(s => s.category === 'CURSO');

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div>
            <div className="text-xs text-red-400 font-extrabold uppercase tracking-wider">
              {militar.rank}
            </div>
            <div className="text-lg font-black text-white">
              {militar.warName} • Dia {day}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Box with Auto-Focus */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800">
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-red-500 absolute left-3.5 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Digite a sigla ou função (ex: J, EXP6, FER, OS12, 1, 41, CM5)..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border-2 border-slate-700 hover:border-slate-600 focus:border-red-500 rounded-2xl pl-11 pr-24 py-3 text-sm font-bold text-white placeholder-slate-500 outline-none transition shadow-inner"
            />
            <div className="absolute right-3 flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 pointer-events-none">
              <span>ENTER</span>
              <CornerDownLeft className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* Options Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Direct Custom Code Match Button */}
          {isCustomCode && (
            <button
              onClick={() => { onSelectCode(cleanTerm); onClose(); }}
              className="w-full p-3.5 bg-gradient-to-r from-red-600/30 to-amber-600/30 hover:from-red-600/40 hover:to-amber-600/40 border border-red-500/50 rounded-2xl text-left flex items-center justify-between transition shadow-md group"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="text-sm font-black text-white">
                    Aplicar sigla digitada: <span className="text-red-400 font-mono text-base">{cleanTerm}</span>
                  </div>
                  <div className="text-xs text-slate-300">
                    {customHours > 0 ? `Equivale a ${customHours} horas de serviço` : 'Sigla personalizada'}
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-white bg-red-600 px-3 py-1 rounded-xl group-hover:bg-red-500">
                Pressione Enter
              </span>
            </button>
          )}

          {/* If search has no match and not custom */}
          {filteredShifts.length === 0 && !isCustomCode && (
            <div className="text-center py-8 text-slate-400 text-sm">
              Nenhuma sigla padrão encontrada para "{searchTerm}". Digite e pressione Enter para aplicar mesmo assim.
            </div>
          )}

          {/* Operacional */}
          {operacionais.length > 0 && (
            <div>
              <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Jornadas & Turnos Operacionais</span>
                <span className="text-[10px] text-slate-500">Horas</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {operacionais.map(renderShiftButton)}
              </div>
            </div>
          )}

          {/* Expedientes */}
          {expedientes.length > 0 && (
            <div>
              <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                Expedientes & Ordens de Serviço
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {expedientes.map(renderShiftButton)}
              </div>
            </div>
          )}

          {/* Afastamentos */}
          {afastamentos.length > 0 && (
            <div>
              <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                Férias & Afastamentos
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {afastamentos.map(renderShiftButton)}
              </div>
            </div>
          )}

          {/* Cursos */}
          {cursos.length > 0 && (
            <div>
              <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                Etapas de Curso CBMRS
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {cursos.map(renderShiftButton)}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => { onSelectCode(''); onClose(); }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition border border-rose-500/30"
          >
            <Trash2 className="w-4 h-4" />
            Limpar Célula (Folga)
          </button>
          
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
