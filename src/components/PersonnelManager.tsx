import React, { useState, useRef } from 'react';
import { 
  Users, 
  Plus, 
  Check, 
  Trash2, 
  Shield, 
  Palmtree, 
  UserCheck,
  Edit,
  ArrowUp,
  ArrowDown,
  Search,
  Download,
  Upload,
  RotateCcw,
  UserX,
  Award,
  IdCard,
  Briefcase,
  GripVertical,
  ArrowUpDown,
  Move,
  Info,
  Layers,
  Database
} from 'lucide-react';
import type { Militar, RankType, MilitarStatus } from '../types';

interface PersonnelManagerProps {
  personnel: Militar[];
  onAddMilitar: (militar: Militar, targetIndex?: number) => void;
  onUpdateMilitar: (militar: Militar, targetIndex?: number) => void;
  onRemoveMilitar: (id: string) => void;
  onReorderPersonnel: (startIndex: number, endIndex: number) => void;
  onMoveMilitarToPosition: (militarId: string, targetIndex: number) => void;
  onResetDefaultPersonnel: () => void;
  onApplyVacationRange: (militarId: string, startDay: number, endDay: number, code: string) => void;
  onImportPersonnel?: (imported: Militar[]) => void;
  numDaysInMonth: number;
}

export const PersonnelManager: React.FC<PersonnelManagerProps> = ({
  personnel,
  onAddMilitar,
  onUpdateMilitar,
  onRemoveMilitar,
  onReorderPersonnel,
  onMoveMilitarToPosition,
  onResetDefaultPersonnel,
  onApplyVacationRange,
  onImportPersonnel,
  numDaysInMonth
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Vacation Range Tool State
  const [selectedMilitarId, setSelectedMilitarId] = useState<string>(personnel[1]?.id || '');
  const [startDay, setStartDay] = useState<number>(1);
  const [endDay, setEndDay] = useState<number>(10);
  const [vacationCode, setVacationCode] = useState<string>('FER');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRank, setFilterRank] = useState<string>('TODOS');
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMilitar, setEditingMilitar] = useState<Militar | null>(null);

  // Delete Confirmation Modal State
  const [deletingMilitar, setDeletingMilitar] = useState<Militar | null>(null);

  // Quick Move / Reorder Modal State
  const [movingMilitar, setMovingMilitar] = useState<Militar | null>(null);
  const [quickTargetAfterId, setQuickTargetAfterId] = useState<string>('');
  const [quickDirectPosition, setQuickDirectPosition] = useState<number>(1);

  // Form Fields
  const [formRank, setFormRank] = useState<RankType>('SOLDADO');
  const [formWarName, setFormWarName] = useState('');
  const [formMatricula, setFormMatricula] = useState('');
  const [formRole, setFormRole] = useState<string>('Socorrista');
  const [formIsCommander, setFormIsCommander] = useState(false);
  const [formStatus, setFormStatus] = useState<MilitarStatus>('ATIVO');

  // Position / Seniority placement in Add/Edit form
  const [placementMode, setPlacementMode] = useState<'END' | 'AFTER' | 'START' | 'EXACT'>('AFTER');
  const [targetAfterMilitarId, setTargetAfterMilitarId] = useState<string>('');
  const [exactPosition, setExactPosition] = useState<number>(personnel.length + 1);

  // Drag and Drop State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const openAddModal = () => {
    setEditingMilitar(null);
    setFormRank('SOLDADO');
    setFormWarName('');
    setFormMatricula('');
    setFormRole('Socorrista');
    setFormIsCommander(false);
    setFormStatus('ATIVO');
    
    // Default to inserting after the last soldier or last militar
    const lastMilitar = personnel[personnel.length - 1];
    setTargetAfterMilitarId(lastMilitar ? lastMilitar.id : '');
    setPlacementMode('AFTER');
    setExactPosition(personnel.length + 1);
    setIsModalOpen(true);
  };

  const openEditModal = (militar: Militar) => {
    setEditingMilitar(militar);
    setFormRank(militar.rank);
    setFormWarName(militar.warName);
    setFormMatricula(militar.matricula || '');
    setFormRole(militar.role || 'Operacional');
    setFormIsCommander(!!militar.isCommander);
    setFormStatus(militar.status || (militar.isActive === false ? 'AFASTADO' : 'ATIVO'));

    const currentIdx = personnel.findIndex(p => p.id === militar.id);
    const prevMilitar = currentIdx > 0 ? personnel[currentIdx - 1] : null;
    
    setTargetAfterMilitarId(prevMilitar ? prevMilitar.id : '');
    setPlacementMode(prevMilitar ? 'AFTER' : 'START');
    setExactPosition(currentIdx + 1);
    setIsModalOpen(true);
  };

  const openQuickMoveModal = (militar: Militar) => {
    setMovingMilitar(militar);
    const currentIdx = personnel.findIndex(p => p.id === militar.id);
    const prevMilitar = currentIdx > 0 ? personnel[currentIdx - 1] : null;
    setQuickTargetAfterId(prevMilitar ? prevMilitar.id : (personnel[0]?.id || ''));
    setQuickDirectPosition(currentIdx + 1);
  };

  const calculateTargetIndex = (): number => {
    if (placementMode === 'START') {
      return 0;
    }
    if (placementMode === 'END') {
      return personnel.length;
    }
    if (placementMode === 'EXACT') {
      return Math.max(0, Math.min(personnel.length, exactPosition - 1));
    }
    if (placementMode === 'AFTER') {
      const idx = personnel.findIndex(p => p.id === targetAfterMilitarId);
      if (idx !== -1) {
        return idx + 1;
      }
      return personnel.length;
    }
    return personnel.length;
  };

  const handleSaveMilitar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formWarName.trim()) return;

    const targetIdx = calculateTargetIndex();

    if (editingMilitar) {
      // Edit existing
      const updated: Militar = {
        ...editingMilitar,
        rank: formRank,
        warName: formWarName.trim().toUpperCase(),
        matricula: formMatricula.trim(),
        role: formRole,
        isCommander: formIsCommander || formRank === '1º Tenente',
        status: formStatus,
        isActive: formStatus === 'ATIVO'
      };
      onUpdateMilitar(updated, targetIdx);
    } else {
      // Add new
      const newM: Militar = {
        id: String(Date.now()),
        rank: formRank,
        warName: formWarName.trim().toUpperCase(),
        matricula: formMatricula.trim(),
        role: formRole,
        isCommander: formIsCommander || formRank === '1º Tenente',
        status: formStatus,
        isActive: formStatus === 'ATIVO'
      };
      onAddMilitar(newM, targetIdx);
    }

    setIsModalOpen(false);
  };

  const handleExecuteQuickMove = (mode: 'AFTER' | 'EXACT' | 'TOP' | 'BOTTOM') => {
    if (!movingMilitar) return;

    let targetIdx = 0;
    if (mode === 'TOP') {
      targetIdx = 0;
    } else if (mode === 'BOTTOM') {
      targetIdx = personnel.length - 1;
    } else if (mode === 'EXACT') {
      targetIdx = Math.max(0, Math.min(personnel.length - 1, quickDirectPosition - 1));
    } else if (mode === 'AFTER') {
      const afterIdx = personnel.findIndex(p => p.id === quickTargetAfterId);
      if (afterIdx !== -1) {
        const currentIdx = personnel.findIndex(p => p.id === movingMilitar.id);
        if (currentIdx < afterIdx) {
          targetIdx = afterIdx;
        } else {
          targetIdx = afterIdx + 1;
        }
      }
    }

    onMoveMilitarToPosition(movingMilitar.id, targetIdx);
    setMovingMilitar(null);
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      onReorderPersonnel(index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < personnel.length - 1) {
      onReorderPersonnel(index, index + 1);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    // leave
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!isNaN(sourceIndex) && sourceIndex !== dropIndex) {
      onReorderPersonnel(sourceIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleApplyVacation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMilitarId) return;
    onApplyVacationRange(selectedMilitarId, startDay, endDay, vacationCode);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(personnel, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Efetivo_CBMRS_Ijui_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0 && onImportPersonnel) {
          onImportPersonnel(parsed);
        } else {
          alert('Arquivo JSON inválido. Certifique-se de selecionar um backup exportado do efetivo.');
        }
      } catch (err) {
        alert('Erro ao ler arquivo JSON de backup.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Filtered List
  const filteredPersonnel = personnel.filter(p => {
    const matchSearch = p.warName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (p.matricula && p.matricula.includes(searchTerm)) ||
                        p.rank.toLowerCase().includes(searchTerm.toLowerCase());

    const matchRank = filterRank === 'TODOS' ? true :
                      filterRank === 'OFICIAL' ? p.rank.includes('Tenente') :
                      filterRank === 'SARGENTO' ? p.rank.includes('SARGENTO') :
                      p.rank.includes('SOLDADO') || p.rank.includes('CABO');

    const status = p.status || (p.isActive === false ? 'AFASTADO' : 'ATIVO');
    const matchStatus = filterStatus === 'TODOS' ? true : status === filterStatus;

    return matchSearch && matchRank && matchStatus;
  });

  const totalSgts = personnel.filter(p => p.rank.includes('SARGENTO')).length;
  const totalSds = personnel.filter(p => p.rank.includes('SOLDADO') || p.rank.includes('CABO')).length;
  const totalActive = personnel.filter(p => p.isActive !== false && !p.isCommander).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Hidden File Input for Importing JSON Backup */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".json"
        className="hidden"
      />

      {/* Top Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">Efetivo Total</span>
            <span className="text-lg font-black text-white">{personnel.length} Militares</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">Efetivo Operacional Ativo</span>
            <span className="text-lg font-black text-emerald-400">{totalActive} Militares</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">Sargentos (Graduados)</span>
            <span className="text-lg font-black text-indigo-300">{totalSgts} SGTs</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">Soldados & Cabos</span>
            <span className="text-lg font-black text-amber-300">{totalSds} Praças</span>
          </div>
        </div>
      </div>

      {/* Seniority Hierarchy Explanatory Note */}
      <div className="bg-slate-900/90 border border-blue-900/40 rounded-2xl p-4 shadow-lg flex items-start gap-3.5">
        <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div className="text-xs space-y-1">
          <h4 className="font-black text-blue-200">Hierarquia e Ordem de Antiguidade do Pelotão</h4>
          <p className="text-slate-300 leading-relaxed">
            A posição de cada militar na tabela abaixo define a sua <strong>antiguidade na escala</strong>. Ao cadastrar um novo militar (ex: <em>Soldado Juliano</em>), você pode escolher inseri-lo <strong>logo após outro militar (ex: atrás do Sd Veiga)</strong>, arrastar a linha pelo ícone <strong className="text-white">⠿</strong>, ou usar o botão <strong className="text-white">Mover</strong>.
          </p>
        </div>
      </div>

      {/* Vacation / Leave Quick Tool */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
            <Palmtree className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">Lançamento Rápido de Férias & Afastamentos</h3>
            <p className="text-[11px] text-slate-400">Aplica o código no período selecionado e ajusta a meta do militar na escala</p>
          </div>
        </div>

        <form onSubmit={handleApplyVacation} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">Militar</label>
            <select
              value={selectedMilitarId}
              onChange={e => setSelectedMilitarId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:ring-2 focus:ring-red-500 outline-none"
            >
              {personnel.map(p => (
                <option key={p.id} value={p.id}>{p.rank} {p.warName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">Tipo de Afastamento</label>
            <select
              value={vacationCode}
              onChange={e => setVacationCode(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-yellow-400 focus:ring-2 focus:ring-red-500 outline-none"
            >
              <option value="FER">FER - Férias</option>
              <option value="RSP">RSP - Recompensa de Serviço</option>
              <option value="LTS">LTS - Tratamento de Saúde</option>
              <option value="LFC">LFC - Licença Familiar</option>
              <option value="PRE">PRE - Licença Prêmio</option>
              <option value="FC">FC - Folga Compensatória</option>
            </select>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Dia Início</label>
              <input
                type="number"
                min="1"
                max={numDaysInMonth}
                value={startDay}
                onChange={e => setStartDay(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white text-center"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Dia Fim</label>
              <input
                type="number"
                min="1"
                max={numDaysInMonth}
                value={endDay}
                onChange={e => setEndDay(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white text-center"
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Aplicar na Escala
            </button>
          </div>
        </form>
      </div>

      {/* Main Squad Management Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-4 p-6">
        
        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-red-500" />
              Quadro de Efetivo do 1º Pelotão (Ijuí/RS)
            </h2>
            <p className="text-xs text-slate-400">
              Controle de inclusão, transferência, promoções e hierarquia de antiguidade na escala
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
              title="Importar Efetivo a partir de arquivo JSON"
            >
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              <span>Importar Backup</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
              title="Baixar Backup do Efetivo em JSON"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar Backup</span>
            </button>

            <button
              onClick={onResetDefaultPersonnel}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
              title="Restaurar lista original de 21 militares de Ijuí"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Padrão</span>
            </button>

            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-black transition flex items-center gap-2 shadow-lg shadow-red-600/30 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Militar</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por nome, posto ou matrícula..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-red-500 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-white placeholder-slate-500 outline-none transition"
            />
          </div>

          <div>
            <select
              value={filterRank}
              onChange={e => setFilterRank(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-red-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 outline-none"
            >
              <option value="TODOS">Todos os Postos / Graduações</option>
              <option value="OFICIAL">Oficiais (Tenentes)</option>
              <option value="SARGENTO">Sargentos</option>
              <option value="PRACA">Soldados & Cabos</option>
            </select>
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-red-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 outline-none"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="ATIVO">Ativo na Escala</option>
              <option value="AFASTADO">Afastado / Licença</option>
              <option value="TRANSFERIDO">Transferido</option>
              <option value="RESERVA">Reserva Remunerada (RR)</option>
            </select>
          </div>
        </div>

        {/* Personnel Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-800">
              <tr>
                <th className="px-3 py-3 text-center w-12">Arrastar</th>
                <th className="px-3 py-3 text-center w-28">Antiguidade</th>
                <th className="px-4 py-3">Posto / Graduação</th>
                <th className="px-4 py-3">Nome de Guerra</th>
                <th className="px-4 py-3">Função Principal</th>
                <th className="px-4 py-3">Status Funcional</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
              {filteredPersonnel.map((p) => {
                const globalIndex = personnel.findIndex(item => item.id === p.id);
                const status = p.status || (p.isActive === false ? 'AFASTADO' : 'ATIVO');
                const isDragging = draggedIndex === globalIndex;
                const isDragOver = dragOverIndex === globalIndex;

                return (
                  <tr 
                    key={p.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, globalIndex)}
                    onDragOver={(e) => handleDragOver(e, globalIndex)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, globalIndex)}
                    onDragEnd={handleDragEnd}
                    className={`transition ${
                      isDragging ? 'opacity-30 bg-red-950/20' : 
                      isDragOver ? 'bg-red-600/20 border-t-2 border-red-500' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    
                    {/* Drag handle */}
                    <td className="px-3 py-2.5 text-center cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-300">
                      <div className="flex items-center justify-center" title="Arrastar para reordenar antiguidade">
                        <GripVertical className="w-4 h-4" />
                      </div>
                    </td>

                    {/* Antiguidade / Order buttons */}
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1 font-mono font-bold text-slate-400">
                        <button
                          onClick={() => handleMoveUp(globalIndex)}
                          disabled={globalIndex === 0}
                          className="p-1 text-slate-500 hover:text-white hover:bg-slate-800 rounded disabled:opacity-20 transition"
                          title="Subir na escala (mais antigo)"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        
                        <span 
                          onClick={() => openQuickMoveModal(p)}
                          className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-white cursor-pointer text-xs border border-slate-700 transition"
                          title="Clique para reposicionar militar na antiguidade"
                        >
                          #{globalIndex + 1}
                        </span>

                        <button
                          onClick={() => handleMoveDown(globalIndex)}
                          disabled={globalIndex === personnel.length - 1}
                          className="p-1 text-slate-500 hover:text-white hover:bg-slate-800 rounded disabled:opacity-20 transition"
                          title="Descer na escala (mais moderno)"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Rank */}
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        p.isCommander 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                          : p.rank.includes('SARGENTO') 
                            ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' 
                            : 'bg-slate-800 text-slate-300'
                      }`}>
                        {p.rank}
                      </span>
                    </td>

                    {/* War Name */}
                    <td className="px-4 py-2.5 font-black text-white text-sm">
                      <div className="flex items-center gap-2">
                        <span>{p.warName}</span>
                        {p.matricula && (
                          <span className="text-[10px] text-slate-500 font-mono font-normal">
                            Id: {p.matricula}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-2.5 text-slate-300 font-medium">
                      {p.role || 'Operacional'}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-2.5">
                      {p.isCommander ? (
                        <span className="text-amber-400 font-bold text-[11px] flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5" />
                          Comandante da Unidade
                        </span>
                      ) : status === 'ATIVO' ? (
                        <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-md w-max">
                          <UserCheck className="w-3.5 h-3.5" />
                          Ativo na Escala
                        </span>
                      ) : status === 'TRANSFERIDO' ? (
                        <span className="text-indigo-400 font-bold text-[11px] flex items-center gap-1 bg-indigo-950/40 border border-indigo-500/30 px-2 py-0.5 rounded-md w-max">
                          Transferido OBM
                        </span>
                      ) : status === 'RESERVA' ? (
                        <span className="text-purple-400 font-bold text-[11px] flex items-center gap-1 bg-purple-950/40 border border-purple-500/30 px-2 py-0.5 rounded-md w-max">
                          Reserva (RR)
                        </span>
                      ) : (
                        <span className="text-rose-400 font-bold text-[11px] flex items-center gap-1 bg-rose-950/40 border border-rose-500/30 px-2 py-0.5 rounded-md w-max">
                          <UserX className="w-3.5 h-3.5" />
                          Afastado / Licença
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openQuickMoveModal(p)}
                          className="px-2 py-1 text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition text-[11px] font-bold flex items-center gap-1 border border-slate-700/60"
                          title="Mover posição / antiguidade de forma direta"
                        >
                          <ArrowUpDown className="w-3 h-3 text-amber-400" />
                          <span>Mover</span>
                        </button>

                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                          title="Editar Militar (Posto, Nome, Posição, Função)"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {!p.isCommander && (
                          <button
                            onClick={() => setDeletingMilitar(p)}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                            title="Remover Militar do Pelotão"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Database & Persistence Info Banner */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span><strong>Banco de Dados Local Ativo:</strong> As alterações são gravadas instantaneamente no seu navegador (LocalStorage) e preservadas permanentemente.</span>
          </div>
          <span className="text-slate-400 font-mono">1º PelBM Ijuí/RS</span>
        </div>

      </div>

      {/* Add / Edit Military Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <form 
            onSubmit={handleSaveMilitar}
            className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <IdCard className="w-5 h-5 text-red-500" />
                {editingMilitar ? `Editar Militar: ${editingMilitar.rank} ${editingMilitar.warName}` : 'Cadastrar Novo Militar no Pelotão'}
              </h3>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Posto / Graduação</label>
                <select
                  value={formRank}
                  onChange={e => setFormRank(e.target.value as RankType)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:ring-2 focus:ring-red-500 outline-none"
                >
                  <option value="1º Tenente">1º Tenente</option>
                  <option value="1º Sargento">1º Sargento</option>
                  <option value="2º Sargento">2º Sargento</option>
                  <option value="3º Sargento">3º Sargento</option>
                  <option value="SARGENTO">Sargento</option>
                  <option value="CABO">Cabo</option>
                  <option value="SOLDADO">Soldado</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Nome de Guerra</label>
                <input
                  type="text"
                  placeholder="Ex: JULIANO"
                  value={formWarName}
                  onChange={e => setFormWarName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white uppercase focus:ring-2 focus:ring-red-500 outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Matrícula / ID Funcional</label>
                <input
                  type="text"
                  placeholder="Ex: 4321980"
                  value={formMatricula}
                  onChange={e => setFormMatricula(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Função no Quartel</label>
                <select
                  value={formRole}
                  onChange={e => setFormRole(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                >
                  <option value="Chefe de Socorro">Chefe de Socorro (Comandante Guarnição)</option>
                  <option value="Motorista">Motorista / Condutor (ABT/Resgate - COV)</option>
                  <option value="Socorrista">Socorrista / Linha de Ataque</option>
                  <option value="Prevenção">Prevenção / Vistoria de Incêndio</option>
                  <option value="Sargenteante">Sargenteante</option>
                  <option value="Comandante">Comandante do Pelotão</option>
                  <option value="Operacional">Operacional Geral</option>
                </select>
              </div>
            </div>

            {/* Antiguidade / Placement Section (Key Feature) */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Posição de Antiguidade na Escala
                </label>
                {editingMilitar && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    Posição atual: #{personnel.findIndex(p => p.id === editingMilitar.id) + 1}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300">
                  <input
                    type="radio"
                    name="placementMode"
                    value="AFTER"
                    checked={placementMode === 'AFTER'}
                    onChange={() => setPlacementMode('AFTER')}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span>Posicionar <strong>logo após outro militar</strong> (antiguidade relativa)</span>
                </label>

                {placementMode === 'AFTER' && (
                  <div className="pl-6 pt-1">
                    <select
                      value={targetAfterMilitarId}
                      onChange={e => setTargetAfterMilitarId(e.target.value)}
                      className="w-full bg-slate-800 border border-amber-500/50 rounded-xl px-3 py-2 text-xs font-bold text-white focus:ring-2 focus:ring-red-500 outline-none"
                    >
                      {personnel
                        .filter(p => !editingMilitar || p.id !== editingMilitar.id)
                        .map((p, idx) => (
                          <option key={p.id} value={p.id}>
                            #{idx + 1} - {p.rank} {p.warName}
                          </option>
                        ))}
                    </select>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      O militar será posicionado diretamente atrás do selecionado.
                    </span>
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300">
                  <input
                    type="radio"
                    name="placementMode"
                    value="END"
                    checked={placementMode === 'END'}
                    onChange={() => setPlacementMode('END')}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span>No <strong>final da lista</strong> (mais moderno do pelotão)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300">
                  <input
                    type="radio"
                    name="placementMode"
                    value="START"
                    checked={placementMode === 'START'}
                    onChange={() => setPlacementMode('START')}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span>No <strong>início da lista</strong> (mais antigo)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300">
                  <input
                    type="radio"
                    name="placementMode"
                    value="EXACT"
                    checked={placementMode === 'EXACT'}
                    onChange={() => setPlacementMode('EXACT')}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span>Na <strong>posição numérica exata</strong></span>
                </label>

                {placementMode === 'EXACT' && (
                  <div className="pl-6 pt-1 flex items-center gap-2">
                    <span className="text-xs text-slate-400">Posição:</span>
                    <input
                      type="number"
                      min="1"
                      max={personnel.length + 1}
                      value={exactPosition}
                      onChange={e => setExactPosition(parseInt(e.target.value) || 1)}
                      className="w-20 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white text-center"
                    />
                    <span className="text-[11px] text-slate-500">de 1 a {personnel.length + (editingMilitar ? 0 : 1)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Status & Commander Check */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Status Funcional</label>
                <select
                  value={formStatus}
                  onChange={e => setFormStatus(e.target.value as MilitarStatus)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                >
                  <option value="ATIVO">Ativo na Escala</option>
                  <option value="AFASTADO">Afastado (LTS / Licença)</option>
                  <option value="TRANSFERIDO">Transferido para outra OBM</option>
                  <option value="RESERVA">Reserva Remunerada (RR)</option>
                </select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                  <input
                    type="checkbox"
                    checked={formIsCommander}
                    onChange={e => setFormIsCommander(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 bg-slate-800 border-slate-700 focus:ring-red-500"
                  />
                  <span>Comandante (Fora da escala)</span>
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-black transition shadow-lg shadow-red-600/30"
              >
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal (Replaces Native window.confirm) */}
      {deletingMilitar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div 
            className="bg-slate-900 border border-red-500/40 rounded-3xl p-6 w-full max-w-md shadow-2xl shadow-red-950/50 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-500 border border-red-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Excluir Militar do Efetivo</h3>
                <p className="text-xs text-red-400 font-semibold">Confirmação de exclusão</p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-2">
              <p className="text-xs text-slate-300">
                Tem certeza que deseja remover este militar do efetivo do 1º PelBM?
              </p>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs text-amber-400 font-bold block">{deletingMilitar.rank}</span>
                  <span className="text-sm font-black text-white">{deletingMilitar.warName}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-mono block">{deletingMilitar.matricula ? `ID: ${deletingMilitar.matricula}` : 'Sem Matrícula'}</span>
                  <span className="text-[11px] text-slate-300 font-medium">{deletingMilitar.role || 'Operacional'}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                ⚠️ Esta ação removerá o militar da listagem permanente e limpará todos os seus lançamentos da escala mensal.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingMilitar(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onRemoveMilitar(deletingMilitar.id);
                  setDeletingMilitar(null);
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-black transition shadow-lg shadow-red-600/30 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Sim, Excluir Militar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Reposition / Move Modal */}
      {movingMilitar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div 
            className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Move className="w-5 h-5 text-amber-400" />
                  Mover Antiguidade
                </h3>
                <p className="text-xs text-slate-400">
                  Militar: <strong className="text-white">{movingMilitar.rank} {movingMilitar.warName}</strong> (Posição atual: #{personnel.findIndex(p => p.id === movingMilitar.id) + 1})
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Option 1: Place After Specific Military */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <label className="text-xs font-black text-amber-300 block">
                  1. Posicionar logo após outro militar:
                </label>
                <div className="flex gap-2">
                  <select
                    value={quickTargetAfterId}
                    onChange={e => setQuickTargetAfterId(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    {personnel
                      .filter(p => p.id !== movingMilitar.id)
                      .map((p) => {
                        const pIdx = personnel.findIndex(x => x.id === p.id);
                        return (
                          <option key={p.id} value={p.id}>
                            #{pIdx + 1} - {p.rank} {p.warName}
                          </option>
                        );
                      })}
                  </select>
                  <button
                    onClick={() => handleExecuteQuickMove('AFTER')}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition"
                  >
                    Posicionar
                  </button>
                </div>
              </div>

              {/* Option 2: Direct Number Position */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <label className="text-xs font-black text-slate-300 block">
                  2. Mover para número de posição exato:
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max={personnel.length}
                    value={quickDirectPosition}
                    onChange={e => setQuickDirectPosition(parseInt(e.target.value) || 1)}
                    className="w-24 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white text-center"
                  />
                  <button
                    onClick={() => handleExecuteQuickMove('EXACT')}
                    className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition border border-slate-700"
                  >
                    Mover para #{quickDirectPosition}
                  </button>
                </div>
              </div>

              {/* Option 3: Quick Top / Bottom buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleExecuteQuickMove('TOP')}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-700"
                >
                  <ArrowUp className="w-4 h-4 text-blue-400" />
                  Mover para o Topo (#1)
                </button>
                <button
                  onClick={() => handleExecuteQuickMove('BOTTOM')}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-700"
                >
                  <ArrowDown className="w-4 h-4 text-amber-400" />
                  Mover para o Fim (#{personnel.length})
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setMovingMilitar(null)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
