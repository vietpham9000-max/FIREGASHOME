import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';
import { useApp } from '@/context/AppContext';
import { colors, radius, spacing } from '@/theme';
import { SectionHeader } from './SectionHeader';

function points(values: (number | null)[], width: number, height: number, normalize: (value: number) => number): string {
  return values.map((value, index) => value == null ? null : `${index / Math.max(1, values.length - 1) * width},${(1 - Math.max(0, Math.min(1, normalize(value)))) * height}`).filter(Boolean).join(' ');
}
export function MiniChart() {
  const { history } = useApp(); const { width: windowWidth } = useWindowDimensions(); const width = Math.max(260, windowWidth - 64), height = 170;
  const recent = history.slice(-40); const temp = points(recent.map(point => point.temperature), width, height, value => (value - 15) / 40); const humidity = points(recent.map(point => point.humidity), width, height, value => value / 100); const gas = points(recent.map(point => point.gas), width, height, value => value / 1023);
  return <View style={styles.card}><SectionHeader eyebrow="LỊCH SỬ TRONG PHIÊN" title="Dữ liệu môi trường" /><View style={styles.legend}><Legend color={colors.blue} label="Nhiệt độ" /><Legend color={colors.success} label="Độ ẩm" /><Legend color={colors.warning} label="Gas" /></View><Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>{[0, .25, .5, .75, 1].map(row => <Line key={row} x1="0" y1={row * height} x2={width} y2={row * height} stroke="#223041" strokeWidth="1" />)}{temp ? <Polyline points={temp} fill="none" stroke={colors.blue} strokeWidth="2.4" /> : null}{humidity ? <Polyline points={humidity} fill="none" stroke={colors.success} strokeWidth="2.4" /> : null}{gas ? <Polyline points={gas} fill="none" stroke={colors.warning} strokeWidth="2.4" /> : null}</Svg>{recent.length < 2 ? <View style={styles.empty}><Text style={styles.emptyTitle}>Chưa đủ dữ liệu biểu đồ</Text><Text style={styles.emptyText}>Lịch sử được ghi từ lúc mở ứng dụng.</Text></View> : null}<Text style={styles.note}>Các chuỗi được chuẩn hóa để so sánh xu hướng</Text></View>;
}
function Legend({ color, label }: { color: string; label: string }) { return <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: color }]} /><Text style={styles.legendText}>{label}</Text></View>; }
const styles = StyleSheet.create({ card: { position: 'relative', padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, overflow: 'hidden' }, legend: { flexDirection: 'row', gap: spacing.md, marginVertical: spacing.md }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 }, dot: { width: 7, height: 7, borderRadius: 4 }, legendText: { color: colors.textSecondary, fontSize: 9 }, empty: { position: 'absolute', top: 105, left: 0, right: 0, alignItems: 'center' }, emptyTitle: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' }, emptyText: { marginTop: 4, color: colors.textMuted, fontSize: 10 }, note: { marginTop: spacing.sm, color: colors.textMuted, fontSize: 9, textAlign: 'right' } });
