import { useState, type CSSProperties } from 'react';
import { BackIcon, CoinIcon } from '../components/Icons';
import { Pet } from '../components/Pet';
import { ItemIcon } from '../components/ShopArt';
import { MAX_NAME_LENGTH, ProfileError, updateProfile } from '../data/profiles';
import { buyItem, setHidden, setWorn } from '../data/shop';
import { syncStickers } from '../data/stickers';
import type { Profile } from '../data/types';
import { ISLANDS } from '../engine/levels';
import { SHOP, wornIds, type ShopItem, type ShopTab } from '../engine/shop';
import './PetHome.css';

interface Props {
  profile: Profile;
  onBack: () => void;
  onChanged: () => Promise<void>;
}

const TABS: { id: ShopTab; name: string }[] = [
  { id: 'clothes', name: 'Одяг' },
  { id: 'toys', name: 'Іграшки' },
  { id: 'room', name: 'Кімната' },
];

/** Where toys and room things stand in the room (740×676), and how wide they are drawn. */
const SPOT: Record<string, { left: number; top: number; width: number }> = {
  picture: { left: 296, top: 118, width: 110 },
  crystal: { left: 492, top: 36, width: 64 },
  aquarium: { left: 36, top: 316, width: 150 },
  lamp: { left: 648, top: 356, width: 84 },
  flower: { left: 560, top: 362, width: 84 },
  balloon: { left: 600, top: 214, width: 72 },
  lollipop: { left: 150, top: 236, width: 64 },
  bed: { left: 36, top: 476, width: 150 },
  teddy: { left: 576, top: 462, width: 80 },
  castle: { left: 470, top: 590, width: 90 },
  blocks: { left: 66, top: 600, width: 80 },
  ball: { left: 652, top: 580, width: 64 },
};

const islandOf = (item: ShopItem) => ISLANDS.find((i) => i.id === item.rareFor)?.name ?? '';

/** «Будиночок»: the pet's room with the things the child has, and the shop (screen 7). */
export function PetHome({ profile, onBack, onChanged }: Props) {
  const [tab, setTab] = useState<ShopTab>('clothes');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [say, setSay] = useState<string | null>(null);
  const [naming, setNaming] = useState<string | null>(null);
  const owned = new Set(profile.owned ?? []);
  const hidden = new Set(profile.hidden ?? []);
  const worn = new Set(Object.values(profile.worn ?? {}));
  const inRoom = SHOP.filter((i) => i.tab !== 'clothes' && owned.has(i.id) && !hidden.has(i.id));

  /** Runs a change; `run` may return words to add to the pet's line (a new sticker). */
  async function act(run: () => Promise<unknown>, line: string) {
    try {
      const more = await run();
      setSay(typeof more === 'string' ? `${line} ${more}` : line);
      await onChanged();
    } catch (e) {
      setSay(e instanceof ProfileError ? e.message : 'Ой, щось не вийшло. Спробуй ще раз.');
    }
    setConfirm(null);
  }

  async function buyAndStick(itemId: string) {
    await buyItem(profile.id, itemId);
    const { added } = await syncStickers(profile.id);
    return added.length ? 'І ще нова наліпка в альбомі!' : undefined;
  }

  async function saveName() {
    if (naming === null) return;
    const name = naming.trim().slice(0, MAX_NAME_LENGTH);
    setNaming(null);
    if (name && name !== profile.petName) {
      await act(() => updateProfile(profile.id, { petName: name }), `Тепер мене звати ${name}!`);
    }
  }

  function card(item: ShopItem) {
    const has = owned.has(item.id);
    const on = item.tab === 'clothes' ? worn.has(item.id) : has && !hidden.has(item.id);
    const short = item.price !== null ? item.price - profile.coins : 0;
    let control;
    if (has) {
      control =
        item.tab === 'clothes' ? (
          <button
            type="button"
            className={on ? 'ph-on' : 'ph-use'}
            aria-label={on ? `Зняти: ${item.name}` : `Вдягти: ${item.name}`}
            onClick={() => act(() => setWorn(profile.id, item.id, !on), on ? 'Добре, зніму.' : `Мені пасує ${item.thanks}?`)}
          >
            {on ? '✓ Вдягнено' : 'Вдягти'}
          </button>
        ) : (
          <button
            type="button"
            className={on ? 'ph-on' : 'ph-use'}
            aria-label={on ? `Сховати: ${item.name}` : `Поставити: ${item.name}`}
            onClick={() => act(() => setHidden(profile.id, item.id, on), on ? 'Сховаю на потім.' : 'Ура, знову в кімнаті!')}
          >
            {on ? '✓ У кімнаті' : 'Поставити'}
          </button>
        );
    } else if (item.price === null) {
      control = <span className="ph-note">рідкісна · бос «{islandOf(item)}»</span>;
    } else if (short > 0) {
      control = (
        <span className="ph-note">
          {item.price} · ще {short}
        </span>
      );
    } else if (confirm === item.id) {
      control = (
        <span className="ph-confirm">
          <button type="button" className="ph-yes" onClick={() => act(() => buyAndStick(item.id), `Дякую за ${item.thanks}! Пограємо?`)}>
            Так
          </button>
          <button type="button" className="ph-no" onClick={() => setConfirm(null)}>
            Ні
          </button>
        </span>
      );
    } else {
      control = (
        <button type="button" className="ph-price" aria-label={`Купити: ${item.name}, ${item.price} монеток`} onClick={() => setConfirm(item.id)}>
          <CoinIcon size={18} />
          {item.price}
        </button>
      );
    }
    const locked = !has && (item.price === null || short > 0);
    return (
      <div key={item.id} className={`ph-card${has && on ? ' on' : ''}${locked ? ' locked' : ''}`}>
        <ItemIcon id={item.id} size={56} />
        <span className="ph-name">{confirm === item.id ? `Купити за ${item.price}?` : item.name}</span>
        {control}
      </div>
    );
  }

  return (
    <div className="screen ph">
      <div className="topbar">
        <button type="button" className="chip-btn" onClick={onBack}>
          <BackIcon />
          Карта
        </button>
        <span className="topbar-title">Будиночок</span>
        <span className="ph-grow" />
        <span className="coins">
          <CoinIcon />
          {profile.coins}
          <span className="ph-unit">монеток</span>
        </span>
      </div>

      <div className="ph-body">
        <div className="ph-room">
          <div className="ph-floor" />
          <div className="ph-window">
            <i />
            <b />
          </div>
          <div className="ph-plate">
            {naming !== null ? (
              <input
                aria-label="Імʼя улюбленця"
                value={naming}
                maxLength={MAX_NAME_LENGTH}
                autoFocus
                onChange={(e) => setNaming(e.target.value)}
                onBlur={() => void saveName()}
                onKeyDown={(e) => e.key === 'Enter' && void saveName()}
              />
            ) : (
              <>
                <span>{profile.petName}</span>
                <button type="button" aria-label="Перейменувати улюбленця" onClick={() => setNaming(profile.petName)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 20h4L19 9l-4-4L4 16z" />
                  </svg>
                </button>
              </>
            )}
          </div>
          <div className="bubble ph-say" role="status">
            {say ?? 'Привіт! Подивись, що є в магазині.'}
          </div>

          {owned.has('rug') && !hidden.has('rug') && (
            <div className="ph-rug" role="img" aria-label="Килимок">
              <i />
            </div>
          )}
          {inRoom
            .filter((i) => SPOT[i.id])
            .map((i) => (
              <button
                key={i.id}
                type="button"
                className="ph-thing"
                style={{ left: SPOT[i.id].left, top: SPOT[i.id].top } as CSSProperties}
                aria-label={i.name}
                onClick={() => setSay(`${i.name}! Мені так подобається!`)}
              >
                <ItemIcon id={i.id} size={SPOT[i.id].width} />
              </button>
            ))}
          <div className="ph-pet">
            <Pet kind={profile.pet} size={260} label={profile.petName} wear={wornIds(profile.worn)} />
          </div>
        </div>

        <div className="ph-shop">
          <span className="ph-shop-title">Магазин</span>
          <div className="ph-tabs" role="tablist" aria-label="Розділи магазину">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => {
                  setTab(t.id);
                  setConfirm(null);
                }}
              >
                {t.name}
              </button>
            ))}
          </div>
          <div className="ph-grid">{SHOP.filter((i) => i.tab === tab).map(card)}</div>
        </div>
      </div>
    </div>
  );
}
