import { COMMAND_CONFIRM_TIMEOUT_MS, ESP32_ONLINE_TIMEOUT_MS } from '@/constants/config';
import { commandStatusAfterTimeout, getEsp32State, getSafetyState, getTelemetryHealth, isCommandConfirmed, isControlEnabled } from '@/utils/domain';

const now = 1_800_000_000_000;
describe('FireGas domain rules', () => {
  test('ESP32 online, stale and unknown', () => {
    expect(getEsp32State(getTelemetryHealth({ lastSeen: now - 1_000 }, now))).toBe('online');
    expect(getEsp32State(getTelemetryHealth({ lastSeen: now - ESP32_ONLINE_TIMEOUT_MS - 1 }, now))).toBe('offline');
    expect(getEsp32State(getTelemetryHealth({}, now))).toBe('unknown');
  });
  test('stale data overrides safe', () => expect(getSafetyState({ gasDetected: false, flame: false }, 'stale', true)).toBe('offline'));
  test.each([['safe', false, false], ['gas', true, false], ['fire', false, true], ['critical', true, true]] as const)('%s safety state', (expected, gasDetected, flame) => expect(getSafetyState({ gasDetected, flame }, 'fresh', true)).toBe(expected));
  test('control requires manual, connection and no lock', () => {
    const base = { mode: 'MANUAL' as const, key: 'fan' as const, telemetry: {}, health: 'fresh' as const, firebaseConnected: true, internetOnline: true, commandsReady: true, demo: false };
    expect(isControlEnabled(base)).toBe(true); expect(isControlEnabled({ ...base, mode: 'AUTO' })).toBe(false); expect(isControlEnabled({ ...base, telemetry: { fanControlLocked: true } })).toBe(false); expect(isControlEnabled({ ...base, health: 'stale' })).toBe(false);
  });
  test('command confirmation uses actual telemetry only', () => { expect(isCommandConfirmed('fan', true, { fan: true })).toBe(true); expect(isCommandConfirmed('fan', true, { fan: false })).toBe(false); });
  test('waiting command times out after the configured window', () => { expect(COMMAND_CONFIRM_TIMEOUT_MS).toBe(8_000); expect(commandStatusAfterTimeout('waiting')).toBe('timeout'); expect(commandStatusAfterTimeout('confirmed')).toBe('confirmed'); });
});
