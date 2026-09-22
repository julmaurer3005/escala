import type { Militar, MonthConfig, ScheduleStats } from '../types';
import { getShiftHours } from '../data/constants';

export interface SchedulerResult {
  schedule: Record<number, Record<string, string>>;
  stats: ScheduleStats[];
  warnings: string[];
  totalSlotsAssigned: number;
}

export function calculateBaseHours(numDays: number): number {
  if (numDays === 31) return 177;
  if (numDays === 30) return 171;
  if (numDays === 29) return 165;
  if (numDays === 28) return 160;
  return Math.round((numDays / 30) * 171);
}

export function computeScheduleStats(
  personnel: Militar[],
  schedule: Record<number, Record<string, string>>,
  config: MonthConfig
): ScheduleStats[] {
  const { numDays, baseHours, year, month } = config;

  return personnel.map(militar => {
    let workedHours = 0;
    let diasAfastamento = 0;
    let saturdays = 0;
    let sundays = 0;
    const weekendBlocks = new Set<string>();

    for (let day = 1; day <= numDays; day++) {
      const code = schedule[day]?.[militar.id] || '';
      const hours = getShiftHours(code);

      if (hours > 0) {
        workedHours += hours;

        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay(); // 0 = Dom, 6 = Sáb
        if (dayOfWeek === 6) {
          saturdays++;
          weekendBlocks.add(date.toDateString());
        } else if (dayOfWeek === 0) {
          sundays++;
          const satDate = new Date(date);
          satDate.setDate(date.getDate() - 1);
          weekendBlocks.add(satDate.toDateString());
        }
      } else if (code === 'FER' || code === 'RSP' || code === 'LTS' || code === 'LFC' || code === 'PRE') {
        diasAfastamento++;
      }
    }

    let targetHours = militar.isCommander ? 0 : baseHours;
    if (diasAfastamento > 0 && !militar.isCommander) {
      const deduction = Math.round((baseHours / numDays) * diasAfastamento);
      targetHours = Math.max(0, baseHours - deduction);
    }

    const balanceHours = workedHours - targetHours;
    const isDeficit = !militar.isCommander && balanceHours < 0;

    return {
      militarId: militar.id,
      warName: militar.warName,
      rank: militar.rank,
      targetHours,
      workedHours,
      balanceHours,
      isDeficit,
      saturdays,
      sundays,
      distinctWeekends: weekendBlocks.size
    };
  });
}

export function generateAutomatedSchedule(
  personnel: Militar[],
  currentSchedule: Record<number, Record<string, string>>,
  config: MonthConfig
): SchedulerResult {
  const { year, month, numDays, baseHours, maxOvertimeSgt, maxOvertimeSd, maxWeekends, dailyRequiredStaff, lastMonthDay31Workers } = config;

  const warnings: string[] = [];
  let totalSlotsAssigned = 0;

  const newSchedule: Record<number, Record<string, string>> = {};
  for (let d = 1; d <= numDays; d++) {
    newSchedule[d] = { ...(currentSchedule[d] || {}) };
  }

  const operationalPersonnel = personnel.filter(p => !p.isCommander && p.isActive !== false);

  let sgtCount = 0;
  let sdCount = 0;
  const rankOrderMap: Record<string, number> = {};

  operationalPersonnel.forEach(p => {
    if (p.rank.includes('SARGENTO') || p.rank.includes('Tenente')) {
      rankOrderMap[p.id] = sgtCount++;
    } else {
      rankOrderMap[p.id] = sdCount++;
    }
  });

  const hoursTracker: Record<string, number> = {};
  const targetTracker: Record<string, number> = {};
  const weekendTracker: Record<string, Set<string>> = {};

  operationalPersonnel.forEach(p => {
    hoursTracker[p.id] = 0;
    targetTracker[p.id] = baseHours;
    weekendTracker[p.id] = new Set<string>();

    let diasAfastamento = 0;
    for (let d = 1; d <= numDays; d++) {
      const code = newSchedule[d]?.[p.id] || '';
      const h = getShiftHours(code);
      if (h > 0) {
        hoursTracker[p.id] += h;

        const date = new Date(year, month - 1, d);
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          const satDate = new Date(date);
          if (dayOfWeek === 0) satDate.setDate(date.getDate() - 1);
          weekendTracker[p.id].add(satDate.toDateString());
        }
      } else if (code === 'FER' || code === 'RSP' || code === 'LTS' || code === 'LFC' || code === 'PRE') {
        diasAfastamento++;
      }
    }

    if (diasAfastamento > 0) {
      const deduction = Math.round((baseHours / numDays) * diasAfastamento);
      targetTracker[p.id] = Math.max(0, baseHours - deduction);
    }
  });

  const lastMonthSet = new Set(lastMonthDay31Workers || []);

  // FASE 1: PREENCHIMENTO DA GUARNIÇÃO BASE
  for (let d = 1; d <= numDays; d++) {
    const requiredToday = dailyRequiredStaff[d] || 4;

    const alreadyWorkingToday = operationalPersonnel.filter(p => {
      const code = newSchedule[d]?.[p.id];
      return getShiftHours(code) > 0;
    });

    const slotsToFill = requiredToday - alreadyWorkingToday.length;
    if (slotsToFill <= 0) continue;

    const date = new Date(year, month - 1, d);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    let weekendId = '';
    if (isWeekend) {
      const satDate = new Date(date);
      if (dayOfWeek === 0) satDate.setDate(date.getDate() - 1);
      weekendId = satDate.toDateString();
    }

    const sgtCandidates: Array<{ p: Militar; score: number; balance: number; exceededHE: boolean }> = [];
    const sdCandidates: Array<{ p: Militar; score: number; balance: number; exceededHE: boolean }> = [];

    operationalPersonnel.forEach(p => {
      const currentCell = newSchedule[d]?.[p.id] || '';
      if (currentCell !== '' && currentCell !== '-') return;

      let workedYesterday = false;
      if (d === 1) {
        workedYesterday = lastMonthSet.has(p.warName);
      } else {
        const yCode = newSchedule[d - 1]?.[p.id] || '';
        if (getShiftHours(yCode) > 0) workedYesterday = true;
      }
      if (workedYesterday) return;

      if (isWeekend) {
        const weekends = weekendTracker[p.id];
        if (!weekends.has(weekendId) && weekends.size >= maxWeekends) return;
      }

      const isSgt = p.rank.includes('SARGENTO');
      const maxHE = isSgt ? maxOvertimeSgt : maxOvertimeSd;
      const targetH = targetTracker[p.id];
      const futureHours = hoursTracker[p.id] + 24;
      const futureOvertime = Math.max(0, futureHours - targetH);
      const exceededHE = futureOvertime > maxHE;

      const balance = hoursTracker[p.id] - targetH;
      const rotationMatch = (rankOrderMap[p.id] % 4 === (d - 1) % 4) ? 0 : 1;

      const candidate = {
        p,
        score: rotationMatch,
        balance,
        exceededHE
      };

      if (isSgt) {
        sgtCandidates.push(candidate);
      } else {
        sdCandidates.push(candidate);
      }
    });

    const sortFn = (a: typeof sgtCandidates[0], b: typeof sgtCandidates[0]) => {
      if (a.exceededHE !== b.exceededHE) return a.exceededHE ? 1 : -1;
      if (a.balance !== b.balance) return a.balance - b.balance;
      if (a.score !== b.score) return a.score - b.score;
      return hoursTracker[a.p.id] - hoursTracker[b.p.id];
    };

    sgtCandidates.sort(sortFn);
    sdCandidates.sort(sortFn);

    const currentSgts = alreadyWorkingToday.filter(p => p.rank.includes('SARGENTO')).length;
    let maxSgtsToAdd = Math.max(0, 2 - currentSgts);

    const assignedToday: Militar[] = [];

    while (maxSgtsToAdd > 0 && sgtCandidates.length > 0 && assignedToday.length < slotsToFill) {
      const c = sgtCandidates.shift()!;
      assignedToday.push(c.p);
      maxSgtsToAdd--;
    }

    while (assignedToday.length < slotsToFill && sdCandidates.length > 0) {
      const c = sdCandidates.shift()!;
      assignedToday.push(c.p);
    }

    while (assignedToday.length < slotsToFill && sgtCandidates.length > 0) {
      const c = sgtCandidates.shift()!;
      assignedToday.push(c.p);
    }
    while (assignedToday.length < slotsToFill && sdCandidates.length > 0) {
      const c = sdCandidates.shift()!;
      assignedToday.push(c.p);
    }

    assignedToday.forEach(p => {
      if (!newSchedule[d]) newSchedule[d] = {};
      newSchedule[d][p.id] = 'J';
      hoursTracker[p.id] += 24;
      totalSlotsAssigned++;

      if (isWeekend && weekendId) {
        weekendTracker[p.id].add(weekendId);
      }
    });
  }

  // FASE 2: ZERAMENTO DE FALTAS
  operationalPersonnel.forEach(p => {
    if (hoursTracker[p.id] < targetTracker[p.id]) {
      const possibleDays: Array<{ day: number; isWeekend: boolean; weekendId: string; staffCount: number }> = [];

      for (let d = 1; d <= numDays; d++) {
        const code = newSchedule[d]?.[p.id] || '';
        if (code !== '' && code !== '-') continue;

        let workedPrev = false;
        if (d === 1) {
          workedPrev = lastMonthSet.has(p.warName);
        } else {
          const yCode = newSchedule[d - 1]?.[p.id] || '';
          if (getShiftHours(yCode) > 0) workedPrev = true;
        }
        if (workedPrev) continue;

        let workedNext = false;
        if (d < numDays) {
          const nCode = newSchedule[d + 1]?.[p.id] || '';
          if (getShiftHours(nCode) > 0) workedNext = true;
        }
        if (workedNext) continue;

        const date = new Date(year, month - 1, d);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        let weekendId = '';
        if (isWeekend) {
          const satDate = new Date(date);
          if (dayOfWeek === 0) satDate.setDate(date.getDate() - 1);
          weekendId = satDate.toDateString();

          const weekends = weekendTracker[p.id];
          if (!weekends.has(weekendId) && weekends.size >= maxWeekends) continue;
        }

        let totalDayHours = 0;
        operationalPersonnel.forEach(other => {
          const c = newSchedule[d]?.[other.id];
          totalDayHours += getShiftHours(c);
        });
        const staffCount = totalDayHours / 24;

        possibleDays.push({ day: d, isWeekend, weekendId, staffCount });
      }


      possibleDays.sort((a, b) => {
        if (a.isWeekend !== b.isWeekend) return a.isWeekend ? 1 : -1;
        return a.staffCount - b.staffCount;
      });

      for (const cand of possibleDays) {
        if (hoursTracker[p.id] >= targetTracker[p.id]) break;

        const d = cand.day;
        if (d > 1 && getShiftHours(newSchedule[d - 1]?.[p.id]) > 0) continue;
        if (d < numDays && getShiftHours(newSchedule[d + 1]?.[p.id]) > 0) continue;

        if (!newSchedule[d]) newSchedule[d] = {};
        newSchedule[d][p.id] = 'J';
        hoursTracker[p.id] += 24;
        totalSlotsAssigned++;

        if (cand.isWeekend && cand.weekendId) {
          weekendTracker[p.id].add(cand.weekendId);
        }
      }
    }
  });

  const finalStats = computeScheduleStats(personnel, newSchedule, config);

  return {
    schedule: newSchedule,
    stats: finalStats,
    warnings,
    totalSlotsAssigned
  };
}
