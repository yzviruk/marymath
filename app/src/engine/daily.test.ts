import { describe, expect, it } from 'vitest';
import { BLITZ_SECONDS, blitzHasDivision, blitzOpen, blitzTask } from './blitz';
import { DAY_TASKS, dayTaskFor, dayTaskProgress, streak, type DayAttempt } from './daily';
import { Rng } from './rng';

const NOW = new Date(2026, 10, 21, 18, 0); // Saturday
const at = (daysAgo: number, min = 0) => new Date(2026, 10, 21 - daysAgo, 10, min).toISOString();
const x = (o: Partial<DayAttempt>): DayAttempt => ({ at: at(0), op: '+', a: 47, b: 38, correct: true, tryNo: 1, ...o });

describe('day task', () => {
  it('the three kinds come in turn', () => {
    const kinds = ['2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24'].map((d) => dayTaskFor(d).kind);
    expect(new Set(kinds.slice(0, 3)).size).toBe(3);
    expect(kinds[3]).toBe(kinds[0]);
  });

  it('solve: tasks finished right today, not the word-problem setup', () => {
    const list = [x({}), x({ tryNo: 3 }), x({ correct: false }), x({ stage: 'setup' }), x({ at: at(1) })];
    expect(dayTaskProgress(DAY_TASKS.solve, list, 0, NOW)).toBe(2);
    expect(dayTaskProgress(DAY_TASKS.solve, Array.from({ length: 14 }, () => x({})), 0, NOW)).toBe(10);
  });

  it('water: different × / : facts right at the first try today', () => {
    const list = [
      x({ op: '×', a: 6, b: 4 }),
      x({ op: ':', a: 24, b: 6 }), // the same flower
      x({ op: '×', a: 3, b: 5, tryNo: 2 }),
      x({ op: ':', a: 12, b: 3 }),
    ];
    expect(dayTaskProgress(DAY_TASKS.water, list, 0, NOW)).toBe(2);
  });

  it('level: levels passed today', () => {
    expect(dayTaskProgress(DAY_TASKS.level, [], 1, NOW)).toBe(1);
    expect(dayTaskProgress(DAY_TASKS.level, [], 0, NOW)).toBe(0);
  });
});

describe('streak', () => {
  it('counts days with the day task; a missed day is a pause, not a reset', () => {
    const s = streak(['2026-11-10', '2026-11-16', '2026-11-17', '2026-11-19', '2026-11-20'], NOW);
    expect(s.days).toBe(5);
    expect(s.week.map((d) => d.label)).toEqual(['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']);
    expect(s.week.map((d) => d.state)).toEqual(['done', 'done', 'pause', 'done', 'done', 'today', 'ahead']);
    expect(streak(['2026-11-21'], NOW).week[5].state).toBe('done');
    // A profile made on Thursday: Mon–Wed are not a pause.
    expect(streak([], NOW, '2026-11-19').week.map((d) => d.state)).toEqual(['ahead', 'ahead', 'ahead', 'pause', 'pause', 'today', 'ahead']);
  });
});

describe('blitz', () => {
  it('opens after ×3; division joins after :1', () => {
    expect(blitzOpen({ '×2': 3 })).toBe(false);
    expect(blitzOpen({ '×3': 1 })).toBe(true);
    expect(blitzOpen({}, ['mul'])).toBe(true);
    expect(blitzHasDivision({ '×3': 1 })).toBe(false);
    expect(blitzHasDivision({ ':1': 2 })).toBe(true);
    expect(BLITZ_SECONDS).toBe(60);
  });

  it('gives facts up to 35, never the same twice in a row, : only when allowed', () => {
    const rng = new Rng(3);
    let prev: string | undefined;
    for (let i = 0; i < 200; i++) {
      const t = blitzTask(rng, false, prev);
      expect(t.main.op).toBe('×');
      expect(t.main.result).toBeLessThanOrEqual(35);
      expect(t.key).not.toBe(prev);
      prev = t.key;
    }
    const ops = new Set(Array.from({ length: 50 }, () => blitzTask(rng, true).main.op));
    expect(ops).toEqual(new Set(['×', ':']));
  });
});
