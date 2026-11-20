import { describe, expect, it } from 'vitest';
import { LEVELS } from './levels';
import { buildLevel, similarTask, TASKS_PER_LEVEL } from './session';
import { columnTask, factTask } from './tasks';

describe('level session', () => {
  it.each(LEVELS.map((l) => l.id))('%s: 10 different tasks', (id) => {
    for (let seed = 1; seed <= 20; seed++) {
      const tasks = buildLevel(id, { seed });
      expect(tasks).toHaveLength(TASKS_PER_LEVEL);
      expect(new Set(tasks.map((t) => t.key)).size).toBe(TASKS_PER_LEVEL);
    }
  });

  it('is the same for the same seed', () => {
    expect(buildLevel('×4', { seed: 3 }).map((t) => t.key)).toEqual(buildLevel('×4', { seed: 3 }).map((t) => t.key));
  });

  it('mixes in at most 2 review tasks at positions 4 and 8', () => {
    const review = [factTask('×3', '×', 2, 7), factTask('×3', '×', 10, 3), factTask('×3', '×', 2, 4)];
    const tasks = buildLevel('×4', { seed: 1, review });
    expect(tasks).toHaveLength(10);
    expect(tasks[3].key).toBe('2×7');
    expect(tasks[7].key).toBe('10×3');
    expect(tasks.some((t) => t.key === '2×4')).toBe(false);
  });

  it('does not repeat a review task as a fresh one', () => {
    const review = [factTask('×4', '×', 5, 4)];
    for (let seed = 1; seed <= 30; seed++) {
      const keys = buildLevel('×4', { seed, review }).map((t) => t.key);
      expect(keys.filter((k) => k === '5×4')).toHaveLength(1);
    }
  });
});

describe('similar task', () => {
  it('keeps the carry pattern of a column task', () => {
    const t = columnTask('+5', '+', 356, 127); // carry from ones only
    for (let seed = 1; seed <= 50; seed++) {
      const s = similarTask(t, seed);
      expect(s.key).not.toBe(t.key);
      expect(s.column!.regroup).toEqual([0]);
    }
  });

  it('keeps borrowing through zero', () => {
    const s = similarTask(columnTask('−5', '−', 400, 127), 9);
    expect(s.column!.throughZero).toBe(true);
  });

  it('stays on the same level for facts', () => {
    const s = similarTask(factTask('×6', '×', 6, 4), 2);
    expect(s.level).toBe('×6');
    expect(s.key).not.toBe('6×4');
  });
});
