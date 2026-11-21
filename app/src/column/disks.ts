import type { ColumnInfo } from '../engine/column';

/** Number of place-value disks in each place (index 0 = ones). */
export type Disks = number[];

/** Addition: both numbers' disks together; subtraction: the top number only. */
export function initialDisks(column: ColumnInfo): Disks {
  return column.places.map((p) => (column.op === '+' ? p.a + p.b : p.a));
}

/** 10 disks of a place become 1 disk of the next place. */
export function canMerge(d: Disks, place: number): boolean {
  return place + 1 < d.length && d[place] >= 10;
}

export function merge(d: Disks, place: number): Disks {
  if (!canMerge(d, place)) return d;
  return d.map((n, i) => (i === place ? n - 10 : i === place + 1 ? n + 1 : n));
}

/** 1 disk of a place becomes 10 disks of the place below. */
export function canSplit(d: Disks, place: number): boolean {
  return place > 0 && place < d.length && d[place] >= 1;
}

export function split(d: Disks, place: number): Disks {
  if (!canSplit(d, place)) return d;
  return d.map((n, i) => (i === place ? n - 1 : i === place - 1 ? n + 10 : n));
}

/** Disk size (px) so that `count` disks fit a column of the panel with `columns` places. */
export function diskSize(count: number, columns: number, base: number): number {
  const width = (344 - 8 * (columns - 1)) / columns - 14;
  const height = 250;
  const gap = 5;
  for (let s = base; s > 18; s--) {
    const perRow = Math.max(1, Math.floor((width + gap) / (s + gap)));
    if (Math.ceil(count / perRow) * (s + gap) - gap <= height) return s;
  }
  return 18;
}

/**
 * Disks as they look while the child works on `active` place (the pictorial mode):
 * addition merges every place below it, subtraction makes the borrows the active place needs.
 */
export function disksAt(column: ColumnInfo, active: number): Disks {
  let d = initialDisks(column);
  if (column.op === '+') {
    for (let p = 0; p < active && p < d.length; p++) d = merge(d, p);
    return d;
  }
  for (let p = 0; p <= active && p < d.length; p++) {
    // Disks are not taken away here, so a place borrows only when it has fewer than it must give.
    if (d[p] < column.places[p].b) d = borrowInto(d, p);
  }
  return d;
}

/** Split from the nearest non-empty place on the left, passing through zeros (400 − 127). */
function borrowInto(d: Disks, place: number): Disks {
  let from = place + 1;
  while (from < d.length && d[from] === 0) from++;
  if (from >= d.length) return d;
  for (let p = from; p > place; p--) d = split(d, p);
  return d;
}

/** Disk value per place. */
export const DISK_VALUE = [1, 10, 100, 1000];
