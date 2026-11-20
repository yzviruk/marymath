/**
 * Column (vertical) addition and subtraction, digit by digit.
 * Place 0 = ones, 1 = tens, 2 = hundreds, 3 = thousands.
 */

export interface ColumnPlace {
  place: number;
  /** Digit of the top number. */
  a: number;
  /** Digit of the bottom number (0 when the number is shorter). */
  b: number;
  /** Digit of the result in this place. */
  digit: number;
  /** Addition: carried in from the place below. Subtraction: lent to the place below (top digit is reduced by 1). */
  in: 0 | 1;
  /** Addition: carried to the place above. Subtraction: borrowed from the place above. */
  out: 0 | 1;
}

export interface ColumnInfo {
  op: '+' | '−';
  a: number;
  b: number;
  result: number;
  /** Places shown in the column (longest of a, b, result). */
  width: number;
  /** Index 0 = ones. */
  places: ColumnPlace[];
  /** Places that carry (addition) or borrow (subtraction), ascending. */
  regroup: number[];
  /** Subtraction only: a borrow had to pass through a 0 digit (400 − 127). */
  throughZero: boolean;
}

export const PLACE_NAMES = ['одиниці', 'десятки', 'сотні', 'тисячі'] as const;

export function digitCount(n: number): number {
  return n === 0 ? 1 : Math.floor(Math.log10(Math.abs(n))) + 1;
}

/** Digits from ones up, padded with zeros to `width`. */
export function digitsOf(n: number, width = digitCount(n)): number[] {
  const out: number[] = [];
  for (let i = 0; i < width; i++) {
    out.push(Math.floor(n / 10 ** i) % 10);
  }
  return out;
}

export function columnAdd(a: number, b: number): ColumnInfo {
  const result = a + b;
  const width = Math.max(digitCount(a), digitCount(b), digitCount(result));
  const da = digitsOf(a, width);
  const db = digitsOf(b, width);
  const places: ColumnPlace[] = [];
  let carry: 0 | 1 = 0;
  for (let i = 0; i < width; i++) {
    const sum: number = da[i] + db[i] + carry;
    const out: 0 | 1 = sum >= 10 ? 1 : 0;
    places.push({ place: i, a: da[i], b: db[i], digit: sum % 10, in: carry, out });
    carry = out;
  }
  return {
    op: '+',
    a,
    b,
    result,
    width,
    places,
    regroup: places.filter((p) => p.out).map((p) => p.place),
    throughZero: false,
  };
}

export function columnSub(a: number, b: number): ColumnInfo {
  if (b > a) throw new Error(`${a} − ${b}: результат відʼємний`);
  const result = a - b;
  const width = Math.max(digitCount(a), digitCount(b));
  const da = digitsOf(a, width);
  const db = digitsOf(b, width);
  const places: ColumnPlace[] = [];
  let lent: 0 | 1 = 0;
  let throughZero = false;
  for (let i = 0; i < width; i++) {
    let top: number = da[i] - lent;
    if (lent && da[i] === 0) throughZero = true;
    const out: 0 | 1 = top < db[i] ? 1 : 0;
    top += out * 10;
    places.push({ place: i, a: da[i], b: db[i], digit: top - db[i], in: lent, out });
    lent = out;
  }
  return {
    op: '−',
    a,
    b,
    result,
    width,
    places,
    regroup: places.filter((p) => p.out).map((p) => p.place),
    throughZero,
  };
}
