import { expect, test } from '@playwright/test';

test('create a profile, keep it after reload, play the demo task', async ({ page }) => {
  await page.goto('./');

  // First start: the form opens by itself.
  await expect(page.getByRole('heading', { name: 'Хто сьогодні грає?' })).toBeVisible();
  await page.getByLabel('Імʼя').fill('Марія');
  await page.getByRole('button', { name: 'Котик' }).click();
  await page.getByRole('button', { name: 'Створити профіль' }).click();

  // Straight to the map.
  await expect(page.getByText('Карта островів')).toBeVisible();
  await expect(page.getByText('Привіт, Марія!')).toBeVisible();

  // Data survives a reload (IndexedDB).
  await page.reload();
  await expect(page.getByText('Привіт, Марія!')).toBeVisible();
  await page.getByRole('button', { name: 'Змінити гравця' }).click();
  await expect(page.getByRole('button', { name: /Марія/ })).toBeVisible();

  // Demo task: keypad + number line.
  await page.getByRole('button', { name: /Марія/ }).click();
  await page.getByRole('button', { name: 'Пробне завдання' }).click();
  await expect(page.getByRole('img', { name: 'Числова шкала від 0 до 20' })).toBeVisible();
  await page.getByRole('button', { name: '1', exact: true }).click();
  await page.getByRole('button', { name: '3', exact: true }).click();
  await page.getByRole('button', { name: 'Перевірити' }).click();
  await expect(page.getByRole('img', { name: /стрибки: 0 → 3 → 6 → 9 → 12/ })).toBeVisible();
  await expect(page.getByLabel('Твоя відповідь')).toHaveText('13');
  // After a wrong answer the first new digit replaces the old answer.
  await page.getByRole('button', { name: '1', exact: true }).click();
  await expect(page.getByLabel('Твоя відповідь')).toHaveText('1');
  await page.keyboard.press('2');
  await expect(page.getByLabel('Твоя відповідь')).toHaveText('12');
  await page.getByRole('button', { name: 'Перевірити' }).click();
  await expect(page.getByText('Так! 3 × 4 = 12')).toBeVisible();

  // Android back gesture returns to the map.
  await page.goBack();
  await expect(page.getByText('Карта островів')).toBeVisible();
});

test('PWA manifest is served', async ({ request }) => {
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
