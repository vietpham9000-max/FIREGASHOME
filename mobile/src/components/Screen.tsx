import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';

export function Screen({ children, contentContainerStyle, ...props }: ScrollViewProps) {
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView style={styles.scroll} contentContainerStyle={[styles.content, contentContainerStyle]} showsVerticalScrollIndicator={false} {...props}>{children}</ScrollView></SafeAreaView>;
}
export function StaticScreen({ children }: { children: React.ReactNode }) { return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.content}>{children}</View></SafeAreaView>; }
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, scroll: { flex: 1 }, content: { padding: spacing.lg, paddingBottom: 110, gap: spacing.lg } });
