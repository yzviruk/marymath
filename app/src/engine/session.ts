import { getLevel } from './levels';
import { Rng, sample } from './rng';
import type { LevelId, Task } from './types';

export const TASKS_PER_LEVEL = 10;
export const REVIEW_SLOTS = 2;
/** Where review tasks go (0-based), spread through the level. */
const REVIEW_POSITIONS = [3, 7];

export interface BuildOptions {
  seed: number;
  /** Weak tasks to repeat (from earlier levels or yesterday's mistakes); at most 2 are used. */
  review?: Task[];
}

/** One level run: 10 tasks, no repeats, review tasks mixed in. */
export function buildLevel(levelId: LevelId, { seed, review = [] }: BuildOptions): Task[] {
  const level = getLevel(levelId);
  const rng = new Rng(seed);
  const used = new Set<string>();
  const picked = review.filter((t) => !used.has(t.key) && used.add(t.key)).slice(0, REVIEW_SLOTS);

  const fresh: Task[] = [];
  while (fresh.length < TASKS_PER_LEVEL - picked.length) {
    const t = sample(() => level.make(rng), (x) => !used.has(x.key), 5000);
    used.add(t.key);
    fresh.push(t);
  }

  const out = [...fresh];
  picked.forEach((t, i) => out.splice(Math.min(REVIEW_POSITIONS[i], out.length), 0, t));
  return out;
}

/**
 * A task of the same type for the 3rd step of an explanation: same level, a different
 * example, and for column tasks the same places carrying / borrowing.
 */
export function similarTask(task: Task, seed: number): Task {
  const level = getLevel(task.level);
  const rng = new Rng(seed);
  const pattern = task.column?.regroup.join(',');
  return sample(
    () => level.make(rng),
    (t) =>
      t.key !== task.key &&
      t.kind === task.kind &&
      (pattern === undefined || t.column?.regroup.join(',') === pattern) &&
      t.column?.throughZero === task.column?.throughZero,
    5000,
  );
}
