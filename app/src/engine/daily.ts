import { factPair, localDay, pairKey } from './stats';

/**
 * The day task and the streak (stage 6c, agreed 21.11.2026).
 * - One simple task a day, the three kinds in turn; done → a gift box the pet opens: 5 coins.
 * - The streak counts days with the day task done. It is soft: a missed day is a pause, it never resets.
 */
export type DayTaskKind = 'solve' | 'water' | 'level';

export interface DayTaskDef {
  kind: DayTaskKind;
  title: string;
  need: number;
}

export const DAY_TASKS: Record<DayTaskKind, DayTaskDef> = {
  solve: { kind: 'solve', title: 'Розвʼяжи 10 прикладів', need: 10 },
  water: { kind: 'water', title: 'Полий 3 квітки', need: 3 },
  level: { kind: 'level', title: 'Пройди рівень', need: 1 },
};

const ORDER: DayTaskKind[] = ['solve', 'water', 'level'];

export const DAY_GIFT_COINS = 5;

/** Days since 1.1.2026 by the local calendar (no DST trouble: noon to noon). */
function dayNumber(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2026, 0, 1)) / 86400000);
}

export function dayTaskFor(day: string): DayTaskDef {
  const n = dayNumber(day);
  return DAY_TASKS[ORDER[((n % ORDER.length) + ORDER.length) % ORDER.length]];
}

export interface DayAttempt {
  at: string;
  op: string;
  a: number;
  b: number;
  correct: boolean;
  tryNo: number;
  stage?: string;
}

/**
 * How far the day task is: solve — tasks finished right today (a task ends with a right check);
 * water — different × / : facts right at the first try today; level — levels passed today.
 */
export function dayTaskProgress(def: DayTaskDef, attempts: DayAttempt[], levelsPassedToday: number, now: Date): number {
  const today = localDay(now);
  const mine = attempts.filter((x) => localDay(new Date(x.at)) === today && x.stage !== 'setup');
  let have = 0;
  if (def.kind === 'solve') have = mine.filter((x) => x.correct).length;
  else if (def.kind === 'water') {
    const facts = new Set<string>();
    for (const x of mine) {
      const pair = x.correct && x.tryNo === 1 ? factPair(x) : null;
      if (pair) facts.add(pairKey(...pair));
    }
    have = facts.size;
  } else have = levelsPassedToday;
  return Math.min(have, def.need);
}

export type WeekDayState = 'done' | 'pause' | 'today' | 'ahead';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

/**
 * The streak card: days with the day task done, and this week Mon–Sun.
 * `since` — the first day of the profile: days before it are not a pause, just empty.
 */
export function streak(doneDays: readonly string[], now: Date, since?: string): { days: number; week: { label: string; day: string; state: WeekDayState }[] } {
  const done = new Set(doneDays);
  const today = localDay(now);
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const week = WEEKDAYS.map((label, i) => {
    const day = localDay(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
    const state: WeekDayState = done.has(day) ? 'done' : day === today ? 'today' : day < today && (!since || day >= since) ? 'pause' : 'ahead';
    return { label, day, state };
  });
  return { days: done.size, week };
}
