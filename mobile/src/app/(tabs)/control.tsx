import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ConnectionBar } from '@/components/ConnectionBar';
import { ControlRow } from '@/components/ControlRow';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { useApp } from '@/context/AppContext';
import { colors, radius, spacing } from '@/theme';
import type { CommandKey } from '@/types';
import { isControlEnabled } from '@/utils/domain';

export default function ControlScreen() {
  const { isDemoMode, telemetry, commands, commandsReady, firebaseState, internetOnline, telemetryHealth, pending, sendMode, sendDeviceCommand } = useApp();
  const isStale = telemetryHealth !== 'fresh';
  const reachable = isDemoMode || (firebaseState === 'connected' && internetOnline && !isStale && commandsReady);
  const description = !reachable ? 'Không thể gửi lệnh khi thiết bị mất kết nối.' : commands.mode === 'AUTO' ? 'Hệ thống đang ở chế độ tự động.' : 'Chế độ thủ công đang bật. Safety lock vẫn được ưu tiên.';
  const control = (key: CommandKey, name: string, icon: 'refresh-outline' | 'water-outline' | 'exit-outline', actualValue: boolean | undefined, requested: boolean, lock: boolean) => {
    const enabled = isControlEnabled({ mode: commands.mode, key, telemetry, health: telemetryHealth, firebaseConnected: firebaseState === 'connected', internetOnline, commandsReady, demo: isDemoMode });
    const actual = typeof actualValue === 'boolean' ? actualValue ? key === 'door' ? 'OPEN' : 'ON' : key === 'door' ? 'CLOSED' : 'OFF' : 'UNKNOWN';
    const item = pending[key];
    const message = item?.message ?? (!reachable ? 'Không thể gửi lệnh khi thiết bị mất kết nối' : lock ? 'Hệ thống an toàn đang kiểm soát thiết bị' : commands.mode === 'AUTO' ? 'Chuyển sang MANUAL để điều khiển' : 'Sẵn sàng điều khiển');
    return <ControlRow key={key} icon={icon} name={name} actual={actual} requested={requested} enabled={enabled} locked={lock} isStale={isStale} commandStatus={item?.status} message={message} onChange={value => sendDeviceCommand(key, value)} />;
  };
  return <Screen><SectionHeader eyebrow="ĐIỀU KHIỂN HỆ THỐNG" title="Điều khiển hệ thống" /><ConnectionBar /><View style={styles.modeCard}><Text style={styles.modeLabel}>CHẾ ĐỘ HỆ THỐNG</Text><View style={styles.segment}><Pressable disabled={!reachable} onPress={() => sendMode('AUTO')} style={[styles.modeButton, commands.mode === 'AUTO' && styles.active]}><Text style={[styles.modeText, commands.mode === 'AUTO' && styles.activeText]}>AUTO</Text></Pressable><Pressable disabled={!reachable} onPress={() => sendMode('MANUAL')} style={[styles.modeButton, commands.mode === 'MANUAL' && styles.active]}><Text style={[styles.modeText, commands.mode === 'MANUAL' && styles.activeText]}>MANUAL</Text></Pressable></View><Text style={[styles.notice, !reachable && styles.danger]}>{description}</Text></View>{control('fan', 'Quạt thông gió', 'refresh-outline', telemetry?.fan, commands.fan, telemetry?.fanControlLocked === true)}{control('pump', 'Bơm nước', 'water-outline', telemetry?.pump, commands.pump, telemetry?.pumpControlLocked === true)}{control('door', 'Cửa thoát hiểm', 'exit-outline', telemetry?.doorOpen, commands.doorOpen, telemetry?.doorControlLocked === true)}<View style={styles.note}><Text style={styles.noteTitle}>Requested ≠ Actual</Text><Text style={styles.noteText}>Firebase xác nhận đã nhận command không đồng nghĩa relay/servo đã hoạt động. Ứng dụng chỉ báo Confirmed khi telemetry output khớp yêu cầu.</Text></View></Screen>;
}
const styles = StyleSheet.create({ modeCard: { padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface }, modeLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 }, segment: { flexDirection: 'row', gap: 4, marginTop: spacing.md, padding: 4, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.background }, modeButton: { minHeight: 44, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 5 }, active: { backgroundColor: '#29435C' }, modeText: { color: colors.textMuted, fontSize: 11, fontWeight: '800' }, activeText: { color: colors.textPrimary }, notice: { marginTop: spacing.md, color: colors.warning, fontSize: 11, lineHeight: 16 }, danger: { color: colors.danger }, note: { padding: spacing.md, borderLeftWidth: 3, borderLeftColor: colors.blue, backgroundColor: colors.surface }, noteTitle: { color: colors.textPrimary, fontSize: 11, fontWeight: '800' }, noteText: { marginTop: 5, color: colors.textSecondary, fontSize: 10, lineHeight: 15 } });
