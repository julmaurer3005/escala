import React, { useState } from 'react';
import type { Militar, MonthConfig, ScheduleStats } from '../types';
import { DAYS_OF_WEEK_SHORT, SHIFT_MAP, getShiftHours, ROLE_OPTIONS, getRoleOption } from '../data/constants';
import { ShiftPopover } from './ShiftPopover';
import { Plus, Minus, ChevronDown } from 'lucide-react';

interface RosterGridProps {
  personnel: Militar[];
  schedule: Record<number, Record<string, string>>;
  config: MonthConfig;
  stats: ScheduleStats[];
  onUpdateCell: (militarId: string, day: number, code: string) => void;
  onChangeDailyRequired: (day: number, delta: number) => void;
  onUpdateMilitar?: (militar: Militar) => void;
}

export const getRoleAbbr = (militar: Militar): string => {
  if (militar.isCommander || militar.rank.includes('Tenente')) return 'CMTE';
  const roleOpt = getRoleOption(militar.role);
  return roleOpt.shortLabel;
};

export const RosterGrid: React.FC<RosterGridProps> = ({
  personnel,
  schedule,
  config,
  stats,
  onUpdateCell,
  onChangeDailyRequired,
  onUpdateMilitar
}) => {
  const { year, month, numDays, dailyRequiredStaff } = config;

  const [selectedCell, setSelectedCell] = useState<{ militar: Militar; day: number } | null>(null);

  const statsMap = stats.reduce((acc, s) => {
    acc[s.militarId] = s;
    return acc;
  }, {} as Record<string, ScheduleStats>);

  const isWeekendDay = (day: number) => {
    const date = new Date(year, month - 1, day);
    const dow = date.getDay();
    return dow === 0 || dow === 6;
  };

  const getDayOfWeekShort = (day: number) => {
    const date = new Date(year, month - 1, day);
    return DAYS_OF_WEEK_SHORT[date.getDay()];
  };

  const hasInterjornadaConflict = (militarId: string, day: number) => {
    if (day <= 1) return false;
    const todayShift = schedule[day]?.[militarId];
    const prevShift = schedule[day - 1]?.[militarId];
    return getShiftHours(todayShift) > 0 && getShiftHours(prevShift) > 0;
  };

  const handleRoleChange = (militar: Militar, newRole: string) => {
    if (onUpdateMilitar) {
      onUpdateMilitar({
        ...militar,
        role: newRole
      });
    }
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
      
      <div className="overflow-x-auto max-h-[calc(100vh-220px)] relative">
        <table className="w-full border-collapse text-left text-xs">
          
          <thead className="sticky top-0 z-30 bg-slate-950 shadow-md">
            
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="sticky left-0 z-40 bg-slate-950 px-3 py-2 font-bold w-24 min-w-[96px] max-w-[96px] text-slate-300 border-r border-slate-800">
                POSTO
              </th>
              <th className="sticky left-[96px] z-40 bg-slate-950 px-2 py-2 font-bold w-24 min-w-[96px] max-w-[96px] text-center text-slate-400 border-r border-slate-800">
                ID FUNCIONAL
              </th>
              <th className="sticky left-[192px] z-40 bg-slate-950 px-3 py-2 font-bold w-44 min-w-[176px] max-w-[176px] text-slate-300 border-r border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                NOME & FUNÇÃO
              </th>

              {Array.from({ length: numDays }, (_, i) => i + 1).map(day => {
                const isWk = isWeekendDay(day);
                return (
                  <th
                    key={`day-${day}`}
                    className={`px-1 py-1 text-center font-black min-w-[44px] max-w-[50px] border-r border-slate-800/80 ${
                      isWk ? 'bg-slate-900 text-red-400' : 'bg-slate-950 text-slate-200'
                    }`}
                  >
                    {day}
                  </th>
                );
              })}

              <th className="bg-slate-950 px-3 py-2 text-center font-bold w-20 min-w-[80px] text-slate-400 border-l border-slate-800">
                META
              </th>
              <th className="bg-slate-950 px-3 py-2 text-center font-bold w-20 min-w-[80px] text-slate-300 border-l border-slate-800">
                TRAB.
              </th>
              <th className="bg-slate-950 px-3 py-2 text-center font-bold w-28 min-w-[110px] text-slate-200 border-l border-slate-800">
                SALDO
              </th>
            </tr>

            <tr className="border-b border-slate-800 text-[10px] text-slate-400 bg-slate-950">
              <th className="sticky left-0 z-40 bg-slate-950 px-3 py-1 font-semibold text-slate-500 border-r border-slate-800">
                GRADUAÇÃO
              </th>
              <th className="sticky left-[96px] z-40 bg-slate-950 px-2 py-1 font-semibold text-center text-slate-500 border-r border-slate-800 font-mono text-[9px]">
                MATRÍCULA
              </th>
              <th className="sticky left-[192px] z-40 bg-slate-950 px-3 py-1 font-semibold text-slate-500 border-r border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                EFETIVO ({personnel.length})
              </th>

              {Array.from({ length: numDays }, (_, i) => i + 1).map(day => {
                const isWk = isWeekendDay(day);
                return (
                  <th
                    key={`dow-${day}`}
                    className={`px-1 py-1 text-center font-bold border-r border-slate-800/80 ${
                      isWk ? 'bg-slate-900 text-red-400 font-extrabold' : 'bg-slate-950 text-slate-400'
                    }`}
                  >
                    {getDayOfWeekShort(day)}
                  </th>
                );
              })}

              <th className="bg-slate-950 text-center text-[9px] text-slate-500 border-l border-slate-800">HORAS</th>
              <th className="bg-slate-950 text-center text-[9px] text-slate-500 border-l border-slate-800">HORAS</th>
              <th className="bg-slate-950 text-center text-[9px] text-slate-500 border-l border-slate-800">HE / FALTA</th>
            </tr>

          </thead>

          <tbody className="divide-y divide-slate-800/60 bg-slate-900">
            {personnel.map((militar, pIndex) => {
              const s = statsMap[militar.id];
              const isEven = pIndex % 2 === 0;
              const isCmte = militar.isCommander;
              const roleOpt = getRoleOption(militar.role);

              return (
                <tr 
                  key={militar.id}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    isCmte ? 'bg-slate-950/60 opacity-90' : isEven ? 'bg-slate-900' : 'bg-slate-900/70'
                  }`}
                >
                  {/* POSTO */}
                  <td className="sticky left-0 z-20 bg-slate-900 px-3 py-2 font-bold text-slate-300 border-r border-slate-800 w-24 min-w-[96px] max-w-[96px] whitespace-nowrap">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                      isCmte 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                        : militar.rank.includes('SARGENTO') 
                          ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' 
                          : 'bg-slate-700/50 text-slate-300'
                    }`}>
                      {militar.rank}
                    </span>
                  </td>

                  {/* ID FUNCIONAL */}
                  <td className="sticky left-[96px] z-20 bg-slate-900 px-2 py-2 text-center text-slate-400 font-mono text-[11px] border-r border-slate-800 w-24 min-w-[96px] max-w-[96px] whitespace-nowrap">
                    {militar.matricula || '-'}
                  </td>

                  {/* NOME DE GUERRA & FUNÇÃO (2-LINE DISPLAY WITH INLINE SELECTOR) */}
                  <td className="sticky left-[192px] z-20 bg-slate-900 px-3 py-2 border-r border-slate-800 w-44 min-w-[176px] max-w-[176px] shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                    <div className="flex flex-col gap-1">
                      {/* Line 1: War Name */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-black text-white text-xs tracking-wide truncate">
                          {militar.warName}
                        </span>
                        {isCmte && (
                          <span className="text-[9px] font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-1 rounded shrink-0">
                            CMTE
                          </span>
                        )}
                      </div>

                      {/* Line 2: Role Selector / Badge */}
                      <div className="relative group/role">
                        <select
                          value={militar.role || (isCmte ? 'Comandante' : militar.rank.includes('SARGENTO') ? 'Chefe de Socorro' : 'Socorrista')}
                          onChange={(e) => handleRoleChange(militar, e.target.value)}
                          className={`w-full text-[9.5px] font-black uppercase tracking-tight py-0.5 pl-1.5 pr-4 rounded-md border outline-none cursor-pointer appearance-none transition shadow-2xs ${roleOpt.badgeClass}`}
                          title="Clique para alterar a função operacional deste militar"
                        >
                          {ROLE_OPTIONS.map(opt => (
                            <option 
                              key={opt.value} 
                              value={opt.value} 
                              className="bg-slate-950 text-white font-bold text-xs py-1"
                            >
                              {opt.shortLabel} • {opt.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-2.5 h-2.5 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none opacity-60 text-current" />
                      </div>
                    </div>
                  </td>

                  {/* DAYS WITH CLEAN SINGLE SHIFT BADGES */}
                  {Array.from({ length: numDays }, (_, i) => i + 1).map(day => {
                    const code = schedule[day]?.[militar.id] || '';
                    const shiftDef = SHIFT_MAP[code];
                    const isWk = isWeekendDay(day);
                    const conflict = hasInterjornadaConflict(militar.id, day);

                    return (
                      <td
                        key={`cell-${militar.id}-${day}`}
                        onClick={() => setSelectedCell({ militar, day })}
                        className={`px-0.5 py-1 text-center cursor-pointer border-r border-slate-800/60 hover:bg-red-500/10 transition group relative ${
                          isWk ? 'bg-slate-950/30' : ''
                        }`}
                      >
                        {code ? (
                          <div className={`mx-auto w-9 h-7 flex items-center justify-center rounded-lg border font-black text-xs transition transform group-hover:scale-105 shadow-xs ${
                            shiftDef ? `${shiftDef.bgColor} ${shiftDef.textColor} ${shiftDef.borderColor}` : 'bg-slate-800 text-slate-200 border-slate-700'
                          }`}>
                            <span>{code}</span>
                          </div>
                        ) : (
                          <div className="w-9 h-7 mx-auto rounded flex items-center justify-center text-slate-700 group-hover:text-slate-500 text-xs font-semibold">
                            -
                          </div>
                        )}

                        {conflict && (
                          <span 
                            className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500 animate-ping" 
                            title="Aviso: Dobra de serviço em dias consecutivos!"
                          />
                        )}
                      </td>
                    );
                  })}

                  <td className="bg-slate-900 px-3 py-2 text-center font-semibold text-slate-400 border-l border-slate-800">
                    {isCmte ? '-' : s?.targetHours || 0}
                  </td>

                  <td className="bg-slate-900 px-3 py-2 text-center font-bold text-white border-l border-slate-800">
                    {isCmte ? '-' : s?.workedHours || 0}
                  </td>

                  <td className="bg-slate-900 px-3 py-2 text-center font-black border-l border-slate-800 whitespace-nowrap">
                    {isCmte ? (
                      <span className="text-slate-500 text-[10px]">COMANDANTE</span>
                    ) : s?.isDeficit ? (
                      <span className="text-red-400 bg-red-500/20 px-2 py-0.5 rounded font-black border border-red-500/30 text-[11px] animate-pulse">
                        FALTA ({Math.abs(s.balanceHours)}h)
                      </span>
                    ) : s && s.balanceHours > 0 ? (
                      <span className="text-emerald-400 font-black">
                        +{s.balanceHours}h
                      </span>
                    ) : (
                      <span className="text-slate-500">0h</span>
                    )}
                  </td>

                </tr>
              );
            })}
          </tbody>

          <tfoot className="sticky bottom-0 z-30 bg-slate-950 font-black text-xs border-t-2 border-slate-700 shadow-2xl">
            <tr className="bg-slate-950 text-slate-200 border-b border-slate-800">
              <td className="sticky left-0 z-40 bg-slate-950 px-3 py-2.5 text-red-400 font-extrabold border-r border-slate-800 w-24 min-w-[96px] max-w-[96px]">
                TOTAL ME
              </td>
              <td className="sticky left-[96px] z-40 bg-slate-950 px-2 py-2.5 text-center text-slate-500 border-r border-slate-800 w-24 min-w-[96px] max-w-[96px]">
                -
              </td>
              <td className="sticky left-[192px] z-40 bg-slate-950 px-3 py-2.5 text-slate-300 font-extrabold border-r border-slate-800 w-44 min-w-[176px] max-w-[176px] shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                DE SERVIÇO
              </td>

              {Array.from({ length: numDays }, (_, i) => i + 1).map(day => {
                let count = 0;
                personnel.forEach(p => {
                  if (!p.isCommander && getShiftHours(schedule[day]?.[p.id]) > 0) count++;
                });

                const req = dailyRequiredStaff[day] || 4;
                const isUnderstaffed = count < req;

                return (
                  <td
                    key={`total-${day}`}
                    className={`px-1 py-2 text-center font-black text-sm border-r border-slate-800 ${
                      isUnderstaffed 
                        ? 'bg-red-500/20 text-red-400 animate-pulse font-black' 
                        : count > req 
                          ? 'text-amber-400' 
                          : 'text-emerald-400'
                    }`}
                  >
                    {count}
                  </td>
                );
              })}

              <td className="bg-slate-950 text-center text-slate-500 border-l border-slate-800">-</td>
              <td className="bg-slate-950 text-center text-slate-500 border-l border-slate-800">-</td>
              <td className="bg-slate-950 text-center text-slate-500 border-l border-slate-800">-</td>
            </tr>

            <tr className="bg-slate-900 text-slate-400 text-[11px]">
              <td className="sticky left-0 z-40 bg-slate-900 px-3 py-2 text-slate-400 border-r border-slate-800 w-24 min-w-[96px] max-w-[96px]">
                GUARNIÇÃO
              </td>
              <td className="sticky left-[96px] z-40 bg-slate-900 px-2 py-2 text-center text-slate-500 border-r border-slate-800 w-24 min-w-[96px] max-w-[96px]">
                -
              </td>
              <td className="sticky left-[192px] z-40 bg-slate-900 px-3 py-2 text-slate-400 border-r border-slate-800 w-44 min-w-[176px] max-w-[176px] shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                TAMANHO PREVISTO
              </td>

              {Array.from({ length: numDays }, (_, i) => i + 1).map(day => {
                const req = dailyRequiredStaff[day] || 4;
                return (
                  <td
                    key={`req-${day}`}
                    className="px-1 py-1 text-center font-bold text-slate-300 border-r border-slate-800 group"
                  >
                    <div className="flex items-center justify-center gap-0.5">
                      <button 
                        onClick={() => onChangeDailyRequired(day, -1)}
                        className="opacity-0 group-hover:opacity-100 hover:text-red-400 text-[9px] p-0.5"
                        title="Diminuir efetivo do dia"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span>{req}</span>
                      <button 
                        onClick={() => onChangeDailyRequired(day, 1)}
                        className="opacity-0 group-hover:opacity-100 hover:text-emerald-400 text-[9px] p-0.5"
                        title="Aumentar efetivo do dia"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </td>
                );
              })}

              <td className="bg-slate-900 text-center border-l border-slate-800">-</td>
              <td className="bg-slate-900 text-center border-l border-slate-800">-</td>
              <td className="bg-slate-900 text-center border-l border-slate-800">-</td>
            </tr>

          </tfoot>

        </table>
      </div>

      {selectedCell && (
        <ShiftPopover
          militar={selectedCell.militar}
          day={selectedCell.day}
          currentCode={schedule[selectedCell.day]?.[selectedCell.militar.id] || ''}
          onSelectCode={(code) => onUpdateCell(selectedCell.militar.id, selectedCell.day, code)}
          onClose={() => setSelectedCell(null)}
        />
      )}

    </div>
  );
};
