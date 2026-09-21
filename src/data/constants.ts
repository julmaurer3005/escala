import type { Militar, ShiftDefinition } from '../types';

export const SHIFTS: ShiftDefinition[] = [
  // Operacional
  { code: 'J', label: 'Jornada Operacional 24h', hours: 24, category: 'OPERACIONAL', bgColor: 'bg-red-600/25', textColor: 'text-red-400', borderColor: 'border-red-500/40' },
  { code: '1', label: '1º Turno (02h às 08h)', hours: 6, category: 'OPERACIONAL', bgColor: 'bg-orange-500/20', textColor: 'text-orange-400', borderColor: 'border-orange-500/30' },
  { code: '2', label: '2º Turno (08h às 14h)', hours: 6, category: 'OPERACIONAL', bgColor: 'bg-orange-500/20', textColor: 'text-orange-400', borderColor: 'border-orange-500/30' },
  { code: '3', label: '3º Turno (14h às 20h)', hours: 6, category: 'OPERACIONAL', bgColor: 'bg-orange-500/20', textColor: 'text-orange-400', borderColor: 'border-orange-500/30' },
  { code: '4', label: '4º Turno (20h às 02h)', hours: 6, category: 'OPERACIONAL', bgColor: 'bg-orange-500/20', textColor: 'text-orange-400', borderColor: 'border-orange-500/30' },
  { code: '41', label: 'Turno 12h (20h às 08h)', hours: 12, category: 'OPERACIONAL', bgColor: 'bg-amber-500/20', textColor: 'text-amber-400', borderColor: 'border-amber-500/30' },
  { code: '23', label: 'Turno 12h (08h às 20h)', hours: 12, category: 'OPERACIONAL', bgColor: 'bg-amber-500/20', textColor: 'text-amber-400', borderColor: 'border-amber-500/30' },
  { code: '34', label: 'Turno 12h (14h às 02h)', hours: 12, category: 'OPERACIONAL', bgColor: 'bg-amber-500/20', textColor: 'text-amber-400', borderColor: 'border-amber-500/30' },
  { code: '123', label: 'Turno 18h (02h às 20h)', hours: 18, category: 'OPERACIONAL', bgColor: 'bg-indigo-500/20', textColor: 'text-indigo-400', borderColor: 'border-indigo-500/30' },
  { code: '234', label: 'Turno 18h (08h às 02h)', hours: 18, category: 'OPERACIONAL', bgColor: 'bg-indigo-500/20', textColor: 'text-indigo-400', borderColor: 'border-indigo-500/30' },
  { code: '341', label: 'Turno 18h (14h às 08h)', hours: 18, category: 'OPERACIONAL', bgColor: 'bg-indigo-500/20', textColor: 'text-indigo-400', borderColor: 'border-indigo-500/30' },

  // Expedientes e Ordens de Serviço
  { code: 'EXP6', label: 'Expediente Administrativo 6h', hours: 6, category: 'EXPEDIENTE', bgColor: 'bg-blue-600/25', textColor: 'text-blue-400', borderColor: 'border-blue-500/40' },
  { code: 'EXP12', label: 'Expediente Administrativo 12h', hours: 12, category: 'EXPEDIENTE', bgColor: 'bg-blue-600/25', textColor: 'text-blue-400', borderColor: 'border-blue-500/40' },
  { code: 'OS12', label: 'Ordem de Serviço 12h', hours: 12, category: 'EXPEDIENTE', bgColor: 'bg-sky-500/20', textColor: 'text-sky-400', borderColor: 'border-sky-500/30' },
  { code: 'OS6', label: 'Ordem de Serviço 6h', hours: 6, category: 'EXPEDIENTE', bgColor: 'bg-sky-500/20', textColor: 'text-sky-400', borderColor: 'border-sky-500/30' },

  // Afastamentos e Folgas
  { code: 'FER', label: 'Férias Regulamentares', hours: 0, category: 'AFASTAMENTO', bgColor: 'bg-yellow-500/30', textColor: 'text-yellow-300', borderColor: 'border-yellow-500/50' },
  { code: 'RSP', label: 'Recompensa Serviços Prestados', hours: 0, category: 'AFASTAMENTO', bgColor: 'bg-emerald-500/30', textColor: 'text-emerald-300', borderColor: 'border-emerald-500/50' },
  { code: 'LTS', label: 'Licença Tratamento de Saúde', hours: 0, category: 'AFASTAMENTO', bgColor: 'bg-rose-500/25', textColor: 'text-rose-400', borderColor: 'border-rose-500/40' },
  { code: 'LFC', label: 'Licença Família', hours: 0, category: 'AFASTAMENTO', bgColor: 'bg-pink-500/25', textColor: 'text-pink-400', borderColor: 'border-pink-500/40' },
  { code: 'PRE', label: 'Licença Prêmio', hours: 0, category: 'AFASTAMENTO', bgColor: 'bg-purple-500/25', textColor: 'text-purple-400', borderColor: 'border-purple-500/40' },
  { code: 'FC', label: 'Folga Compensatória', hours: 0, category: 'AFASTAMENTO', bgColor: 'bg-teal-500/25', textColor: 'text-teal-400', borderColor: 'border-teal-500/40' },

  // Cursos CBMRS
  { code: 'C1', label: 'Etapa de Curso 6h', hours: 6, category: 'CURSO', bgColor: 'bg-violet-500/25', textColor: 'text-violet-400', borderColor: 'border-violet-500/40' },
  { code: 'C2', label: 'Etapa de Curso 12h', hours: 12, category: 'CURSO', bgColor: 'bg-violet-500/25', textColor: 'text-violet-400', borderColor: 'border-violet-500/40' },
  { code: 'C3', label: 'Etapa de Curso 18h', hours: 18, category: 'CURSO', bgColor: 'bg-violet-500/25', textColor: 'text-violet-400', borderColor: 'border-violet-500/40' },
  { code: 'C4', label: 'Etapa de Curso 24h', hours: 24, category: 'CURSO', bgColor: 'bg-violet-500/25', textColor: 'text-violet-400', borderColor: 'border-violet-500/40' },
];

export const SHIFT_MAP: Record<string, ShiftDefinition> = SHIFTS.reduce((acc, shift) => {
  acc[shift.code] = shift;
  return acc;
}, {} as Record<string, ShiftDefinition>);

export const getShiftHours = (code: string | undefined): number => {
  if (!code) return 0;
  const upper = code.trim().toUpperCase();
  if (SHIFT_MAP[upper]) return SHIFT_MAP[upper].hours;

  const match = upper.match(/^(EXP|OS|IN|FC|CM)(\d+)$/);
  if (match) return parseInt(match[2], 10);

  return 0;
};

export const DEFAULT_PERSONNEL: Militar[] = [
  { id: '1', rank: '1º Tenente', warName: 'AGNOLETTO', isCommander: true, role: 'Comandante', isActive: true },
  { id: '2', rank: 'SARGENTO', warName: 'VICTOR', isCommander: false, role: 'Sargenteante', isActive: true },
  { id: '3', rank: 'SARGENTO', warName: 'KOMMERS', isCommander: false, role: 'Chefe de Socorro', isActive: true },
  { id: '4', rank: 'SARGENTO', warName: 'JARBAS', isCommander: false, role: 'Chefe de Socorro', isActive: true },
  { id: '5', rank: 'SARGENTO', warName: 'KRAEMER', isCommander: false, role: 'Chefe de Socorro', isActive: true },
  { id: '6', rank: 'SARGENTO', warName: 'WIELENS', isCommander: false, role: 'Chefe de Socorro', isActive: true },
  { id: '7', rank: 'SARGENTO', warName: 'DOBLER', isCommander: false, role: 'Chefe de Socorro', isActive: true },
  { id: '8', rank: 'SARGENTO', warName: 'WEBER', isCommander: false, role: 'Chefe de Socorro', isActive: true },
  { id: '9', rank: 'SARGENTO', warName: 'GUILHERMANO', isCommander: false, role: 'Chefe de Socorro', isActive: true },
  { id: '10', rank: 'SARGENTO', warName: 'TIAGO', isCommander: false, role: 'Chefe de Socorro', isActive: true },
  { id: '11', rank: 'SARGENTO', warName: 'LEONARDO', isCommander: false, role: 'Chefe de Socorro', isActive: true },
  { id: '12', rank: 'SARGENTO', warName: 'FUNCK', isCommander: false, role: 'Chefe de Socorro', isActive: true },
  { id: '13', rank: 'SARGENTO', warName: 'DA SILVA', isCommander: false, role: 'Chefe de Socorro', isActive: true },
  { id: '14', rank: 'SOLDADO', warName: 'FERNANDES', isCommander: false, role: 'Motorista', isActive: true },
  { id: '15', rank: 'SOLDADO', warName: 'DIEISON', isCommander: false, role: 'Socorrista', isActive: true },
  { id: '16', rank: 'SOLDADO', warName: 'VEIGA', isCommander: false, role: 'Motorista', isActive: true },
  { id: '17', rank: 'SOLDADO', warName: 'MENDONÇA', isCommander: false, role: 'Socorrista', isActive: true },
  { id: '18', rank: 'SOLDADO', warName: 'OLIVEIRA', isCommander: false, role: 'Socorrista', isActive: true },
  { id: '19', rank: 'SOLDADO', warName: 'ERIK', isCommander: false, role: 'Motorista', isActive: true },
  { id: '20', rank: 'SOLDADO', warName: 'GOI', isCommander: false, role: 'Socorrista', isActive: true },
  { id: '21', rank: 'SOLDADO', warName: 'CZYZEWSKI', isCommander: false, role: 'Motorista', isActive: true }
];

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const DAYS_OF_WEEK_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export interface RoleOption {
  value: string;
  label: string;
  shortLabel: string;
  badgeClass: string;
}

export const ROLE_OPTIONS: RoleOption[] = [
  { value: 'Chefe de Socorro', label: 'Chefe de Socorro', shortLabel: 'CHEFE', badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { value: 'Motorista', label: 'Motorista (COV)', shortLabel: 'COV', badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
  { value: 'Socorrista', label: 'Socorrista', shortLabel: 'SOCORRISTA', badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { value: 'Prevenção', label: 'Prevenção / Vistoria', shortLabel: 'PREVENÇÃO', badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  { value: 'Sargenteante', label: 'Sargenteante', shortLabel: 'SARG', badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
  { value: 'Comandante', label: 'Comandante', shortLabel: 'CMTE', badgeClass: 'bg-yellow-500/25 text-yellow-300 border-yellow-500/50' },
  { value: 'Operacional', label: 'Operacional Geral', shortLabel: 'OPERACIONAL', badgeClass: 'bg-slate-800 text-slate-300 border-slate-700' }
];

export const getRoleOption = (roleName?: string): RoleOption => {
  if (!roleName) return ROLE_OPTIONS[2]; // Default Socorrista
  const found = ROLE_OPTIONS.find(r => r.value.toLowerCase() === roleName.toLowerCase() || r.shortLabel.toLowerCase() === roleName.toLowerCase());
  if (found) return found;

  const lower = roleName.toLowerCase();
  if (lower.includes('chefe')) return ROLE_OPTIONS[0];
  if (lower.includes('motorista') || lower.includes('cov') || lower.includes('condutor')) return ROLE_OPTIONS[1];
  if (lower.includes('socorrista')) return ROLE_OPTIONS[2];
  if (lower.includes('preven')) return ROLE_OPTIONS[3];
  if (lower.includes('sarg')) return ROLE_OPTIONS[4];
  if (lower.includes('cmte') || lower.includes('comandante')) return ROLE_OPTIONS[5];

  return ROLE_OPTIONS[6];
};
