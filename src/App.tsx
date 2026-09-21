import { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  Users, 
  ArrowLeftRight, 
  BarChart3, 
  RotateCcw,
  CheckCircle2
} from 'lucide-react';

import type { Militar, MonthConfig, ScheduleStats } from './types';
import { DEFAULT_PERSONNEL, MONTH_NAMES } from './data/constants';
import { calculateBaseHours, computeScheduleStats, generateAutomatedSchedule } from './utils/schedulerEngine';
import { exportScheduleToPDF, exportScheduleToExcel } from './utils/exportUtils';
import * as api from './services/api';

import { Header } from './components/Header';
import { RosterGrid } from './components/RosterGrid';
import { AutoScheduleModal } from './components/AutoScheduleModal';
import { PersonnelManager } from './components/PersonnelManager';
import { PermutaManager } from './components/PermutaManager';
import { DashboardView } from './components/DashboardView';

type TabType = 'ESCALA' | 'EFETIVO' | 'PERMUTAS' | 'DASHBOARD';

export function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [currentTab, setCurrentTab] = useState<TabType>('ESCALA');
  const [isAutoScheduleOpen, setIsAutoScheduleOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<'online' | 'offline'>('online');

  const [config, setConfig] = useState<MonthConfig>(() => {
    const year = 2026;
    const month = 10;
    const numDays = new Date(year, month, 0).getDate();
    const baseHours = calculateBaseHours(numDays);

    const initialRequired: Record<number, number> = {};
    for (let d = 1; d <= numDays; d++) {
      const dow = new Date(year, month - 1, d).getDay();
      initialRequired[d] = (dow === 0 || dow === 6) ? 5 : 4;
    }

    return {
      year,
      month,
      numDays,
      baseHours,
      maxOvertimeSgt: 24,
      maxOvertimeSd: 48,
      maxWeekends: 3,
      dailyRequiredStaff: initialRequired,
      lastMonthDay31Workers: ['KOMMERS', 'DIEISON', 'ERIK']
    };
  });

  const [personnel, setPersonnel] = useState<Militar[]>(() => {
    const saved = localStorage.getItem('cbmrs_personnel');
    return saved ? JSON.parse(saved) : DEFAULT_PERSONNEL;
  });

  const [schedule, setSchedule] = useState<Record<number, Record<string, string>>>(() => {
    const saved = localStorage.getItem('cbmrs_schedule_10_2026');
    if (saved) return JSON.parse(saved);

    const initial: Record<number, Record<string, string>> = {};
    for (let d = 1; d <= 31; d++) initial[d] = {};

    for (let d = 1; d <= 10; d++) initial[d]['1'] = 'FER';

    initial[1]['8'] = 'OS12';
    initial[2]['8'] = 'OS12';
    for (let d = 3; d <= 23; d++) initial[d]['8'] = 'FER';

    for (let d = 16; d <= 30; d++) initial[d]['13'] = 'FER';
    for (let d = 15; d <= 19; d++) initial[d]['16'] = 'RSP';
    for (let d = 22; d <= 31; d++) initial[d]['17'] = 'FER';
    for (let d = 1; d <= 20; d++) initial[d]['18'] = 'FER';
    for (let d = 5; d <= 18; d++) initial[d]['21'] = 'FER';

    [1, 2, 5, 6, 7, 8, 9].forEach(d => {
      initial[d]['2'] = 'EXP6';
    });

    return initial;
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load from SQLite on startup
  const loadDataFromBackend = useCallback(async (targetYear: number, targetMonth: number) => {
    try {
      const health = await api.checkServerHealth();
      setDbStatus(health.status);

      if (health.status === 'online') {
        const [fetchedPersonnel, scheduleData] = await Promise.all([
          api.fetchPersonnel(),
          api.fetchScheduleAndConfig(targetYear, targetMonth)
        ]);

        if (fetchedPersonnel && fetchedPersonnel.length > 0) {
          setPersonnel(fetchedPersonnel);
        }

        if (scheduleData && scheduleData.schedule) {
          setSchedule(scheduleData.schedule);
          if (scheduleData.config) {
            setConfig(scheduleData.config);
          }
        }
      }
    } catch (err) {
      console.warn('Backend SQLite offline or starting, using local cache:', err);
      setDbStatus('offline');
    }
  }, []);

  useEffect(() => {
    loadDataFromBackend(config.year, config.month);
  }, [loadDataFromBackend, config.year, config.month]);

  // Sync with LocalStorage as offline cache
  useEffect(() => {
    localStorage.setItem('cbmrs_personnel', JSON.stringify(personnel));
  }, [personnel]);

  useEffect(() => {
    localStorage.setItem(`cbmrs_schedule_${config.month}_${config.year}`, JSON.stringify(schedule));
  }, [schedule, config]);

  const stats: ScheduleStats[] = computeScheduleStats(personnel, schedule, config);

  const totalPersonnel = personnel.length;
  const operationalStats = stats.filter(s => {
    const m = personnel.find(p => p.id === s.militarId);
    return m && !m.isCommander;
  });
  const totalAvailableHours = operationalStats.reduce((acc, s) => acc + s.workedHours, 0);
  const totalRequiredHours = Object.values(config.dailyRequiredStaff).reduce((acc, n) => acc + (n * 24), 0);
  const totalOvertimeHours = operationalStats.reduce((acc, s) => acc + Math.max(0, s.balanceHours), 0);

  const handleChangeMonth = async (newMonth: number, newYear: number) => {
    const newNumDays = new Date(newYear, newMonth, 0).getDate();
    const newBaseHours = calculateBaseHours(newNumDays);

    const newDailyRequired: Record<number, number> = {};
    for (let d = 1; d <= newNumDays; d++) {
      const dow = new Date(newYear, newMonth - 1, d).getDay();
      newDailyRequired[d] = (dow === 0 || dow === 6) ? 5 : 4;
    }

    const updatedConfig: MonthConfig = {
      ...config,
      year: newYear,
      month: newMonth,
      numDays: newNumDays,
      baseHours: newBaseHours,
      dailyRequiredStaff: newDailyRequired
    };

    setConfig(updatedConfig);

    try {
      const res = await api.fetchScheduleAndConfig(newYear, newMonth);
      if (res && res.schedule) {
        setSchedule(res.schedule);
        if (res.config) setConfig(res.config);
      }
    } catch {
      const saved = localStorage.getItem(`cbmrs_schedule_${newMonth}_${newYear}`);
      if (saved) {
        setSchedule(JSON.parse(saved));
      } else {
        const empty: Record<number, Record<string, string>> = {};
        for (let d = 1; d <= newNumDays; d++) empty[d] = {};
        setSchedule(empty);
      }
    }

    showToast(`Escala alternada para ${MONTH_NAMES[newMonth - 1]} de ${newYear}`);
  };

  const handleUpdateCell = async (militarId: string, day: number, code: string) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...(prev[day] || {}),
        [militarId]: code
      }
    }));

    try {
      await api.updateScheduleCell(config.year, config.month, day, militarId, code);
    } catch (err) {
      console.warn('Falha ao salvar célula no SQLite, mantido no cache local:', err);
    }
  };

  const handleChangeDailyRequired = (day: number, delta: number) => {
    setConfig(prev => {
      const current = prev.dailyRequiredStaff[day] || 4;
      const next = Math.max(1, current + delta);
      const updated = {
        ...prev,
        dailyRequiredStaff: {
          ...prev.dailyRequiredStaff,
          [day]: next
        }
      };

      api.updateMonthConfig(config.year, config.month, updated).catch(() => {});
      return updated;
    });
  };

  const handleRunAutoScheduler = async (newConfig: MonthConfig) => {
    setConfig(newConfig);
    const result = generateAutomatedSchedule(personnel, schedule, newConfig);
    setSchedule(result.schedule);

    try {
      await Promise.all([
        api.bulkUpdateSchedule(newConfig.year, newConfig.month, result.schedule),
        api.updateMonthConfig(newConfig.year, newConfig.month, newConfig)
      ]);
    } catch (err) {
      console.warn('Falha ao sincronizar escala com SQLite:', err);
    }

    showToast(`🎉 Escala de ${MONTH_NAMES[newConfig.month - 1]} gerada e salva no SQLite! ${result.totalSlotsAssigned} jornadas alocadas.`);
  };

  const handleClearOperationalShifts = async () => {
    if (!window.confirm('Deseja limpar todos os serviços operacionais (J) mantendo férias e afastamentos?')) return;

    const cleaned: Record<number, Record<string, string>> = {};
    for (let d = 1; d <= config.numDays; d++) {
      cleaned[d] = {};
      Object.entries(schedule[d] || {}).forEach(([mId, code]) => {
        if (code === 'FER' || code === 'RSP' || code === 'LTS' || code === 'LFC' || code === 'PRE') {
          cleaned[d][mId] = code;
        }
      });
    }

    setSchedule(cleaned);
    try {
      await api.bulkUpdateSchedule(config.year, config.month, cleaned);
    } catch (err) {
      console.warn('Falha ao salvar limpeza no SQLite:', err);
    }

    showToast('Serviços operacionais limpos com sucesso.');
  };

  // Personnel Handlers
  const handleAddMilitar = async (newM: Militar, targetIndex?: number) => {
    setPersonnel(prev => {
      const list = [...prev];
      if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= list.length) {
        list.splice(targetIndex, 0, newM);
      } else {
        list.push(newM);
      }
      return list;
    });

    try {
      await api.addMilitar(newM, targetIndex);
    } catch (err) {
      console.warn('Falha ao salvar militar no SQLite:', err);
    }

    showToast(`Militar ${newM.rank} ${newM.warName} cadastrado no SQLite.`);
  };

  const handleUpdateMilitar = async (updatedM: Militar, targetIndex?: number) => {
    setPersonnel(prev => {
      let list = prev.map(p => p.id === updatedM.id ? updatedM : p);
      if (targetIndex !== undefined && targetIndex >= 0 && targetIndex < list.length) {
        const currentIndex = list.findIndex(p => p.id === updatedM.id);
        if (currentIndex !== -1 && currentIndex !== targetIndex) {
          const [moved] = list.splice(currentIndex, 1);
          list.splice(targetIndex, 0, moved);
        }
      }
      return list;
    });

    try {
      await api.updateMilitar(updatedM, targetIndex);
    } catch (err) {
      console.warn('Falha ao atualizar militar no SQLite:', err);
    }

    showToast(`Militar ${updatedM.warName} atualizado no SQLite.`);
  };

  const handleMoveMilitarToPosition = async (militarId: string, targetIndex: number) => {
    const currentIndex = personnel.findIndex(p => p.id === militarId);
    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= personnel.length) return;

    setPersonnel(prev => {
      const list = [...prev];
      const [moved] = list.splice(currentIndex, 1);
      list.splice(targetIndex, 0, moved);
      return list;
    });

    try {
      await api.reorderPersonnel(currentIndex, targetIndex);
    } catch (err) {
      console.warn('Falha ao reordenar militar no SQLite:', err);
    }

    const m = personnel.find(p => p.id === militarId);
    showToast(`Antiguidade de ${m?.warName} reposicionada para #${targetIndex + 1}.`);
  };

  const handleRemoveMilitar = async (id: string) => {
    const m = personnel.find(p => p.id === id);
    setPersonnel(prev => prev.filter(p => p.id !== id));
    
    // Clean up schedule entries for this militar
    setSchedule(prev => {
      const next = { ...prev };
      for (let d = 1; d <= config.numDays; d++) {
        if (next[d] && next[d][id]) {
          const dayCopy = { ...next[d] };
          delete dayCopy[id];
          next[d] = dayCopy;
        }
      }
      return next;
    });

    try {
      await api.removeMilitar(id);
    } catch (err) {
      console.warn('Falha ao remover militar do SQLite:', err);
    }

    showToast(`Militar ${m?.rank || ''} ${m?.warName || ''} excluído do SQLite e da escala.`);
  };

  const handleImportPersonnel = (importedList: Militar[]) => {
    if (!Array.isArray(importedList) || importedList.length === 0) {
      showToast('Arquivo de backup inválido ou vazio.');
      return;
    }
    setPersonnel(importedList);
    showToast(`Backup restaurado! ${importedList.length} militares carregados.`);
  };

  const handleReorderPersonnel = async (startIndex: number, endIndex: number) => {
    setPersonnel(prev => {
      const list = [...prev];
      const [moved] = list.splice(startIndex, 1);
      list.splice(endIndex, 0, moved);
      return list;
    });

    try {
      await api.reorderPersonnel(startIndex, endIndex);
    } catch (err) {
      console.warn('Falha ao reordenar no SQLite:', err);
    }

    showToast('Ordem de antiguidade atualizada no SQLite.');
  };

  const handleResetDefaultPersonnel = async () => {
    if (!window.confirm('Deseja restaurar a lista original com os 21 militares de Ijuí no SQLite?')) return;
    setPersonnel(DEFAULT_PERSONNEL);
    try {
      await api.resetPersonnel();
    } catch (err) {
      console.warn('Falha ao resetar no SQLite:', err);
    }
    showToast('Efetivo padrão de Ijuí restaurado no SQLite.');
  };

  const handleApplyVacationRange = async (militarId: string, startDay: number, endDay: number, code: string) => {
    const next = { ...schedule };
    for (let d = startDay; d <= endDay; d++) {
      if (!next[d]) next[d] = {};
      next[d][militarId] = code;
    }
    setSchedule(next);

    try {
      await api.bulkUpdateSchedule(config.year, config.month, next);
    } catch (err) {
      console.warn('Falha ao salvar férias no SQLite:', err);
    }

    const m = personnel.find(p => p.id === militarId);
    showToast(`${code} aplicado para ${m?.warName} do dia ${startDay} ao dia ${endDay}.`);
  };

  // Permuta Handlers
  const handleApplySwap = async (militarAId: string, dayA: number, militarBId: string, dayB: number) => {
    const next = { ...schedule };
    const shiftA = schedule[dayA]?.[militarAId] || '';
    const shiftB = schedule[dayB]?.[militarBId] || '';

    if (!next[dayA]) next[dayA] = {};
    if (!next[dayB]) next[dayB] = {};

    next[dayA][militarAId] = '';
    next[dayA][militarBId] = shiftA || 'J';

    next[dayB][militarBId] = '';
    next[dayB][militarAId] = shiftB || 'J';

    setSchedule(next);

    try {
      await api.createPermuta({
        militarAId,
        dayA,
        militarBId,
        dayB,
        month: config.month,
        year: config.year
      });
    } catch (err) {
      console.warn('Falha ao registrar permuta no SQLite:', err);
    }

    const mA = personnel.find(p => p.id === militarAId);
    const mB = personnel.find(p => p.id === militarBId);
    showToast(`Permuta entre ${mA?.warName} (Dia ${dayA}) e ${mB?.warName} (Dia ${dayB}) gravada no SQLite!`);
  };

  // Exports
  const handleExportPDF = () => {
    exportScheduleToPDF(personnel, schedule, config);
    showToast('PDF Oficial gerado com sucesso!');
  };

  const handleExportExcel = () => {
    exportScheduleToExcel(personnel, schedule, config);
    showToast('Planilha Excel exportada com sucesso!');
  };

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans ${darkMode ? '' : 'light'}`}>
      
      <Header
        config={config}
        onChangeMonth={handleChangeMonth}
        onOpenAutoSchedule={() => setIsAutoScheduleOpen(true)}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        totalPersonnel={totalPersonnel}
        totalAvailableHours={totalAvailableHours}
        totalRequiredHours={totalRequiredHours}
        totalOvertimeHours={totalOvertimeHours}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        dbStatus={dbStatus}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl p-1 shadow-md">
            <button
              onClick={() => setCurrentTab('ESCALA')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                currentTab === 'ESCALA'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Escala Mensal</span>
            </button>

            <button
              onClick={() => setCurrentTab('EFETIVO')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                currentTab === 'EFETIVO'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Efetivo & Férias</span>
            </button>

            <button
              onClick={() => setCurrentTab('PERMUTAS')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                currentTab === 'PERMUTAS'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>Permutas (Trocas)</span>
            </button>

            <button
              onClick={() => setCurrentTab('DASHBOARD')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                currentTab === 'DASHBOARD'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard & HE</span>
            </button>
          </div>

          {currentTab === 'ESCALA' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearOperationalShifts}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-red-400 bg-slate-900 border border-slate-800 hover:border-red-500/40 rounded-xl transition"
                title="Limpar apenas os serviços operacionais"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar Jornadas</span>
              </button>
            </div>
          )}
        </div>

        {currentTab === 'ESCALA' && (
          <RosterGrid
            personnel={personnel}
            schedule={schedule}
            config={config}
            stats={stats}
            onUpdateCell={handleUpdateCell}
            onChangeDailyRequired={handleChangeDailyRequired}
            onUpdateMilitar={handleUpdateMilitar}
          />
        )}

        {currentTab === 'EFETIVO' && (
          <PersonnelManager
            personnel={personnel}
            onAddMilitar={handleAddMilitar}
            onUpdateMilitar={handleUpdateMilitar}
            onRemoveMilitar={handleRemoveMilitar}
            onReorderPersonnel={handleReorderPersonnel}
            onMoveMilitarToPosition={handleMoveMilitarToPosition}
            onResetDefaultPersonnel={handleResetDefaultPersonnel}
            onApplyVacationRange={handleApplyVacationRange}
            onImportPersonnel={handleImportPersonnel}
            numDaysInMonth={config.numDays}
          />
        )}

        {currentTab === 'PERMUTAS' && (
          <PermutaManager
            personnel={personnel}
            schedule={schedule}
            config={config}
            onApplySwap={handleApplySwap}
          />
        )}

        {currentTab === 'DASHBOARD' && (
          <DashboardView
            personnel={personnel}
            stats={stats}
            config={config}
            schedule={schedule}
          />
        )}

      </main>

      {isAutoScheduleOpen && (
        <AutoScheduleModal
          config={config}
          personnel={personnel}
          onGenerate={handleRunAutoScheduler}
          onClose={() => setIsAutoScheduleOpen(false)}
        />
      )}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900/95 border border-emerald-500/50 text-white px-5 py-3 rounded-2xl shadow-2xl shadow-emerald-950/50 animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        Corpo de Bombeiros Militar do Estado do Rio Grande do Sul • 1º Pelotão de Bombeiro Militar (Ijuí/RS)
      </footer>

    </div>
  );
}

export default App;
