export const PET_KINDS = ['dog', 'cat', 'unicorn', 'panda', 'capybara'] as const;
export type PetKind = (typeof PET_KINDS)[number];

export const PET_LABELS: Record<PetKind, string> = {
  dog: 'Мальтіпу',
  cat: 'Котик',
  unicorn: 'Єдиноріг',
  panda: 'Панда',
  capybara: 'Капібара',
};

export const DEFAULT_PET_NAME = 'Персик';

export interface Profile {
  id: string;
  name: string;
  pet: PetKind;
  petName: string;
  createdAt: string; // ISO
  /** Sum of the best stars of every level. */
  stars: number;
  coins: number;
  /** Best stars (0–3) per level id, e.g. { '+3': 2 }. */
  levelStars?: Record<string, number>;
  /** The level finished last — «Продовжити» on the map stays on its island. */
  lastLevel?: string;
  /** Shop: things the child has (bought or got from a boss), item ids from engine/shop.ts. */
  owned?: string[];
  /** Clothes on the pet, one per slot. */
  worn?: Partial<Record<'head' | 'ear' | 'eyes' | 'neck', string>>;
  /** Toys and room things the child put away. */
  hidden?: string[];
  /** Stickers of the album (engine/stickers.ts): id → the day it was got (YYYY-MM-DD). */
  stickers?: Record<string, string>;
}

/** One press of «Перевірити». */
export interface Attempt {
  id?: number;
  profileId: string;
  at: string; // ISO
  level: string;
  taskKey: string;
  /** Enough to rebuild the task for review. */
  op: '+' | '−' | '×' | ':';
  a: number;
  b: number;
  /** The answer of the first wrong blank (or the last blank when right). */
  value: number;
  /** Every blank as typed, for tasks with several boxes (×1, ×2, :3, :4). */
  values?: (number | null)[];
  correct: boolean;
  /** Typical mistake (ErrorKind) or null when correct. */
  error: string | null;
  /** 1 = first check of this task, 2 = after the hint, 3 = after the explanation. */
  tryNo: number;
  hintUsed: boolean;
  ms: number;
  /** Word problems: 'setup' — the check of the chosen action and numbers, before solving. */
  stage?: 'setup';
}
