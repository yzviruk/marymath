/** Ukrainian noun forms after a number: 1 цукерка, 2 цукерки, 5 цукерок. */
export type Forms = readonly [one: string, few: string, many: string];

export function plural(n: number, forms: Forms): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1];
  return forms[2];
}

/** «4 цукерки» */
export const count = (n: number, forms: Forms) => `${n} ${plural(n, forms)}`;

export const CANDY: Forms = ['цукерка', 'цукерки', 'цукерок'];
export const GEM: Forms = ['камінець', 'камінці', 'камінців'];
export const APPLE: Forms = ['яблуко', 'яблука', 'яблук'];
export const BOX: Forms = ['коробка', 'коробки', 'коробок'];
export const BASKET: Forms = ['кошик', 'кошики', 'кошиків'];
export const GROUP: Forms = ['група', 'групи', 'груп'];
export const ROW: Forms = ['ряд', 'ряди', 'рядів'];
export const JUMP: Forms = ['стрибок', 'стрибки', 'стрибків'];
export const PART: Forms = ['частина', 'частини', 'частин'];
