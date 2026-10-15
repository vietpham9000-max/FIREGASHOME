import { ref, runTransaction, type Database } from 'firebase/database';
import { COMMANDS_PATH } from '@/constants/config';
import type { Commands } from '@/types';

export async function updateCommands(database: Database, changes: Partial<Omit<Commands, 'sequence'>>): Promise<void> {
  await runTransaction(ref(database, COMMANDS_PATH), current => ({
    mode: current?.mode === 'MANUAL' ? 'MANUAL' : 'AUTO',
    fan: Boolean(current?.fan), pump: Boolean(current?.pump), doorOpen: Boolean(current?.doorOpen),
    ...changes, sequence: (Number(current?.sequence) || 0) + 1,
  }));
}
