import { ISLANDS, LEVELS, type LevelDef } from './levels';
import type { IslandId } from './types';

/**
 * Opening of levels and islands (agreed 21.11.2026):
 * - on each of the 4 islands the first level is open from the start;
 * - the next level opens once the previous one is passed (7+ of 10 = at least 1 star);
 * - the Задачі island opens after all 4 bosses.
 */
export type Stars = Record<string, number>;

export const levelsOf = (island: IslandId): LevelDef[] => LEVELS.filter((l) => l.island === island);

export const isPassed = (stars: Stars, id: string): boolean => (stars[id] ?? 0) >= 1;

export function isUnlocked(stars: Stars, id: string): boolean {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) return false;
  const same = levelsOf(level.island);
  const i = same.findIndex((l) => l.id === id);
  return i === 0 || isPassed(stars, same[i - 1].id);
}

/** The level to play next on an island: the first open one not passed yet; null when all are passed. */
export function currentLevel(stars: Stars, island: IslandId): LevelDef | null {
  return levelsOf(island).find((l) => isUnlocked(stars, l.id) && !isPassed(stars, l.id)) ?? null;
}

export function passedCount(stars: Stars, island: IslandId): number {
  return levelsOf(island).filter((l) => isPassed(stars, l.id)).length;
}

export function tasksIslandOpen(stars: Stars): boolean {
  return ISLANDS.every((i) => levelsOf(i.id).filter((l) => l.boss).every((l) => isPassed(stars, l.id)));
}

/**
 * «Продовжити»: the current level of the island played last; if that island is done (or nothing
 * was played yet), the first island in map order that still has a level to play.
 */
export function continueLevel(stars: Stars, lastLevel?: string): LevelDef | null {
  const last = lastLevel ? LEVELS.find((l) => l.id === lastLevel) : undefined;
  if (last) {
    const here = currentLevel(stars, last.island);
    if (here) return here;
  }
  for (const island of ISLANDS) {
    const level = currentLevel(stars, island.id);
    if (level) return level;
  }
  return null;
}

/** The level that has to be passed to open `id` (for «Спершу пройди …»); null when open. */
export function blockedBy(stars: Stars, id: string): LevelDef | null {
  if (isUnlocked(stars, id)) return null;
  const level = LEVELS.find((l) => l.id === id)!;
  const same = levelsOf(level.island);
  return same[same.findIndex((l) => l.id === id) - 1];
}
