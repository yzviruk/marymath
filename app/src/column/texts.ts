import { bridgeBackPath, bridgeTenPath } from '../components/lineGeometry';
import { digitCount, type ColumnInfo } from '../engine/column';
import type { ErrorKind } from '../engine/types';
import type { ColumnInput } from './columnInput';

export const PLACE = ['Одиниці', 'Десятки', 'Сотні', 'Тисячі'];
/** «Перевір розряд …» */
export const PLACE_GEN = ['одиниць', 'десятків', 'сотень', 'тисяч'];
/** «позичаємо …», «1 … пишемо зверху» */
export const UNIT_ACC = ['одиницю', 'десяток', 'сотню', 'тисячу'];

/**
 * What the pet says while the child types: names the place and its numbers only, never
 * whether a digit is right (agreed: correctness is shown after «Перевірити»).
 */
export function coachLine(s: ColumnInput, column: ColumnInfo): string {
  const c = s.cursor;
  if (!c) return 'Готово? Натисни «Перевірити».';
  const p = column.places[c.place];
  const name = PLACE[c.place];
  if (column.op === '+') {
    const carry = s.carry[c.place];
    const extra = carry ? ` і ще ${carry} зверху` : '';
    return `${name}: ${p.a} + ${p.b}${extra}.`;
  }
  const top = p.a - (s.crossed[c.place] ? 1 : 0) + (s.crossed[c.place + 1] ? 10 : 0);
  return `${name}: ${top} − ${p.b}.`;
}

/** One step of the explanation for a place (step 2 of a mistake). */
export function placeStep(column: ColumnInfo, place: number): string {
  const p = column.places[place];
  const name = PLACE[place];
  if (column.op === '+') {
    const sum = p.a + p.b + p.in;
    const head = p.in ? `${name}: ${p.a} + ${p.b} і ще 1 зверху = ${sum}.` : `${name}: ${p.a} + ${p.b} = ${sum}.`;
    return p.out ? `${head} Пишемо ${p.digit}, а 1 ${UNIT_ACC[place + 1]} — зверху.` : `${head} Пишемо ${p.digit}.`;
  }
  const left = p.a - p.in;
  if (isLeadingZero(column, place)) return `${name}: нічого не лишилось — тут нічого не пишемо.`;
  if (p.out) {
    const next = column.places[place + 1];
    const viaZero = next && next.a === 0 ? ` У сусіда 0, тому спершу він позичає ${UNIT_ACC[place + 2]} зліва.` : '';
    return `${name}: з ${left} не відняти ${p.b} — позичаємо ${UNIT_ACC[place + 1]}.${viaZero} ${left + 10} − ${p.b} = ${p.digit}.`;
  }
  if (p.in) return `${name}: було ${p.a}, 1 позичили — лишилось ${left}. ${left} − ${p.b} = ${p.digit}.`;
  return `${name}: ${p.a} − ${p.b} = ${p.digit}.`;
}

/** Places on the left that stay empty because the result is shorter (1000 − 970 = 30). */
export function isLeadingZero(column: ColumnInfo, place: number): boolean {
  return place >= digitCount(column.result);
}

export function explainIntro(kind: ErrorKind): string {
  switch (kind) {
    case 'forgot-carry':
      return 'Коли в розряді 10 або більше, 10 одиниць стають 1 десятком — його пишемо зверху.';
    case 'no-borrow':
      return 'Коли зверху цифра менша, позичаємо десяток у сусіда зліва.';
    case 'borrow-through-zero':
      return 'Коли в сусіда 0, позичаємо далі зліва — по черзі.';
    default:
      return 'Розберімо по розрядах.';
  }
}

/** Jumps on the 0–20 line that help with one place: 7 + 8 → 7, 10, 15; 13 − 6 → 13, 10, 7. */
export function placeJumps(column: ColumnInfo, place: number): number[] {
  const p = column.places[place];
  if (column.op === '+') {
    const start = p.a + p.in;
    return p.b ? bridgeTenPath(start, p.b) : [start];
  }
  const top = p.a - p.in + 10 * p.out;
  return p.b ? bridgeBackPath(top, p.b) : [top];
}
