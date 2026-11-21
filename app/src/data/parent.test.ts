import { beforeEach, describe, expect, it } from 'vitest';
import { listAttempts, saveAttempt } from './attempts';
import { resetDbForTests } from './db';
import {
  checkPin,
  exportBackup,
  getSettings,
  hasPin,
  parseBackup,
  removeProfile,
  resetProgress,
  restoreBackup,
  saveSettings,
  setIslandOpen,
  setPin,
} from './parent';
import { addCoins, createProfile, getProfile, listProfiles, recordLevelStars } from './profiles';
import type { Attempt } from './types';

beforeEach(async () => {
  await resetDbForTests();
});

const attempt = (profileId: string): Omit<Attempt, 'id'> => ({
  profileId,
  at: '2026-11-21T10:00:00.000Z',
  level: '+1',
  taskKey: '34+5',
  op: '+',
  a: 34,
  b: 5,
  value: 39,
  correct: true,
  error: null,
  tryNo: 1,
  hintUsed: false,
  ms: 5000,
});

describe('parent panel data', () => {
  it('PIN: none at first, then only the right one passes', async () => {
    expect(await hasPin()).toBe(false);
    await expect(setPin('12a4')).rejects.toThrow('PIN — 4 цифри');
    await setPin('2468');
    expect(await hasPin()).toBe(true);
    expect(await checkPin('2468')).toBe(true);
    expect(await checkPin('1234')).toBe(false);
  });

  it('settings have defaults and keep changes', async () => {
    expect(await getSettings()).toEqual({ sound: true, music: true, musicVolume: 40, speech: true });
    await saveSettings({ speech: false });
    expect((await getSettings()).speech).toBe(false);
  });

  it('reset keeps the name and pet, drops progress and attempts of that child only', async () => {
    const m = await createProfile({ name: 'Марія', pet: 'dog', petName: 'Зефір' });
    const o = await createProfile({ name: 'Олег', pet: 'cat' });
    await recordLevelStars(m.id, '+1', 3);
    await addCoins(m.id, 50);
    await saveAttempt(attempt(m.id));
    await saveAttempt(attempt(o.id));
    const fresh = await resetProgress(m.id);
    expect(fresh).toMatchObject({ name: 'Марія', petName: 'Зефір', stars: 0, coins: 0 });
    expect(fresh.levelStars).toBeUndefined();
    expect(await listAttempts(m.id)).toHaveLength(0);
    expect(await listAttempts(o.id)).toHaveLength(1);
    await removeProfile(o.id);
    expect((await listProfiles()).map((p) => p.name)).toEqual(['Марія']);
    expect(await listAttempts(o.id)).toHaveLength(0);
  });

  it('opens an island by hand', async () => {
    const m = await createProfile({ name: 'Марія', pet: 'dog' });
    await setIslandOpen(m.id, 'tasks', true);
    expect((await getProfile(m.id))?.openIslands).toEqual(['tasks']);
    await setIslandOpen(m.id, 'tasks', false);
    expect((await getProfile(m.id))?.openIslands).toEqual([]);
  });

  it('backup: export → parse → restore brings everything back, the PIN stays', async () => {
    const m = await createProfile({ name: 'Марія', pet: 'dog' });
    await addCoins(m.id, 30);
    await saveAttempt(attempt(m.id));
    await setPin('2468');
    const text = JSON.stringify(await exportBackup());
    await removeProfile(m.id);
    await createProfile({ name: 'Інша', pet: 'cat' });
    await restoreBackup(parseBackup(text));
    const all = await listProfiles();
    expect(all.map((p) => [p.name, p.coins])).toEqual([['Марія', 30]]);
    expect(await listAttempts(m.id)).toHaveLength(1);
    expect(await checkPin('2468')).toBe(true);
    expect(() => parseBackup('{"app":"other"}')).toThrow('Це не файл копії MaryMath');
    expect(() => parseBackup('not json')).toThrow('Це не файл копії MaryMath');
  });
});
