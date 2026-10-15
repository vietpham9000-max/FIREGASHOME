import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import type { CommandStatus } from '@/types';
import { StatusBadge } from './StatusBadge';
type IconName = keyof typeof Ionicons.glyphMap;
export function ControlRow({ icon, name, actual, requested, enabled, locked, isStale = false, commandStatus = 'idle', message, onChange }: { icon: IconName; name: string; actual: string; requested: boolean; enabled: boolean; locked: boolean; isStale?: boolean; commandStatus?: CommandStatus; message: string; onChange(value: boolean): void }) {
  const badge = locked ? 'LOCKED' : !enabled ? 'DISABLED' : commandStatus === 'sending' ? 'SENDING' : commandStatus === 'waiting' ? 'WAITING' : commandStatus === 'timeout' ? 'TIMEOUT' : commandStatus === 'failed' ? 'FAILED' : commandStatus === 'confirmed' ? 'CONFIRMED' : actual;
  const tone = locked || commandStatus === 'failed' ? 'danger' : commandStatus === 'timeout' || commandStatus === 'waiting' ? 'warning' : actual === 'ON' || actual === 'OPEN' || commandStatus === 'confirmed' ? 'success' : 'neutral';
  const isDoor = actual === 'OPEN' || actual === 'CLOSED' || name.toLowerCase().includes('cửa');
  const requestedLabel = requested ? (isDoor ? 'OPEN' : 'ON') : (isDoor ? 'CLOSED' : 'OFF');
  const actualPrefix = isStale ? 'Last actual' : 'Actual';
  const requestedPrefix = isStale ? 'Last requested' : 'Requested';
  return <View style={[styles.row, !enabled && styles.disabled]}><View style={styles.icon}><Ionicons name={icon} size={20} color={locked ? colors.warning : colors.blue} /></View><View style={styles.copy}><View style={styles.titleRow}><Text style={styles.name}>{name}</Text><StatusBadge label={badge} tone={tone} /></View><Text style={styles.actual}>{actualPrefix}: {actual} · {requestedPrefix}: {requestedLabel}</Text><Text style={[styles.message, commandStatus === 'timeout' && { color: colors.warning }]}>{message}</Text></View><Switch value={requested} onValueChange={onChange} disabled={!enabled} trackColor={{ false: '#39485A', true: '#247C60' }} thumbColor={requested ? '#DFFFF3' : '#B4BEC9'} ios_backgroundColor="#39485A" /></View>;
}
const styles = StyleSheet.create({ row: { minHeight: 100, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface }, disabled: { opacity: .72 }, icon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: '#192635' }, copy: { flex: 1 }, titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, name: { flex: 1, color: colors.textPrimary, fontSize: 13, fontWeight: '700' }, actual: { marginTop: 7, color: colors.textSecondary, fontSize: 10 }, message: { marginTop: 4, color: colors.textMuted, fontSize: 10, lineHeight: 14 } });
