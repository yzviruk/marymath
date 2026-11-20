import { columnAdd, columnSub } from './column';
import type { Rng } from './rng';
import type { LevelId, Line, Op, Part, Task } from './types';

const num = (v: number): Part => ({ t: 'num', v });
const op = (v: Op | '='): Part => ({ t: 'op', v });
const blank = (i: number): Part => ({ t: 'blank', i });

export function apply(o: Op, a: number, b: number): number {
  switch (o) {
    case '+':
      return a + b;
    case '−':
      return a - b;
    case '×':
      return a * b;
    case ':':
      return a / b;
  }
}

/** 47 + 38 = ? in a column. */
export function columnTask(level: LevelId, o: '+' | '−', a: number, b: number): Task {
  const column = o === '+' ? columnAdd(a, b) : columnSub(a, b);
  return {
    key: `${a}${o}${b}`,
    level,
    kind: 'column',
    lines: [[num(a), op(o), num(b), op('='), blank(0)]],
    answers: [column.result],
    main: { op: o, a, b, result: column.result },
    column,
  };
}

/** 6 × 4 = ? or 24 : 6 = ? */
export function factTask(level: LevelId, o: '×' | ':', a: number, b: number, picture?: Task['picture']): Task {
  const result = apply(o, a, b);
  if (!Number.isInteger(result)) throw new Error(`${a} : ${b} ділиться з остачею`);
  return {
    key: `${a}${o}${b}`,
    level,
    kind: 'fact',
    lines: [[num(a), op(o), num(b), op('='), blank(0)]],
    answers: [result],
    main: { op: o, a, b, result },
    picture,
  };
}

/** `times` groups of `size`: 4 + 4 + 4 = 4 × ? = ? */
export function repeatedAddTask(level: LevelId, size: number, times: number): Task {
  const sum: Part[] = [];
  for (let i = 0; i < times; i++) {
    if (i) sum.push(op('+'));
    sum.push(num(size));
  }
  return {
    key: `${size}×${times}`,
    level,
    kind: 'repeated-add',
    lines: [[...sum, op('='), num(size), op('×'), blank(0), op('='), blank(1)]],
    answers: [times, size * times],
    main: { op: '×', a: size, b: times, result: size * times },
    picture: { groups: times, size, mode: 'equal-groups' },
  };
}

/** Array of `rows` × `cols`: a × b = b × ? = ? */
export function commutativeTask(level: LevelId, a: number, b: number): Task {
  return {
    key: `${a}×${b}`,
    level,
    kind: 'commutative',
    lines: [[num(a), op('×'), num(b), op('='), num(b), op('×'), blank(0), op('='), blank(1)]],
    answers: [a, a * b],
    main: { op: '×', a, b, result: a * b },
    picture: { groups: b, size: a, mode: 'array' },
  };
}

/**
 * Picture of `groups` boxes with `size` items → write the division. The child places the
 * three numbers; total must come first (the agreed rule «спочатку — скільки всього»).
 */
export function divComposeTask(level: LevelId, groups: number, size: number, rng: Rng): Task {
  const total = groups * size;
  return {
    key: `${total}:${groups}`,
    level,
    kind: 'div-compose',
    lines: [[blank(0), op(':'), blank(1), op('='), blank(2)]],
    answers: [total, groups, size],
    main: { op: ':', a: total, b: groups, result: size },
    picture: { groups, size, mode: 'share' },
    choices: rng.shuffle([total, groups, size]),
  };
}

/** Triangle a, b, a·b → all four facts of the family. */
export function factFamilyTask(level: LevelId, a: number, b: number): Task {
  const p = a * b;
  const lines: Line[] = [
    [num(a), op('×'), num(b), op('='), blank(0)],
    [num(b), op('×'), num(a), op('='), blank(1)],
    [num(p), op(':'), num(a), op('='), blank(2)],
    [num(p), op(':'), num(b), op('='), blank(3)],
  ];
  const [x, y] = a < b ? [a, b] : [b, a];
  return {
    key: `family:${x}×${y}`,
    level,
    kind: 'fact-family',
    lines,
    answers: [p, p, b, a],
    main: { op: '×', a, b, result: p },
  };
}

/** Plain text of a task with blanks as «?» or filled with `values`. */
export function taskText(task: Task, values?: (number | undefined)[]): string {
  return task.lines
    .map((line) =>
      line
        .map((p) => (p.t === 'blank' ? String(values?.[p.i] ?? '?') : String(p.v)))
        .join(' '),
    )
    .join('; ');
}
