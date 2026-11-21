import type { IslandId } from './types';

/**
 * The pet shop (stage 5b). Clothes are worn by the pet (one per slot), toys and room things
 * stand in the pet's room. Rare things are not sold: a boss gives one the first time it is passed.
 */
export type ShopTab = 'clothes' | 'toys' | 'room';
export type Slot = 'head' | 'ear' | 'eyes' | 'neck';

export interface ShopItem {
  id: string;
  name: string;
  /** Accusative after «Дякую за …»: «Дякую за шапочку!» */
  thanks: string;
  tab: ShopTab;
  /** Price in coins; null = rare, not sold. */
  price: number | null;
  /** Clothes only: where it is worn. */
  slot?: Slot;
  /** Rare things: the island whose boss gives it. */
  rareFor?: IslandId;
}

export const SHOP: ShopItem[] = [
  { id: 'bow', name: 'Бантик', thanks: 'бантик', tab: 'clothes', price: 15, slot: 'ear' },
  { id: 'hat', name: 'Шапочка', thanks: 'шапочку', tab: 'clothes', price: 20, slot: 'head' },
  { id: 'scarf', name: 'Шарфик', thanks: 'шарфик', tab: 'clothes', price: 25, slot: 'neck' },
  { id: 'glasses', name: 'Окуляри', thanks: 'окуляри', tab: 'clothes', price: 40, slot: 'eyes' },
  { id: 'mask', name: 'Маска героя', thanks: 'маску героя', tab: 'clothes', price: 90, slot: 'eyes' },
  { id: 'crown', name: 'Корона', thanks: 'корону', tab: 'clothes', price: 200, slot: 'head' },
  { id: 'wreath', name: 'Лісовий віночок', thanks: 'віночок', tab: 'clothes', price: null, slot: 'head', rareFor: 'add' },

  { id: 'ball', name: 'Мʼячик', thanks: 'мʼячик', tab: 'toys', price: 10 },
  { id: 'blocks', name: 'Кубики', thanks: 'кубики', tab: 'toys', price: 20 },
  { id: 'balloon', name: 'Кулька', thanks: 'кульку', tab: 'toys', price: 30 },
  { id: 'teddy', name: 'Ведмедик', thanks: 'ведмедика', tab: 'toys', price: 60 },
  { id: 'lollipop', name: 'Льодяник-велетень', thanks: 'льодяник', tab: 'toys', price: null, rareFor: 'mul' },

  { id: 'flower', name: 'Квітка', thanks: 'квітку', tab: 'room', price: 15 },
  { id: 'rug', name: 'Килимок', thanks: 'килимок', tab: 'room', price: 30 },
  { id: 'lamp', name: 'Лампа', thanks: 'лампу', tab: 'room', price: 40 },
  { id: 'picture', name: 'Картина', thanks: 'картину', tab: 'room', price: 50 },
  { id: 'bed', name: 'Ліжечко', thanks: 'ліжечко', tab: 'room', price: 80 },
  { id: 'aquarium', name: 'Акваріум', thanks: 'акваріум', tab: 'room', price: 120 },
  { id: 'castle', name: 'Пісочний замок', thanks: 'пісочний замок', tab: 'room', price: null, rareFor: 'sub' },
  { id: 'crystal', name: 'Чарівний кристал', thanks: 'кристал', tab: 'room', price: null, rareFor: 'div' },
];

export function getItem(id: string): ShopItem | undefined {
  return SHOP.find((i) => i.id === id);
}

/** The rare thing a boss of this island gives. */
export function rareItemFor(island: IslandId): ShopItem | undefined {
  return SHOP.find((i) => i.rareFor === island);
}

export type Worn = Partial<Record<Slot, string>>;

/** Putting on an item takes off whatever was in its slot. */
export function wear(worn: Worn, itemId: string): Worn {
  const item = getItem(itemId);
  if (!item?.slot) return worn;
  return { ...worn, [item.slot]: itemId };
}

export function takeOff(worn: Worn, itemId: string): Worn {
  return Object.fromEntries(Object.entries(worn).filter(([, id]) => id !== itemId)) as Worn;
}

/** Worn item ids in drawing order (head things over the bow, glasses over the mask). */
export function wornIds(worn: Worn | undefined): string[] {
  if (!worn) return [];
  return (['neck', 'ear', 'eyes', 'head'] as Slot[]).flatMap((s) => (worn[s] ? [worn[s]!] : []));
}
