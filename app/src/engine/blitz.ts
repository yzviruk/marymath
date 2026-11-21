import { facts, LATE_LIMIT } from './facts';
import { isPassed, type Stars } from './progress';
import type { Rng } from './rng';
import { BLITZ_LEVEL } from './stats';
import { factTask } from './tasks';
import type { Task } from './types';

/**
 * The blitz (stage 6c): an optional speed round of × and : facts, open after ×3.
 * One minute, as many as she manages; a mistake shows the right answer and the round goes on.
 * Only her own record counts; a new record pays a few coins.
 */
export const BLITZ_SECONDS = 60;
export const BLITZ_RECORD_COINS = 5;
/** The last seconds the ring turns orange. */
export const BLITZ_HURRY = 10;
export const BLITZ_UNLOCK = '×3';

export function blitzOpen(stars: Stars, opened: readonly string[] = []): boolean {
  return isPassed(stars, BLITZ_UNLOCK) || opened.includes('mul');
}

/** Division joins once the first : level is passed (or the island is opened by hand). */
export function blitzHasDivision(stars: Stars, opened: readonly string[] = []): boolean {
  return isPassed(stars, ':1') || opened.includes('div');
}

const ALL = facts(LATE_LIMIT);

/** A random fact, never the same example twice in a row. */
export function blitzTask(rng: Rng, division: boolean, prevKey?: string): Task {
  for (;;) {
    const f = rng.pick(ALL);
    const t = division && rng.chance(0.5) ? factTask(BLITZ_LEVEL, ':', f.product, f.a) : factTask(BLITZ_LEVEL, '×', f.a, f.b);
    if (t.key !== prevKey) return t;
  }
}
