import { columnAdd, columnSub, type ColumnInfo } from './column';
import { EARLY_LIMIT, facts, LATE_LIMIT, type Fact } from './facts';
import { sample, type Rng } from './rng';
import { columnTask, commutativeTask, divComposeTask, factFamilyTask, factTask, repeatedAddTask } from './tasks';
import type { IslandId, LevelId, Task } from './types';

export interface LevelDef {
  id: LevelId;
  island: IslandId;
  title: string;
  /** Example from the plan, for the parent preview. */
  sample: string;
  boss?: boolean;
  make: (rng: Rng) => Task;
}

const same = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);

const n2 = (rng: Rng) => rng.int(10, 99);
const n3 = (rng: Rng) => rng.int(100, 999);

/** Two- or three-digit subtraction pair with a < b rejected. */
function subPair(rng: Rng, threeDigit: boolean): [number, number] {
  const a = threeDigit ? n3(rng) : n2(rng);
  const b = threeDigit && rng.chance(0.3) ? n2(rng) : threeDigit ? n3(rng) : n2(rng);
  return [a, b];
}

function addLevel(id: LevelId, title: string, sampleText: string, make: (rng: Rng) => [number, number], ok: (c: ColumnInfo) => boolean): LevelDef {
  return {
    id,
    island: 'add',
    title,
    sample: sampleText,
    make: (rng) => {
      const [a, b] = sample(() => make(rng), ([x, y]) => ok(columnAdd(x, y)));
      return columnTask(id, '+', a, b);
    },
  };
}

function subLevel(id: LevelId, title: string, sampleText: string, make: (rng: Rng) => [number, number], ok: (c: ColumnInfo) => boolean): LevelDef {
  return {
    id,
    island: 'sub',
    title,
    sample: sampleText,
    make: (rng) => {
      const [a, b] = sample(
        () => make(rng),
        ([x, y]) => y < x && ok(columnSub(x, y)),
      );
      return columnTask(id, '−', a, b);
    },
  };
}

function poolLevel(id: LevelId, island: IslandId, title: string, sampleText: string, pool: Fact[], make: (f: Fact, rng: Rng) => Task): LevelDef {
  if (pool.length < 10) throw new Error(`Рівень ${id}: замало фактів (${pool.length})`);
  return { id, island, title, sample: sampleText, make: (rng) => make(rng.pick(pool), rng) };
}

const has = (set: number[]) => (a: number, b: number) => set.includes(a) || set.includes(b);

// ── Додавання ──────────────────────────────────────────────────────────────
const ADD: LevelDef[] = [
  addLevel('+1', 'Двоцифрове + одноцифрове, без перенесення', '34 + 5', (r) => [n2(r), r.int(1, 9)], (c) => c.regroup.length === 0),
  addLevel('+2', 'Двоцифрові, без перенесення', '42 + 35', (r) => [n2(r), n2(r)], (c) => c.regroup.length === 0 && c.b % 10 !== 0),
  addLevel('+3', 'Двоцифрові, перенесення з одиниць', '47 + 38', (r) => [n2(r), n2(r)], (c) => same(c.regroup, [0]) && c.result < 100),
  addLevel('+4', 'Трицифрові, без перенесення', '312 + 245', (r) => [n3(r), n3(r)], (c) => c.regroup.length === 0),
  addLevel('+5', 'Трицифрові, перенесення в одному розряді', '356 + 127', (r) => [n3(r), n3(r)], (c) => c.regroup.length === 1 && c.result <= 999),
  addLevel('+6', 'Перенесення в двох розрядах', '278 + 356', (r) => [n3(r), n3(r)], (c) => same(c.regroup, [0, 1]) && c.result <= 999),
  {
    id: '+7',
    island: 'add',
    title: 'Сума до 1000',
    sample: '999 + 1, 450 + 550',
    make: (rng) => {
      if (rng.chance(0.3)) {
        const a = n3(rng);
        return columnTask('+7', '+', a, 1000 - a);
      }
      const [a, b] = sample(
        () => [n3(rng), rng.chance(0.2) ? rng.int(1, 9) : rng.chance(0.3) ? n2(rng) : n3(rng)] as [number, number],
        ([x, y]) => {
          const c = columnAdd(x, y);
          return c.result >= 600 && c.result <= 1000 && c.regroup.length >= 1;
        },
      );
      return columnTask('+7', '+', a, b);
    },
  },
];

// ── Віднімання ─────────────────────────────────────────────────────────────
const SUB: LevelDef[] = [
  subLevel('−1', 'Без позичання', '87 − 34, 568 − 245', (r) => subPair(r, r.chance(0.5)), (c) => c.regroup.length === 0),
  subLevel('−2', 'Позичання з десятків', '52 − 17, 463 − 128', (r) => subPair(r, r.chance(0.5)), (c) => same(c.regroup, [0]) && !c.throughZero),
  subLevel('−3', 'Позичання із сотень', '527 − 254', (r) => subPair(r, true), (c) => same(c.regroup, [1])),
  subLevel('−4', 'Позичання в двох розрядах', '632 − 278', (r) => subPair(r, true), (c) => same(c.regroup, [0, 1]) && !c.throughZero),
  subLevel(
    '−5',
    'Позичання через нуль',
    '400 − 127, 1000 − 365',
    (r) => {
      if (r.chance(0.2)) return [1000, n3(r)];
      const a = r.int(1, 9) * 100 + (r.chance(0.5) ? 0 : r.int(1, 9));
      return [a, r.chance(0.25) ? n2(r) : n3(r)];
    },
    (c) => c.throughZero,
  ),
];

// ── Множення ───────────────────────────────────────────────────────────────
const MUL: LevelDef[] = [
  poolLevel('×1', 'mul', 'Рівні групи → додавання однакових', '4 + 4 + 4 = 4 × 3', facts(EARLY_LIMIT, (_a, b) => b <= 5), (f) =>
    repeatedAddTask('×1', f.a, f.b),
  ),
  poolLevel('×2', 'mul', 'Масиви, переставний закон', '2 × 5 = 5 × 2', facts(EARLY_LIMIT, (a, b) => a !== b), (f) =>
    commutativeTask('×2', f.a, f.b),
  ),
  poolLevel('×3', 'mul', '× 2 і × 10', '2 × 7, 10 × 3', facts(LATE_LIMIT, has([2, 10])), (f) => factTask('×3', '×', f.a, f.b)),
  poolLevel('×4', 'mul', '× 5', '5 × 4, 5 × 7', facts(LATE_LIMIT, has([5])), (f) => factTask('×4', '×', f.a, f.b)),
  poolLevel('×5', 'mul', '× 3 і × 4', '3 × 6, 4 × 5', facts(LATE_LIMIT, has([3, 4])), (f) => factTask('×5', '×', f.a, f.b)),
  poolLevel('×6', 'mul', '× 6 і × 7 (до 35)', '6 × 4, 7 × 5', facts(LATE_LIMIT, has([6, 7])), (f) => factTask('×6', '×', f.a, f.b)),
];

// ── Ділення ────────────────────────────────────────────────────────────────
// A fact a × b reads as «b boxes with a items each»: groups = b, size = a.
const DIV: LevelDef[] = [
  poolLevel(':1', 'div', 'Розклади порівну', '6 : 3', facts(EARLY_LIMIT), (f) =>
    factTask(':1', ':', f.product, f.b, { groups: f.b, size: f.a, mode: 'share' }),
  ),
  poolLevel(':2', 'div', 'Групи по кілька', '10 : 2', facts(EARLY_LIMIT), (f) =>
    factTask(':2', ':', f.product, f.a, { groups: f.b, size: f.a, mode: 'group' }),
  ),
  poolLevel(':3', 'div', 'Склади приклад за малюнком', '24 : 6 = 4', facts(LATE_LIMIT, (a, b) => a !== b), (f, rng) =>
    divComposeTask(':3', f.b, f.a, rng),
  ),
  poolLevel(':4', 'div', 'Сімейство фактів', '5 × 3 → 15 : 3, 15 : 5', facts(LATE_LIMIT, (a, b) => a !== b), (f) =>
    factFamilyTask(':4', f.a, f.b),
  ),
  {
    id: ':5',
    island: 'div',
    title: 'Ділення до 35',
    sample: '30 : 6, 35 : 7',
    make: (rng) => {
      // Lean on the new, bigger facts (21–35) but keep some small ones.
      const pool = rng.chance(0.6) ? facts(LATE_LIMIT, (a, b) => a * b > EARLY_LIMIT) : facts(EARLY_LIMIT);
      const f = rng.pick(pool);
      return factTask(':5', ':', f.product, f.b);
    },
  },
];

function boss(id: LevelId, island: IslandId, title: string, from: LevelDef[]): LevelDef {
  return { id, island, title, sample: '—', boss: true, make: (rng) => rng.pick(from).make(rng) };
}

const byId = (list: LevelDef[], ids: string[]) => ids.map((id) => list.find((l) => l.id === id)!);

export const LEVELS: LevelDef[] = [
  ...ADD,
  boss('+♛', 'add', 'Бос: змішані', byId(ADD, ['+2', '+3', '+4', '+5', '+6', '+7'])),
  ...SUB,
  boss('−♛', 'sub', 'Бос: змішані', SUB),
  ...MUL,
  boss('×♛', 'mul', 'Бос: змішані', byId(MUL, ['×3', '×4', '×5', '×6'])),
  ...DIV,
  boss(':♛', 'div', 'Бос: змішані × і :', [...byId(MUL, ['×3', '×4', '×5', '×6']), ...byId(DIV, [':1', ':2', ':5'])]),
];

export const ISLANDS: { id: IslandId; name: string }[] = [
  { id: 'add', name: 'Додавання' },
  { id: 'sub', name: 'Віднімання' },
  { id: 'mul', name: 'Множення' },
  { id: 'div', name: 'Ділення' },
];

export function getLevel(id: LevelId): LevelDef {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`Невідомий рівень ${id}`);
  return level;
}
