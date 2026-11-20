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
  value: number;
  correct: boolean;
  /** Typical mistake (ErrorKind) or null when correct. */
  error: string | null;
  /** 1 = first check of this task, 2 = after the hint, 3 = after the explanation. */
  tryNo: number;
  hintUsed: boolean;
  ms: number;
}
