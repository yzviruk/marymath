import { blankFact } from '../engine/check';
import { taskText } from '../engine/tasks';
import type { ErrorKind, Op, Picture, Task } from '../engine/types';
import { divisionPath, multiplicationPath } from '../components/lineGeometry';
import { APPLE, BASKET, BOX, CANDY, count, GEM, GROUP, ROW, type Forms } from './words';

/** C → P → A: things to move, a picture, only the record. */
export type FactMode = 'concrete' | 'pictorial' | 'abstract';

export type ItemKind = 'candy' | 'gem' | 'apple';

export interface Fact {
  op: Op;
  a: number;
  b: number;
  result: number;
}

export interface Theme {
  item: ItemKind;
  items: Forms;
  holders: Forms;
}

/** What the objects are: candies in boxes (×), apples in baskets (share), gems (groups, :3). */
export function themeOf(picture: Picture, op: Op): Theme {
  if (op === ':' && picture.mode === 'equal-groups') return { item: 'gem', items: GEM, holders: BOX };
  if (op === '×' || picture.mode === 'equal-groups' || picture.mode === 'array')
    return { item: 'candy', items: CANDY, holders: BOX };
  if (picture.mode === 'share') return { item: 'apple', items: APPLE, holders: BASKET };
  return {
    item: 'gem',
    items: GEM,
    holders: picture.mode === 'group' ? GROUP : BOX,
  };
}

/** The picture a task shows (the explanation may draw one for a task without it). */
export function pictureOf(task: Task, fact: Fact = task.main): Picture {
  const m = task.main;
  // :3 — gems in boxes, as on the worksheets.
  if (task.kind === 'div-compose') return { ...task.picture!, mode: 'equal-groups' };
  if (task.picture && fact.op === m.op && fact.a === m.a && fact.b === m.b) return task.picture;
  if (fact.op === ':') return { groups: fact.b, size: fact.result, mode: 'share' };
  return { groups: fact.b, size: fact.a, mode: 'equal-groups' };
}

/** «6 коробок, у кожній по 4 камінці» */
export function caption(picture: Picture, op: Op): string {
  const { groups, size, mode } = picture;
  const t = themeOf(picture, op);
  const total = groups * size;
  if (mode === 'array') return `${count(groups, ROW)} по ${count(size, CANDY)}`;
  if (mode === 'share') return `${count(total, APPLE)} порівну в ${count(groups, BASKET)} — по ${size} в кожному`;
  if (mode === 'group') return `${count(total, GEM)} по ${size} — це ${count(groups, GROUP)}`;
  return `${count(groups, t.holders)}, у кожній по ${count(size, t.items)}`;
}

/** The task's wording above the picture. */
export function condition(task: Task, mode: FactMode): string {
  const { a, b, op } = task.main;
  const p = task.picture;
  switch (task.kind) {
    case 'repeated-add':
      return `${count(b, BOX)}, у кожній по ${count(a, CANDY)}. Скільки всього цукерок?`;
    case 'commutative':
      return `У коробці ${count(b, ROW)} по ${count(a, CANDY)}. Поверни коробку — чи зміниться кількість?`;
    case 'div-compose':
      return `${count(p!.groups, BOX)}, у кожній по ${count(p!.size, GEM)}. Склади приклад на ділення.`;
    case 'fact-family':
      return `${a}, ${b} і ${a * b} — одна сімʼя. Заповни всі чотири приклади.`;
    default:
      break;
  }
  if (mode === 'abstract' || !p) return `Скільки буде ${a} ${op} ${b}?`;
  if (op === '×') return `${count(b, BOX)}, у кожній по ${count(a, CANDY)}. Скільки всього цукерок?`;
  if (p.mode === 'share')
    return `${count(a, APPLE)} розклали порівну в ${count(b, BASKET)}. Скільки яблук у кожному кошику?`;
  return `${count(a, GEM)} розклали по ${b}. Скільки груп вийшло?`;
}

/** Captions under the numbers of a one-line division, as in the mockups. */
export function lineLabels(task: Task, mode: FactMode): string[] | null {
  if (task.kind === 'div-compose') return ['усього', 'скільки частин', 'в одній частині'];
  if (task.kind !== 'fact' || task.main.op !== ':' || mode === 'abstract') return null;
  if (task.picture?.mode === 'group') return ['скільки всього', 'по скільки', 'скільки груп'];
  return ['скільки всього', 'скільки кошиків', 'в одному кошику'];
}

/** What the pet says when the task opens. */
export function startLine(task: Task, mode: FactMode): string {
  const p = task.picture;
  if (task.kind === 'div-compose') return 'Торкайся чисел, щоб скласти приклад. Спочатку — скільки всього.';
  if (task.kind === 'fact-family') return 'Подивись на трикутник: вгорі — скільки всього, внизу — дві частини.';
  if (task.kind === 'commutative') return 'Натисни «Повернути» — рядів і цукерок у ряду поміняється.';
  if (mode === 'concrete' && p) {
    if (p.mode === 'share') return 'Перетягуй яблука в кошики — по одному в кожен.';
    if (p.mode === 'group') return `Торкайся камінців: кожні ${p.size} стають групою.`;
    return 'Торкайся коробок по черзі й лічи цукерки.';
  }
  return 'Впиши відповідь і натисни «Перевірити».';
}

/** Step 1 of a mistake: where to look, never the answer. */
export function firstHint(task: Task, error: ErrorKind, wrongBlank: number): string {
  const f = blankFact(task, wrongBlank);
  switch (error) {
    case 'reversed-division':
      return 'Майже! Спочатку пишемо, скільки всього.';
    case 'wrong-operation':
      return f.op === ':'
        ? 'Ми ділимо — розкладаємо порівну. Перевір ще раз.'
        : 'Множення — це кілька однакових груп. Перевір ще раз.';
    case 'neighbor-fact':
      return 'Майже! Полічи ще раз уважно — можна натиснути «Підказка».';
    default:
      if (task.kind === 'div-compose') return 'Подивись на малюнок: скільки всього, скільки коробок, скільки в одній?';
      return 'Перевір віконце, що хитається. Можна натиснути «Підказка».';
  }
}

/** Jumps for a fact on the 0–20 line, or null when they do not fit. */
export function factPath(f: Fact): number[] | null {
  if (f.op === '×') return f.result <= 20 ? multiplicationPath(f.a, f.b) : null;
  return f.a <= 20 ? divisionPath(f.a, f.b) : null;
}

/** The «Підказка» button: jumps on the line when they fit, otherwise counting by groups. */
export function hintLine(task: Task, blank: number): string {
  if (task.kind === 'div-compose') return 'Найбільше число — скільки всього. Його пишемо першим.';
  if (task.kind === 'repeated-add' && blank === 0) return `Скільки разів повторюється ${task.main.a}? Полічи коробки.`;
  if (task.kind === 'commutative' && blank === 0)
    return 'Поверни коробку: рядів стало стільки, скільки було цукерок у ряду.';
  const f = blankFact(task, blank);
  if (factPath(f)) {
    return f.op === '×'
      ? `Стрибай по ${f.a} від 0 — ${count(f.b, ['стрибок', 'стрибки', 'стрибків'])}. На якому числі зупинка?`
      : `Стрибай назад по ${f.b} від ${f.a} до 0. Скільки стрибків?`;
  }
  if (f.op === '×') {
    const firsts = [1, 2, 3].map((k) => k * f.a).join(', ');
    return `Лічи по коробках: ${firsts}…`;
  }
  return `Розклади ${f.a} порівну на ${f.b}: подивись на кошики.`;
}

export function solvedLine(task: Task): string {
  if (task.kind === 'fact-family') return 'Правильно! Уся сімʼя на місці.';
  return `Правильно! ${taskText(task, task.answers)}.`;
}

// ── The explanation (step 2 of a mistake) ─────────────────────────────────

export interface Explanation {
  fact: Fact;
  picture: Picture;
  caption: string;
  /** The child's line as written: «4 : 6 = 24». */
  yours: string;
  yoursNote: string;
  /** Headline of each of the 3 steps. */
  titles: [string, string, string];
  /** What the pet says on each step. */
  pet: [string, string, string];
  /** Jumps on the 0–20 line, or on a temporary 0–35 line when `wide`. */
  path: number[];
  wide: boolean;
  /** The bar model fits the story (division, ×1 groups). */
  bar: boolean;
}

export function explanation(
  task: Task,
  values: readonly (number | null)[],
  error: ErrorKind,
  wrongBlank: number,
): Explanation {
  const fact = task.kind === 'div-compose' ? task.main : blankFact(task, wrongBlank);
  const picture = pictureOf(task, fact);
  const line = task.lines.find((l) => l.some((p) => p.t === 'blank' && p.i === wrongBlank)) ?? task.lines[0];
  const yours = line.map((p) => (p.t === 'blank' ? String(values[p.i] ?? '?') : String(p.v))).join(' ');
  const total = fact.op === '×' ? fact.result : fact.a;
  const wide = total > 20;
  const path = fact.op === '×' ? multiplicationPath(fact.a, fact.b) : divisionPath(fact.a, fact.b);
  const jumps = path.length - 1;
  const jumpWord = count(jumps, ['стрибок', 'стрибки', 'стрибків']);

  if (error === 'reversed-division') {
    return {
      fact,
      picture,
      caption: caption(picture, ':'),
      yours,
      yoursNote: 'числа помінялися місцями',
      titles: ['Що на малюнку?', 'Спочатку пишемо, скільки всього', 'Тепер запиши сам'],
      pet: [
        `Скільки всього камінців? Їх ${total}. Це ціле.`,
        'Нічого страшного! Ціле завжди йде першим — як довга смужка зверху.',
        'Торкайся чисел: спочатку — скільки всього.',
      ],
      path,
      wide,
      bar: true,
    };
  }

  if (fact.op === ':') {
    const story =
      picture.mode === 'group'
        ? `Беремо по ${fact.b} — виходить ${count(fact.result, GROUP)}.`
        : `Розкладаємо ${fact.a} порівну на ${fact.b} — у кожній частині по ${fact.result}.`;
    return {
      fact,
      picture,
      caption: caption(picture, ':'),
      yours,
      yoursNote: error === 'wrong-operation' ? 'тут треба ділити' : 'інша відповідь',
      titles: ['Що на малюнку?', 'Ділимо — розкладаємо порівну', 'Тепер запиши сам'],
      pet: [
        `Усього ${fact.a}. Ділимо на ${fact.b}.`,
        `${story} На шкалі — ${jumpWord} назад по ${fact.b}.`,
        'Впиши відповідь у віконце.',
      ],
      path,
      wide,
      bar: true,
    };
  }

  const sum = Array.from({ length: fact.b }, () => fact.a).join(' + ');
  return {
    fact,
    picture,
    caption: caption(picture, '×'),
    yours,
    yoursNote:
      error === 'wrong-operation'
        ? 'тут треба множити'
        : error === 'neighbor-fact'
          ? 'майже — сусідній приклад'
          : 'інша відповідь',
    titles: ['Що на малюнку?', 'Полічимо стрибки разом', 'Тепер запиши сам'],
    pet: [
      `${count(fact.b, picture.mode === 'array' ? ROW : BOX)} по ${fact.a}. Це ${fact.a} × ${fact.b}.`,
      `${sum} = ${fact.result}: ${jumpWord} по ${fact.a}.`,
      'Впиши відповідь у віконця.',
    ],
    path,
    wide,
    bar: false,
  };
}
