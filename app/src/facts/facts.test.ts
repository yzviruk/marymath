import { describe, expect, it } from 'vitest';
import { classifyError, isCorrect } from '../engine/check';
import { LEVELS } from '../engine/levels';
import { Rng } from '../engine/rng';
import { divComposeTask, factFamilyTask, factTask, repeatedAddTask } from '../engine/tasks';
import {
  eraseDigit,
  initialFactInput,
  type FactInput,
  markWrong,
  placeChoice,
  takeBack,
  typeDigit,
  typeTowards,
  usedChoices,
} from './factInput';
import { allGrouped, initialGrouping, initialShare, isEqualShare, moveOne, tapItem } from './objects';
import { condition, explanation, factPath, firstHint, hintLine, lineLabels } from './texts';
import { count, CANDY } from './words';

describe('words', () => {
  it('agrees nouns with numbers', () => {
    expect([1, 2, 4, 5, 11, 12, 21, 22, 25, 35].map((n) => count(n, CANDY))).toEqual([
      '1 цукерка',
      '2 цукерки',
      '4 цукерки',
      '5 цукерок',
      '11 цукерок',
      '12 цукерок',
      '21 цукерка',
      '22 цукерки',
      '25 цукерок',
      '35 цукерок',
    ]);
  });
});

describe('typing into boxes', () => {
  it('builds two-digit numbers and moves on', () => {
    let s = initialFactInput(2);
    s = typeDigit(s, 2);
    expect(s).toMatchObject({ values: [2, null], cursor: 0 });
    s = typeDigit(s, 4);
    expect(s).toMatchObject({ values: [24, null], cursor: 1 });
    s = typeDigit(s, 6);
    expect(s.values).toEqual([24, 6]);
  });

  it('a third digit starts the number over; erase removes the last digit', () => {
    let s: FactInput = { ...initialFactInput(1), values: [24] };
    s = typeDigit(s, 3);
    expect(s.values).toEqual([3]);
    s = eraseDigit({ ...s, values: [35] });
    expect(s.values).toEqual([3]);
  });

  it('after a failed check the first digit replaces the old answer', () => {
    let s = markWrong({ values: [5, 28], cursor: 1, fresh: [false, false] }, [1]);
    expect(s.cursor).toBe(1);
    s = typeDigit(s, 2);
    expect(s.values).toEqual([5, 2]);
    s = typeDigit(s, 4);
    expect(s.values).toEqual([5, 24]);
  });

  it('places tapped numbers for :3 and gives them back', () => {
    const choices = [4, 24, 6];
    let s = initialFactInput(3);
    s = placeChoice(s, 24);
    s = placeChoice(s, 6);
    expect(s.values).toEqual([24, 6, null]);
    expect(usedChoices(s.values, choices)).toEqual([false, true, true]);
    s = takeBack(s, 0);
    expect(s).toMatchObject({ values: [null, 6, null], cursor: 0 });
    s = placeChoice(s, 4);
    expect(s.values).toEqual([4, 6, null]);
  });

  it('a tapped number replaces a box marked wrong', () => {
    let s = markWrong({ values: [4, 6, 24], cursor: 2, fresh: [false, false, false] }, [0]);
    s = placeChoice(takeBack(s, 2), 24);
    expect(s.values).toEqual([24, 6, null]);
  });

  it('checks the explanation answer digit by digit', () => {
    expect(typeTowards(null, 2, 24)).toEqual({ value: 2, result: 'wait' });
    expect(typeTowards(2, 4, 24)).toEqual({ value: 24, result: 'ok' });
    expect(typeTowards(null, 3, 24).result).toBe('wrong');
    expect(typeTowards(null, 4, 4).result).toBe('ok');
  });
});

describe('objects', () => {
  it('shares apples into baskets', () => {
    let s = initialShare(6, 3);
    for (const b of [0, 1, 2, 0, 1]) s = moveOne(s, 'pile', b);
    expect(isEqualShare(s)).toBe(false);
    s = moveOne(s, 'pile', 0);
    expect(s).toEqual({ pile: 0, baskets: [3, 2, 1] });
    expect(isEqualShare(s)).toBe(false);
    s = moveOne(s, 0, 2);
    expect(isEqualShare(s)).toBe(true);
    expect(moveOne(initialShare(2, 2), 0, 1)).toEqual(initialShare(2, 2));
  });

  it('groups items by taps; a tap on a group undoes it', () => {
    let g = initialGrouping(2);
    g = tapItem(g, 0);
    g = tapItem(g, 0);
    expect(g.picked).toEqual([]);
    for (const i of [0, 3, 1, 2]) g = tapItem(g, i);
    expect(g.groups).toEqual([
      [0, 3],
      [1, 2],
    ]);
    expect(allGrouped(g, 4)).toBe(true);
    g = tapItem(g, 3);
    expect(g.groups).toEqual([[1, 2]]);
  });
});

describe('texts', () => {
  it('words the conditions like the worksheets', () => {
    expect(condition(factTask(':1', ':', 12, 3, { groups: 3, size: 4, mode: 'share' }), 'concrete')).toBe(
      '12 яблук розклали порівну в 3 кошики. Скільки яблук у кожному кошику?',
    );
    expect(condition(repeatedAddTask('×1', 4, 3), 'concrete')).toBe(
      '3 коробки, у кожній по 4 цукерки. Скільки всього цукерок?',
    );
    expect(condition(factTask(':5', ':', 30, 6), 'abstract')).toBe('Скільки буде 30 : 6?');
    expect(lineLabels(divComposeTask(':3', 6, 4, new Rng(1)), 'pictorial')).toEqual([
      'усього',
      'скільки частин',
      'в одній частині',
    ]);
  });

  it('first hints never give the answer', () => {
    const t = divComposeTask(':3', 6, 4, new Rng(1));
    const err = classifyError(t, [4, 6, 24])!;
    expect(err).toBe('reversed-division');
    expect(firstHint(t, err, 0)).toBe('Майже! Спочатку пишемо, скільки всього.');
    const m = factTask('×6', '×', 6, 4);
    for (const kind of ['neighbor-fact', 'wrong-operation', 'other'] as const) {
      expect(firstHint(m, kind, 0)).not.toContain('24');
    }
  });

  it('jumps fit the 0–20 line or fall back to counting groups', () => {
    expect(factPath({ op: '×', a: 3, b: 4, result: 12 })).toEqual([0, 3, 6, 9, 12]);
    expect(factPath({ op: ':', a: 12, b: 3, result: 4 })).toEqual([12, 9, 6, 3, 0]);
    expect(factPath({ op: '×', a: 6, b: 4, result: 24 })).toBeNull();
    expect(hintLine(factTask('×6', '×', 6, 4), 0)).toBe('Лічи по коробках: 6, 12, 18…');
  });

  it('explains «4 : 6 = 24» with the bar model, whole first', () => {
    const t = divComposeTask(':3', 6, 4, new Rng(1));
    const e = explanation(t, [4, 6, 24], 'reversed-division', 0);
    expect(e.yours).toBe('4 : 6 = 24');
    expect(e.caption).toBe('6 коробок, у кожній по 4 камінці');
    expect(e.titles[1]).toBe('Спочатку пишемо, скільки всього');
    expect(e.bar).toBe(true);
    expect(e.wide).toBe(true);
  });

  it('explains the wrong line of a fact family', () => {
    const t = factFamilyTask(':4', 5, 3);
    const values = [15, 15, 4, 5];
    expect(isCorrect(t, values)).toBe(false);
    const e = explanation(t, values, 'neighbor-fact', 2);
    expect(e.fact).toEqual({ op: ':', a: 15, b: 5, result: 3 });
    expect(e.yours).toBe('15 : 5 = 4');
    expect(e.path).toEqual([15, 10, 5, 0]);
  });
});

describe('review', () => {
  it('every level except bosses rebuilds its own tasks', () => {
    const rng = new Rng(5);
    // Word problems are not rebuilt from their numbers: their texts differ, review skips them.
    for (const level of LEVELS.filter((l) => !l.boss && l.island !== 'tasks')) {
      for (let i = 0; i < 30; i++) {
        const t = level.make(rng);
        const again = level.rebuild!(t.main.a, t.main.b);
        expect([again.key, again.kind, again.picture], `${level.id} ${t.key}`).toEqual([t.key, t.kind, t.picture]);
      }
    }
  });

  it('every × and : task has a picture or a family triangle', () => {
    const rng = new Rng(9);
    for (const level of LEVELS.filter((l) => l.island === 'mul' || l.island === 'div')) {
      for (let i = 0; i < 30; i++) {
        const t = level.make(rng);
        expect(t.picture !== undefined || t.kind === 'fact-family', t.key).toBe(true);
      }
    }
  });
});
