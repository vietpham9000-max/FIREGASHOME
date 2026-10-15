import NetInfo from '@react-native-community/netinfo';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { onValue, ref } from 'firebase/database';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { COMMAND_CONFIRM_TIMEOUT_MS, COMMANDS_PATH, IS_DEMO_MODE, MAX_HISTORY_POINTS, TELEMETRY_PATH, isFirebaseConfigured } from '@/constants/config';
import { getFirebaseServices } from '@/services/firebase';
import { updateCommands } from '@/services/commands';
import type { AppSessionUser, CommandKey, Commands, DemoScenario, FirebaseConnectionState, HistoryPoint, PendingCommand, SafetyState, Telemetry, TelemetryHealth } from '@/types';
import { authErrorMessage } from '@/utils/format';
import { commandStatusAfterTimeout, getSafetyState, getTelemetryHealth, isCommandConfirmed, isControlEnabled } from '@/utils/domain';

const defaultCommands: Commands = { mode: 'AUTO', fan: false, pump: false, doorOpen: false, sequence: 0 };
const demoBase: Telemetry = { temperature: 28.4, humidity: 64, dhtOk: true, gas: 82, gasRaw: 82, gasDetected: false, flame: false, flameValue: 0, flameSensorAvailable: true, alarm: false, fan: false, pump: false, doorOpen: false, wifiRssi: -53, arduinoConnected: true, fanControlLocked: false, pumpControlLocked: false, doorControlLocked: false, lastSeen: Date.now() };

interface AppContextValue {
  isDemoMode: boolean; authLoading: boolean; user: AppSessionUser | null; authError: string | null;
  telemetry: Telemetry | null; telemetryReceived: boolean; commands: Commands; commandsReady: boolean;
  firebaseState: FirebaseConnectionState; internetOnline: boolean; telemetryHealth: TelemetryHealth; safetyState: SafetyState;
  history: HistoryPoint[]; pending: Partial<Record<CommandKey, PendingCommand>>; dataError: string | null;
  scenario: DemoScenario; now: number;
  signIn(email: string, password: string): Promise<boolean>; signOut(): Promise<void>;
  sendMode(mode: Commands['mode']): Promise<void>; sendDeviceCommand(key: CommandKey, value: boolean): Promise<void>;
  setScenario(scenario: DemoScenario): void;
}
const AppContext = createContext<AppContextValue | null>(null);

function demoForScenario(next: DemoScenario, previous: Telemetry | null): Telemetry {
  const data: Telemetry = { ...demoBase, temperature: previous?.temperature ?? 28.4, humidity: previous?.humidity ?? 64, lastSeen: Date.now() };
  if (next === 'gas' || next === 'critical') Object.assign(data, { gas: 670, gasRaw: 670, gasDetected: true, fan: true, fanControlLocked: true });
  if (next === 'fire' || next === 'critical') Object.assign(data, { flame: true, flameValue: 1, alarm: true, pump: true, doorOpen: true, pumpControlLocked: true, doorControlLocked: true });
  if (next === 'offline') delete data.lastSeen;
  if (next === 'stale') data.lastSeen = Date.now() - 60_000;
  return data;
}

export function AppProvider({ children }: PropsWithChildren) {
  const [authLoading, setAuthLoading] = useState(!IS_DEMO_MODE && isFirebaseConfigured);
  const [user, setUser] = useState<AppSessionUser | null>(IS_DEMO_MODE ? { uid: 'demo', email: 'demo@firegas.local' } : null);
  const [authError, setAuthError] = useState<string | null>(!IS_DEMO_MODE && !isFirebaseConfigured ? 'Firebase chưa được cấu hình. Hãy tạo file .env từ .env.example.' : null);
  const [telemetry, setTelemetry] = useState<Telemetry | null>(IS_DEMO_MODE ? demoBase : null);
  const [telemetryReceived, setTelemetryReceived] = useState(IS_DEMO_MODE);
  const [commands, setCommands] = useState<Commands>(defaultCommands);
  const [commandsReady, setCommandsReady] = useState(IS_DEMO_MODE);
  const [firebaseState, setFirebaseState] = useState<FirebaseConnectionState>(IS_DEMO_MODE ? 'demo' : isFirebaseConfigured ? 'connecting' : 'disconnected');
  const [internetOnline, setInternetOnline] = useState(true);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [pending, setPending] = useState<Partial<Record<CommandKey, PendingCommand>>>({});
  const [dataError, setDataError] = useState<string | null>(null);
  const [scenario, setScenarioState] = useState<DemoScenario>('normal');
  const [now, setNow] = useState(() => Date.now());
  const lastHistoryTimestamp = useRef<number | null>(null);
  const commandTimers = useRef<Partial<Record<CommandKey, ReturnType<typeof setTimeout>>>>({});

  useEffect(() => NetInfo.addEventListener(state => setInternetOnline(state.isConnected === true)), []);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);

  useEffect(() => {
    if (IS_DEMO_MODE) return;
    if (!isFirebaseConfigured) return;
    try {
      const { auth } = getFirebaseServices();
      return onAuthStateChanged(auth, current => { setUser(current ? { uid: current.uid, email: current.email, firebaseUser: current } : null); setAuthLoading(false); }, error => { setAuthError(authErrorMessage((error as { code?: string }).code)); setAuthLoading(false); });
    } catch { queueMicrotask(() => { setFirebaseState('disconnected'); setAuthError('Firebase không khả dụng.'); setAuthLoading(false); }); }
  }, []);

  useEffect(() => {
    if (IS_DEMO_MODE || !user) return;
    const { database } = getFirebaseServices();
    const unsubConnection = onValue(ref(database, '.info/connected'), snap => setFirebaseState(snap.val() === true ? 'connected' : internetOnline ? 'connecting' : 'disconnected'), () => setFirebaseState('disconnected'));
    const unsubTelemetry = onValue(ref(database, TELEMETRY_PATH), snap => { const value = (snap.val() ?? {}) as Telemetry; setTelemetry(value); setTelemetryReceived(true); setDataError(null); }, error => { const code = (error as { code?: string }).code; setDataError(code === 'PERMISSION_DENIED' ? 'Không có quyền đọc telemetry.' : 'Không thể đọc telemetry từ Firebase.'); });
    const unsubCommands = onValue(ref(database, COMMANDS_PATH), snap => { const value = snap.val() ?? {}; setCommands({ mode: value.mode === 'MANUAL' ? 'MANUAL' : 'AUTO', fan: Boolean(value.fan), pump: Boolean(value.pump), doorOpen: Boolean(value.doorOpen), sequence: Number(value.sequence) || 0 }); setCommandsReady(true); }, error => { const code = (error as { code?: string }).code; setCommandsReady(false); setDataError(code === 'PERMISSION_DENIED' ? 'Không có quyền đọc commands.' : 'Không thể đọc commands từ Firebase.'); });
    return () => { unsubConnection(); unsubTelemetry(); unsubCommands(); };
  }, [user, internetOnline]);

  const appendHistory = useCallback((data: Telemetry) => {
    const timestamp = Number(data.lastSeen) || Date.now(); if (!IS_DEMO_MODE && timestamp === lastHistoryTimestamp.current) return; lastHistoryTimestamp.current = timestamp;
    const numeric = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : null;
    const point: HistoryPoint = { timestamp, temperature: numeric(data.temperature), humidity: numeric(data.humidity), gas: numeric(data.gas ?? data.gasRaw) };
    setHistory(current => [...current, point].slice(-MAX_HISTORY_POINTS));
  }, []);
  useEffect(() => { if (telemetry && telemetryReceived) appendHistory(telemetry); }, [telemetry, telemetryReceived, appendHistory]);

  useEffect(() => {
    (Object.keys(pending) as CommandKey[]).forEach(key => { const item = pending[key]; if (item && ['sending', 'waiting'].includes(item.status) && isCommandConfirmed(key, item.requested, telemetry)) { const timer = commandTimers.current[key]; if (timer) clearTimeout(timer); setPending(current => ({ ...current, [key]: { ...item, status: 'confirmed', message: 'Thiết bị đã xác nhận' } })); } });
  }, [telemetry, pending]);

  useEffect(() => {
    if (!IS_DEMO_MODE) return;
    const timer = setInterval(() => setTelemetry(current => {
      if (!current || ['offline', 'stale'].includes(scenario)) return current;
      const next = { ...current, temperature: Number(current.temperature ?? 28.4) + (Math.random() - 0.5) * 0.14, humidity: Number(current.humidity ?? 64) + (Math.random() - 0.5) * 0.3, wifiRssi: -53 + Math.round((Math.random() - 0.5) * 4), lastSeen: Date.now() };
      if (scenario === 'normal') { next.gas = 82 + Math.round((Math.random() - 0.5) * 12); next.gasRaw = next.gas; }
      return next;
    }), 2000);
    return () => clearInterval(timer);
  }, [scenario]);

  const telemetryHealth = getTelemetryHealth(telemetry, now);
  const effectivelyConnected = IS_DEMO_MODE || (internetOnline && firebaseState === 'connected');
  const safetyState = getSafetyState(telemetry, telemetryHealth, effectivelyConnected);

  const signIn = useCallback(async (email: string, password: string) => {
    setAuthError(null); if (IS_DEMO_MODE) return true;
    if (!isFirebaseConfigured) { setAuthError('Firebase chưa được cấu hình.'); return false; }
    try { const { auth } = getFirebaseServices(); await signInWithEmailAndPassword(auth, email.trim(), password); return true; }
    catch (error) { setAuthError(authErrorMessage((error as { code?: string }).code)); return false; }
  }, []);
  const signOut = useCallback(async () => {
    if (IS_DEMO_MODE) return;
    try { const { auth } = getFirebaseServices(); await firebaseSignOut(auth); setTelemetry(null); setHistory([]); }
    catch { setDataError('Không thể đăng xuất lúc này.'); }
  }, []);
  const sendMode = useCallback(async (mode: Commands['mode']) => {
    if (IS_DEMO_MODE) { setCommands(current => ({ ...current, mode, sequence: current.sequence + 1 })); return; }
    if (!internetOnline || firebaseState !== 'connected' || telemetryHealth !== 'fresh' || !commandsReady) { setDataError('Không thể đổi chế độ khi hệ thống mất kết nối hoặc dữ liệu đã cũ.'); return; }
    try { const { database } = getFirebaseServices(); await updateCommands(database, { mode }); setDataError(null); }
    catch { setDataError('Không gửi được yêu cầu đổi chế độ.'); }
  }, [commandsReady, firebaseState, internetOnline, telemetryHealth]);
  const sendDeviceCommand = useCallback(async (key: CommandKey, value: boolean) => {
    const enabled = isControlEnabled({ mode: commands.mode, key, telemetry, health: telemetryHealth, firebaseConnected: firebaseState === 'connected', internetOnline, commandsReady, demo: IS_DEMO_MODE });
    if (!enabled) { setDataError('Điều khiển đang bị khóa bởi chế độ, kết nối hoặc trạng thái an toàn.'); return; }
    setPending(current => ({ ...current, [key]: { requested: value, status: 'sending', message: 'Đang gửi…' } }));
    if (IS_DEMO_MODE) { const field = key === 'door' ? 'doorOpen' : key; setCommands(current => ({ ...current, [field]: value, sequence: current.sequence + 1 })); setTimeout(() => setTelemetry(current => current ? { ...current, [field]: value } : current), 450); return; }
    try {
      const { database } = getFirebaseServices(); const field = key === 'door' ? 'doorOpen' : key; await updateCommands(database, { [field]: value });
      setPending(current => ({ ...current, [key]: { requested: value, status: 'waiting', message: 'Đã gửi · đang chờ xác nhận' } }));
      const oldTimer = commandTimers.current[key]; if (oldTimer) clearTimeout(oldTimer);
      commandTimers.current[key] = setTimeout(() => setPending(current => { const item = current[key]; return item && commandStatusAfterTimeout(item.status) === 'timeout' ? { ...current, [key]: { ...item, status: 'timeout', message: 'Thiết bị chưa xác nhận' } } : current; }), COMMAND_CONFIRM_TIMEOUT_MS);
    } catch { setPending(current => ({ ...current, [key]: { requested: value, status: 'failed', message: 'Không gửi được lệnh' } })); }
  }, [commands.mode, commandsReady, firebaseState, internetOnline, telemetry, telemetryHealth]);
  const setScenario = useCallback((next: DemoScenario) => { if (!IS_DEMO_MODE) return; setScenarioState(next); const data = demoForScenario(next, telemetry); setTelemetry(data); setCommands(current => ({ ...current, mode: 'AUTO', fan: Boolean(data.fan), pump: Boolean(data.pump), doorOpen: Boolean(data.doorOpen), sequence: current.sequence + 1 })); }, [telemetry]);

  const value = useMemo<AppContextValue>(() => ({ isDemoMode: IS_DEMO_MODE, authLoading, user, authError, telemetry, telemetryReceived, commands, commandsReady, firebaseState, internetOnline, telemetryHealth, safetyState, history, pending, dataError, scenario, now, signIn, signOut, sendMode, sendDeviceCommand, setScenario }), [authLoading, user, authError, telemetry, telemetryReceived, commands, commandsReady, firebaseState, internetOnline, telemetryHealth, safetyState, history, pending, dataError, scenario, now, signIn, signOut, sendMode, sendDeviceCommand, setScenario]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
export function useApp() { const context = useContext(AppContext); if (!context) throw new Error('useApp must be used within AppProvider'); return context; }
