import { getLevel } from './levels';

/**
 * Coins (balance agreed 21.11.2026): a task pays 1 coin when right at the first check without a hint;
 * the level pays for its stars, weighted by how hard it is. A replay pays only for new stars,
 * and a level that already has 3 stars pays nothing — new coins wait further on.
 */
export const TASK_COIN = 1;

/** Coins for 0–3 stars before the weight. */
export const STAR_COINS = [0, 4, 6, 10] as const;

const WEIGHT_1 = ['+1', '+2', '−1', '×1', '×2', ':1'];
const WEIGHT_2 = ['+3', '+4', '+5', '−2', '−3', '×3', '×4', ':2', ':3'];

/** 1 easy, 2 middle, 3 hard (and the word problems), 4 a boss. */
export function levelWeight(levelId: string): number {
  if (getLevel(levelId).boss) return 4;
  if (WEIGHT_1.includes(levelId)) return 1;
  if (WEIGHT_2.includes(levelId)) return 2;
  return 3;
}

/** The level reward for reaching `stars` when the best so far was `before`. */
export function levelReward(levelId: string, stars: number, before: number): number {
  const gained = STAR_COINS[clampStars(stars)] - STAR_COINS[clampStars(before)];
  return gained > 0 ? gained * levelWeight(levelId) : 0;
}

/** Coins for one task: 1 when right at once without a hint, none on a level that already has 3 stars. */
export function taskCoins(firstTry: boolean, levelFull: boolean): number {
  return firstTry && !levelFull ? TASK_COIN : 0;
}

function clampStars(n: number): number {
  return Math.max(0, Math.min(3, Math.floor(n)));
}
