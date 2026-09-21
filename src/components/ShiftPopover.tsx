import React, { useState, useRef, useEffect } from 'react';
import { X, Trash2, Search, CornerDownLeft, Sparkles, Shield, Truck, HeartPulse, ClipboardCheck, FileText, Check } from 'lucide-react';
import { SHIFTS, getShiftHours, parseShiftCell } from '../data/constants';
import type { Militar, ShiftDefinition } from '../types';

interface ShiftPopoverProps {
  militar: Militar;
  day: number;
  currentCode: string;
  onSelectCode: (code: string) => void;
  onClose: () => void;
}

const AVAILABLE_DAILY_ROLES = [
  { key: 'CHEFE', label: 'Chefe de Socorro', icon: Shield, color: 'border-amber-500 bg-amber-500/20 text-amber-300' },
  { key: 'COV', label: 'Motorista (COV)', icon: Truck, color: 'border-cyan-500 bg-cyan-500/20 text-cyan-300' },
  { key: 'SOCORRISTA', label: 'Socorrista', icon: HeartPulse, color: 'border-emerald-500 bg-emerald-500/20 text-emerald-300' },
  { key: 'PREVENÇÃO', label: 'Prevenção', icon: ClipboardCheck, color: 'border-purple-500 bg-purple-500/20 text-purple-300' },
  { key: 'SARG', label: 'Sargenteante', icon: FileText, color: 'border-indigo-500 bg-indigo-500/20 text-indigo-300' },
];

export const ShiftPopover: React.FC<ShiftPopoverProps> = ({
  militar,
  day,
  currentCode,
  onSelectCode,
  onClose
}) => {
  const parsed = parseShiftCell(currentCode, militar);

  const [selectedRole, setSelectedRole] = useState<string>(() => {
    if (parsed.role) return parsed.role;
    if (militar.isCommander || militar.rank.includes('Tenente')) return 'CMTE';
    const r = (militar.role || '').toLowerCase();
    if (r.includes('chefe') || militar.rank.includes('SARGENTO')) return 'CHEFE';
    if (r.includes('motorista') || r.includes('cov') || r.includes('condutor')) return 'COV';
    if (r.includes('preven')) return 'PREVENÇÃO';
    if (r.includes('sarg')) return 'SARG';
    return 'SOCORRISTA';
  });

  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleApplyShiftWithRole = (shiftCode: string, roleToApply?: string) => {
    const role = roleToApply !== undefined ? roleToApply : selectedRole;
    const upper = shiftCode.trim().toUpperCase();

    // If clearing
    if (!upper || upper === '-') {
      onSelectCode('');
      onClose();
      return;
    }

    // If operational or custom shift that supports roles
    if (role && (upper === 'J' || ['1', '2', '3', '4', '41', '23', '34', '123', '234', '341'].includes(upper))) {
      onSelectCode(`${upper}:${role}`);
    } else {
      onSelectCode(upper);
    }
    onClose();
  };

  const handleChangeOnlyRole = (newRole: string) => {
    setSelectedRole(newRole);
    if (parsed.shiftCode) {
      handleApplyShiftWithRole(parsed.shiftCode, newRole);
    }
  };

  // Filtra as siglas pelo termo de busca
  const cleanTerm = searchTerm.trim().toUpperCase();

  const filteredShifts = SHIFTS.filter(shift => 
    shift.code.toUpperCase().includes(cleanTerm) ||
    shift.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(shift.hours).includes(cleanTerm)
  );

  const isCustomCode = cleanTerm.length > 0 && !SHIFTS.some(s => s.code.toUpperCase() === cleanTerm);
  const customHours = isCustomCode ? getShiftHours(cleanTerm) : 0;

  // Seleção com tecla ENTER
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredShifts.length > 0) {
        handleApplyShiftWithRole(filteredShifts[0].code);
      } else if (cleanTerm) {
        handleApplyShiftWithRole(cleanTerm);
      }
    }
  };

  const renderShiftButton = (shift: ShiftDefinition) => {
    const isSelected = parsed.shiftCode === shift.code;
    return (
      <button
        key={shift.code}
        onClick={() => handleApplyShiftWithRole(shift.code)}
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div>
            <div className="text-xs text-red-400 font-extrabold uppercase tracking-wider">
              {militar.rank}
            </div>
            <div className="text-lg font-black text-white flex items-center gap-2">
              <span>{militar.warName}</span>
              <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                Dia {day}
              </span>
              {parsed.shiftCode && (
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-500/40 px-2 py-0.5 rounded-md">
                  Atual: {parsed.shiftCode} ({parsed.role || 'SEM FUNÇÃO'})
                </span>
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Daily Role Selector (Crucial for per-day function assignment) */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>1. Escolha a Função do Militar Neste Dia:</span>
            </span>
            <span className="text-[11px] text-slate-400">
              {parsed.shiftCode ? 'Clique para alterar a função imediatamente' : 'Será aplicada com a jornada'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {AVAILABLE_DAILY_ROLES.map(r => {
              const Icon = r.icon;
              const isRoleActive = selectedRole === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => handleChangeOnlyRole(r.key)}
                  className={`px-2.5 py-2 rounded-xl border text-xs font-black transition flex items-center justify-center gap-1.5 shadow-sm ${
                    isRoleActive
                      ? `${r.color} ring-2 ring-current shadow-lg`
                      : 'bg-slate-900/90 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:border-slate-500'
                  }`}
                  title={`Definir função deste dia como ${r.label}`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{r.key}</span>
                  {isRoleActive && <Check className="w-3 h-3 ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Quick 1-Click Operational Presets */}
        <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-tight shrink-0">
            Atalhos Rápidos (Jornada 24h):
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {AVAILABLE_DAILY_ROLES.map(r => (
              <button
                key={`preset-${r.key}`}
                type="button"
                onClick={() => handleApplyShiftWithRole('J', r.key)}
                className={`px-2 py-1 rounded-lg border text-[11px] font-black transition ${
                  parsed.shiftCode === 'J' && parsed.role === r.key
                    ? 'bg-red-600 text-white border-red-500 shadow-md ring-1 ring-red-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-slate-500'
                }`}
              >
                J • {r.key}
              </button>
            ))}
          </div>
        </div>

        {/* Search Box with Auto-Focus */}
        <div className="p-3.5 bg-slate-900/90 border-b border-slate-800">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-red-500 absolute left-3.5 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar sigla (ex: J, EXP6, FER, OS12, 1, 41, CM5)..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-red-500 rounded-xl pl-10 pr-20 py-2 text-xs font-bold text-white placeholder-slate-500 outline-none transition shadow-inner"
            />
            <div className="absolute right-2.5 flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 pointer-events-none">
              <span>ENTER</span>
              <CornerDownLeft className="w-2.5 h-2.5" />
            </div>
          </div>
        </div>

        {/* Options Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* Direct Custom Code Match Button */}
          {isCustomCode && (
            <button
              onClick={() => handleApplyShiftWithRole(cleanTerm)}
              className="w-full p-3 bg-gradient-to-r from-red-600/30 to-amber-600/30 hover:from-red-600/40 hover:to-amber-600/40 border border-red-500/50 rounded-2xl text-left flex items-center justify-between transition shadow-md group"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="text-xs font-black text-white">
                    Aplicar sigla digitada: <span className="text-red-400 font-mono text-sm">{cleanTerm}</span> ({selectedRole})
                  </div>
                  <div className="text-[11px] text-slate-300">
                    {customHours > 0 ? `Equivale a ${customHours} horas de serviço` : 'Sigla personalizada'}
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-white bg-red-600 px-2.5 py-1 rounded-lg group-hover:bg-red-500">
                Pressione Enter
              </span>
            </button>
          )}

          {/* If search has no match and not custom */}
          {filteredShifts.length === 0 && !isCustomCode && (
            <div className="text-center py-6 text-slate-400 text-xs">
              Nenhuma sigla padrão encontrada para "{searchTerm}". Digite e pressione Enter para aplicar mesmo assim.
            </div>
          )}

          {/* Operacional */}
          {operacionais.length > 0 && (
            <div>
              <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Jornadas & Turnos Operacionais (com função: {selectedRole})</span>
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
              <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
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
              <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
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
              <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                Etapas de Curso CBMRS
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {cursos.map(renderShiftButton)}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => handleApplyShiftWithRole('')}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition border border-rose-500/30"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpar Célula (Folga)
          </button>
          
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
