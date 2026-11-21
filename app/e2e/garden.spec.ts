import { expect, test, type Page } from '@playwright/test';
import { unlockLevel } from './unlock';

// Saturday 21.11.2026: the day task is «Розвʼяжи 10 прикладів».
const TODAY = new Date(2026, 10, 21, 10, 0);

async function createProfile(page: Page) {
  await page.clock.install({ time: TODAY });
  await page.goto('./');
  await page.getByLabel('Імʼя').fill('Марія');
  await page.getByRole('button', { name: 'Котик' }).click();
  await page.getByRole('button', { name: 'Створити профіль' }).click();
  await expect(page.getByText('Карта островів')).toBeVisible();
}

async function typeNumber(page: Page, n: number) {
  for (const d of String(n)) await page.getByRole('button', { name: d, exact: true }).click();
}

function solve(text: string): number {
  const [, a, op, b] = text.match(/(\d+) ([×:]) (\d+) = \?/)!;
  return op === '×' ? Number(a) * Number(b) : Number(a) / Number(b);
}

test('garden: watering grows buds, the day task opens a gift, the streak counts the day', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await createProfile(page);
  const day = page.getByTestId('day-task');
  await expect(day).toContainText('Розвʼяжи 10 прикладів');
  await expect(day).toContainText('0 з 10');
  await expect(page.getByTestId('streak')).toContainText('0 днів із завданням дня');

  await page.getByRole('button', { name: 'Садочок' }).click();
  await expect(page.getByText('Розквітло 0 з 20')).toBeVisible();
  await expect(page.locator('.gd-flower[data-state="seed"]')).toHaveCount(20);
  expect(await page.evaluate(() => (window as unknown as { __music?: string }).__music)).toBe('normal');

  await page.getByRole('button', { name: 'Полити квіти' }).click();
  for (let i = 0; i < 10; i++) {
    const group = page.getByRole('group', { name: /^Приклад:/ });
    await expect(group).toBeVisible();
    const text = (await group.getAttribute('aria-label'))!.replace('Приклад: ', '');
    await typeNumber(page, solve(text));
    await page.getByRole('button', { name: 'Перевірити' }).click();
    await page.getByRole('button', { name: 'Далі' }).click();
  }
  await expect(page.getByText('Полито 10 квіток!')).toBeVisible();
  await expect(page.getByText('Підросли:')).toBeVisible();
  await page.getByRole('button', { name: 'До садочка' }).click();
  await expect(page.locator('.gd-flower[data-state="bud"]')).toHaveCount(10);
  await expect(page.locator('.gd-flower[data-state="seed"]')).toHaveCount(10);

  await page.getByRole('button', { name: 'Карта' }).click();
  await page.getByRole('button', { name: 'Відкрити подарунок' }).click();
  await expect(page.getByText(/відкриває подарунок… 5 монеток/)).toBeVisible();
  await expect(day).toContainText('Виконано!');
  await expect(page.getByTestId('streak')).toContainText('1 день із завданням дня');
  await expect(page.getByLabel('Сб: завдання виконано')).toBeVisible();
  await expect(page.locator('.map-chip.coins b')).toHaveText('5');
  expect(errors).toEqual([]);
});

test('blitz: locked before ×3, a minute of facts, a first record pays 5 coins', async ({ page }) => {
  await createProfile(page);
  await page.getByRole('button', { name: 'Бліц, закрито' }).click();
  await expect(page.getByText('Бліц відкриється, коли пройдеш рівень ×3 — 7 правильних з 10.')).toBeVisible();

  await unlockLevel(page, '×4');
  await page.getByRole('button', { name: 'Бліц', exact: true }).click();
  await page.getByRole('button', { name: 'Почати' }).click();
  expect(await page.evaluate(() => (window as unknown as { __music?: string }).__music)).toBe('off');

  for (let i = 0; i < 3; i++) {
    const answer = Number(await page.locator('.bz-eq').getAttribute('data-answer'));
    await typeNumber(page, answer);
    await page.getByRole('button', { name: 'Готово' }).click();
  }
  const answer = Number(await page.locator('.bz-eq').getAttribute('data-answer'));
  await typeNumber(page, answer === 1 ? 2 : answer - 1);
  await page.getByRole('button', { name: 'Готово' }).click();
  await expect(page.getByTestId('blitz-right')).toHaveText('3');
  await expect(page.locator('.bz-recent .miss')).toHaveCount(1);

  await page.clock.fastForward(61_000);
  const result = page.getByRole('dialog', { name: 'Час вийшов' });
  await expect(result.getByTestId('blitz-total')).toHaveText('3');
  await expect(result).toContainText('Твій перший рекорд!');
  await expect(result).toContainText('+5 за рекорд');
  await result.getByRole('button', { name: 'Ще раз' }).click();
  await expect(page.getByLabel('Рекорд 3')).toBeVisible();
  await page.getByRole('button', { name: 'Карта' }).click();
  await expect(page.locator('.map-chip.coins b')).toHaveText('5');
});
