import { BackIcon } from '../components/Icons';
import { Pet } from '../components/Pet';
import type { PetKind } from '../data/types';

interface Props {
  title: string;
  text: string;
  backLabel: string;
  onBack: () => void;
  pet?: PetKind;
  action?: { label: string; onClick: () => void };
}

/** Temporary screen for parts that arrive in later stages. */
export function StubScreen({ title, text, backLabel, onBack, pet, action }: Props) {
  return (
    <div className="screen">
      <div className="topbar">
        <button type="button" className="chip-btn" onClick={onBack}>
          <BackIcon />
          {backLabel}
        </button>
        <span className="topbar-title">{title}</span>
      </div>
      <div
        className="panel"
        style={{ margin: 'auto', width: 720, padding: 48, display: 'flex', alignItems: 'center', gap: 32 }}
      >
        {pet && <Pet kind={pet} size={160} />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'flex-start' }}>
          <p style={{ margin: 0, fontSize: 26, lineHeight: '34px', fontWeight: 800 }}>{text}</p>
          {action && (
            <button type="button" className="btn-primary" onClick={action.onClick}>
              {action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
