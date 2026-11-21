import { expect, test, type Page } from '@playwright/test';
import { patchProfile, unlockLevel } from './unlock';

const SIGN_NAMES: Record<string, string> = { '+': 'Додати', '−': 'Відняти', '×': 'Помножити', ':': 'Поділити' };

async function createProfile(page: Page) {
  await page.goto('./');
  await page.getByLabel('Імʼя').fill('Марія');
  await page.getByRole('button', { name: 'Котик' }).click();
  await page.getByRole('button', { name: 'Створити профіль' }).click();
  await expect(page.getByText('Карта островів')).toBeVisible();
}

async function start(page: Page, level: string) {
  await createProfile(page);
  await unlockLevel(page, level);
  await page.getByRole('button', { name: new RegExp(`^Рівень \\${level}(,|$)`) }).click();
}

async function problem(page: Page) {
  const data = (await page.locator('.pt-main').getAttribute('data-answer'))!;
  const [, a, op, b, result] = data.match(/^(\d+)([+−×:])(\d+)=(\d+)$/)!;
  return { a: Number(a), op, b: Number(b), result: Number(result) };
}

async function setUp(page: Page, op: string, x: number, y: number) {
  await page.getByRole('button', { name: SIGN_NAMES[op] }).click();
  await page.locator('.pt-num:not(:disabled)').filter({ hasText: new RegExp(`^${x}$`) }).first().click();
  await page.locator('.pt-num:not(:disabled)').filter({ hasText: new RegExp(`^${y}$`) }).first().click();
}

async function typeLeftToRight(page: Page, n: number) {
  for (const d of String(n)) await page.getByRole('button', { name: d, exact: true }).click();
}

test('?2: choose the action, place the numbers, solve, read the answer sentence', async ({ page }) => {
  await start(page, '?2');
  const t = await problem(page);
  await expect(page.getByText('Малюнок до задачі', { exact: true })).toBeVisible(); // the bar on the first tasks
  await setUp(page, t.op, t.a, t.b);
  await page.getByRole('button', { name: 'Перевірити' }).click();
  await expect(page.getByRole('status')).toHaveText('Правильно! Тепер рахуємо.');
  await typeLeftToRight(page, t.result);
  await page.getByRole('button', { name: 'Перевірити' }).click();
  await expect(page.locator('.pt-answer.done')).toContainText(String(t.result));
  await page.getByRole('button', { name: 'Далі' }).click();
  await expect(page.getByLabel('Приклад 2 з 10')).toBeVisible();
});

test('?2: a wrong action twice → the explanation, then each tap is checked', async ({ page }) => {
  await start(page, '?2');
  const t = await problem(page);
  const wrong = t.op === ':' ? '+' : '−';
  await setUp(page, wrong, t.a, t.b);
  await page.getByRole('button', { name: 'Перевірити' }).click();
  await expect(page.getByTestId('error-kind')).toHaveText('wrong-operation');
  await expect(page.getByRole('status')).toContainText('Подивись на смужку');
  await page.getByRole('button', { name: 'Перевірити' }).click();
  await expect(page.getByRole('status')).toContainText('Обери дію і постав числа');
  await page.getByRole('button', { name: SIGN_NAMES[wrong] }).click();
  await expect(page.getByRole('status')).toContainText('Ще раз!');
  await setUp(page, t.op, t.a, t.b);
  await expect(page.getByRole('status')).toHaveText('Ось так! Тепер рахуємо.');
  await typeLeftToRight(page, t.result);
  await page.getByRole('button', { name: 'Перевірити' }).click();
  await page.getByRole('button', { name: 'Далі' }).click();
  await expect(page.getByLabel('Приклад 2 з 10')).toBeVisible();
});

test('?2 division: the whole has to come first', async ({ page }) => {
  await start(page, '?2');
  let t = await problem(page);
  for (let i = 0; i < 10 && (t.op !== ':' || t.a === t.b); i++) {
    // Not a division: solve it and take the next one.
    await setUp(page, t.op, t.a, t.b);
    await page.getByRole('button', { name: 'Перевірити' }).click();
    await typeLeftToRight(page, t.result);
    await page.getByRole('button', { name: 'Перевірити' }).click();
    await page.getByRole('button', { name: 'Далі' }).click();
    t = await problem(page);
  }
  expect(t.op).toBe(':');
  await setUp(page, ':', t.b, t.a);
  await page.getByRole('button', { name: 'Перевірити' }).click();
  await expect(page.getByTestId('error-kind')).toHaveText('reversed-division');
  await expect(page.getByRole('status')).toContainText('Спочатку пишемо ціле');
});

test('?1: after the action the column screen opens with the numbers', async ({ page }) => {
  await start(page, '?1');
  const t = await problem(page);
  await setUp(page, t.op, t.a, t.b);
  await page.getByRole('button', { name: 'Перевірити' }).click();
  await expect(page.getByLabel(`Приклад у стовпчик: ${t.a} ${t.op} ${t.b}`)).toBeVisible();
  for (const d of String(t.result).split('').reverse()) await page.getByRole('button', { name: d, exact: true }).click();
  await page.getByRole('button', { name: 'Перевірити' }).click();
  await page.getByRole('button', { name: 'Далі' }).click();
  await expect(page.locator('.pt-answer.done')).toContainText(String(t.result));
  await page.getByRole('button', { name: 'Далі' }).click();
  await expect(page.getByLabel('Приклад 2 з 10')).toBeVisible();
});

test('map: the Задачі island is closed until the four bosses', async ({ page }) => {
  await createProfile(page);
  await expect(page.getByText('після всіх чотирьох босів')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Рівень \?1/ })).toHaveCount(0);
  await unlockLevel(page, '?1');
  await expect(page.getByRole('button', { name: 'Рівень ?1', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Рівень ?2, закрито' })).toBeVisible();
});

test('album: stickers earned before appear, the next one is shown', async ({ page }) => {
  await createProfile(page);
  await patchProfile(page, { coins: 82, levelStars: { '+1': 3, '+♛': 1 }, stars: 4 });
  await page.getByRole('button', { name: 'Наліпки' }).click();
  await expect(page.getByLabel('Наліпок: 3 з 18')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Лісова корона — є' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Корона замку — ще немає: переможи боса Задач' })).toBeVisible();
  await expect(page.locator('.sa-next')).toContainText('82 з 100');
  await page.getByRole('button', { name: /^100 монеток/ }).click();
  await expect(page.locator('.sa-how')).toHaveText('Як отримати: збери 100 монеток.');
});
