/** Multiplication facts from the worksheets: factors 2–7 and 10. */
export const FACTORS = [2, 3, 4, 5, 6, 7, 10] as const;

/** Product limit on the first levels and on the later ones. */
export const EARLY_LIMIT = 20;
export const LATE_LIMIT = 35;

export interface Fact {
  a: number;
  b: number;
  product: number;
}

/** All ordered pairs a × b with both factors from FACTORS and product ≤ limit, filtered by `keep`. */
export function facts(limit: number, keep: (a: number, b: number) => boolean = () => true): Fact[] {
  const out: Fact[] = [];
  for (const a of FACTORS) {
    for (const b of FACTORS) {
      if (a * b <= limit && keep(a, b)) out.push({ a, b, product: a * b });
    }
  }
  return out;
}
