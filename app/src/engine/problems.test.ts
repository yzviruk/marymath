import { describe, expect, it } from 'vitest';
import { plural, type Forms } from '../facts/words';
import { FACTORS, LATE_LIMIT } from './facts';
import { getLevel } from './levels';
import { answerSentence, problemText, setupError } from './problems';
import { isUnlocked, tasksIslandOpen } from './progress';
import { Rng } from './rng';
import type { Task } from './types';

function generate(id: string, runs = 600): Task[] {
  const level = getLevel(id);
  const rng = new Rng(777);
  return Array.from({ length: runs }, () => level.make(rng));
}

const isFactor = (n: number) => (FACTORS as readonly number[]).includes(n);

describe('word problems', () => {
  const q1 = generate('?1');
  const q2 = generate('?2');

  it('?1 is + or − with numbers for a column up to 1000', () => {
    for (const t of q1) {
      const { op, a, b, result } = t.main;
      expect(['+', '−'], t.key).toContain(op);
      expect(a >= 10 && b >= 10, t.key).toBe(true);
      expect(result, t.key).toBeLessThanOrEqual(999);
      expect(result, t.key).toBeGreaterThanOrEqual(10);
    }
    const kinds = new Set(q1.map((t) => t.problem!.kind));
    expect([...kinds].sort()).toEqual(['add-to', 'join', 'part', 'take-away']);
  });

  it('?2 is × or : with factors 2–7 and 10, up to 35, no remainder', () => {
    for (const t of q2) {
      const { op, a, b, result } = t.main;
      expect(['×', ':'], t.key).toContain(op);
      const [x, y] = op === '×' ? [a, b] : [b, result];
      expect(isFactor(x) && isFactor(y), t.key).toBe(true);
      expect(op === '×' ? result : a, t.key).toBeLessThanOrEqual(LATE_LIMIT);
      expect(Number.isInteger(result), t.key).toBe(true);
    }
    const kinds = new Set(q2.map((t) => t.problem!.kind));
    expect([...kinds].sort()).toEqual(['groups', 'measure', 'share']);
  });

  it('the text names both numbers in order, asks a question, has no gaps', () => {
    for (const t of [...q1, ...q2]) {
      const p = t.problem!;
      const text = problemText(p);
      const nums = p.pieces.filter((x) => typeof x !== 'string') as { n: number; i: number }[];
      expect(nums.map((x) => x.n), text).toEqual(p.given);
      expect(nums.map((x) => x.i), text).toEqual([0, 1]);
      expect(text.endsWith('?'), text).toBe(true);
      expect(text, text).not.toMatch(/undefined|NaN|\s{2}| [.,?]/);
      expect(answerSentence(p, t.main.result), text).toMatch(/^[А-ЯІЇЄҐ].* \d+ [а-яіїєґʼ' ]+\.$/);
    }
  });

  it('nouns agree with the numbers', () => {
    const texts = [...q1, ...q2].map((t) => problemText(t.problem!));
    const nouns: Forms[] = [
      ['наліпка', 'наліпки', 'наліпок'],
      ['книга', 'книги', 'книг'],
      ['яблуко', 'яблука', 'яблук'],
      ['олівець', 'олівці', 'олівців'],
      ['цукерка', 'цукерки', 'цукерок'],
      ['горіх', 'горіхи', 'горіхів'],
      ['тарілка', 'тарілки', 'тарілок'],
      ['кошик', 'кошики', 'кошиків'],
      ['сторінка', 'сторінки', 'сторінок'],
    ];
    let checked = 0;
    for (const text of texts) {
      for (const [, num, word] of text.matchAll(/(\d+) ([а-яіїєґ]+)/g)) {
        const forms = nouns.find((f) => f.includes(word) || (word.length > 3 && word.endsWith('у') && f[0].startsWith(word.slice(0, -1))));
        if (!forms) continue;
        checked++;
        const n = Number(num);
        const ok = word === plural(n, forms) || (plural(n, forms) === forms[0] && word.endsWith('у'));
        expect(ok, `${text} — ${num} ${word}`).toBe(true);
      }
    }
    expect(checked).toBeGreaterThan(500);
  });

  it('the bar model matches the numbers', () => {
    for (const t of [...q1, ...q2]) {
      const { bar } = t.problem!;
      const { op, a, b, result } = t.main;
      const whole = op === '+' || op === '×' ? result : a;
      if (bar.whole !== null) expect(bar.whole, t.key).toBe(whole);
      const known = bar.parts.map((p) => p.value ?? 0).reduce((s, v) => s + v, 0);
      if (bar.parts.every((p) => p.value !== null)) expect(known, t.key).toBe(whole);
      if (op === ':') expect(bar.parts.length, t.key).toBe(t.problem!.kind === 'share' ? b : result);
    }
  });

  it('checks the action and the order: whole first for − and :', () => {
    const t = q2.find((x) => x.main.op === ':')!;
    const { a, b } = t.main;
    expect(setupError(t, ':', a, b)).toBeNull();
    expect(setupError(t, ':', b, a)).toBe('reversed-division');
    expect(setupError(t, '×', a, b)).toBe('wrong-operation');
    const m = q2.find((x) => x.main.op === '×')!;
    expect(setupError(m, '×', m.main.b, m.main.a)).toBeNull();
    const s = q1.find((x) => x.main.op === '−')!;
    expect(setupError(s, '−', s.main.b, s.main.a)).toBe('reversed-order');
    expect(setupError(s, '+', s.main.a, s.main.b)).toBe('wrong-operation');
    const p = q1.find((x) => x.main.op === '+')!;
    expect(setupError(p, '+', p.main.b, p.main.a)).toBeNull();
  });

  it('a share problem reads well', () => {
    const t = q2.find((x) => x.problem!.kind === 'share' && x.problem!.pieces.some((y) => typeof y === 'string' && y.includes('сторінки')))!;
    expect(problemText(t.problem!)).toMatch(/^\S+ розкла(?:в|ла) \d+ наліп\S+ порівну на \d+ сторін\S+ альбому\. Скільки наліпок на кожній сторінці\?$/);
  });
});

describe('the Задачі island', () => {
  const bosses = { '+♛': 1, '−♛': 1, '×♛': 1, ':♛': 1 };
  it('opens ?1 and ?2 with all four bosses, the boss after both', () => {
    expect(isUnlocked({}, '?1')).toBe(false);
    expect(tasksIslandOpen(bosses)).toBe(true);
    expect(isUnlocked(bosses, '?1')).toBe(true);
    expect(isUnlocked(bosses, '?2')).toBe(false);
    expect(isUnlocked({ ...bosses, '?1': 1 }, '?2')).toBe(true);
    expect(isUnlocked({ ...bosses, '?1': 1, '?2': 2 }, '?♛')).toBe(true);
  });
});
