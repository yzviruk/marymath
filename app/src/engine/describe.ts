import type { ErrorKind, Task } from './types';

const PROBLEM_KINDS = {
  join: 'дві частини → разом',
  'add-to': 'було і додали',
  'take-away': 'було і забрали',
  part: 'ціле і частина → друга частина',
  groups: 'однакові групи → усього',
  share: 'порівну на частини',
  measure: 'по скільки → скільки частин',
} as const;

const PLACE_FROM = ['з одиниць', 'з десятків', 'із сотень', 'з тисяч'];

/** Short Ukrainian tags describing what a task trains (for the parent preview and stats). */
export function describeTask(task: Task): string[] {
  const tags: string[] = [];
  const c = task.column;
  if (c) {
    if (c.op === '+') {
      tags.push(c.regroup.length ? `перенесення ${c.regroup.map((p) => PLACE_FROM[p]).join(' і ')}` : 'без перенесення');
    } else {
      // Borrowing at place p takes a ten from place p + 1.
      tags.push(c.regroup.length ? `позичання ${c.regroup.map((p) => PLACE_FROM[p + 1]).join(' і ')}` : 'без позичання');
      if (c.throughZero) tags.push('через нуль');
    }
    if (c.width === 4) tags.push('до 1000');
  }
  const pic = task.picture;
  if (pic) {
    const total = pic.groups * pic.size;
    if (pic.mode === 'equal-groups') tags.push(`${pic.groups} групи по ${pic.size}`);
    if (pic.mode === 'array') tags.push(`масив ${pic.groups} ряди по ${pic.size}`);
    if (pic.mode === 'share') tags.push(`${total} порівну в ${pic.groups} кошики`);
    if (pic.mode === 'group') tags.push(`${total} по ${pic.size} — скільки груп?`);
  }
  if (task.choices) tags.push(`числа: ${task.choices.join(', ')}`);
  if (task.problem) tags.push(PROBLEM_KINDS[task.problem.kind]);
  if (task.kind === 'fact-family') tags.push(`трикутник ${task.main.result} / ${task.main.a} / ${task.main.b}`);
  return tags;
}

export const ERROR_LABELS: Record<ErrorKind, string> = {
  'forgot-carry': 'Забула перенесення',
  'no-borrow': 'Не позичила десяток',
  'borrow-through-zero': 'Позичання через нуль',
  'reversed-division': 'Переплутаний порядок у діленні',
  'wrong-operation': 'Інша дія замість потрібної',
  'neighbor-fact': 'Сусідній факт',
  'reversed-order': 'Ціле не першим у відніманні',
  other: 'Інша помилка',
};
