import { useRegisterSW } from 'virtual:pwa-register/react';
import './UpdatePrompt.css';

/** Registers the service worker and offers a quiet "update" button when a new version is ready. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Tablet may stay open for days: check for a new version every hour.
      if (registration) setInterval(() => void registration.update(), 60 * 60 * 1000);
    },
  });

  if (!needRefresh) return null;
  return (
    <div className="update" role="status">
      <span>Є нова версія</span>
      <button type="button" className="update-go" onClick={() => void updateServiceWorker(true)}>
        Оновити
      </button>
      <button type="button" className="update-later" onClick={() => setNeedRefresh(false)} aria-label="Пізніше">
        ✕
      </button>
    </div>
  );
}
