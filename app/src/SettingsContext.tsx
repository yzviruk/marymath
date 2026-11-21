import { createContext, useContext } from 'react';
import { DEFAULT_SETTINGS, type Settings } from './data/parent';

/** Parent settings for every screen (loaded by App, changed in the parent panel). */
export const SettingsContext = createContext<Settings>(DEFAULT_SETTINGS);

export const useSettings = () => useContext(SettingsContext);
