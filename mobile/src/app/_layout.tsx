import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '@/context/AppContext';
import { colors } from '@/theme';

export default function RootLayout() { return <SafeAreaProvider><AppProvider><StatusBar style="light" /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}><Stack.Screen name="index" /><Stack.Screen name="login" /><Stack.Screen name="(tabs)" /></Stack></AppProvider></SafeAreaProvider>; }
