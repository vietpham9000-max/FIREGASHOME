import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useApp } from '@/context/AppContext';
import { colors, radius, spacing } from '@/theme';
import { getEsp32State, normalizeTimestamp } from '@/utils/domain';
import { relativeTime } from '@/utils/format';

export function ConnectionBar() {
  const { isDemoMode, firebaseState, internetOnline, telemetryHealth, telemetry, now } = useApp();
  const esp = getEsp32State(telemetryHealth, isDemoMode);
  const tone = !internetOnline || firebaseState === 'disconnected' || esp === 'offline' ? colors.danger : firebaseState === 'connecting' || esp === 'unknown' ? colors.warning : isDemoMode ? colors.blue : colors.success;
  const text = isDemoMode ? 'Dữ liệu mô phỏng' : !internetOnline ? 'Mất kết nối mạng' : `Firebase ${firebaseState} · ESP32 ${esp}`;
  return <View style={styles.bar}><View style={styles.left}><View style={[styles.dot, { backgroundColor: tone }]} /><Text numberOfLines={1} style={styles.text}>{text}</Text></View><View style={styles.time}><Ionicons name="time-outline" size={13} color={colors.textMuted} /><Text style={styles.timeText}>{relativeTime(normalizeTimestamp(telemetry?.lastSeen), now)}</Text></View></View>;
}
const styles = StyleSheet.create({ bar: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface }, left: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, dot: { width: 8, height: 8, borderRadius: 4 }, text: { flex: 1, color: colors.textSecondary, fontSize: 11, textTransform: 'capitalize' }, time: { flexDirection: 'row', alignItems: 'center', gap: 4 }, timeText: { color: colors.textMuted, fontSize: 10 } });
