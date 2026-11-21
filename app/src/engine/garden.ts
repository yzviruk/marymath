import { FACTORS, LATE_LIMIT } from './facts';
import type { Rng } from './rng';
import { factProgress, GARDEN_LEVEL, localDay, pairKey, type StatAttempt } from './stats';
import { factTask } from './tasks';
import type { Task } from './types';

/**
 * The fact garden (stage 6c): every × / : fact of the worksheets (factors 2–7 and 10, product ≤ 35)
 * is a flower. It blooms when known (engine/stats.ts `factProgress`: right first tries in a row
 * on 3 different days). × and both : of a fact are one flower.
 */
export type FlowerState = 'bloom' | 'bud' | 'thirsty' | 'seed';

export interface Flower {
  /** The smaller factor first: 3 × 4. */
  a: number;
  b: number;
  key: string;
  state: FlowerState;
  /** Days of the run going on now, 0–3 (the dots under the flower). */
  days: number;
  /** A first try today: watering again today does not grow it. */
  wateredToday: boolean;
}

export interface Bed {
  /** The smaller factor: «грядка на 3». */
  factor: number;
  flowers: Flower[];
}

/** Beds «на 2» … «на 5»; 6 × 6 is over 35, so there is no bed «на 6». */
export const GARDEN_PAIRS: [number, number][] = FACTORS.flatMap((a) =>
  FACTORS.filter((b) => b >= a && a * b <= LATE_LIMIT).map((b): [number, number] => [a, b]),
);

export const GARDEN_SIZE = GARDEN_PAIRS.length;

export function garden(list: StatAttempt[], now: Date): Bed[] {
  const progress = factProgress(list);
  const today = localDay(now);
  const beds = new Map<number, Flower[]>();
  for (const [a, b] of GARDEN_PAIRS) {
    const key = pairKey(a, b);
    const p = progress.get(key);
    const state: FlowerState = !p ? 'seed' : p.status === 'known' ? 'bloom' : p.status === 'wrong' ? 'thirsty' : 'bud';
    beds.set(a, [...(beds.get(a) ?? []), { a, b, key, state, days: p?.days ?? 0, wateredToday: p?.lastDay === today }]);
  }
  return [...beds].map(([factor, flowers]) => ({ factor, flowers }));
}

export const flowersOf = (beds: Bed[]) => beds.flatMap((b) => b.flowers);

export const bloomedCount = (beds: Bed[]) => flowersOf(beds).filter((f) => f.state === 'bloom').length;

/** Tasks in one watering. */
export const WATERING_SIZE = 10;

/**
 * Which flowers to water first: thirsty ones, buds not watered today, seeds,
 * then buds watered today, then the bloomed ones (a refresh).
 */
function rank(f: Flower): number {
  if (f.state === 'thirsty') return 0;
  if (f.state === 'bud') return f.wateredToday ? 3 : 1;
  if (f.state === 'seed') return 2;
  return 4;
}

/** One of the four facts of the family: a × b, b × a, p : a, p : b. */
export function factForm(a: number, b: number, rng: Rng): Task {
  const p = a * b;
  const forms: (() => Task)[] = [
    () => factTask(GARDEN_LEVEL, '×', a, b),
    () => factTask(GARDEN_LEVEL, '×', b, a),
    () => factTask(GARDEN_LEVEL, ':', p, a),
    () => factTask(GARDEN_LEVEL, ':', p, b),
  ];
  return rng.pick(a === b ? forms.slice(0, 3).filter((_, i) => i !== 1) : forms)();
}

/** 10 tasks for «Полити квіти»: one per flower, the thirstiest first, in shuffled order. */
export function wateringTasks(beds: Bed[], rng: Rng, size = WATERING_SIZE): Task[] {
  const flowers = rng.shuffle(flowersOf(beds)).sort((x, y) => rank(x) - rank(y));
  return rng.shuffle(flowers.slice(0, size)).map((f) => factForm(f.a, f.b, rng));
}

/** After an explanation: the same fact in another form of its family (24 : 6 → 24 : 4). */
export function otherForm(task: Task, rng: Rng): Task {
  const { op, a, b, result } = task.main;
  const [x, y] = op === '×' ? [a, b] : [b, result];
  for (let i = 0; i < 20; i++) {
    const t = factForm(Math.min(x, y), Math.max(x, y), rng);
    if (t.key !== task.key) return t;
  }
  return task;
}
