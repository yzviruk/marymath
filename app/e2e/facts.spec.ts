import { expect, test, type Page } from '@playwright/test';

async function createProfile(page: Page, name = 'Марія') {
  await page.goto('./');
  await page.getByLabel('Імʼя').fill(name);
  await page.getByRole('button', { name: 'Котик' }).click();
  await page.getByRole('button', { name: 'Створити профіль' }).click();
  await expect(page.getByText('Карта островів')).toBeVisible();
}

async function openLevel(page: Page, id: string) {
  await page.getByRole('button', { name: new RegExp(`^Рівень ${id}(,|$)`) }).click();
  await expect(page.getByRole('group', { name: /^Приклад:/ })).toBeVisible();
}

/** The written example as the screen reads it: «Приклад: 4 + 4 + 4 = 4 × ? = ?». */
async function example(page: Page) {
  return (await page.getByRole('group', { name: /^Приклад:/ }).getAttribute('aria-label'))!.replace('Приклад: ', '');
}

async function typeNumber(page: Page, n: number) {
  for (const d of String(n)) await page.getByRole('button', { name: d, exact: true }).click();
}

/** Answer of a one-line «a op b = ?». */
function solve(text: string): number {
  const [, a, op, b] = text.match(/(\d+) ([×:]) (\d+) = \?/)!;
  return op === '×' ? Number(a) * Number(b) : Number(a) / Number(b);
}

test('× and : islands are open for the first try', async ({ page }) => {
  await createProfile(page);
  for (const id of ['×1', '×6', ':1', ':5']) {
    await expect(page.getByRole('button', { name: `Рівень ${id}` })).toBeVisible();
  }
});

test('×1: equal groups → repeated addition, two boxes', async ({ page }) => {
  await createProfile(page);
  await openLevel(page, '×1');
  const text = await example(page);
  const [, size] = text.match(/^(\d+) \+/)!;
  const times = text.split('+').length;
  await page.getByRole('button', { name: /^Коробка 1/ }).click();
  await expect(page.getByRole('status')).toHaveText(`${size}…`);

  await typeNumber(page, times);
  await page.getByRole('button', { name: 'Віконце 2: порожнє' }).click();
  await typeNumber(page, Number(size) * times);
  await page.getByRole('button', { name: 'Перевірити' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Правильно!' })).toBeVisible();
  await expect(page.getByRole('img', { name: /стрибки:/ })).toBeVisible();
});

test(':1: apples are dragged into baskets and the bar model fills', async ({ page }) => {
  await createProfile(page);
  await openLevel(page, ':1');
  const [, total, groups] = (await example(page)).match(/(\d+) : (\d+)/)!;
  for (let i = 0; i < Number(total); i++) {
    const from = (await page.getByTestId('pile-apple').first().boundingBox())!;
    const to = (await page.getByTestId(`basket-${i % Number(groups)}`).boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 5 });
    await page.mouse.up();
  }
  const size = Number(total) / Number(groups);
  await expect(page.getByRole('status')).toHaveText(`Порівну! У кожному кошику по ${size}.`);
  await expect(page.getByRole('img', { name: `Смужка: ${total} — це ${groups} рівних частин по ${size}` })).toBeVisible();
});

test(':2: gems tapped into groups', async ({ page }) => {
  await createProfile(page);
  await openLevel(page, ':2');
  const [, total, size] = (await example(page)).match(/(\d+) : (\d+)/)!;
  for (let i = 1; i <= Number(size); i++) await page.getByRole('button', { name: `Камінець ${i}`, exact: true }).click();
  await expect(page.getByRole('button', { name: 'Камінець 1, група 1' })).toBeVisible();
  // A tap on a finished group undoes it.
  await page.getByRole('button', { name: 'Камінець 1, група 1' }).click();
  await expect(page.getByRole('button', { name: 'Камінець 1', exact: true })).toBeVisible();
  expect(Number(total) % Number(size)).toBe(0);
});

test(':3: «4 : 6 = 24» goes hint → bar model explanation → similar task', async ({ page }) => {
  await createProfile(page);
  await openLevel(page, ':3');
  const chips = (await page.getByRole('button', { name: /^Число / }).allInnerTexts()).map(Number);
  const [small, mid, whole] = [...chips].sort((a, b) => a - b);
  const place = async (nums: number[]) => {
    for (const n of nums) await page.getByRole('button', { name: `Число ${n}`, exact: true }).click();
  };

  await place([small, mid, whole]);
  await page.getByRole('button', { name: 'Перевірити' }).click();
  await expect(page.getByRole('status')).toHaveText('Майже! Спочатку пишемо, скільки всього.');

  // Give back the numbers and make the same mistake again.
  for (const i of [1, 2, 3]) await page.getByRole('button', { name: new RegExp(`^Віконце ${i}: \\d`) }).click();
  await place([mid, small, whole]);
  await page.getByRole('button', { name: 'Перевірити' }).click();
  await expect(page.getByTestId('error-kind')).toHaveText('reversed-division');
  await expect(page.getByText('Твоя відповідь')).toBeVisible();
  await page.getByRole('button', { name: 'Далі' }).click();
  await expect(page.getByText('Спочатку пишемо, скільки всього', { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: /^Смужка:/ })).toBeVisible();
  await page.getByRole('button', { name: 'Запишу сам' }).click();

  // The whole must come first.
  await page.getByRole('button', { name: `Число ${small}`, exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Ще раз! Спочатку — скільки всього.');
  await place([whole, mid, small]);
  await expect(page.getByRole('status').filter({ hasText: 'Тепер схожий приклад' })).toBeVisible();
  await page.getByRole('button', { name: 'Далі' }).click();
  await expect(page.getByLabel('Приклад 2 з 10')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Число / })).toHaveCount(3);
});

test(':4: the fact family, four boxes', async ({ page }) => {
  await createProfile(page);
  await openLevel(page, ':4');
  const lines = (await example(page)).split('; ');
  expect(lines).toHaveLength(4);
  for (const [i, line] of lines.entries()) {
    await page.getByRole('button', { name: new RegExp(`^Віконце ${i + 1}:`) }).click();
    await typeNumber(page, solve(line));
  }
  await page.getByRole('button', { name: 'Перевірити' }).click();
  await expect(page.getByRole('status')).toHaveText('Правильно! Уся сімʼя на місці.');
});

test('×6: a neighbour fact twice → jumps explained, then written by the child', async ({ page }) => {
  await createProfile(page);
  await openLevel(page, '×6');
  const text = await example(page);
  const [, a] = text.match(/(\d+) ×/)!;
  const right = solve(text);
  const wrong = right + Number(a);
  await typeNumber(page, wrong);
  await page.getByRole('button', { name: 'Перевірити' }).click();
  await expect(page.getByRole('status')).toHaveText('Майже! Полічи ще раз уважно — можна натиснути «Підказка».');
  await typeNumber(page, wrong); // the first digit replaces the old answer
  await page.getByRole('button', { name: 'Перевірити' }).click();
  await expect(page.getByTestId('error-kind')).toHaveText('neighbor-fact');
  await page.getByRole('button', { name: 'Далі' }).click();
  await expect(page.getByText('Полічимо стрибки разом')).toBeVisible();
  await expect(page.getByRole('img', { name: /стрибки:/ })).toBeVisible();
  await page.getByRole('button', { name: 'Запишу сам' }).click();
  await typeNumber(page, right);
  await expect(page.getByRole('status').filter({ hasText: 'Тепер схожий приклад' })).toBeVisible();
});

test('a whole × level: 10 right → 3 stars', async ({ page }) => {
  await createProfile(page);
  await openLevel(page, '×4');
  for (let i = 0; i < 10; i++) {
    await typeNumber(page, solve(await example(page)));
    await page.getByRole('button', { name: 'Перевірити' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Правильно!' })).toBeVisible();
    await page.getByRole('button', { name: 'Далі' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Рівень пройдено!' })).toBeVisible();
  await expect(page.getByRole('img', { name: '3 зірки з 3' })).toBeVisible();
});
