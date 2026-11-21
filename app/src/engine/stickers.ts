import { columnAdd, columnSub } from './column';
import { getItem } from './shop';

/**
 * The sticker album (stage 5c): 18 stickers in three rows, as on the mockup.
 * Every rule reads what is already stored (stars, coins, things, attempts), so stickers
 * earned before the album existed appear at once.
 */
export type StickerRow = 'islands' | 'skills' | 'effort';

export interface StickerDef {
  id: string;
  name: string;
  /** What to do to get it — shown on an empty place. */
  how: string;
  row: StickerRow;
  color: string;
  /** An icon from components/StickerArt, or a short text («+1», «10»). */
  icon?: string;
  glyph?: string;
}

export const STICKER_ROWS: { id: StickerRow; title: string }[] = [
  { id: 'islands', title: 'Острови' },
  { id: 'skills', title: 'Уміння' },
  { id: 'effort', title: 'Старанність' },
];

export const STICKERS: StickerDef[] = [
  { id: 'first-level', name: 'Перший рівень', how: 'пройди перший рівень', row: 'islands', color: '#5B3FD6', icon: 'flag' },
  { id: 'boss-add', name: 'Лісова корона', how: 'переможи боса Додавання', row: 'islands', color: '#3FA34D', icon: 'tree' },
  { id: 'boss-sub', name: 'Пустельна корона', how: 'переможи боса Віднімання', row: 'islands', color: '#D9861C', icon: 'cactus' },
  { id: 'boss-mul', name: 'Цукеркова корона', how: 'переможи боса Множення', row: 'islands', color: '#E0508E', icon: 'lolly' },
  { id: 'boss-div', name: 'Кришталева корона', how: 'переможи боса Ділення', row: 'islands', color: '#3A8FD6', icon: 'crystal' },
  { id: 'boss-tasks', name: 'Корона замку', how: 'переможи боса Задач', row: 'islands', color: '#7A5BD6', icon: 'castle' },

  { id: 'carry', name: 'Перше перенесення', how: 'перенеси десяток', row: 'skills', color: '#E8770E', glyph: '+1' },
  { id: 'borrow', name: 'Перше позичання', how: 'позич десяток', row: 'skills', color: '#138A55', icon: 'swap' },
  { id: 'zero', name: 'Через нуль', how: 'віднімай від 400', row: 'skills', color: '#2F6FED', glyph: '0' },
  { id: 'share', name: 'Порівну', how: 'розклади порівну', row: 'skills', color: '#C2417A', glyph: ':' },
  { id: 'family', name: 'Сімейство фактів', how: 'склади 4 приклади', row: 'skills', color: '#8A5BD6', icon: 'triangle' },
  { id: 'problem', name: 'Перша задача', how: 'розвʼяжи задачу', row: 'skills', color: '#B5722A', icon: 'book' },

  { id: 'ten-row', name: '10 поспіль', how: '10 правильних поспіль', row: 'effort', color: '#1E9E63', glyph: '10' },
  { id: 'three-stars', name: 'Три зірки', how: 'пройди рівень на 3 зірки', row: 'effort', color: '#E6A100', icon: 'star' },
  { id: 'coins-100', name: '100 монеток', how: 'збери 100 монеток', row: 'effort', color: '#D98A12', icon: 'coin' },
  { id: 'no-give-up', name: 'Не здаюся', how: 'виправ помилку', row: 'effort', color: '#E5484D', icon: 'heart' },
  { id: 'first-buy', name: 'Перша покупка', how: 'купи щось у магазині', row: 'effort', color: '#2E9C9C', icon: 'bag' },
  { id: 'week', name: 'Тиждень занять', how: 'займайся 7 різних днів', row: 'effort', color: '#4F6BD6', icon: 'cal' },
];

export const getSticker = (id: string) => STICKERS.find((s) => s.id === id);

/** What the rules look at; attempts as stored (data/types Attempt). */
export interface StickerFacts {
  levelStars: Record<string, number>;
  coins: number;
  owned: string[];
  attempts: {
    at: string;
    level: string;
    op: string;
    a: number;
    b: number;
    correct: boolean;
    tryNo: number;
    /** 'setup' — choosing the action of a word problem, not solving it. */
    stage?: string;
  }[];
}

const BOSSES: Record<string, string> = { 'boss-add': '+♛', 'boss-sub': '−♛', 'boss-mul': '×♛', 'boss-div': ':♛', 'boss-tasks': '?♛' };

export const TEN_ROW = 10;
export const COINS_GOAL = 100;
export const WEEK_DAYS = 7;

/** The longest run of tasks right at the first check, and the run going on now. */
export function firstTryRuns(f: StickerFacts): { best: number; now: number } {
  let best = 0;
  let now = 0;
  const firsts = f.attempts.filter((x) => x.tryNo === 1 && x.stage !== 'setup').sort((x, y) => x.at.localeCompare(y.at));
  for (const x of firsts) {
    now = x.correct ? now + 1 : 0;
    best = Math.max(best, now);
  }
  return { best, now };
}

export const activeDays = (f: StickerFacts) => new Set(f.attempts.map((x) => x.at.slice(0, 10))).size;

/** Ids of every sticker the facts have earned, in album order. */
export function earnedStickers(f: StickerFacts): string[] {
  const stars = Object.entries(f.levelStars);
  const solved = f.attempts.filter((x) => x.correct && x.stage !== 'setup');
  const rules: Record<string, () => boolean> = {
    'first-level': () => stars.some(([, s]) => s >= 1),
    carry: () => solved.some((x) => x.op === '+' && columnAdd(x.a, x.b).regroup.length > 0),
    borrow: () => solved.some((x) => x.op === '−' && x.a > x.b && columnSub(x.a, x.b).regroup.length > 0),
    zero: () => solved.some((x) => x.op === '−' && x.a > x.b && columnSub(x.a, x.b).throughZero),
    share: () => solved.some((x) => x.level === ':1'),
    family: () => solved.some((x) => x.level === ':4'),
    problem: () => solved.some((x) => x.level.startsWith('?')),
    'ten-row': () => firstTryRuns(f).best >= TEN_ROW,
    'three-stars': () => stars.some(([, s]) => s >= 3),
    'coins-100': () => f.coins >= COINS_GOAL,
    // A second mistake leads to the explanation, and the child always finishes the task herself.
    'no-give-up': () => f.attempts.some((x) => x.tryNo === 2 && !x.correct),
    'first-buy': () => f.owned.some((id) => getItem(id)?.price != null),
    week: () => activeDays(f) >= WEEK_DAYS,
  };
  return STICKERS.filter((s) => (BOSSES[s.id] ? (f.levelStars[BOSSES[s.id]] ?? 0) >= 1 : rules[s.id]())).map((s) => s.id);
}

/** «Скоро нова наліпка»: the counted sticker closest to done among those not got yet. */
export function nextSticker(f: StickerFacts, got: Iterable<string>): { id: string; have: number; need: number } | null {
  const have = new Set(got);
  const options = [
    { id: 'coins-100', have: f.coins, need: COINS_GOAL },
    { id: 'ten-row', have: firstTryRuns(f).now, need: TEN_ROW },
    { id: 'week', have: activeDays(f), need: WEEK_DAYS },
  ].filter((o) => !have.has(o.id) && o.have < o.need);
  if (!options.length) return null;
  return options.reduce((best, o) => (o.have / o.need > best.have / best.need ? o : best));
}
