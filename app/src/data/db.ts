import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Attempt, Profile } from './types';

export const DB_NAME = 'marymath';
export const DB_VERSION = 2;

interface MaryMathDB extends DBSchema {
  profiles: { key: string; value: Profile; indexes: { byCreated: string } };
  meta: { key: string; value: unknown };
  attempts: { key: number; value: Attempt; indexes: { byProfile: string } };
}

export type MaryMathDb = IDBPDatabase<MaryMathDB>;

let dbPromise: Promise<MaryMathDb> | null = null;

/**
 * Opens the app database. Each schema change bumps DB_VERSION and adds an
 * `if (oldVersion < N)` block, so data already on the tablet is migrated, never dropped.
 */
export function getDb(): Promise<MaryMathDb> {
  dbPromise ??= openDB<MaryMathDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const profiles = db.createObjectStore('profiles', { keyPath: 'id' });
        profiles.createIndex('byCreated', 'createdAt');
        db.createObjectStore('meta');
      }
      if (oldVersion < 2) {
        const attempts = db.createObjectStore('attempts', { keyPath: 'id', autoIncrement: true });
        attempts.createIndex('byProfile', 'profileId');
      }
    },
  });
  return dbPromise;
}

/** Test helper: close the cached connection and delete the database. */
export async function resetDbForTests(): Promise<void> {
  if (dbPromise) (await dbPromise).close();
  dbPromise = null;
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
