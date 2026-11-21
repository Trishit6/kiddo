import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  useFonts as useDisplayFonts,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts as useInterFonts,
} from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthGateProvider } from '@/components/auth-gate';
import { AuthProvider, useAuth } from '@/components/auth-provider';
import { OfflineBanner } from '@/components/offline-banner';
import { api } from '@/lib/api';
import { PreferencesProvider, usePreferences } from '@/theme/preferences-provider';
import { ThemeProvider, useTheme } from '@/theme/theme-provider';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

function subscribeToBackground(flush: () => void): () => void {
  const subscription = AppState.addEventListener('change', (state) => {
    if (state !== 'active') flush();
  });
  return () => subscription.remove();
}

function AppShell({ fontsReady, children }: { fontsReady: boolean; children: ReactNode }) {
  const { status } = useAuth();
  const { ready: themeReady, mode, colors } = useTheme();
  const { ready: preferencesReady } = usePreferences();
  const ready = fontsReady && themeReady && preferencesReady && status !== 'loading';

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <OfflineBanner />
      {children}
    </View>
  );
}

export default function RootLayout() {
  const [displayLoaded, displayError] = useDisplayFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
  });
  const [interLoaded, interError] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const fontsReady = (displayLoaded && interLoaded) || Boolean(displayError || interError);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <PreferencesProvider>
                <AuthProvider>
                  <AuthGateProvider api={api} subscribeToBackground={subscribeToBackground}>
                    <BottomSheetModalProvider>
                      <AppShell fontsReady={fontsReady}>
                        <Stack
                          screenOptions={{
                            headerShown: false,
                            animation: 'slide_from_right',
                            contentStyle: { backgroundColor: 'transparent' },
                          }}
                        />
                      </AppShell>
                    </BottomSheetModalProvider>
                  </AuthGateProvider>
                </AuthProvider>
              </PreferencesProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
