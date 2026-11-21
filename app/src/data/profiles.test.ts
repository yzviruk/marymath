import { beforeEach, describe, expect, it } from 'vitest';
import { resetDbForTests } from './db';
import { createProfile, deleteProfile, listProfiles, MAX_PROFILES, ProfileError, recordLevelStars, updateProfile } from './profiles';

beforeEach(async () => {
  await resetDbForTests();
});

describe('profiles', () => {
  it('creates a profile with defaults and lists it', async () => {
    const p = await createProfile({ name: '  Марія  ', pet: 'dog' });
    expect(p.name).toBe('Марія');
    expect(p.petName).toBe('Персик');
    expect(p.coins).toBe(0);
    expect(await listProfiles()).toEqual([p]);
  });

  it('keeps creation order', async () => {
    const a = await createProfile({ name: 'Марія', pet: 'dog' });
    await new Promise((r) => setTimeout(r, 5));
    const b = await createProfile({ name: 'Олег', pet: 'panda', petName: 'Бамбук' });
    expect((await listProfiles()).map((p) => p.id)).toEqual([a.id, b.id]);
    expect(b.petName).toBe('Бамбук');
  });

  it('rejects empty and duplicate names', async () => {
    await expect(createProfile({ name: '   ', pet: 'cat' })).rejects.toBeInstanceOf(ProfileError);
    await createProfile({ name: 'Марія', pet: 'cat' });
    await expect(createProfile({ name: 'марія', pet: 'dog' })).rejects.toThrow('уже є');
  });

  it(`allows at most ${MAX_PROFILES} profiles`, async () => {
    for (let i = 0; i < MAX_PROFILES; i++) await createProfile({ name: `Дитина ${i}`, pet: 'dog' });
    await expect(createProfile({ name: 'Ще одна', pet: 'dog' })).rejects.toThrow(String(MAX_PROFILES));
  });

  it('updates and deletes', async () => {
    const p = await createProfile({ name: 'Марія', pet: 'dog' });
    expect((await updateProfile(p.id, { petName: 'Зефір' })).petName).toBe('Зефір');
    await deleteProfile(p.id);
    expect(await listProfiles()).toEqual([]);
  });

  it('keeps the best stars per level and remembers the last level', async () => {
    const p = await createProfile({ name: 'Марія', pet: 'cat' });
    await recordLevelStars(p.id, '+1', 3);
    const q = await recordLevelStars(p.id, '+1', 1);
    expect(q.levelStars).toEqual({ '+1': 3 });
    const r = await recordLevelStars(p.id, '×1', 0);
    expect(r.stars).toBe(3);
    expect(r.lastLevel).toBe('×1');
  });
});
