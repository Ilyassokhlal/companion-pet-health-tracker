import '@/global.css';
import '@/i18n';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View } from 'react-native';

import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { PetProvider } from '@/context/PetContext';
import { ThemeProvider as AppThemeProvider, useTheme as useAppTheme } from '@/theme/ThemeContext';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { user, loading } = useAuth();
  const { loading: themeLoading } = useAppTheme();

  useEffect(() => {
    if (!loading && !themeLoading) {
      SplashScreen.hideAsync();
    }
  }, [loading, themeLoading]);

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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[{ flex: 1 }, style]}>
        <AuthProvider>
          <PetProvider>
            <ThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
              <RootNavigator />
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