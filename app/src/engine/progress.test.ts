import { describe, expect, it } from 'vitest';
import { blockedBy, continueLevel, currentLevel, isUnlocked, passedCount, tasksIslandOpen } from './progress';

describe('opening of levels and islands', () => {
  it('a new child has the first level of every island open, nothing else', () => {
    for (const id of ['+1', '−1', '×1', ':1']) expect(isUnlocked({}, id)).toBe(true);
    for (const id of ['+2', '−2', '×2', ':2', '+♛', ':♛']) expect(isUnlocked({}, id)).toBe(false);
    expect(tasksIslandOpen({})).toBe(false);
  });

  it('the next level opens with at least 1 star (7 of 10) in the previous one', () => {
    expect(isUnlocked({ '+1': 0 }, '+2')).toBe(false);
    expect(isUnlocked({ '+1': 1 }, '+2')).toBe(true);
    expect(isUnlocked({ '+1': 3 }, '+3')).toBe(false);
    expect(blockedBy({ '+1': 3 }, '+3')?.id).toBe('+2');
    expect(blockedBy({ '+1': 3 }, '+2')).toBeNull();
  });

  it('the current level is the first open one not passed', () => {
    expect(currentLevel({}, 'add')?.id).toBe('+1');
    expect(currentLevel({ '+1': 2, '+2': 1 }, 'add')?.id).toBe('+3');
    expect(passedCount({ '+1': 2, '+2': 1, '+3': 0 }, 'add')).toBe(2);
    const all = Object.fromEntries(['+1', '+2', '+3', '+4', '+5', '+6', '+7', '+♛'].map((id) => [id, 1]));
    expect(currentLevel(all, 'add')).toBeNull();
  });

  it('the Задачі island opens after all four bosses', () => {
    const bosses = { '+♛': 1, '−♛': 1, '×♛': 1 };
    expect(tasksIslandOpen(bosses)).toBe(false);
    expect(tasksIslandOpen({ ...bosses, ':♛': 2 })).toBe(true);
  });

  it('«Продовжити» stays on the island played last', () => {
    expect(continueLevel({})?.id).toBe('+1');
    expect(continueLevel({ '×1': 2 }, '×1')?.id).toBe('×2');
    expect(continueLevel({ '×1': 0 }, '×1')?.id).toBe('×1'); // not passed: try again
    const addDone = Object.fromEntries(['+1', '+2', '+3', '+4', '+5', '+6', '+7', '+♛'].map((id) => [id, 1]));
    expect(continueLevel(addDone, '+♛')?.id).toBe('−1');
  });
});
