import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

async function createProfile(page: Page, name = 'Марія') {
  await page.goto('./');
  await page.getByLabel('Імʼя').fill(name);
  await page.getByRole('button', { name: 'Котик' }).click();
  await page.getByRole('button', { name: 'Створити профіль' }).click();
  await expect(page.getByText('Карта островів')).toBeVisible();
}

/** «Для батьків» opens only when held. */
async function holdParent(page: Page) {
  const button = page.getByRole('button', { name: 'Для батьків' });
  await button.hover();
  await page.mouse.down();
  await page.waitForTimeout(1700);
  await page.mouse.up();
}

async function typePin(page: Page, pin: string) {
  for (const d of pin) await page.getByRole('button', { name: d, exact: true }).click();
}

/** First visit: set the PIN twice, land in the panel. */
async function openPanel(page: Page, pin = '2468') {
  await holdParent(page);
  await expect(page.getByText('Придумайте PIN із 4 цифр')).toBeVisible();
  await typePin(page, pin);
  await expect(page.getByText('Повторіть PIN')).toBeVisible();
  await typePin(page, pin);
  await expect(page.getByRole('heading', { name: 'Панель батьків' })).toBeVisible();
}

test('a short tap does not open the parent panel', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Для батьків' }).click();
  await expect(page.getByText('Утримуйте кнопку')).toBeVisible();
  await expect(page.getByText('Придумайте PIN')).toHaveCount(0);
});

test('PIN: set once, then wrong and right; «Забули PIN?» sets a new one', async ({ page }) => {
  await page.goto('./');
  await openPanel(page);
  await page.getByRole('button', { name: 'Вийти' }).click();
  await holdParent(page);
  await expect(page.getByText('Введіть PIN')).toBeVisible();
  await typePin(page, '1111');
  await expect(page.getByRole('alert')).toHaveText('Невірний PIN. Спробуйте ще раз.');
  await page.getByRole('button', { name: 'Забули PIN?' }).click();
  const q = (await page.locator('.pg-title').innerText()).match(/(\d+) × (\d+)/)!;
  await typePin(page, String(Number(q[1]) * Number(q[2])));
  await page.getByRole('button', { name: 'Перевірити' }).click();
  await expect(page.getByText('Придумайте PIN із 4 цифр')).toBeVisible();
  await typePin(page, '1357');
  await typePin(page, '1357');
  await expect(page.getByRole('heading', { name: 'Панель батьків' })).toBeVisible();
});

test('statistics of a child after a level, the journal, turning speech off', async ({ page }) => {
  await createProfile(page);
  await page.getByRole('button', { name: /^Рівень ×1/ }).click();
  // Two tasks: one right at once, one with a wrong product.
  for (const wrongFirst of [false, true]) {
    const label = (await page.getByRole('group', { name: /^Приклад:/ }).getAttribute('aria-label'))!;
    const nums = label.match(/\d+/g)!.map(Number);
    const size = nums[0];
    const times = nums.filter((n) => n === size).length - 1; // the size repeats once per group, plus «size × ?»
    const values = [times, wrongFirst ? size * times + 1 : size * times];
    for (const [i, v] of values.entries()) {
      await page.getByRole('button', { name: new RegExp(`^Віконце ${i + 1}:`) }).click();
      for (const d of String(v)) await page.getByRole('button', { name: d, exact: true }).click();
    }
    await page.getByRole('button', { name: 'Перевірити' }).click();
    if (wrongFirst) {
      await expect(page.getByTestId('error-kind')).toHaveCount(1);
      break;
    }
    await page.getByRole('button', { name: 'Далі' }).click();
  }
  await page.getByRole('button', { name: 'Карта' }).click();
  await page.getByRole('button', { name: 'Змінити гравця' }).click();
  await openPanel(page);
  await expect(page.getByRole('tab', { name: 'Марія' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.pp-topic').filter({ hasText: 'Множення' })).toContainText('50%');
  await expect(page.locator('.pp-topic').filter({ hasText: 'Додавання' })).toContainText('—');
  await page.getByRole('button', { name: 'Журнал' }).click();
  await expect(page.locator('.pp-journal tbody tr')).toHaveCount(2);
  await page.getByRole('button', { name: 'Закрити' }).click();

  await page.getByLabel('Озвучення умов').uncheck();
  await page.getByRole('button', { name: 'Вийти' }).click();
  await page.getByRole('button', { name: /Марія/ }).click();
  await page.getByRole('button', { name: /^Рівень ×1/ }).click();
  await expect(page.getByRole('group', { name: /^Приклад:/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Прочитати умову вголос' })).toHaveCount(0);
});

test('profile: rename, open an island, reset, delete; add a profile', async ({ page }) => {
  await createProfile(page);
  await page.getByRole('button', { name: 'Змінити гравця' }).click();
  await openPanel(page);
  await page.getByRole('button', { name: 'Профіль', exact: true }).click();
  await page.getByLabel('Імʼя').fill('Маруся');
  await page.getByRole('button', { name: 'Зберегти', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Імʼя збережено' })).toBeVisible();
  await page.getByLabel('Множення').check();
  await expect(page.getByText('Острів «Множення» відкрито')).toBeVisible();
  await page.getByRole('button', { name: 'Скинути прогрес' }).click();
  await page.getByRole('button', { name: /Так, скинути/ }).click();
  await expect(page.getByText('Прогрес скинуто')).toBeVisible();
  await page.getByRole('button', { name: 'Закрити' }).click();
  await expect(page.getByRole('tab', { name: 'Маруся' })).toBeVisible();

  await page.getByRole('button', { name: 'Вийти' }).click();
  await page.getByRole('button', { name: /Маруся/ }).click();
  await expect(page.getByRole('button', { name: 'Рівень ×6', exact: true })).toBeVisible(); // opened by hand
  await page.getByRole('button', { name: 'Змінити гравця' }).click();

  await holdParent(page);
  await typePin(page, '2468');
  await page.getByRole('button', { name: '+ Додати профіль' }).click();
  await page.getByLabel('Імʼя').fill('Олег');
  await page.getByRole('button', { name: 'Панда' }).click();
  await page.getByRole('button', { name: 'Створити профіль' }).click();
  await expect(page.getByText('Привіт, Олег!')).toBeVisible();
  await page.getByRole('button', { name: 'Змінити гравця' }).click();
  await holdParent(page);
  await typePin(page, '2468');
  await page.getByRole('tab', { name: 'Маруся' }).click();
  await page.getByRole('button', { name: 'Профіль', exact: true }).click();
  await page.getByRole('button', { name: 'Видалити профіль' }).click();
  await page.getByRole('button', { name: 'Так, видалити Маруся назавжди' }).click();
  await expect(page.getByRole('tab')).toHaveCount(1);
  await expect(page.getByRole('tab', { name: 'Олег' })).toBeVisible();
});

test('backup: save a copy, change things, restore from the file', async ({ page }) => {
  await createProfile(page);
  await page.getByRole('button', { name: 'Змінити гравця' }).click();
  await openPanel(page);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Зберегти копію' }).click();
  const file = await (await download).path();
  const backup = JSON.parse(readFileSync(file, 'utf8'));
  expect(backup.app).toBe('marymath');
  expect(backup.profiles.map((p: { name: string }) => p.name)).toEqual(['Марія']);

  await page.getByRole('button', { name: 'Профіль', exact: true }).click();
  await page.getByRole('button', { name: 'Видалити профіль' }).click();
  await page.getByRole('button', { name: /Так, видалити/ }).click();
  await expect(page.getByText('Профілів ще немає')).toBeVisible();

  await page.getByLabel('Файл копії').setInputFiles(file);
  await expect(page.getByRole('dialog', { name: 'Відновити з копії' })).toContainText('Марія');
  await page.getByRole('button', { name: 'Замінити все даними з копії' }).click();
  await expect(page.getByRole('tab', { name: 'Марія' })).toBeVisible();
  await expect(page.getByText('Дані відновлено з копії.')).toBeVisible();
});

test('parent can preview generated tasks of every level', async ({ page }) => {
  await page.goto('./');
  await openPanel(page);
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
