import type { User } from 'firebase/auth';

export interface Telemetry {
  temperature?: number; humidity?: number; dhtOk?: boolean;
  gas?: number; gasRaw?: number; gasDetected?: boolean;
  flame?: boolean; flameValue?: number; flameSensorAvailable?: boolean;
  alarm?: boolean; fan?: boolean; pump?: boolean; doorOpen?: boolean;
  mode?: 'AUTO' | 'MANUAL'; wifiRssi?: number; arduinoConnected?: boolean;
  manualFan?: boolean; manualPump?: boolean; manualDoor?: boolean;
  fanControlLocked?: boolean; pumpControlLocked?: boolean; doorControlLocked?: boolean;
  lastSeen?: number;
}
export interface Commands { mode: 'AUTO' | 'MANUAL'; fan: boolean; pump: boolean; doorOpen: boolean; sequence: number; }
export type FirebaseConnectionState = 'connecting' | 'connected' | 'disconnected' | 'demo';
export type DeviceConnectionState = 'online' | 'offline' | 'unknown' | 'demo';
export type TelemetryHealth = 'fresh' | 'stale' | 'unknown';
export type SafetyState = 'safe' | 'gas' | 'fire' | 'critical' | 'offline';
export type CommandStatus = 'idle' | 'sending' | 'waiting' | 'confirmed' | 'timeout' | 'failed';
export type CommandKey = 'fan' | 'pump' | 'door';
export type DemoScenario = 'normal' | 'gas' | 'fire' | 'critical' | 'offline' | 'stale';
export interface PendingCommand { requested: boolean; status: CommandStatus; message: string; }
export interface HistoryPoint { timestamp: number; temperature: number | null; humidity: number | null; gas: number | null; }
export interface AppSessionUser { uid: string; email: string | null; firebaseUser?: User; }
