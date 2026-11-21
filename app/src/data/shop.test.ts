import { beforeEach, describe, expect, it } from 'vitest';
import { wornIds } from '../engine/shop';
import { resetDbForTests } from './db';
import { addCoins, createProfile } from './profiles';
import { buyItem, grantItem, setHidden, setWorn } from './shop';

describe('pet shop', () => {
  beforeEach(resetDbForTests);

  it('buying takes the coins once and puts clothes on', async () => {
    const p = await createProfile({ name: 'Марія', pet: 'cat' });
    await addCoins(p.id, 50);
    const q = await buyItem(p.id, 'hat');
    expect(q.coins).toBe(30);
    expect(q.owned).toEqual(['hat']);
    expect(q.worn).toEqual({ head: 'hat' });
    await expect(buyItem(p.id, 'hat')).rejects.toThrow('уже є');
    await expect(buyItem(p.id, 'glasses')).rejects.toThrow('Не вистачає 10 монеток');
    await expect(buyItem(p.id, 'wreath')).rejects.toThrow('не продають');
  });

  it('two things in one slot: the new one replaces the old one', async () => {
    const p = await createProfile({ name: 'Марія', pet: 'cat' });
    await addCoins(p.id, 300);
    await buyItem(p.id, 'hat');
    await buyItem(p.id, 'bow');
    let q = await buyItem(p.id, 'crown');
    expect(q.worn).toEqual({ head: 'crown', ear: 'bow' });
    expect(wornIds(q.worn)).toEqual(['bow', 'crown']);
    q = await setWorn(p.id, 'hat', true);
    expect(q.worn?.head).toBe('hat');
    q = await setWorn(p.id, 'hat', false);
    expect(q.worn).toEqual({ ear: 'bow' });
    await expect(setWorn(p.id, 'mask', true)).rejects.toThrow('ще немає');
  });

  it('a boss gives its rare thing once; toys can be put away', async () => {
    const p = await createProfile({ name: 'Марія', pet: 'cat' });
    expect((await grantItem(p.id, 'castle'))?.owned).toEqual(['castle']);
    expect(await grantItem(p.id, 'castle')).toBeNull();
    expect((await setHidden(p.id, 'castle', true)).hidden).toEqual(['castle']);
    expect((await setHidden(p.id, 'castle', false)).hidden).toEqual([]);
  });
});
