import { count, plural, type Forms } from '../facts/words';
import { EARLY_LIMIT, facts, LATE_LIMIT } from './facts';
import type { Rng } from './rng';
import type { ErrorKind, LevelId, Op, Task } from './types';

/**
 * Word problems of the Задачі island (stage 5c):
 * ?1 — + and − in a column (numbers up to 1000), ?2 — × and : with a bar model (up to 35).
 * The child reads, looks at the bar, chooses the action, taps the two numbers of the text into
 * the boxes (the whole first for − and :), then solves: ?1 in a column, ?2 on the keypad.
 */
export type ProblemKind = 'join' | 'add-to' | 'take-away' | 'part' | 'groups' | 'share' | 'measure';

/** A piece of the text: plain words, or one of the two given numbers (`i` — its order in the text). */
export type Piece = string | { n: number; i: 0 | 1 };

export interface BarPart {
  value: number | null;
  label?: string;
}

/** Bar model: the whole on top, the parts below; null = unknown («?»). */
export interface BarSpec {
  whole: number | null;
  wholeLabel: string;
  parts: BarPart[];
  partsLabel: string;
  /** Parts of equal size (× and :) — drawn the same width. */
  equal: boolean;
}

export interface Problem {
  kind: ProblemKind;
  pieces: Piece[];
  /** The two numbers in text order. */
  given: [number, number];
  /** Answer sentence: «Лишилося» + «373 наліпки». */
  answerLead: string;
  unit: Forms;
  bar: BarSpec;
  /** Captions under the boxes once the action is right ('' = none). */
  labels: [string, string, string];
  /** Why this action — the explanation after the second mistake. */
  why: string;
  /** A hint that points at the bar without naming the action. */
  look: string;
}

export const problemText = (p: Problem): string =>
  p.pieces.map((x) => (typeof x === 'string' ? x : String(x.n))).join('');

/** The answer sentence: «Лишилося 373 наліпки.» */
export const answerSentence = (p: Problem, result: number): string => `${p.answerLead} ${count(result, p.unit)}.`;

// ── Words ──────────────────────────────────────────────────────────────────

type Gender = 'm' | 'f';
const NAMES: [string, Gender][] = [
  ['Оля', 'f'],
  ['Тарас', 'm'],
  ['Соломія', 'f'],
  ['Петрик', 'm'],
  ['Марко', 'm'],
  ['Даринка', 'f'],
  ['Іванко', 'm'],
  ['Зоряна', 'f'],
];
const vg = (g: Gender, m: string, f: string) => (g === 'm' ? m : f);

interface Item {
  nom: Forms;
  /** Accusative after a number («розклала 21 наліпку»). */
  acc: Forms;
}
const item = (nom: Forms, acc1?: string): Item => ({ nom, acc: [acc1 ?? nom[0], nom[1], nom[2]] });

const STICKER = item(['наліпка', 'наліпки', 'наліпок'], 'наліпку');
const BOOK = item(['книга', 'книги', 'книг'], 'книгу');
const STAMP = item(['марка', 'марки', 'марок'], 'марку');
const NUT = item(['горіх', 'горіхи', 'горіхів']);
const BEAD = item(['намистинка', 'намистинки', 'намистинок'], 'намистинку');
const APPLE = item(['яблуко', 'яблука', 'яблук']);
const PENCIL = item(['олівець', 'олівці', 'олівців']);
const CANDY = item(['цукерка', 'цукерки', 'цукерок'], 'цукерку');

const gen = (i: Item) => i.nom[2];

interface Container {
  nom: Forms;
  /** «альбому» after «сторінки». */
  suffix: string;
  /** «на 3 сторінки» / «у 3 кошики». */
  into: string;
  /** «на кожній сторінці» */
  each: string;
  /** «на кожну сторінку» */
  eachTo: string;
  /** «на одній сторінці» — the caption of the answer box. */
  one: string;
}

const PAGE: Container = { nom: ['сторінка', 'сторінки', 'сторінок'], suffix: ' альбому', into: 'на', each: 'на кожній сторінці', eachTo: 'на кожну сторінку', one: 'на одній сторінці' };
const BASKET: Container = { nom: ['кошик', 'кошики', 'кошиків'], suffix: '', into: 'у', each: 'у кожному кошику', eachTo: 'у кожен кошик', one: 'в одному кошику' };
const PLATE: Container = { nom: ['тарілка', 'тарілки', 'тарілок'], suffix: '', into: 'на', each: 'на кожній тарілці', eachTo: 'на кожну тарілку', one: 'на одній тарілці' };
const BOX: Container = { nom: ['коробка', 'коробки', 'коробок'], suffix: '', into: 'у', each: 'у кожній коробці', eachTo: 'у кожну коробку', one: 'в одній коробці' };
const SHELF: Container = { nom: ['полиця', 'полиці', 'полиць'], suffix: '', into: 'на', each: 'на кожній полиці', eachTo: 'на кожну полицю', one: 'на одній полиці' };

const SCENES: [Item, Container][] = [
  [STICKER, PAGE],
  [APPLE, BASKET],
  [APPLE, PLATE],
  [PENCIL, BOX],
  [CANDY, PLATE],
  [CANDY, BOX],
  [BOOK, SHELF],
];
const BIG_ITEMS = [STICKER, BOOK, STAMP, NUT, BEAD];
const GIVERS = ['Бабуся подарувала', 'Тато подарував', 'Мама подарувала', 'Друзі подарували'];

const cap = (s: string) => s[0].toLocaleUpperCase('uk') + s.slice(1);
const n0 = (n: number): Piece => ({ n, i: 0 });
const n1 = (n: number): Piece => ({ n, i: 1 });

// ── ?1: + and − ────────────────────────────────────────────────────────────

const LOOK_PARTS = 'Подивись на смужку: обидві частини відомі, а ціле — ні.';
const LOOK_WHOLE = 'Подивись на смужку: ціле відоме, а однієї частини не знаємо.';
const WHY_ADD = 'Знаємо обидві частини, шукаємо ціле — додаємо.';
const WHY_SUB = 'Знаємо ціле й одну частину, шукаємо другу — віднімаємо. Спочатку пишемо ціле.';

function addProblem(kind: 'join' | 'add-to', a: number, b: number, rng: Rng): Problem {
  const it = rng.pick(BIG_ITEMS);
  const bar = (wholeLabel: string, l1: string, l2: string): BarSpec => ({
    whole: null,
    wholeLabel,
    parts: [
      { value: a, label: l1 },
      { value: b, label: l2 },
    ],
    partsLabel: 'дві частини',
    equal: false,
  });
  if (kind === 'join') {
    return {
      kind,
      pieces: ['У першому ящику ', n0(a), ` ${plural(a, it.nom)}, а в другому — `, n1(b), ` ${plural(b, it.nom)}. Скільки ${gen(it)} в обох ящиках?`],
      given: [a, b],
      answerLead: 'В обох ящиках',
      unit: it.nom,
      bar: bar('разом', 'у першому', 'у другому'),
      labels: ['частина', 'частина', 'ціле'],
      why: WHY_ADD,
      look: LOOK_PARTS,
    };
  }
  const [name, g] = rng.pick(NAMES);
  return {
    kind,
    pieces: [`${name} ${vg(g, 'мав', 'мала')} `, n0(a), ` ${plural(a, it.acc)}. ${rng.pick(GIVERS)} ще `, n1(b), `. Скільки ${gen(it)} стало?`],
    given: [a, b],
    answerLead: 'Стало',
    unit: it.nom,
    bar: bar('стало', 'було', 'додали'),
    labels: ['частина', 'частина', 'ціле'],
    why: WHY_ADD,
    look: LOOK_PARTS,
  };
}

function subProblem(kind: 'take-away' | 'part', a: number, b: number, rng: Rng): Problem {
  const it = rng.pick(BIG_ITEMS);
  if (kind === 'take-away') {
    return {
      kind,
      pieces: ['У магазині було ', n0(a), ` ${plural(a, it.nom)}. За день продали `, n1(b), `. Скільки ${gen(it)} лишилося?`],
      given: [a, b],
      answerLead: 'Лишилося',
      unit: it.nom,
      bar: { whole: a, wholeLabel: 'було', parts: [{ value: b, label: 'продали' }, { value: null, label: 'лишилося' }], partsLabel: 'дві частини', equal: false },
      labels: ['ціле', 'частина', 'частина'],
      why: WHY_SUB,
      look: LOOK_WHOLE,
    };
  }
  return {
    kind,
    pieces: ['У двох коробках ', n0(a), ` ${plural(a, it.nom)}. У першій — `, n1(b), `. Скільки ${gen(it)} у другій коробці?`],
    given: [a, b],
    answerLead: 'У другій коробці',
    unit: it.nom,
    bar: { whole: a, wholeLabel: 'у двох', parts: [{ value: b, label: 'у першій' }, { value: null, label: 'у другій' }], partsLabel: 'дві частини', equal: false },
    labels: ['ціле', 'частина', 'частина'],
    why: WHY_SUB,
    look: LOOK_WHOLE,
  };
}

const n2 = (rng: Rng) => rng.int(10, 99);
/** «було 21 книга», «лишилося 31 наліпка» need another verb form — such numbers are skipped. */
const endsInOne = (n: number) => n % 10 === 1 && n % 100 !== 11;
const n3 = (rng: Rng) => rng.int(100, 899);

function makeColumnProblem(level: LevelId, rng: Rng): Task {
  if (rng.chance(0.5)) {
    let a: number, b: number;
    do {
      a = rng.chance(0.3) ? n2(rng) : n3(rng);
      b = rng.chance(0.4) ? n2(rng) : n3(rng);
    } while (a + b > 999 || endsInOne(a + b));
    return wordTask(level, '+', a, b, addProblem(rng.pick(['join', 'add-to'] as const), a, b, rng));
  }
  let a: number, b: number;
  do {
    a = rng.chance(0.25) ? rng.int(30, 99) : rng.int(120, 999);
    b = rng.chance(0.4) ? n2(rng) : n3(rng);
  } while (a - b < 10 || endsInOne(a) || endsInOne(a - b));
  return wordTask(level, '−', a, b, subProblem(rng.pick(['take-away', 'part'] as const), a, b, rng));
}

// ── ?2: × and : ────────────────────────────────────────────────────────────

function makeFactProblem(level: LevelId, rng: Rng): Task {
  const [it, c] = rng.pick(SCENES);
  const [name, g] = rng.pick(NAMES);
  const f = rng.pick(rng.chance(0.5) ? facts(EARLY_LIMIT) : facts(LATE_LIMIT));
  const kind = rng.pick(['groups', 'share', 'measure'] as const);
  const groupsOf = (n: number) => `${plural(n, c.nom)}${c.suffix}`;

  if (kind === 'groups') {
    // f.b containers with f.a items each; in the text the containers come first.
    const { a: size, b: groups } = f;
    return wordTask(level, '×', groups, size, {
      kind,
      pieces: [`${name} має `, n0(groups), ` ${groupsOf(groups)}. ${cap(c.each)} — по `, n1(size), ` ${plural(size, it.nom)}. Скільки всього ${gen(it)}?`],
      given: [groups, size],
      answerLead: 'Усього',
      unit: it.nom,
      bar: {
        whole: null,
        wholeLabel: 'усього',
        parts: Array.from({ length: groups }, () => ({ value: size })),
        partsLabel: `${count(groups, c.nom)} по ${size}`,
        equal: true,
      },
      labels: ['', '', 'усього'],
      why: `${cap(count(groups, c.nom))} по ${count(size, it.nom)} — це однакові групи. Множимо!`,
      look: 'Подивись на смужку: кілька однакових частин. Скільки всього?',
    });
  }

  const total = f.product;
  if (kind === 'share') {
    const groups = f.b;
    return wordTask(level, ':', total, groups, {
      kind,
      pieces: [`${name} ${vg(g, 'розклав', 'розклала')} `, n0(total), ` ${plural(total, it.acc)} порівну ${c.into} `, n1(groups), ` ${groupsOf(groups)}. Скільки ${gen(it)} ${c.each}?`],
      given: [total, groups],
      answerLead: cap(c.each),
      unit: it.nom,
      bar: {
        whole: total,
        wholeLabel: 'усього',
        parts: Array.from({ length: groups }, () => ({ value: null })),
        partsLabel: `${count(groups, ['рівна частина', 'рівні частини', 'рівних частин'])}`,
        equal: true,
      },
      labels: ['скільки всього', `скільки ${c.nom[2]}`, c.one],
      why: `Ціле — ${total} — розклали порівну на ${count(groups, ['частину', 'частини', 'частин'])}. Це ділення. Спочатку пишемо, скільки всього.`,
      look: 'Подивись на смужку: ціле розкладають на рівні частини.',
    });
  }

  const size = f.b;
  const groups = f.a;
  return wordTask(level, ':', total, size, {
    kind,
    pieces: [`${name} ${vg(g, 'розклав', 'розклала')} `, n0(total), ` ${plural(total, it.acc)} по `, n1(size), ` ${c.eachTo}. Скільки ${c.nom[2]} знадобилося?`],
    given: [total, size],
    answerLead: 'Знадобилося',
    unit: c.nom,
    bar: {
      whole: total,
      wholeLabel: 'усього',
      parts: Array.from({ length: groups }, () => ({ value: size })),
      partsLabel: `по ${size} — скільки частин?`,
      equal: true,
    },
    labels: ['скільки всього', 'по скільки', `скільки ${c.nom[2]}`],
    why: `Розкладаємо ${total} по ${size} — це ділення. Спочатку пишемо, скільки всього.`,
    look: `Подивись на смужку: ціле ділять на частини по ${size}.`,
  });
}

function wordTask(level: LevelId, op: Op, a: number, b: number, problem: Problem): Task {
  const result = op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b;
  return {
    key: `${problem.kind}:${a}${op}${b}`,
    level,
    kind: 'word',
    lines: [[{ t: 'blank', i: 0 }, { t: 'op', v: op }, { t: 'blank', i: 1 }, { t: 'op', v: '=' }, { t: 'blank', i: 2 }]],
    answers: [a, b, result],
    main: { op, a, b, result },
    problem,
  };
}

export const columnProblem = (level: LevelId) => (rng: Rng) => makeColumnProblem(level, rng);
export const factProblem = (level: LevelId) => (rng: Rng) => makeFactProblem(level, rng);

// ── Checking the set-up: the action and the order of the numbers ──────────

/**
 * Is «x sign y» the right way to write the problem? + and × take the numbers in any order,
 * − and : need the whole first. Returns the mistake or null.
 */
export function setupError(task: Task, sign: Op, x: number, y: number): ErrorKind | null {
  const { op, a, b } = task.main;
  if (sign !== op) return 'wrong-operation';
  if (x === a && y === b) return null;
  if (x === b && y === a) {
    if (op === '+' || op === '×') return null;
    return op === ':' ? 'reversed-division' : 'reversed-order';
  }
  return 'other';
}
