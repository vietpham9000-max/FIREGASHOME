import { ESP32_ONLINE_TIMEOUT_MS } from '@/constants/config';
import type { CommandKey, Commands, CommandStatus, DeviceConnectionState, SafetyState, Telemetry, TelemetryHealth } from '@/types';

export function normalizeTimestamp(value?: number): number | null {
  if (!Number.isFinite(value)) return null;
  return (value as number) < 1e12 ? (value as number) * 1000 : value as number;
}
export function getTelemetryHealth(telemetry: Telemetry | null, now = Date.now()): TelemetryHealth {
  const lastSeen = normalizeTimestamp(telemetry?.lastSeen);
  if (!lastSeen) return 'unknown';
  return now - lastSeen <= ESP32_ONLINE_TIMEOUT_MS ? 'fresh' : 'stale';
}
export function getEsp32State(health: TelemetryHealth, demo = false): DeviceConnectionState {
  if (demo) return 'demo';
  return health === 'fresh' ? 'online' : health === 'stale' ? 'offline' : 'unknown';
}
export function getSafetyState(telemetry: Telemetry | null, health: TelemetryHealth, connected: boolean): SafetyState {
  if (!connected || health !== 'fresh') return 'offline';
  const gasValue = Number(telemetry?.gas ?? telemetry?.gasRaw);
  const gas = telemetry?.gasDetected === true || (Number.isFinite(gasValue) && gasValue >= 400);
  const fire = telemetry?.flame === true;
  if (gas && fire) return 'critical';
  if (fire) return 'fire';
  if (gas) return 'gas';
  return 'safe';
}
export function isControlEnabled(input: { mode: Commands['mode']; key: CommandKey; telemetry: Telemetry | null; health: TelemetryHealth; firebaseConnected: boolean; internetOnline: boolean; commandsReady: boolean; demo: boolean }): boolean {
  const { mode, key, telemetry, health, firebaseConnected, internetOnline, commandsReady, demo } = input;
  if (mode !== 'MANUAL') return false;
  if (!demo && (!firebaseConnected || !internetOnline || !commandsReady || health !== 'fresh')) return false;
  return telemetry?.[`${key}ControlLocked` as keyof Telemetry] !== true;
}
export function isCommandConfirmed(key: CommandKey, requested: boolean, telemetry: Telemetry | null): boolean {
  const field = key === 'door' ? 'doorOpen' : key;
  return typeof telemetry?.[field] === 'boolean' && telemetry[field] === requested;
}
export function commandStatusAfterTimeout(status: CommandStatus): CommandStatus {
  return status === 'waiting' ? 'timeout' : status;
}
export function gasValue(telemetry: Telemetry | null): number | null {
  const value = Number(telemetry?.gas ?? telemetry?.gasRaw);
  return Number.isFinite(value) ? value : null;
}
