import { describe, expect, it } from 'vitest';
import { bloomedCount, factForm, flowersOf, garden, GARDEN_PAIRS, GARDEN_SIZE, otherForm, wateringTasks } from './garden';
import { Rng } from './rng';
import type { StatAttempt } from './stats';

const NOW = new Date(2026, 10, 21, 18, 0);
const at = (daysAgo: number, min = 0) => new Date(2026, 10, 21 - daysAgo, 10, min).toISOString();
const x = (o: Partial<StatAttempt>): StatAttempt => ({
  at: at(0),
  level: '×3',
  taskKey: '',
  op: '×',
  a: 3,
  b: 4,
  value: 12,
  correct: true,
  error: null,
  tryNo: 1,
  ms: 5000,
  ...o,
});

describe('fact garden', () => {
  it('has 20 flowers in beds на 2 … на 5', () => {
    expect(GARDEN_SIZE).toBe(20);
    expect(GARDEN_PAIRS).toContainEqual([5, 7]);
    expect(GARDEN_PAIRS).not.toContainEqual([4, 10]); // 40 > 35
    const beds = garden([], NOW);
    expect(beds.map((b) => [b.factor, b.flowers.length])).toEqual([
      [2, 7],
      [3, 6],
      [4, 4],
      [5, 3],
    ]);
    expect(flowersOf(beds).every((f) => f.state === 'seed')).toBe(true);
  });

  it('bud → bloom over 3 days; × and both : grow one flower; a mistake makes it thirsty', () => {
    const list = [
      x({ a: 4, b: 3, at: at(2) }),
      x({ op: ':', a: 12, b: 3, value: 4, at: at(1) }),
      x({ op: ':', a: 12, b: 4, value: 3, at: at(0) }),
      x({ a: 2, b: 6, at: at(1) }),
      x({ a: 6, b: 2, at: at(1, 5) }), // the same day: still one day
      x({ a: 5, b: 5, value: 20, correct: false }),
    ];
    const f = new Map(flowersOf(garden(list, NOW)).map((fl) => [fl.key, fl]));
    expect(f.get('3×4')).toMatchObject({ state: 'bloom', days: 3, wateredToday: true });
    expect(f.get('2×6')).toMatchObject({ state: 'bud', days: 1, wateredToday: false });
    expect(f.get('5×5')).toMatchObject({ state: 'thirsty', days: 0 });
    expect(bloomedCount(garden(list, NOW))).toBe(1);
  });

  it('a second right answer on the same day does not undo a bloom', () => {
    const list = [x({ at: at(2) }), x({ at: at(1) }), x({ at: at(0) }), x({ at: at(0, 30) })];
    expect(flowersOf(garden(list, NOW)).find((f) => f.key === '3×4')!.state).toBe('bloom');
  });

  it('watering takes 10 flowers, the thirsty and the buds first, bloomed last', () => {
    const list = [
      x({ a: 2, b: 2, value: 5, correct: false }),
      x({ a: 2, b: 3, at: at(1) }),
      ...[2, 1, 0].map((d) => x({ a: 5, b: 7, at: at(d) })),
    ];
    const beds = garden(list, NOW);
    for (let seed = 1; seed < 30; seed++) {
      const tasks = wateringTasks(beds, new Rng(seed));
      expect(tasks).toHaveLength(10);
      const facts = tasks.map((t) => (t.main.op === '×' ? [t.main.a, t.main.b] : [t.main.b, t.main.result]).sort((p, q) => p - q).join('×'));
      expect(new Set(facts).size).toBe(10);
      expect(facts).toContain('2×2');
      expect(facts).toContain('2×3');
      expect(facts).not.toContain('5×7');
      expect(tasks.every((t) => t.kind === 'fact' && t.level === 'garden')).toBe(true);
    }
  });

  it('a fact comes in any form of its family; after an explanation — another form', () => {
    const rng = new Rng(7);
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) seen.add(factForm(4, 6, rng).key);
    expect([...seen].sort()).toEqual(['24:4', '24:6', '4×6', '6×4']);
    const t = factForm(4, 6, rng);
    const o = otherForm(t, rng);
    expect(o.key).not.toBe(t.key);
    expect(o.answers[0] * (o.main.op === ':' ? o.main.b : 1)).toBeGreaterThan(0);
    for (let i = 0; i < 20; i++) expect(['2×2', '4:2']).toContain(factForm(2, 2, rng).key);
  });
});
