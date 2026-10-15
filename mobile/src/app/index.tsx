import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useApp } from '@/context/AppContext';
import { colors } from '@/theme';
export default function Index() { const { authLoading, user } = useApp(); if (authLoading) return <View style={styles.container}><View style={styles.mark}><Text style={styles.flame}>●</Text></View><Text style={styles.brand}>FireGas</Text><ActivityIndicator color={colors.blue} /><Text style={styles.loading}>Đang khởi tạo hệ thống…</Text></View>; return <Redirect href={user ? '/(tabs)' : '/login'} />; }
const styles = StyleSheet.create({ container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: colors.background }, mark: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: colors.danger }, flame: { color: colors.white, fontSize: 24 }, brand: { color: colors.textPrimary, fontSize: 28, fontWeight: '800' }, loading: { color: colors.textSecondary, fontSize: 12 } });
