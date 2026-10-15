import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useApp } from '@/context/AppContext';
import { colors, radius, spacing } from '@/theme';

const content = {
  safe: { icon: 'shield-checkmark-outline', title: 'HỆ THỐNG AN TOÀN', subtitle: 'Không phát hiện khí gas hoặc ngọn lửa', color: colors.success, bg: '#10231F' },
  gas: { icon: 'warning-outline', title: 'CẢNH BÁO RÒ RỈ KHÍ GAS', subtitle: 'Hệ thống đã tự động bật quạt thông gió', color: colors.warning, bg: '#251F13' },
  fire: { icon: 'flame-outline', title: 'CẢNH BÁO CHÁY', subtitle: 'Bơm và cửa thoát hiểm đã được kích hoạt', color: colors.danger, bg: '#2A171B' },
  critical: { icon: 'alert-circle-outline', title: 'NGUY HIỂM', subtitle: 'Phát hiện đồng thời khí gas và ngọn lửa', color: colors.critical, bg: '#321418' },
  offline: { icon: 'cloud-offline-outline', title: 'MẤT KẾT NỐI THIẾT BỊ', subtitle: 'Không nhận được dữ liệu mới từ ESP32', color: '#AAB2BC', bg: '#202126' },
} as const;
export function SafetyBanner() { const { safetyState, internetOnline, telemetryHealth } = useApp(); const item = content[safetyState]; const subtitle = !internetOnline ? 'Điện thoại đang mất kết nối Internet' : telemetryHealth === 'stale' ? 'Telemetry đã quá hạn · dữ liệu đang hiển thị là STALE' : item.subtitle; return <View style={[styles.box, { borderColor: item.color, backgroundColor: item.bg }]}><View style={[styles.icon, { backgroundColor: `${item.color}22` }]}><Ionicons name={item.icon} size={28} color={item.color} /></View><View style={styles.copy}><Text style={[styles.kicker, { color: item.color }]}>TRẠNG THÁI AN TOÀN</Text><Text style={styles.title}>{item.title}</Text><Text style={styles.subtitle}>{subtitle}</Text></View></View>; }
const styles = StyleSheet.create({ box: { minHeight: 126, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderLeftWidth: 4, borderRadius: radius.md }, icon: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 27 }, copy: { flex: 1 }, kicker: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, title: { marginTop: 6, color: colors.textPrimary, fontSize: 18, fontWeight: '800' }, subtitle: { marginTop: 5, color: colors.textSecondary, fontSize: 12, lineHeight: 17 } });
