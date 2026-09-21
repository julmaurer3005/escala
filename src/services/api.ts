import type { Militar, MonthConfig } from '../types';

const API_BASE = '/api';

export interface HealthResponse {
  status: 'online' | 'offline';
  database?: string;
  databaseFile?: string;
  stats?: {
    totalPersonnel: number;
    totalScheduledShifts: number;
  };
  error?: string;
}

export async function checkServerHealth(): Promise<HealthResponse> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    return { status: 'offline', error: err.message };
  }
}

export async function fetchPersonnel(): Promise<Militar[]> {
  const res = await fetch(`${API_BASE}/personnel`);
  if (!res.ok) throw new Error('Falha ao carregar efetivo do SQLite');
  return res.json();
}

export async function addMilitar(militar: Militar, targetIndex?: number): Promise<{ success: boolean; id: string }> {
  const res = await fetch(`${API_BASE}/personnel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...militar, targetIndex })
  });
  if (!res.ok) throw new Error('Falha ao cadastrar militar no SQLite');
  return res.json();
}

export async function updateMilitar(militar: Militar, targetIndex?: number): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/personnel/${militar.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...militar, targetIndex })
  });
  if (!res.ok) throw new Error('Falha ao atualizar militar no SQLite');
  return res.json();
}

export async function removeMilitar(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/personnel/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Falha ao remover militar do SQLite');
  return res.json();
}

export async function reorderPersonnel(startIndex: number, endIndex: number): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/personnel/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ startIndex, endIndex })
  });
  if (!res.ok) throw new Error('Falha ao reordenar antiguidade no SQLite');
  return res.json();
}

export async function resetPersonnel(): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/personnel/reset`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Falha ao restaurar efetivo padrão no SQLite');
  return res.json();
}

export async function fetchScheduleAndConfig(year: number, month: number): Promise<{ config: MonthConfig; schedule: Record<number, Record<string, string>> }> {
  const res = await fetch(`${API_BASE}/schedule/${year}/${month}`);
  if (!res.ok) throw new Error('Falha ao carregar escala do SQLite');
  return res.json();
}

export async function updateScheduleCell(year: number, month: number, day: number, militarId: string, code: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/schedule/${year}/${month}/cell`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ day, militarId, code })
  });
  if (!res.ok) throw new Error('Falha ao atualizar célula no SQLite');
  return res.json();
}

export async function bulkUpdateSchedule(year: number, month: number, schedule: Record<number, Record<string, string>>): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/schedule/${year}/${month}/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schedule })
  });
  if (!res.ok) throw new Error('Falha ao gravar escala completa no SQLite');
  return res.json();
}

export async function updateMonthConfig(year: number, month: number, config: MonthConfig): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/config/${year}/${month}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  if (!res.ok) throw new Error('Falha ao atualizar configurações no SQLite');
  return res.json();
}

export async function createPermuta(payload: { militarAId: string; dayA: number; militarBId: string; dayB: number; month: number; year: number }): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/permutas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Falha ao registrar permuta no SQLite');
  return res.json();
}
