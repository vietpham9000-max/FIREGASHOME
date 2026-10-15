export const ESP32_ONLINE_TIMEOUT_MS = 15_000;
export const COMMAND_CONFIRM_TIMEOUT_MS = 8_000;
export const MAX_HISTORY_POINTS = 120;
export const TELEMETRY_PATH = 'devices/firegas01/telemetry';
export const COMMANDS_PATH = 'devices/firegas01/commands';
export const IS_DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
export const AI_BASE_URL = (process.env.EXPO_PUBLIC_FIREGAS_AI_BASE_URL || 'https://semisweet-conceal-gizzard.ngrok-free.dev').replace(/\/$/, '');

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
export const isFirebaseConfigured = Object.values(firebaseConfig).every(value => Boolean(value?.trim()));
