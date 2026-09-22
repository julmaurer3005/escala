import { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  Users, 
  ArrowLeftRight, 
  BarChart3, 
  RotateCcw,
  CheckCircle2
} from 'lucide-react';

import type { Militar, MonthConfig, ScheduleStats, Unit } from './types';
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
import { UnitManagerModal } from './components/UnitManagerModal';
import { Analytics } from '@vercel/analytics/react';

type TabType = 'ESCALA' | 'EFETIVO' | 'PERMUTAS' | 'DASHBOARD';

const DEFAULT_UNITS: Unit[] = [
  { id: 'pelbm_ijui', name: '1º Pelotão de Bombeiro Militar', code: '1º PelBM', city: 'Ijuí/RS' },
  { id: 'pelbm_panambi', name: '2º Pelotão de Bombeiro Militar', code: '2º PelBM', city: 'Panambi/RS' },
  { id: 'pelbm_cruz_alta', name: 'Pelotão de Bombeiro Militar', code: 'PelBM Cruz Alta', city: 'Cruz Alta/RS' }
];

export function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [currentTab, setCurrentTab] = useState<TabType>('ESCALA');
  const [isAutoScheduleOpen, setIsAutoScheduleOpen] = useState(false);
  const [isUnitManagerOpen, setIsUnitManagerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<'online' | 'offline'>('online');

  // Multi-unit state
  const [units, setUnits] = useState<Unit[]>(() => {
    const saved = localStorage.getItem('cbmrs_units');
    return saved ? JSON.parse(saved) : DEFAULT_UNITS;
  });

  const [currentUnitId, setCurrentUnitId] = useState<string>(() => {
    return localStorage.getItem('cbmrs_active_unit_id') || 'pelbm_ijui';
  });

  const activeUnit: Unit = units.find(u => u.id === currentUnitId) || units[0] || DEFAULT_UNITS[0];

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
      unitId: currentUnitId,
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
    const saved = localStorage.getItem(`cbmrs_personnel_${currentUnitId}`);
    if (saved) return JSON.parse(saved);
    return currentUnitId === 'pelbm_ijui' ? DEFAULT_PERSONNEL : [];
  });

  const [schedule, setSchedule] = useState<Record<number, Record<string, string>>>(() => {
    const saved = localStorage.getItem(`cbmrs_schedule_${currentUnitId}_10_2026`);
    if (saved) return JSON.parse(saved);

    const initial: Record<number, Record<string, string>> = {};
    for (let d = 1; d <= 31; d++) initial[d] = {};

    if (currentUnitId === 'pelbm_ijui') {
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
    }

    return initial;
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load Units & Unit Data from SQLite on startup
  const loadUnitsFromBackend = useCallback(async () => {
    try {
      const fetchedUnits = await api.fetchUnits();
      if (fetchedUnits && fetchedUnits.length > 0) {
        setUnits(fetchedUnits);
        localStorage.setItem('cbmrs_units', JSON.stringify(fetchedUnits));
      }
    } catch (err) {
      console.warn('Backend units offline, using local cache:', err);
    }
  }, []);

  const loadDataFromBackend = useCallback(async (targetYear: number, targetMonth: number, targetUnitId: string) => {
    try {
      const health = await api.checkServerHealth();
      setDbStatus(health.status);

      if (health.status === 'online') {
        const [fetchedPersonnel, scheduleData] = await Promise.all([
          api.fetchPersonnel(targetUnitId),
          api.fetchScheduleAndConfig(targetYear, targetMonth, targetUnitId)
        ]);

        if (fetchedPersonnel) {
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
    loadUnitsFromBackend();
  }, [loadUnitsFromBackend]);

  useEffect(() => {
    loadDataFromBackend(config.year, config.month, currentUnitId);
  }, [loadDataFromBackend, config.year, config.month, currentUnitId]);

  // Sync with LocalStorage as offline cache
  useEffect(() => {
    localStorage.setItem('cbmrs_units', JSON.stringify(units));
  }, [units]);

  useEffect(() => {
    localStorage.setItem('cbmrs_active_unit_id', currentUnitId);
  }, [currentUnitId]);

  useEffect(() => {
    localStorage.setItem(`cbmrs_personnel_${currentUnitId}`, JSON.stringify(personnel));
  }, [personnel, currentUnitId]);

  useEffect(() => {
    localStorage.setItem(`cbmrs_schedule_${currentUnitId}_${config.month}_${config.year}`, JSON.stringify(schedule));
  }, [schedule, config, currentUnitId]);

  const stats: ScheduleStats[] = computeScheduleStats(personnel, schedule, config);

  const totalPersonnel = personnel.length;
  const operationalStats = stats.filter(s => {
    const m = personnel.find(p => p.id === s.militarId);
    return m && !m.isCommander;
  });
  const totalAvailableHours = operationalStats.reduce((acc, s) => acc + s.workedHours, 0);
  const totalRequiredHours = Object.values(config.dailyRequiredStaff).reduce((acc, n) => acc + (n * 24), 0);
  const totalOvertimeHours = operationalStats.reduce((acc, s) => acc + Math.max(0, s.balanceHours), 0);

  // Unit handlers
  const handleSelectUnit = async (unitId: string) => {
    if (unitId === currentUnitId) return;
    setCurrentUnitId(unitId);

    const targetUnit = units.find(u => u.id === unitId);
    
    // Load cache first if available
    const savedPersonnel = localStorage.getItem(`cbmrs_personnel_${unitId}`);
    if (savedPersonnel) {
      setPersonnel(JSON.parse(savedPersonnel));
    } else {
      setPersonnel([]);
    }

    const savedSchedule = localStorage.getItem(`cbmrs_schedule_${unitId}_${config.month}_${config.year}`);
    if (savedSchedule) {
      setSchedule(JSON.parse(savedSchedule));
    } else {
      const empty: Record<number, Record<string, string>> = {};
      for (let d = 1; d <= config.numDays; d++) empty[d] = {};
      setSchedule(empty);
    }

    try {
      await loadDataFromBackend(config.year, config.month, unitId);
    } catch {
      // Handled in loadDataFromBackend
    }

    showToast(`Unidade alternada para ${targetUnit?.name || unitId} (${targetUnit?.city || ''})`);
  };

  const handleCreateUnit = async (newUnitData: { name: string; code: string; city: string }) => {
    const res = await api.createUnit(newUnitData);
    if (res.success && res.unit) {
      setUnits(prev => [...prev, res.unit]);
      await handleSelectUnit(res.unit.id);
      showToast(`🎉 Nova unidade ${res.unit.code} cadastrada com sucesso!`);
    }
  };

  const handleUpdateUnit = async (updatedUnit: Unit) => {
    await api.updateUnit(updatedUnit);
    setUnits(prev => prev.map(u => u.id === updatedUnit.id ? updatedUnit : u));
    showToast(`Unidade ${updatedUnit.code} atualizada com sucesso.`);
  };

  const handleDeleteUnit = async (unitId: string) => {
    await api.deleteUnit(unitId);
    const remainingUnits = units.filter(u => u.id !== unitId);
    setUnits(remainingUnits);

    if (currentUnitId === unitId && remainingUnits.length > 0) {
      await handleSelectUnit(remainingUnits[0].id);
    }

    showToast('Unidade excluída com sucesso.');
  };

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
      unitId: currentUnitId,
      year: newYear,
      month: newMonth,
      numDays: newNumDays,
      baseHours: newBaseHours,
      dailyRequiredStaff: newDailyRequired
    };

    setConfig(updatedConfig);

    try {
      const res = await api.fetchScheduleAndConfig(newYear, newMonth, currentUnitId);
      if (res && res.schedule) {
        setSchedule(res.schedule);
        if (res.config) setConfig(res.config);
      }
    } catch {
      const saved = localStorage.getItem(`cbmrs_schedule_${currentUnitId}_${newMonth}_${newYear}`);
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
      await api.updateScheduleCell(config.year, config.month, day, militarId, code, currentUnitId);
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

      api.updateMonthConfig(config.year, config.month, updated, currentUnitId).catch(() => {});
      return updated;
    });
  };

  const handleRunAutoScheduler = async (newConfig: MonthConfig) => {
    const configWithUnit: MonthConfig = { ...newConfig, unitId: currentUnitId };
    setConfig(configWithUnit);
    const result = generateAutomatedSchedule(personnel, schedule, configWithUnit);
    setSchedule(result.schedule);

    try {
      await Promise.all([
        api.bulkUpdateSchedule(configWithUnit.year, configWithUnit.month, result.schedule, currentUnitId),
        api.updateMonthConfig(configWithUnit.year, configWithUnit.month, configWithUnit, currentUnitId)
      ]);
    } catch (err) {
      console.warn('Falha ao sincronizar escala com SQLite:', err);
    }

    showToast(`🎉 Escala de ${MONTH_NAMES[configWithUnit.month - 1]} gerada e salva para ${activeUnit.code}! ${result.totalSlotsAssigned} jornadas alocadas.`);
  };

  const handleClearOperationalShifts = async () => {
    if (!window.confirm(`Deseja limpar todos os serviços operacionais (J) do ${activeUnit.code} mantendo férias e afastamentos?`)) return;

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
      await api.bulkUpdateSchedule(config.year, config.month, cleaned, currentUnitId);
    } catch (err) {
      console.warn('Falha ao salvar limpeza no SQLite:', err);
    }

    showToast(`Serviços operacionais do ${activeUnit.code} limpos com sucesso.`);
  };

  // Personnel Handlers
  const handleAddMilitar = async (newM: Militar, targetIndex?: number) => {
    const militarWithUnit = { ...newM, unitId: currentUnitId };
    setPersonnel(prev => {
      const list = [...prev];
      if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= list.length) {
        list.splice(targetIndex, 0, militarWithUnit);
      } else {
        list.push(militarWithUnit);
      }
      return list;
    });

    try {
      await api.addMilitar(militarWithUnit, targetIndex, currentUnitId);
    } catch (err) {
      console.warn('Falha ao salvar militar no SQLite:', err);
    }

    showToast(`Militar ${militarWithUnit.rank} ${militarWithUnit.warName} cadastrado no ${activeUnit.code}.`);
  };

  const handleUpdateMilitar = async (updatedM: Militar, targetIndex?: number) => {
    const militarWithUnit = { ...updatedM, unitId: currentUnitId };
    setPersonnel(prev => {
      let list = prev.map(p => p.id === updatedM.id ? militarWithUnit : p);
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
      await api.updateMilitar(militarWithUnit, targetIndex);
    } catch (err) {
      console.warn('Falha ao atualizar militar no SQLite:', err);
    }

    showToast(`Militar ${updatedM.warName} atualizado no ${activeUnit.code}.`);
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
      await api.reorderPersonnel(currentIndex, targetIndex, currentUnitId);
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

    showToast(`Militar ${m?.rank || ''} ${m?.warName || ''} excluído do ${activeUnit.code}.`);
  };

  const handleImportPersonnel = (importedList: Militar[]) => {
    if (!Array.isArray(importedList) || importedList.length === 0) {
      showToast('Arquivo de backup inválido ou vazio.');
      return;
    }
    const withUnit = importedList.map(p => ({ ...p, unitId: currentUnitId }));
    setPersonnel(withUnit);
    showToast(`Backup restaurado! ${withUnit.length} militares carregados no ${activeUnit.code}.`);
  };

  const handleReorderPersonnel = async (startIndex: number, endIndex: number) => {
    setPersonnel(prev => {
      const list = [...prev];
      const [moved] = list.splice(startIndex, 1);
      list.splice(endIndex, 0, moved);
      return list;
    });

    try {
      await api.reorderPersonnel(startIndex, endIndex, currentUnitId);
    } catch (err) {
      console.warn('Falha ao reordenar no SQLite:', err);
    }

    showToast(`Ordem de antiguidade do ${activeUnit.code} atualizada.`);
  };

  const handleResetDefaultPersonnel = async () => {
    if (!window.confirm(`Deseja restaurar o efetivo padrão para ${activeUnit.name}?`)) return;
    
    if (currentUnitId === 'pelbm_ijui') {
      setPersonnel(DEFAULT_PERSONNEL);
    } else {
      setPersonnel([]);
    }

    try {
      await api.resetPersonnel(currentUnitId);
    } catch (err) {
      console.warn('Falha ao resetar no SQLite:', err);
    }
    showToast(`Efetivo padrão de ${activeUnit.code} restaurado.`);
  };

  const handleApplyVacationRange = async (militarId: string, startDay: number, endDay: number, code: string) => {
    const next = { ...schedule };
    for (let d = startDay; d <= endDay; d++) {
      if (!next[d]) next[d] = {};
      next[d][militarId] = code;
    }
    setSchedule(next);

    try {
      await api.bulkUpdateSchedule(config.year, config.month, next, currentUnitId);
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
        year: config.year,
        unitId: currentUnitId
      });
    } catch (err) {
      console.warn('Falha ao registrar permuta no SQLite:', err);
    }

    const mA = personnel.find(p => p.id === militarAId);
    const mB = personnel.find(p => p.id === militarBId);
    showToast(`Permuta entre ${mA?.warName} (Dia ${dayA}) e ${mB?.warName} (Dia ${dayB}) gravada no ${activeUnit.code}!`);
  };

  // Exports
  const handleExportPDF = () => {
    exportScheduleToPDF(personnel, schedule, config, activeUnit);
    showToast(`PDF Oficial do ${activeUnit.code} gerado com sucesso!`);
  };

  const handleExportExcel = () => {
    exportScheduleToExcel(personnel, schedule, config, activeUnit);
    showToast(`Planilha Excel do ${activeUnit.code} exportada com sucesso!`);
  };

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans ${darkMode ? '' : 'light'}`}>
      <Analytics />
      
      <Header
        config={config}
        units={units}
        activeUnit={activeUnit}
        onSelectUnit={handleSelectUnit}
        onOpenUnitManager={() => setIsUnitManagerOpen(true)}
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
                <span>Limpar Jornadas ({activeUnit.code})</span>
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

      {isUnitManagerOpen && (
        <UnitManagerModal
          units={units}
          activeUnitId={currentUnitId}
          onSelectUnit={handleSelectUnit}
          onCreateUnit={handleCreateUnit}
          onUpdateUnit={handleUpdateUnit}
          onDeleteUnit={handleDeleteUnit}
          onClose={() => setIsUnitManagerOpen(false)}
        />
      )}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900/95 border border-emerald-500/50 text-white px-5 py-3 rounded-2xl shadow-2xl shadow-emerald-950/50 animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        Corpo de Bombeiros Militar do Estado do Rio Grande do Sul • {activeUnit.name} ({activeUnit.city})
      </footer>

    </div>
  );
}

export default App;

