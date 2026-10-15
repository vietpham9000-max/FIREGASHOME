import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import type { Auth, Persistence } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';
import { firebaseConfig, isFirebaseConfigured } from '@/constants/config';

let authInstance: Auth | null = null;
let databaseInstance: Database | null = null;

export function getFirebaseServices(): { auth: Auth; database: Database } {
  if (!isFirebaseConfigured) throw new Error('FIREBASE_CONFIG_MISSING');
  if (authInstance && databaseInstance) return { auth: authInstance, database: databaseInstance };
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const getReactNativePersistence = (FirebaseAuth as unknown as { getReactNativePersistence(storage: typeof AsyncStorage): Persistence }).getReactNativePersistence;
  try { authInstance = FirebaseAuth.initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) }); }
  catch { authInstance = FirebaseAuth.getAuth(app); }
  databaseInstance = getDatabase(app);
  return { auth: authInstance, database: databaseInstance };
}
