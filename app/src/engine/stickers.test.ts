import { describe, expect, it } from 'vitest';
import { earnedStickers, nextSticker, STICKERS, type StickerFacts } from './stickers';

const none: StickerFacts = { levelStars: {}, coins: 0, owned: [], attempts: [] };
const at = (day: number, i = 0) => `2026-11-${String(day).padStart(2, '0')}T10:00:${String(i).padStart(2, '0')}.000Z`;
const att = (o: Partial<StickerFacts['attempts'][number]>): StickerFacts['attempts'][number] => ({
  at: at(20),
  level: '+1',
  op: '+',
  a: 34,
  b: 5,
  correct: true,
  tryNo: 1,
  ...o,
});

describe('stickers', () => {
  it('there are 18, six in every row, ids unique', () => {
    expect(STICKERS).toHaveLength(18);
    expect(new Set(STICKERS.map((s) => s.id)).size).toBe(18);
    for (const row of ['islands', 'skills', 'effort']) expect(STICKERS.filter((s) => s.row === row)).toHaveLength(6);
  });

  it('a new child has none', () => {
    expect(earnedStickers(none)).toEqual([]);
  });

  it('stars give the first level, three stars and bosses', () => {
    expect(earnedStickers({ ...none, levelStars: { '+1': 1 } })).toEqual(['first-level']);
    expect(earnedStickers({ ...none, levelStars: { '+1': 3, '+♛': 1, '?♛': 2 } })).toEqual([
      'first-level',
      'boss-add',
      'boss-tasks',
      'three-stars',
    ]);
  });

  it('skills come from solved tasks, not from choosing the action', () => {
    expect(earnedStickers({ ...none, attempts: [att({ a: 47, b: 38 })] })).toEqual(['carry']);
    expect(earnedStickers({ ...none, attempts: [att({ a: 47, b: 38, correct: false })] })).toEqual([]);
    expect(earnedStickers({ ...none, attempts: [att({ op: '−', a: 52, b: 17 })] })).toEqual(['borrow']);
    expect(earnedStickers({ ...none, attempts: [att({ op: '−', a: 400, b: 127 })] })).toEqual(['borrow', 'zero']);
    expect(earnedStickers({ ...none, attempts: [att({ level: ':1', op: ':', a: 6, b: 3 })] })).toEqual(['share']);
    expect(earnedStickers({ ...none, attempts: [att({ level: ':4', op: '×', a: 5, b: 3 })] })).toEqual(['family']);
    expect(earnedStickers({ ...none, attempts: [att({ level: '?2', op: ':', a: 15, b: 3, stage: 'setup' })] })).toEqual([]);
    expect(earnedStickers({ ...none, attempts: [att({ level: '?2', op: ':', a: 15, b: 3 })] })).toEqual(['problem']);
  });

  it('effort: 10 in a row, coins, the explanation, a purchase, 7 days', () => {
    const ten = Array.from({ length: 10 }, (_, i) => att({ at: at(20, i) }));
    expect(earnedStickers({ ...none, attempts: ten })).toContain('ten-row');
    const broken = ten.map((x, i) => (i === 5 ? { ...x, correct: false } : x));
    expect(earnedStickers({ ...none, attempts: broken })).not.toContain('ten-row');
    expect(earnedStickers({ ...none, coins: 100 })).toEqual(['coins-100']);
    expect(earnedStickers({ ...none, attempts: [att({ correct: false, tryNo: 2 })] })).toEqual(['no-give-up']);
    expect(earnedStickers({ ...none, owned: ['wreath'] })).toEqual([]); // a boss gift is not a purchase
    expect(earnedStickers({ ...none, owned: ['ball'] })).toEqual(['first-buy']);
    const days = Array.from({ length: 7 }, (_, i) => att({ at: at(10 + i), correct: false }));
    expect(earnedStickers({ ...none, attempts: days })).toEqual(['week']);
  });

  it('«Скоро нова наліпка» picks the closest counted one', () => {
    expect(nextSticker({ ...none, coins: 82 }, [])).toEqual({ id: 'coins-100', have: 82, need: 100 });
    const run = Array.from({ length: 9 }, (_, i) => att({ at: at(20, i) }));
    expect(nextSticker({ ...none, coins: 10, attempts: run }, [])?.id).toBe('ten-row');
    expect(nextSticker({ ...none, coins: 50, attempts: run }, ['ten-row'])?.id).toBe('coins-100');
  });
});
