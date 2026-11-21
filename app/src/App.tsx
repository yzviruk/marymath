import { useCallback, useEffect, useState } from 'react';
import { listProfiles } from './data/profiles';
import type { Profile } from './data/types';
import { UpdatePrompt } from './pwa/UpdatePrompt';
import { useRouter } from './router';
import { LevelsPreview } from './screens/LevelsPreview';
import { MapScreen } from './screens/MapScreen';
import { PetHome } from './screens/PetHome';
import { StickerAlbum } from './screens/StickerAlbum';
import { ParentGate } from './screens/ParentGate';
import { ParentPanel } from './screens/ParentPanel';
import { DEFAULT_SETTINGS, getSettings, saveSettings, type Settings } from './data/parent';
import { SettingsContext } from './SettingsContext';
import { installSound, setMusicMode, setSoundSettings } from './sound/sound';
import { LevelRun } from './screens/LevelRun';
import { WhoPlays } from './screens/WhoPlays';
import { Stage } from './Stage';

export function App() {
  const { route, go, back, reset } = useRouter();
  const [profiles, setProfiles] = useState<Profile[] | null>(null);

  const reload = useCallback(async () => setProfiles(await listProfiles()), []);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  useEffect(() => {
    void reload();
    void getSettings().then(setSettings);
    installSound();
  }, [reload]);
  useEffect(() => setSoundSettings(settings), [settings]);
  // Music on the map and in the home and album; quieter in a level; none elsewhere.
  useEffect(() => {
    setMusicMode(['map', 'petHome', 'album'].includes(route.name) ? 'normal' : route.name === 'level' ? 'quiet' : 'off');
  }, [route.name]);
  const changeSettings = useCallback(async (patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }));
    await saveSettings(patch);
  }, []);

  const profile = 'profileId' in route ? profiles?.find((p) => p.id === route.profileId) : undefined;
  const toMap = (id: string) => go({ name: 'map', profileId: id });

  let screen: React.ReactNode = null;
  if (profiles === null) {
    screen = null; // first IndexedDB read takes a few ms
  } else if ('profileId' in route && !profile) {
    // e.g. a profile deleted while its screen was in history
    screen = <WhoPlays profiles={profiles} onPick={toMap} onCreated={reload} onParent={() => go({ name: 'gate' })} />;
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
            onParent={() => go({ name: 'gate' })}
            initialCreate={route.create}
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
            onOpenAlbum={() => go({ name: 'album', profileId: profile!.id })}
            music={settings.music}
            onToggleMusic={() => changeSettings({ music: !settings.music })}
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
          <PetHome profile={profile!} onBack={back} onChanged={reload} />
        );
        break;
      case 'album':
        screen = <StickerAlbum profile={profile!} onBack={back} onChanged={reload} />;
        break;
      case 'gate':
        screen = <ParentGate onPass={() => reset({ name: 'parent' })} onBack={back} />;
        break;
      case 'parent':
        screen = (
          <ParentPanel
            profiles={profiles}
            onExit={() => reset({ name: 'who' })}
            onAddProfile={() => reset({ name: 'who', create: true })}
            onPreview={() => go({ name: 'levels' })}
            onChanged={reload}
            onSettings={changeSettings}
          />
        );
        break;
      case 'levels':
        screen = <LevelsPreview onBack={back} />;
        break;
    }
  }

  return (
    <SettingsContext.Provider value={settings}>
      <Stage>
        {screen}
        <UpdatePrompt />
      </Stage>
    </SettingsContext.Provider>
  );
}
