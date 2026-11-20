/** Geometry of the 0–20 number line, shared by the component and tests. */
export const LINE_MIN = 0;
export const LINE_MAX = 20;
export const LINE_WIDTH = 1232;
export const LINE_HEIGHT = 120;
export const STEP_PX = 58;
export const ORIGIN_PX = 36;

export const xOf = (n: number) => ORIGIN_PX + STEP_PX * n;

export type ArcLabelMode = 'delta' | 'count' | 'none';

export interface Arc {
  from: number;
  to: number;
  left: number;
  width: number;
  forward: boolean;
  label: string;
  /** SVG path inside the arc's own box (width × 56). */
  d: string;
  head: string;
}

export function onLine(n: number): boolean {
  return Number.isInteger(n) && n >= LINE_MIN && n <= LINE_MAX;
}

/** Jump arcs between consecutive points of a path; points off the line are dropped. */
export function buildArcs(path: number[], mode: ArcLabelMode = 'delta'): Arc[] {
  const pts = path.filter(onLine);
  const arcs: Arc[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const from = pts[i];
    const to = pts[i + 1];
    if (from === to) continue;
    const left = xOf(Math.min(from, to));
    const width = xOf(Math.max(from, to)) - left;
    const forward = to > from;
    const diff = Math.abs(to - from);
    const label =
      mode === 'none' ? '' : mode === 'count' ? String(arcs.length + 1) : `${forward ? '+' : '−'}${diff}`;
    arcs.push({
      from,
      to,
      left,
      width,
      forward,
      label,
      d: `M 2 54 Q ${width / 2} -22 ${width - 2} 54`,
      head: forward ? `${width - 12},44 ${width - 1},56 ${width - 2},40` : '12,44 1,56 2,40',
    });
  }
  return arcs;
}

/** 3 × 4 → [0, 3, 6, 9, 12]: `times` jumps of `size` from 0. */
export function multiplicationPath(size: number, times: number): number[] {
  return Array.from({ length: times + 1 }, (_, i) => i * size);
}

/** 12 : 3 → [12, 9, 6, 3, 0]: jumps back by `size` to 0 (exact division only). */
export function divisionPath(total: number, size: number): number[] {
  if (size <= 0 || total % size !== 0) throw new Error(`${total} : ${size} не ділиться без остачі`);
  return multiplicationPath(size, total / size).reverse();
}

/** 7 + 8 → [7, 10, 15]: to the next ten, then the rest. */
export function bridgeTenPath(a: number, b: number): number[] {
  const toTen = (10 - (a % 10)) % 10;
  if (toTen === 0 || b <= toTen) return [a, a + b];
  return [a, a + toTen, a + b];
}
