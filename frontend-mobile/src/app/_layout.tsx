import '@/global.css';
import '@/i18n';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DeviceEventEmitter, View } from 'react-native';

import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { PetProvider } from '@/context/PetContext';
import { ThemeProvider as AppThemeProvider, useTheme as useAppTheme } from '@/theme/ThemeContext';
import DialogProvider from '@/components/ui/DialogProvider';
import { SUBSCRIPTION_REQUIRED } from '@/api/client';
import { PREMIUM_ROUTE } from '@/premium';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { user, loading, refreshUser, returningTrialDays } = useAuth();
  const { loading: themeLoading } = useAppTheme();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !themeLoading) {
      SplashScreen.hideAsync();
    }
  }, [loading, themeLoading]);

  // A change refused because the account is locked opens the subscribe screen. The account is re-read so the banner catches up when the trial ended while the app was open.
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(SUBSCRIPTION_REQUIRED, () => {
      refreshUser().catch(() => {});
      router.navigate(PREMIUM_ROUTE);
    });
    return () => subscription.remove();
  }, [refreshUser, router]);

  // An email that already had its free month is told so on the subscribe screen straight after signup
  useEffect(() => {
    if (user && returningTrialDays !== null) {
      router.navigate(PREMIUM_ROUTE);
    }
  }, [user, returningTrialDays, router]);

  if (loading || themeLoading) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" />
      </Stack.Protected>

      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Screen name="verify" />
      <Stack.Screen name="reset" />
    </Stack>
  );
}

function ThemedRoot() {
  const { theme, style } = useAppTheme();
  // Override the default background color with transparent to allow the custom pattern background to show through.
  // This ensures that the pattern background remains visible behind all screens. Without being obscured by the default background color.
  const base = theme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = { ...base, colors: { ...base.colors, background: 'transparent' } };


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[{ flex: 1 }, style]}>
        <AuthProvider>
          <PetProvider>
            <ThemeProvider value={navTheme}>
              <DialogProvider>
                <RootNavigator />
              </DialogProvider>
            </ThemeProvider>
          </PetProvider>
        </AuthProvider>
      </View>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <ThemedRoot />
    </AppThemeProvider>
  );
}
