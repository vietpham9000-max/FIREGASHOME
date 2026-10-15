import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/theme';
export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: 'success' | 'warning' | 'danger' | 'neutral' | 'blue' }) { const color = tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : tone === 'danger' ? colors.danger : tone === 'blue' ? colors.blue : colors.textSecondary; return <View style={[styles.badge, { backgroundColor: `${color}18`, borderColor: `${color}55` }]}><Text style={[styles.text, { color }]}>{label}</Text></View>; }
const styles = StyleSheet.create({ badge: { minHeight: 25, justifyContent: 'center', paddingHorizontal: 8, borderWidth: 1, borderRadius: radius.sm }, text: { fontSize: 9, fontWeight: '800', letterSpacing: .4 } });
