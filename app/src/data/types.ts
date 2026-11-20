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
  stars: number;
  coins: number;
}
