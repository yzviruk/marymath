import { expect, test, type Page } from '@playwright/test';
import { unlockLevel } from './unlock';

async function createProfile(page: Page, name = 'Марія') {
  await page.goto('./');
  await page.getByLabel('Імʼя').fill(name);
  await page.getByRole('button', { name: 'Котик' }).click();
  await page.getByRole('button', { name: 'Створити профіль' }).click();
  await expect(page.getByText('Карта островів')).toBeVisible();
}

async function openLevel(page: Page, id: string) {
  await unlockLevel(page, id);
  await page.getByRole('button', { name: new RegExp(`^Рівень ${id.replace('+', '\\+')}(,|$)`) }).click();
  await expect(page.getByLabel(/^Приклад у стовпчик/)).toBeVisible();
}

/** Reads the current column task from the board. */
async function currentTask(page: Page) {
  const label = (await page.getByLabel(/^Приклад у стовпчик/).getAttribute('aria-label'))!;
  const [, a, op, b] = label.match(/(\d+) ([+−]) (\d+)/)!;
  const x = Number(a);
  const y = Number(b);
  return { a: x, b: y, op, result: op === '+' ? x + y : x - y };
}

/** Types a number right to left on the keypad. */
async function typeNumber(page: Page, n: number) {
  for (const d of String(n).split('').reverse()) {
    await page.getByRole('button', { name: d, exact: true }).click();
  }
}

async function solveCurrent(page: Page) {
  const t = await currentTask(page);
  await typeNumber(page, t.result);
  await page.getByRole('button', { name: 'Перевірити' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Правильно!' })).toBeVisible();
  await page.getByRole('button', { name: 'Далі' }).click();
}

test('profile survives a reload', async ({ page }) => {
  await createProfile(page);
  await expect(page.getByText('Привіт, Марія!')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Привіт, Марія!')).toBeVisible();
  await page.getByRole('button', { name: 'Змінити гравця' }).click();
  await expect(page.getByRole('button', { name: /Марія/ })).toBeVisible();
});

test('column: carry written on top, coach names places only', async ({ page }) => {
  await createProfile(page);
  await openLevel(page, '+3');
  const t = await currentTask(page);
  await expect(page.getByRole('img', { name: 'Числова шкала від 0 до 20' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: `Одиниці: ${t.a % 10} + ${t.b % 10}.` })).toBeVisible();

  await page.getByRole('button', { name: String(t.result % 10), exact: true }).click();
  // A tap puts «1» into the carry circle at once; the keypad is not needed.
  const carry = page.getByRole('button', { name: 'Перенесення над десятки' });
  await carry.click();
  await expect(carry).toHaveText('1');
  await expect(carry).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status').filter({ hasText: 'і ще 1 зверху' })).toBeVisible();
  await page.getByRole('button', { name: String(Math.floor(t.result / 10)), exact: true }).click();
  await page.getByRole('button', { name: 'Перевірити' }).click();
  await expect(page.getByRole('status').filter({ hasText: `Правильно! ${t.a} + ${t.b} = ${t.result}.` })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Не забувай' })).toHaveCount(0);
});

test('column: a mistake goes hint → explanation → similar task', async ({ page }) => {
  await createProfile(page);
  await openLevel(page, '+3');
  const t = await currentTask(page);
  const forgotCarry = t.result - 10;

  await typeNumber(page, forgotCarry);
  await page.getByRole('button', { name: 'Перевірити' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Майже! Перевір розряд десятків.' })).toBeVisible();

  // The first new digit replaces the wrong one; still wrong → explanation.
  await page.getByRole('button', { name: String(Math.floor(forgotCarry / 10)), exact: true }).click();
  await page.getByRole('button', { name: 'Перевірити' }).click();
  await expect(page.getByTestId('error-kind')).toHaveText('forgot-carry');
  await expect(page.getByRole('status').filter({ hasText: 'його пишемо зверху' })).toBeVisible();
  await expect(page.getByRole('img', { name: /стрибки:/ })).toBeVisible();

  // A wrong digit in the explanation just repeats the step.
  await page.getByRole('button', { name: String((t.result % 10 + 1) % 10), exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Ще раз:' })).toBeVisible();

  await typeNumber(page, t.result);
  await expect(page.getByRole('status').filter({ hasText: 'Тепер схожий приклад' })).toBeVisible();
  await page.getByRole('button', { name: 'Далі' }).click();

  const similar = await currentTask(page);
  expect(similar.a + similar.b).not.toBe(0);
  expect(`${similar.a}+${similar.b}`).not.toBe(`${t.a}+${t.b}`);
  expect((similar.a % 10) + (similar.b % 10)).toBeGreaterThanOrEqual(10); // still a carry from ones
  // The extra task does not move the progress: first dot is orange, second is current.
  await expect(page.getByLabel('Приклад 2 з 10')).toBeVisible();
});

/** What the child writes above each place after borrowing (null = untouched): 111 − 29 → [11, 10, 0]. */
function borrowMarks(a: number, b: number): (number | null)[] {
  const da = [...String(a)].reverse().map(Number);
  const db = [...String(b)].reverse().map(Number);
  const marks: (number | null)[] = [];
  let lent = 0;
  for (let i = 0; i < da.length; i++) {
    const out = da[i] - lent < (db[i] ?? 0) ? 1 : 0;
    marks.push(lent || out ? da[i] - lent + 10 * out : null);
    lent = out;
  }
  return marks;
}

test('column: borrowing is written in the circles above, through zero too', async ({ page }) => {
  await createProfile(page);
  await openLevel(page, '−5');
  // Subtraction has no disk panel while solving.
  await expect(page.locator('.dp')).toHaveCount(0);
  const t = await currentTask(page);
  const places = ['одиниці', 'десятки', 'сотні', 'тисячі'];
  const marks = borrowMarks(t.a, t.b);
  for (const [p, m] of marks.entries()) {
    if (m === null) continue;
    await page.getByRole('button', { name: `Позичання: ${places[p]}` }).click();
    for (const d of String(m)) await page.getByRole('button', { name: d, exact: true }).click(); // as written: 1, then 0
    await expect(page.getByRole('button', { name: `Позичання: ${places[p]}` })).toHaveText(String(m));
  }
  await page.getByRole('button', { name: 'Відповідь, одиниці' }).click();
  await expect(page.getByRole('status').filter({ hasText: `Одиниці: ${marks[0] ?? t.a % 10} − ${t.b % 10}.` })).toBeVisible();
  await typeNumber(page, t.result);
  await page.getByRole('button', { name: 'Перевірити' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Правильно!' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'кружечках' })).toHaveCount(0);
});

test('column: a right answer without borrow marks gets only a reminder', async ({ page }) => {
  await createProfile(page);
  await openLevel(page, '−2');
  const t = await currentTask(page);
  await typeNumber(page, t.result);
  await page.getByRole('button', { name: 'Перевірити' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Правильно!' })).toContainText('кружечках зверху');
});

test('column: dragging 10 ones onto the tens exchanges them', async ({ page }) => {
  await createProfile(page);
  await openLevel(page, '+3');
  const t = await currentTask(page);
  const ones = (t.a % 10) + (t.b % 10);
  const tens = Math.floor(t.a / 10) + Math.floor(t.b / 10);
  await expect(page.getByTestId('disk-0')).toHaveCount(ones);

  const disk = page.getByTestId('disk-0').first();
  const target = page.locator('[data-disk-place="1"]');
  const from = (await disk.boundingBox())!;
  const to = (await target.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await page.mouse.up();

  await expect(page.getByTestId('disk-0')).toHaveCount(ones - 10);
  await expect(page.getByTestId('disk-1')).toHaveCount(tens + 1);
});

test('a whole level: 10 right → 3 stars and coins on the map', async ({ page }) => {
  await createProfile(page);
  await openLevel(page, '+1');
  for (let i = 0; i < 10; i++) await solveCurrent(page);
  await expect(page.getByRole('heading', { name: 'Рівень пройдено!' })).toBeVisible();
  await expect(page.getByText('10 з 10')).toBeVisible();
  await expect(page.getByRole('img', { name: '3 зірки з 3' })).toBeVisible();
  await expect(page.getByText('+35')).toBeVisible();
  await page.getByRole('button', { name: 'Карта' }).click();
  await expect(page.getByRole('button', { name: 'Рівень +1, зірок: 3' })).toBeVisible();
  await expect(page.locator('.coins').filter({ hasText: '35' })).toBeVisible();
});

test('map: islands fit the sea, passing a level opens the next, «Продовжити» leads on', async ({ page }) => {
  await createProfile(page);
  const sea = (await page.locator('.map-sea').boundingBox())!;
  for (const node of await page.locator('.map-node').all()) {
    const b = (await node.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(sea.x);
    expect(b.y).toBeGreaterThanOrEqual(sea.y);
    expect(b.x + b.width).toBeLessThanOrEqual(sea.x + sea.width);
    expect(b.y + b.height).toBeLessThanOrEqual(sea.y + sea.height);
  }
  await expect(page.locator('[data-island="add"] .map-sign')).toContainText('0 / 8');
  await expect(page.getByText('після всіх чотирьох босів')).toBeVisible();

  await page.locator('.map-continue').getByRole('button', { name: 'Грати' }).click();
  await expect(page.getByText('Додавання · Рівень +1')).toBeVisible();
  for (let i = 0; i < 10; i++) await solveCurrent(page);
  await page.getByRole('button', { name: 'Карта' }).click();
  await expect(page.getByRole('button', { name: 'Рівень +2', exact: true })).toBeVisible();
  await expect(page.locator('[data-island="add"] .map-sign')).toContainText('1 / 8');
  await expect(page.locator('.map-continue')).toContainText('Додавання · Рівень +2');
});

test('PWA manifest is served',async ({ request }) => {
  const res = await request.get('./manifest.webmanifest');
  expect(res.ok()).toBeTruthy();
  const manifest = await res.json();
  expect(manifest.orientation).toBe('landscape');
  expect(manifest.start_url).toBe('/marymath/');
});

test('parent can preview generated tasks of every level', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Для батьків' }).click();
  await page.getByRole('button', { name: 'Приклади рівнів' }).click();
  await expect(page.getByRole('listitem')).toHaveCount(10);
  await page.getByRole('tab', { name: 'Ділення' }).click();
  await page.getByRole('tab', { name: ':3' }).click();
  await expect(page.getByText('Склади приклад за малюнком')).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveCount(10);
  const before = await page.getByRole('list').innerText();
  await page.getByRole('button', { name: 'Ще' }).click();
  await expect(page.getByRole('list')).not.toHaveText(before);
});
