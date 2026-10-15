import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { StatusBadge } from './StatusBadge';
type IconName = keyof typeof Ionicons.glyphMap;
export function DeviceRow({ icon, name, description, status, tone }: { icon: IconName; name: string; description: string; status: string; tone: 'success' | 'warning' | 'danger' | 'neutral' | 'blue' }) { return <View style={styles.row}><View style={styles.icon}><Ionicons name={icon} size={20} color={colors.blue} /></View><View style={styles.copy}><Text style={styles.name}>{name}</Text><Text numberOfLines={2} style={styles.description}>{description}</Text></View><StatusBadge label={status} tone={tone} /></View>; }
const styles = StyleSheet.create({ row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface }, icon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: '#192A3D' }, copy: { flex: 1 }, name: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' }, description: { marginTop: 4, color: colors.textSecondary, fontSize: 10, lineHeight: 14 } });
