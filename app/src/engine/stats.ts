import { FACTORS, LATE_LIMIT } from './facts';
import { getLevel, ISLANDS } from './levels';
import type { ErrorKind, IslandId } from './types';

/**
 * Statistics for the parent panel (stage 6a), from stored attempts only.
 * A «first try» is the first check of a task (tryNo 1); choosing the action of a word problem
 * (stage 'setup') counts as its own check.
 */
export interface StatAttempt {
  at: string;
  level: string;
  taskKey: string;
  op: string;
  a: number;
  b: number;
  value: number;
  values?: (number | null)[];
  correct: boolean;
  error: string | null;
  tryNo: number;
  ms: number;
  stage?: string;
}

const DAY = 24 * 60 * 60 * 1000;
/** A task counts at most this long towards the time spent (a tablet left on the table). */
export const MAX_TASK_MS = 3 * 60 * 1000;

/** Local calendar day «YYYY-MM-DD». */
export function localDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const within = (list: StatAttempt[], now: Date, days: number) =>
  list.filter((x) => now.getTime() - new Date(x.at).getTime() < days * DAY);

/** Levels outside the islands: the garden watering and the blitz (× and : facts). */
export const GARDEN_LEVEL = 'garden';
export const BLITZ_LEVEL = 'blitz';

function islandOf(x: Pick<StatAttempt, 'level' | 'op'>): IslandId | null {
  if (x.level === GARDEN_LEVEL || x.level === BLITZ_LEVEL) return x.op === ':' ? 'div' : 'mul';
  try {
    return getLevel(x.level).island;
  } catch {
    return null;
  }
}

export interface TopicStat {
  island: IslandId;
  name: string;
  right: number;
  total: number;
  /** null when nothing was done. */
  pct: number | null;
}

/** Share of first tries that were right, per island, over the last `days`. */
export function topicAccuracy(list: StatAttempt[], now: Date, days = 7): TopicStat[] {
  const firsts = within(list, now, days).filter((x) => x.tryNo === 1);
  return ISLANDS.map(({ id, name }) => {
    const mine = firsts.filter((x) => islandOf(x) === id);
    const right = mine.filter((x) => x.correct).length;
    return { island: id, name, right, total: mine.length, pct: mine.length ? Math.round((right / mine.length) * 100) : null };
  });
}

export interface ErrorStat {
  kind: ErrorKind;
  count: number;
  /** The newest example: «4 : 6 = 24 замість 24 : 6 = 4». */
  example: string;
}

/** What the child wrote, as an example line. */
export function attemptText(x: StatAttempt): string {
  if (x.stage === 'setup') {
    const [p, q] = x.values ?? [];
    return `задача: ${p ?? '?'} і ${q ?? '?'} — не та дія чи порядок, треба ${x.a} ${x.op} ${x.b}`;
  }
  if (x.level === ':3' && x.values?.length === 3) {
    const [p, q, r] = x.values;
    return `${p ?? '?'} : ${q ?? '?'} = ${r ?? '?'}`;
  }
  return `${x.a} ${x.op} ${x.b} = ${x.value}`;
}

function rightText(x: StatAttempt): string {
  const r = x.op === '+' ? x.a + x.b : x.op === '−' ? x.a - x.b : x.op === '×' ? x.a * x.b : x.a / x.b;
  return `${x.a} ${x.op} ${x.b} = ${r}`;
}

/** Typical mistakes (not «other») over the last `days`, most frequent first. */
export function topErrors(list: StatAttempt[], now: Date, days = 30, limit = 4): ErrorStat[] {
  const wrong = within(list, now, days)
    .filter((x) => !x.correct && x.error && x.error !== 'other')
    .sort((x, y) => y.at.localeCompare(x.at));
  const groups = new Map<string, StatAttempt[]>();
  for (const x of wrong) groups.set(x.error!, [...(groups.get(x.error!) ?? []), x]);
  return [...groups.entries()]
    .map(([kind, xs]) => {
      const x = xs[0];
      const example = x.stage === 'setup' ? attemptText(x) : `напр. ${attemptText(x)} замість ${rightText(x)}`;
      return { kind: kind as ErrorKind, count: xs.length, example };
    })
    .sort((p, q) => q.count - p.count)
    .slice(0, limit);
}

export type FactStatus = 'known' | 'learning' | 'wrong' | 'new';

/** The unordered pair of a × or : attempt: 6 × 4 and 24 : 6 and 24 : 4 are one fact. */
export function factPair(x: Pick<StatAttempt, 'op' | 'a' | 'b' | 'stage'>): [number, number] | null {
  if (x.stage === 'setup') return null;
  if (x.op === '×') return x.a <= x.b ? [x.a, x.b] : [x.b, x.a];
  if (x.op === ':' && x.b && Number.isInteger(x.a / x.b)) {
    const q = x.a / x.b;
    return x.b <= q ? [x.b, q] : [q, x.b];
  }
  return null;
}
export const pairKey = (p: number, q: number) => (p <= q ? `${p}×${q}` : `${q}×${p}`);

/** Right first tries in a row on this many different days make a fact known. */
export const KNOWN_DAYS = 3;

export interface FactProgress {
  status: FactStatus;
  /** Different days in the run of right first tries going on now (0 after a mistake), up to 3. */
  days: number;
  /** The day of the last first try. */
  lastDay: string;
}

/**
 * known — right first tries in a row (no mistake between) on 3 different days; a second right
 * answer on the same day neither helps nor hurts. wrong — the last first try wrong;
 * learning — tried, in between; new — never tried (absent from the map).
 */
export function factProgress(list: StatAttempt[]): Map<string, FactProgress> {
  const byFact = new Map<string, StatAttempt[]>();
  for (const x of [...list].sort((p, q) => p.at.localeCompare(q.at))) {
    if (x.tryNo !== 1) continue;
    const pair = factPair(x);
    if (!pair) continue;
    const k = pairKey(...pair);
    byFact.set(k, [...(byFact.get(k) ?? []), x]);
  }
  const out = new Map<string, FactProgress>();
  for (const [k, xs] of byFact) {
    const lastDay = localDay(new Date(xs[xs.length - 1].at));
    let run = xs.length;
    while (run > 0 && xs[run - 1].correct) run--;
    const days = Math.min(KNOWN_DAYS, new Set(xs.slice(run).map((x) => localDay(new Date(x.at)))).size);
    const status: FactStatus = days === 0 ? 'wrong' : days >= KNOWN_DAYS ? 'known' : 'learning';
    out.set(k, { status, days, lastDay });
  }
  return out;
}

export function factStatuses(list: StatAttempt[]): Map<string, FactStatus> {
  return new Map([...factProgress(list)].map(([k, p]) => [k, p.status]));
}

export interface FactCell {
  a: number;
  b: number;
  product: number;
  status: FactStatus;
}

/** Rows ×2 … ×10 by columns 2 … 10 (factors of the worksheets); null where the product is over 35. */
export function factTable(list: StatAttempt[]): { row: number; cells: (FactCell | null)[] }[] {
  const st = factStatuses(list);
  return FACTORS.map((a) => ({
    row: a,
    cells: FACTORS.map((b) => (a * b > LATE_LIMIT ? null : { a, b, product: a * b, status: st.get(pairKey(a, b)) ?? 'new' })),
  }));
}

const WEEKDAYS = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

/** Minutes of practice on each of the last 7 days, oldest first, today last. */
export function minutesByDay(list: StatAttempt[], now: Date, days = 7): { day: string; label: string; minutes: number }[] {
  const ms = new Map<string, number>();
  for (const x of list) {
    const d = localDay(new Date(x.at));
    ms.set(d, (ms.get(d) ?? 0) + Math.min(Math.max(x.ms, 0), MAX_TASK_MS));
  }
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - i));
    const key = localDay(d);
    return { day: key, label: WEEKDAYS[d.getDay()], minutes: Math.round((ms.get(key) ?? 0) / 60000) };
  });
}

/** The newest attempts first, for the journal. */
export function journal<T extends StatAttempt>(list: T[], limit = 50): T[] {
  return [...list].sort((p, q) => q.at.localeCompare(p.at)).slice(0, limit);
}
