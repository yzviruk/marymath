import { describe, expect, it } from 'vitest';
import { factStatuses, factTable, journal, minutesByDay, topErrors, topicAccuracy, type StatAttempt } from './stats';

const NOW = new Date(2026, 10, 21, 18, 0); // 21.11.2026, local time
const at = (daysAgo: number, min = 0) => new Date(2026, 10, 21 - daysAgo, 10, min).toISOString();
const x = (o: Partial<StatAttempt>): StatAttempt => ({
  at: at(0),
  level: '+3',
  taskKey: '47+38',
  op: '+',
  a: 47,
  b: 38,
  value: 85,
  correct: true,
  error: null,
  tryNo: 1,
  ms: 20000,
  ...o,
});

describe('parent statistics', () => {
  it('accuracy per island counts first tries of the last 7 days', () => {
    const list = [
      x({}),
      x({ correct: false, value: 75, error: 'forgot-carry' }),
      x({ tryNo: 2 }), // a second try does not count
      x({ at: at(10), correct: false }), // too old
      x({ level: ':1', op: ':', a: 12, b: 3, value: 4 }),
    ];
    const t = topicAccuracy(list, NOW);
    expect(t.map((s) => [s.island, s.pct])).toEqual([
      ['add', 50],
      ['sub', null],
      ['mul', null],
      ['div', 100],
      ['tasks', null],
    ]);
  });

  it('typical mistakes: most frequent first, the newest example, no «other»', () => {
    const list = [
      x({ correct: false, value: 75, error: 'forgot-carry', at: at(2) }),
      x({ correct: false, value: 75, error: 'forgot-carry', a: 58, b: 27, at: at(1) }),
      x({ level: ':3', op: ':', a: 24, b: 6, value: 24, values: [4, 6, 24], correct: false, error: 'reversed-division' }),
      x({ correct: false, error: 'other' }),
    ];
    expect(topErrors(list, NOW)).toEqual([
      { kind: 'forgot-carry', count: 2, example: 'напр. 58 + 27 = 75 замість 58 + 27 = 85' },
      { kind: 'reversed-division', count: 1, example: 'напр. 4 : 6 = 24 замість 24 : 6 = 4' },
    ]);
  });

  it('a fact is known after 3 right first tries on 3 days; × and both : count together', () => {
    const list = [
      x({ op: '×', a: 6, b: 4, at: at(3) }),
      x({ op: ':', a: 24, b: 6, at: at(2) }),
      x({ op: ':', a: 24, b: 4, at: at(1) }),
      x({ op: '×', a: 3, b: 5, at: at(1) }),
      x({ op: '×', a: 3, b: 5, at: at(0) }),
      x({ op: '×', a: 2, b: 7, correct: false }),
    ];
    const st = factStatuses(list);
    expect(st.get('4×6')).toBe('known');
    expect(st.get('3×5')).toBe('learning');
    expect(st.get('2×7')).toBe('wrong');
    const table = factTable(list);
    expect(table.map((r) => r.row)).toEqual([2, 3, 4, 5, 6, 7, 10]);
    expect(table.find((r) => r.row === 6)!.cells.find((c) => c?.b === 4)?.status).toBe('known');
    expect(table.find((r) => r.row === 10)!.cells.filter(Boolean)).toHaveLength(2); // 10×2, 10×3
  });

  it('minutes per day for the last week, a task at most 3 minutes', () => {
    const list = [x({ ms: 60000 }), x({ ms: 600000 }), x({ at: at(1), ms: 120000 })];
    const days = minutesByDay(list, NOW);
    expect(days).toHaveLength(7);
    expect(days[6]).toMatchObject({ label: 'Сб', minutes: 4 });
    expect(days[5]).toMatchObject({ label: 'Пт', minutes: 2 });
  });

  it('the journal is newest first', () => {
    expect(journal([x({ at: at(1) }), x({ at: at(0, 5) })]).map((j) => j.at)).toEqual([at(0, 5), at(1)]);
  });
});
