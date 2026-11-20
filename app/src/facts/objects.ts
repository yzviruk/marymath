/** :1 — apples dragged one by one from the pile into baskets. */
export interface Share {
  pile: number;
  baskets: number[];
}

export type Place = 'pile' | number;

export function initialShare(total: number, baskets: number): Share {
  return { pile: total, baskets: Array(baskets).fill(0) };
}

/** Moves one item; nothing happens when the source is empty or the places are the same. */
export function moveOne(s: Share, from: Place, to: Place): Share {
  if (from === to) return s;
  const have = from === 'pile' ? s.pile : s.baskets[from];
  if (!have) return s;
  const baskets = s.baskets.map((n, i) => n - (i === from ? 1 : 0) + (i === to ? 1 : 0));
  const pile = s.pile - (from === 'pile' ? 1 : 0) + (to === 'pile' ? 1 : 0);
  return { pile, baskets };
}

export const allShared = (s: Share) => s.pile === 0;
export const isEqualShare = (s: Share) => s.pile === 0 && s.baskets.every((n) => n === s.baskets[0]);

/** :2 — items tapped into groups of `size`, as if circled on a worksheet. */
export interface Grouping {
  size: number;
  /** Item indices of every finished group, in the order they were made. */
  groups: number[][];
  /** Items tapped for the group in progress. */
  picked: number[];
}

export function initialGrouping(size: number): Grouping {
  return { size, groups: [], picked: [] };
}

/** Tap an item: add it to the group in progress (or remove it); a tap on a finished group undoes it. */
export function tapItem(g: Grouping, item: number): Grouping {
  const inGroup = g.groups.findIndex((grp) => grp.includes(item));
  if (inGroup >= 0) return { ...g, groups: g.groups.filter((_, i) => i !== inGroup) };
  if (g.picked.includes(item)) return { ...g, picked: g.picked.filter((i) => i !== item) };
  const picked = [...g.picked, item];
  if (picked.length === g.size) return { ...g, groups: [...g.groups, picked], picked: [] };
  return { ...g, picked };
}

export const groupOf = (g: Grouping, item: number) => g.groups.findIndex((grp) => grp.includes(item));
export const allGrouped = (g: Grouping, total: number) => g.groups.length * g.size === total;
