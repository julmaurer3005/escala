import React from 'react';
import { 
  BarChart3, 
  Clock, 
  Calendar, 
  ShieldAlert, 
  TrendingUp, 
  Users 
} from 'lucide-react';
import type { Militar, MonthConfig, ScheduleStats } from '../types';
import { getShiftHours } from '../data/constants';

interface DashboardViewProps {
  personnel: Militar[];
  stats: ScheduleStats[];
  config: MonthConfig;
  schedule: Record<number, Record<string, string>>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  personnel,
  stats,
  config,
  schedule
}) => {
  const { numDays, maxOvertimeSgt, maxOvertimeSd } = config;

  const operationalStats = stats.filter(s => {
    const m = personnel.find(p => p.id === s.militarId);
    return m && !m.isCommander;
  });

  const totalWorked = operationalStats.reduce((acc, s) => acc + s.workedHours, 0);
  const totalTarget = operationalStats.reduce((acc, s) => acc + s.targetHours, 0);
  const totalOvertime = operationalStats.reduce((acc, s) => acc + Math.max(0, s.balanceHours), 0);
  const deficitsCount = operationalStats.filter(s => s.isDeficit).length;

  const understaffedDays: number[] = [];
  for (let d = 1; d <= numDays; d++) {
    let count = 0;
    personnel.forEach(p => {
      if (!p.isCommander && getShiftHours(schedule[d]?.[p.id]) > 0) count++;
    });
    if (count < (config.dailyRequiredStaff[d] || 4)) {
      understaffedDays.push(d);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">Horas Totais Trabalhadas</span>
            <span className="text-xl font-black text-white">{totalWorked}h</span>
            <span className="text-[10px] text-slate-500 block">Meta Global: {totalTarget}h</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">Horas Extras Acumuladas</span>
            <span className="text-xl font-black text-emerald-400">+{totalOvertime}h</span>
            <span className="text-[10px] text-slate-500 block">Teto SGT: {maxOvertimeSgt}h | SD: {maxOvertimeSd}h</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl border ${
            deficitsCount > 0 
              ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse' 
              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
          }`}>
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">Militares com "FALTA"</span>
            <span className={`text-xl font-black ${deficitsCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {deficitsCount} Militares
            </span>
            <span className="text-[10px] text-slate-500 block">
              {deficitsCount === 0 ? 'Meta cumprida por todos!' : 'Requer ajuste na escala'}
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold text-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">Cobertura da Guarnição</span>
            <span className={`text-xl font-black ${understaffedDays.length === 0 ? 'text-purple-400' : 'text-red-400'}`}>
              {understaffedDays.length === 0 ? '100% Coberto' : `${understaffedDays.length} Dias desfalcados`}
            </span>
            <span className="text-[10px] text-slate-500 block">Mínimo 4 ME por dia</span>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-red-500" />
                Balanço de Horas Extras por Militar
              </h3>
              <p className="text-xs text-slate-400">Comparativo entre horas trabalhadas e a meta do mês</p>
            </div>
          </div>

          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-2">
            {operationalStats
              .sort((a, b) => b.balanceHours - a.balanceHours)
              .map(s => {
                const maxQuota = s.rank.includes('SARGENTO') ? maxOvertimeSgt : maxOvertimeSd;
                
                return (
                  <div key={s.militarId} className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                          {s.rank}
                        </span>
                        <span className="font-black text-white">{s.warName}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 font-bold">
                        <span className="text-slate-400 text-[11px]">{s.workedHours}h / {s.targetHours}h</span>
                        {s.isDeficit ? (
                          <span className="text-red-400 bg-red-950/60 px-2 py-0.5 rounded text-[11px] font-black border border-red-500/30">
                            FALTA ({Math.abs(s.balanceHours)}h)
                          </span>
                        ) : (
                          <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded text-[11px] font-black border border-emerald-500/30">
                            +{s.balanceHours}h HE
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden flex">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          s.isDeficit 
                            ? 'bg-red-500' 
                            : s.balanceHours > maxQuota 
                              ? 'bg-amber-500' 
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, (s.workedHours / (s.targetHours + maxQuota)) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-400" />
                Fins de Semana Trabalhados (Sáb / Dom)
              </h3>
              <p className="text-xs text-slate-400">Controle de equidade de trabalho em fins de semana (máx 3 FDS)</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2">Militar</th>
                  <th className="px-3 py-2 text-center">Sábados</th>
                  <th className="px-3 py-2 text-center">Domingos</th>
                  <th className="px-3 py-2 text-center">Total Dias</th>
                  <th className="px-3 py-2 text-center">FDS Distintos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {operationalStats.map(s => (
                  <tr key={s.militarId} className="hover:bg-slate-800/30">
                    <td className="px-3 py-2 font-bold text-white">
                      {s.rank} {s.warName}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-300 font-bold">{s.saturdays}</td>
                    <td className="px-3 py-2 text-center text-slate-300 font-bold">{s.sundays}</td>
                    <td className="px-3 py-2 text-center font-bold text-amber-400">{s.saturdays + s.sundays}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded font-black text-xs ${
                        s.distinctWeekends > 3 
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                          : 'bg-slate-800 text-slate-200'
                      }`}>
                        {s.distinctWeekends} / 3 FDS
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};
