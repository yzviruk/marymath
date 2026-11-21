import type { Page } from '@playwright/test';

/** Level order on each island (as on the map). */
const ISLAND_LEVELS = [
  ['+1', '+2', '+3', '+4', '+5', '+6', '+7', '+♛'],
  ['−1', '−2', '−3', '−4', '−5', '−♛'],
  ['×1', '×2', '×3', '×4', '×5', '×6', '×♛'],
  [':1', ':2', ':3', ':4', ':5', ':♛'],
  ['?1', '?2', '?♛'],
];
const BOSSES = ['+♛', '−♛', '×♛', ':♛'];

/**
 * Opens level `id` for the test the way a child would have: gives 1 star to every level before
 * it on its island (written straight into IndexedDB), then reloads the map.
 */
export async function unlockLevel(page: Page, id: string) {
  const island = ISLAND_LEVELS.find((l) => l.includes(id));
  if (!island) throw new Error(`Unknown level ${id}`);
  const before = island.slice(0, island.indexOf(id));
  // The Задачі island opens after the four bosses.
  if (id.startsWith('?')) before.push(...BOSSES);
  if (!before.length) return;
  await page.evaluate(
    (ids) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('marymath');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('profiles', 'readwrite');
          const store = tx.objectStore('profiles');
          const all = store.getAll();
          all.onsuccess = () => {
            for (const p of all.result) {
              p.levelStars = { ...(p.levelStars ?? {}) };
              for (const l of ids) p.levelStars[l] = Math.max(p.levelStars[l] ?? 0, 1);
              p.stars = Object.values(p.levelStars as Record<string, number>).reduce((s, n) => s + n, 0);
              store.put(p);
            }
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    before,
  );
  await page.reload();
}

/** Sets fields of every profile (coins, owned things …) straight in IndexedDB, then reloads. */
export async function patchProfile(page: Page, fields: Record<string, unknown>) {
  await page.evaluate(
    (patch) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('marymath');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('profiles', 'readwrite');
          const store = tx.objectStore('profiles');
          const all = store.getAll();
          all.onsuccess = () => {
            for (const p of all.result) store.put({ ...p, ...patch });
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    fields,
  );
  await page.reload();
}
