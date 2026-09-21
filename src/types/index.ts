export type RankType =
  | '1º Tenente'
  | '1º Sargento'
  | '2º Sargento'
  | '3º Sargento'
  | 'SARGENTO'
  | 'CABO'
  | 'SOLDADO'
  | 'REFORÇO';

export type MilitarStatus = 'ATIVO' | 'TRANSFERIDO' | 'RESERVA' | 'AFASTADO';

export interface VacationRange {
  id: string;
  startDate: number;
  endDate: number;
  code: string;
  description?: string;
}

export type MilitarRole =
  | 'Chefe de Socorro'
  | 'Motorista'
  | 'Socorrista'
  | 'Prevenção'
  | 'Sargenteante'
  | 'Operacional'
  | string;

export interface Militar {
  id: string;
  matricula?: string;
  rank: RankType;
  warName: string;
  isCommander?: boolean;
  isActive?: boolean;
  status?: MilitarStatus;
  role?: MilitarRole;
  vacations?: VacationRange[];
}

export type ShiftCategory = 'OPERACIONAL' | 'EXPEDIENTE' | 'AFASTAMENTO' | 'CURSO' | 'COMPLEMENTACAO' | 'OUTROS';

export interface ShiftDefinition {
  code: string;
  label: string;
  hours: number;
  category: ShiftCategory;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

export interface MonthConfig {
  year: number;
  month: number;
  numDays: number;
  baseHours: number;
  maxOvertimeSgt: number;
  maxOvertimeSd: number;
  maxWeekends: number;
  dailyRequiredStaff: { [day: number]: number };
  lastMonthDay31Workers: string[];
}

export interface PermutaRequest {
  id: string;
  militarAId: string;
  dayA: number;
  militarBId: string;
  dayB: number;
  createdAt: string;
  status: 'ANALISE' | 'APROVADA' | 'REJEITADA';
  justification?: string;
}

export interface ScheduleStats {
  militarId: string;
  warName: string;
  rank: RankType;
  targetHours: number;
  workedHours: number;
  balanceHours: number;
  isDeficit: boolean;
  saturdays: number;
  sundays: number;
  distinctWeekends: number;
}
