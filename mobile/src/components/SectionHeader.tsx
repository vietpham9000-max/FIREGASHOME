import { StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '@/theme';
export function SectionHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) { return <View style={styles.row}><View>{eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}<Text style={styles.title}>{title}</Text></View>{action}</View>; }
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }, eyebrow: { color: colors.blue, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 4 }, title: { color: colors.textPrimary, fontSize: typography.section, fontWeight: '700' } });
