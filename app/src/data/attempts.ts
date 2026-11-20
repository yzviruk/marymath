import { columnTask } from '../engine/tasks';
import type { Task } from '../engine/types';
import { getDb } from './db';
import type { Attempt } from './types';

export async function saveAttempt(attempt: Omit<Attempt, 'id'>): Promise<void> {
  await (await getDb()).add('attempts', attempt as Attempt);
}

export async function listAttempts(profileId: string): Promise<Attempt[]> {
  return (await getDb()).getAllFromIndex('attempts', 'byProfile', profileId);
}

const day = (iso: string) => iso.slice(0, 10);

/**
 * Column tasks to repeat: missed on the first try on an earlier day, on one of `levels`,
 * and not solved on the first try since. Newest first, at most `limit`.
 */
export async function columnReviewTasks(profileId: string, levels: string[], now = new Date(), limit = 2): Promise<Task[]> {
  const today = day(now.toISOString());
  const all = (await listAttempts(profileId)).sort((x, y) => x.at.localeCompare(y.at));
  const lastFirstTry = new Map<string, Attempt>();
  for (const a of all) {
    if (a.tryNo === 1 && levels.includes(a.level) && (a.op === '+' || a.op === '−')) lastFirstTry.set(a.taskKey, a);
  }
  return [...lastFirstTry.values()]
    .filter((a) => !a.correct && day(a.at) < today)
    .sort((x, y) => y.at.localeCompare(x.at))
    .slice(0, limit)
    .map((a) => columnTask(a.level, a.op as '+' | '−', a.a, a.b));
}
