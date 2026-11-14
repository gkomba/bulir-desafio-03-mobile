import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts, Raleway_700Bold, Raleway_800ExtraBold } from '@expo-google-fonts/raleway';
import { Nunito_400Regular, Nunito_700Bold } from '@expo-google-fonts/nunito';
import Navigation from './src/navigation';
import { DialogHost } from './src/components/ui';
import { useAuth } from './src/store/auth';
import { colors } from './src/theme';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

export default function App() {
  const [fontsLoaded] = useFonts({ Raleway_700Bold, Raleway_800ExtraBold, Nunito_400Regular, Nunito_700Bold });
  const { hydrated, hydrate, tokens } = useAuth();
  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => { if (!tokens) queryClient.clear(); }, [tokens]);
  if (!hydrated || !fontsLoaded) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.accent} /></View>;
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Navigation />
        <DialogHost />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
