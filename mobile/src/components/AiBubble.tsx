import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { colors } from '@/theme';

export function AiBubble() {
  const { user } = useApp();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  if (!user || pathname === '/ai') return null;

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: 78 + insets.bottom }]}>
      <Pressable
        accessibilityLabel="Mở trợ lý AI FireGas"
        accessibilityRole="button"
        onPress={() => router.push('/ai')}
        style={({ pressed }) => [styles.bubble, pressed && styles.pressed]}
      >
        <Ionicons name="chatbubble-ellipses" size={25} color={colors.white} />
        <Text style={styles.label}>AI</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', right: 18, zIndex: 20 },
  bubble: { width: 62, height: 62, borderRadius: 31, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: colors.blue, borderWidth: 2, borderColor: '#8BC5FF', elevation: 8, shadowColor: '#000', shadowOpacity: .32, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  label: { color: colors.white, fontWeight: '900', fontSize: 10, marginTop: 19, marginLeft: -7 },
  pressed: { opacity: .85, transform: [{ scale: .96 }] },
});
