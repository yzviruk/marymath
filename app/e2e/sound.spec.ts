import { expect, test, type Page } from '@playwright/test';

async function createProfile(page: Page) {
  await page.goto('./');
  await page.getByLabel('Імʼя').fill('Марія');
  await page.getByRole('button', { name: 'Котик' }).click();
  await page.getByRole('button', { name: 'Створити профіль' }).click();
  await expect(page.getByText('Карта островів')).toBeVisible();
}

const sfx = (page: Page) => page.evaluate(() => [...((window as unknown as { __sfx?: string[] }).__sfx ?? [])]);
const music = (page: Page) => page.evaluate(() => (window as unknown as { __music?: string }).__music);

async function currentColumn(page: Page) {
  const label = (await page.getByLabel(/^Приклад у стовпчик/).getAttribute('aria-label'))!;
  const [, a, op, b] = label.match(/(\d+) ([+−]) (\d+)/)!;
  return op === '+' ? Number(a) + Number(b) : Number(a) - Number(b);
}

async function typeRightToLeft(page: Page, n: number) {
  for (const d of String(n).split('').reverse()) await page.getByRole('button', { name: d, exact: true }).click();
}

test('sounds: right and wrong answers, a whole level, music by screen', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await createProfile(page);
  expect(await music(page)).toBe('normal');
  await page.getByRole('button', { name: /^Рівень \+1/ }).click();
  expect(await music(page)).toBe('quiet');

  const right = await currentColumn(page);
  await typeRightToLeft(page, right === 99 ? 98 : right + 1);
  await page.getByRole('button', { name: 'Перевірити' }).click();
  expect(await sfx(page)).toContain('again');
  await page.getByRole('button', { name: /^Відповідь, одиниці/ }).click();
  for (const d of String(right).split('').reverse()) {
    await page.getByRole('button', { name: d, exact: true }).click();
  }
  await page.getByRole('button', { name: 'Перевірити' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Правильно!' })).toBeVisible();
  expect(await sfx(page)).toContain('correct');
  await page.getByRole('button', { name: 'Далі' }).click();
  for (let i = 1; i < 10; i++) {
    await typeRightToLeft(page, await currentColumn(page));
    await page.getByRole('button', { name: 'Перевірити' }).click();
    await page.getByRole('button', { name: 'Далі' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Рівень пройдено!' })).toBeVisible();
  const log = await sfx(page);
  expect(log.some((x) => x.startsWith('stars:'))).toBe(true);
  expect(log).toContain('coin');
  expect(log).toContain('sticker');

  await page.getByRole('button', { name: 'Карта' }).click();
  expect(await music(page)).toBe('normal');
  await page.getByRole('button', { name: 'Змінити гравця' }).click();
  expect(await music(page)).toBe('off');
  expect(errors).toEqual([]);
});

test('the speaker on the map turns the music off and it stays off', async ({ page }) => {
  await createProfile(page);
  await page.getByRole('button', { name: 'Вимкнути музику' }).click();
  await expect(page.getByRole('button', { name: 'Увімкнути музику' })).toHaveAttribute('aria-pressed', 'false');
  // The setting is written to IndexedDB in the background.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise((resolve) => {
            const open = indexedDB.open('marymath');
            open.onsuccess = () => {
              const req = open.result.transaction('meta').objectStore('meta').get('settings');
              req.onsuccess = () => {
                resolve(req.result?.music);
                open.result.close();
              };
            };
          }),
      ),
    )
    .toBe(false);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Увімкнути музику' })).toBeVisible();
});
