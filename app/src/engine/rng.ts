/** Small seeded PRNG (mulberry32): the same seed always gives the same tasks. */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max], both inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('pick from empty list');
    return items[Math.floor(this.next() * items.length)];
  }

  shuffle<T>(items: readonly T[]): T[] {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** A fresh seed derived from this generator (for nested generators). */
  fork(): Rng {
    return new Rng(Math.floor(this.next() * 4294967296));
  }
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 4294967296);
}

/** Retries `make` until `ok` accepts the result. */
export function sample<T>(make: () => T, ok: (value: T) => boolean, tries = 20000): T {
  for (let i = 0; i < tries; i++) {
    const v = make();
    if (ok(v)) return v;
  }
  throw new Error('sample: no value satisfied the constraint');
}
