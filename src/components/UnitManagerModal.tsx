import React, { useState } from 'react';
import { 
  Building2, 
  X, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  MapPin, 
  Shield, 
  AlertTriangle,
  ArrowRight,
  Flame
} from 'lucide-react';
import type { Unit } from '../types';

interface UnitManagerModalProps {
  units: Unit[];
  activeUnitId: string;
  onSelectUnit: (unitId: string) => void;
  onCreateUnit: (newUnit: { name: string; code: string; city: string }) => Promise<void>;
  onUpdateUnit: (updatedUnit: Unit) => Promise<void>;
  onDeleteUnit: (unitId: string) => Promise<void>;
  onClose: () => void;
}

export const UnitManagerModal: React.FC<UnitManagerModalProps> = ({
  units,
  activeUnitId,
  onSelectUnit,
  onCreateUnit,
  onUpdateUnit,
  onDeleteUnit,
  onClose
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'CREATE' | 'EDIT'>('LIST');
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCity, setFormCity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const openCreateForm = () => {
    setFormName('');
    setFormCode('');
    setFormCity('');
    setErrorMessage(null);
    setViewMode('CREATE');
  };

  const openEditForm = (unit: Unit) => {
    setEditingUnit(unit);
    setFormName(unit.name);
    setFormCode(unit.code);
    setFormCity(unit.city);
    setErrorMessage(null);
    setViewMode('EDIT');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formName.trim() || !formCode.trim() || !formCity.trim()) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (viewMode === 'CREATE') {
        await onCreateUnit({
          name: formName.trim(),
          code: formCode.trim(),
          city: formCity.trim()
        });
      } else if (viewMode === 'EDIT' && editingUnit) {
        await onUpdateUnit({
          ...editingUnit,
          name: formName.trim(),
          code: formCode.trim(),
          city: formCity.trim()
        });
      }
      setViewMode('LIST');
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar unidade.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUnit) return;
    try {
      setIsSubmitting(true);
      await onDeleteUnit(deletingUnit.id);
      setDeletingUnit(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao excluir unidade.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-red-950/80 via-slate-900 to-slate-900 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/30 border border-red-500/40 flex items-center justify-center text-red-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Gestão de Unidades CBMRS</span>
                <span className="text-[10px] bg-red-600/30 text-red-400 border border-red-500/40 px-2 py-0.5 rounded-full uppercase">
                  {units.length} Unidades
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Gerencie os pelotões e postos de bombeiros militares cadastrados no sistema
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {viewMode === 'LIST' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Unidades Militares Cadastradas
                </span>
                <button
                  onClick={openCreateForm}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-red-600/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nova Unidade</span>
                </button>
              </div>

              <div className="grid gap-3">
                {units.map(unit => {
                  const isActive = unit.id === activeUnitId;
                  return (
                    <div
                      key={unit.id}
                      className={`group p-4 rounded-2xl border transition flex items-center justify-between gap-4 ${
                        isActive
                          ? 'bg-slate-800/90 border-red-500/60 shadow-lg shadow-red-950/20'
                          : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-red-600 text-white shadow-md shadow-red-600/40'
                            : 'bg-slate-700/60 text-slate-300 group-hover:text-white'
                        }`}>
                          <Flame className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-white truncate">
                              {unit.name}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-amber-400">
                              {unit.code}
                            </span>
                            {isActive && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                <span>ATIVA</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            <span>{unit.city}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isActive && (
                          <button
                            onClick={() => {
                              onSelectUnit(unit.id);
                              onClose();
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition"
                            title="Alternar para esta unidade"
                          >
                            <span>Selecionar</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => openEditForm(unit)}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition"
                          title="Editar Unidade"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {units.length > 1 && (
                          <button
                            onClick={() => setDeletingUnit(unit)}
                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition"
                            title="Excluir Unidade"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(viewMode === 'CREATE' || viewMode === 'EDIT') && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-red-400" />
                  <span>{viewMode === 'CREATE' ? 'Cadastrar Nova Unidade' : `Editar: ${editingUnit?.code}`}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setViewMode('LIST')}
                  className="text-xs text-slate-400 hover:text-white underline"
                >
                  Voltar para lista
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Nome Oficial da Unidade *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 2º Pelotão de Bombeiro Militar"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Nome que constará no cabeçalho das escalas oficiais e relatórios.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Sigla / Código Curto *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 2º PelBM"
                      value={formCode}
                      onChange={e => setFormCode(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Cidade / Sede (com UF) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Panambi/RS"
                      value={formCity}
                      onChange={e => setFormCity(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setViewMode('LIST')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-red-600/30 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{viewMode === 'CREATE' ? 'Criar Unidade' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Delete Confirmation Dialog */}
          {deletingUnit && (
            <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="w-full max-w-md bg-slate-900 border border-rose-500/50 rounded-2xl p-5 space-y-4 shadow-2xl">
                <div className="flex items-center gap-3 text-rose-400">
                  <AlertTriangle className="w-6 h-6" />
                  <h4 className="font-extrabold text-sm text-white">
                    Confirmar Exclusão de Unidade
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Tem certeza que deseja excluir a unidade <strong>{deletingUnit.name} ({deletingUnit.city})</strong>?
                </p>
                <p className="text-[11px] text-rose-400 bg-rose-950/40 border border-rose-800/40 p-2.5 rounded-xl">
                  ⚠️ Esta ação removerá permanentemente o efetivo cadastrado e todas as escalas desta unidade!
                </p>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeletingUnit(null)}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteConfirm}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-rose-600/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Definitivamente</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Cada unidade possui efetivo, escalas e estatísticas 100% isolados.</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold transition"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
