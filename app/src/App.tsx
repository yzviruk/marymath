import { useCallback, useEffect, useState } from 'react';
import { listProfiles } from './data/profiles';
import type { Profile } from './data/types';
import { UpdatePrompt } from './pwa/UpdatePrompt';
import { useRouter } from './router';
import { LevelsPreview } from './screens/LevelsPreview';
import { MapScreen } from './screens/MapScreen';
import { StubScreen } from './screens/StubScreen';
import { LevelRun } from './screens/LevelRun';
import { WhoPlays } from './screens/WhoPlays';
import { Stage } from './Stage';

export function App() {
  const { route, go, back, reset } = useRouter();
  const [profiles, setProfiles] = useState<Profile[] | null>(null);

  const reload = useCallback(async () => setProfiles(await listProfiles()), []);
  useEffect(() => {
    void reload();
  }, [reload]);

  const profile = 'profileId' in route ? profiles?.find((p) => p.id === route.profileId) : undefined;
  const toMap = (id: string) => go({ name: 'map', profileId: id });

  let screen: React.ReactNode = null;
  if (profiles === null) {
    screen = null; // first IndexedDB read takes a few ms
  } else if ('profileId' in route && !profile) {
    // e.g. a profile deleted while its screen was in history
    screen = <WhoPlays profiles={profiles} onPick={toMap} onCreated={reload} onParent={() => go({ name: 'parent' })} />;
  } else {
    switch (route.name) {
      case 'who':
        screen = (
          <WhoPlays
            profiles={profiles}
            onPick={toMap}
            onCreated={async (p) => {
              await reload();
              toMap(p.id);
            }}
            onParent={() => go({ name: 'parent' })}
          />
        );
        break;
      case 'map':
        screen = (
          <MapScreen
            profile={profile!}
            onSwitchChild={() => reset({ name: 'who' })}
            onOpenLevel={(levelId) => go({ name: 'level', profileId: profile!.id, levelId })}
            onOpenPetHome={() => go({ name: 'petHome', profileId: profile!.id })}
          />
        );
        break;
      case 'level':
        screen = (
          <LevelRun
            key={route.levelId}
            profile={profile!}
            levelId={route.levelId}
            onExit={back}
            onNextLevel={(levelId) => reset({ name: 'level', profileId: profile!.id, levelId })}
            onProfileChanged={reload}
          />
        );
        break;
      case 'petHome':
        screen = (
          <StubScreen
            title="Будиночок і магазин"
            text={`${profile!.petName} чекає на будиночок. Він зʼявиться на етапі гейміфікації.`}
            pet={profile!.pet}
            backLabel="Карта"
            onBack={back}
          />
        );
        break;
      case 'parent':
        screen = (
          <StubScreen
            title="Панель батьків"
            text="Тут будуть PIN, профілі, статистика і резервна копія (етап 6). Уже зараз можна переглянути приклади кожного рівня."
            backLabel="Хто грає?"
            onBack={back}
            action={{ label: 'Приклади рівнів', onClick: () => go({ name: 'levels' }) }}
          />
        );
        break;
      case 'levels':
        screen = <LevelsPreview onBack={back} />;
        break;
    }
  }

  return (
    <Stage>
      {screen}
      <UpdatePrompt />
    </Stage>
  );
}
