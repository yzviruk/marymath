import { useState } from 'react';
import { CoinIcon, LockIcon, PlusIcon, StarIcon } from '../components/Icons';
import { Pet } from '../components/Pet';
import { createProfile, MAX_NAME_LENGTH, MAX_PROFILES, ProfileError } from '../data/profiles';
import { PET_KINDS, PET_LABELS, type PetKind, type Profile } from '../data/types';
import './WhoPlays.css';

interface Props {
  profiles: Profile[];
  onPick: (id: string) => void;
  onCreated: (p: Profile) => void | Promise<void>;
  onParent: () => void;
}

/** Screen 1 «Хто грає?»: profile cards plus the new-profile form (mockup Main.dc.html). */
export function WhoPlays({ profiles, onPick, onCreated, onParent }: Props) {
  const [creating, setCreating] = useState(profiles.length === 0);
  const canAdd = profiles.length < MAX_PROFILES;
  const compact = creating || profiles.length > 3;

  return (
    <div className="screen who">
      <header className="who-head">
        <div>
          <h1>Хто сьогодні грає?</h1>
          <p>{profiles.length ? 'Торкнися своєї картки' : 'Створімо твій профіль'}</p>
        </div>
        <button type="button" className="chip-btn" onClick={onParent}>
          <LockIcon />
          Для батьків
        </button>
      </header>

      <div className="who-body">
        <div className={`who-cards${compact ? ' compact' : ''}`}>
          {profiles.map((p) => (
            <button key={p.id} type="button" className="who-card" onClick={() => onPick(p.id)}>
              <span className="who-avatar">
                <Pet kind={p.pet} size={compact ? 104 : 150} label="" />
              </span>
              <span className="who-name">{p.name}</span>
              <span className="who-stats">
                <span>
                  <StarIcon />
                  {p.stars}
                </span>
                <span>
                  <CoinIcon size={20} />
                  {p.coins}
                </span>
              </span>
            </button>
          ))}
          {canAdd && !creating && (
            <button type="button" className="who-card who-add" onClick={() => setCreating(true)}>
              <span className="who-plus">
                <PlusIcon />
              </span>
              <span>Новий профіль</span>
            </button>
          )}
        </div>

        {creating && (
          <NewProfileForm
            canCancel={profiles.length > 0}
            onCancel={() => setCreating(false)}
            onCreated={async (p) => {
              setCreating(false);
              await onCreated(p);
            }}
          />
        )}
      </div>
    </div>
  );
}

function NewProfileForm({
  canCancel,
  onCancel,
  onCreated,
}: {
  canCancel: boolean;
  onCancel: () => void;
  onCreated: (p: Profile) => void | Promise<void>;
}) {
  const [name, setName] = useState('');
  const [pet, setPet] = useState<PetKind>('dog');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onCreated(await createProfile({ name, pet }));
    } catch (err) {
      setError(err instanceof ProfileError ? err.message : 'Не вдалося зберегти. Спробуй ще раз.');
      setBusy(false);
    }
  }

  return (
    <form className="panel who-form" onSubmit={submit}>
      <div className="who-form-head">
        <h2>Новий профіль</h2>
        {canCancel && (
          <button type="button" className="who-cancel" onClick={onCancel}>
            Скасувати
          </button>
        )}
      </div>
      <div className="who-field">
        <label htmlFor="kid-name">Імʼя</label>
        <input
          id="kid-name"
          type="text"
          placeholder="Як тебе звати?"
          autoComplete="off"
          maxLength={MAX_NAME_LENGTH}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <fieldset className="who-field">
        <legend>Обери улюбленця</legend>
        <div className="who-pets">
          {PET_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              className="who-pet"
              aria-pressed={pet === k}
              onClick={() => setPet(k)}
            >
              <Pet kind={k} size={92} label="" />
              <span>{PET_LABELS[k]}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <p className="who-error" role="alert">
        {error}
      </p>
      <button type="submit" className="btn-primary" disabled={busy}>
        Створити профіль
      </button>
    </form>
  );
}
