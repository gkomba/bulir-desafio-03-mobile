import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/auth';
import { useFavorites } from '../store/favorites';
import { Platform, View } from 'react-native';
import { colors } from '../theme';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ClientHomeScreen from '../screens/ClientHomeScreen';
import ProviderHomeScreen from '../screens/ProviderHomeScreen';
import ExploreScreen from '../screens/ExploreScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import ServiceDetailScreen from '../screens/ServiceDetailScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PaymentMethodsScreen from '../screens/PaymentMethodsScreen';
import WalletScreen from '../screens/WalletScreen';
import { usePayments } from '../store/payments';

import MyServicesScreen from '../screens/MyServicesScreen';
import ServiceFormScreen from '../screens/ServiceFormScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const icon = (name: React.ComponentProps<typeof Ionicons>['name']) => {
  const TabIcon = ({ focused, size }: { focused: boolean; size: number }) => (
    <View style={{ alignItems: 'center' }}>
      <Ionicons name={name} color={focused ? colors.navy : colors.muted} size={size + 2} />
      <View style={{ width: 14, height: 3, borderRadius: 2, marginTop: 3, backgroundColor: focused ? colors.primary : 'transparent' }} />
    </View>
  );
  return TabIcon;
};

/**
 * As abas só têm ícones. No iOS o React Navigation já lhes dá o rótulo ("Explorar, tab, 2 of 5"),
 * mas no Android não dá nenhum: sem este, leitores de ecrã e testes de interface não as encontram.
 */
const tabLabel = (title: string) => (Platform.OS === 'android' ? title : undefined);

function Tabs() {
  const role = useAuth((s) => s.user!.role);
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarShowLabel: false, tabBarStyle: { height: 62, borderTopColor: colors.border, backgroundColor: '#fff' } }}>
      {/* Autorização na navegação: cada perfil só vê as suas telas */}
      {role === 'CLIENT' ? (
        <>
          <Tab.Screen name="Home" component={ClientHomeScreen} options={{ title: 'Início', tabBarAccessibilityLabel: tabLabel('Início'), tabBarIcon: icon('home-outline') }} />
          <Tab.Screen name="Explore" component={ExploreScreen} options={{ title: 'Explorar', tabBarAccessibilityLabel: tabLabel('Explorar'), tabBarIcon: icon('search-outline') }} />
          <Tab.Screen name="Wallet" component={WalletScreen} options={{ title: 'Carteira', tabBarAccessibilityLabel: tabLabel('Carteira'), tabBarIcon: icon('wallet-outline') }} />
        </>
      ) : (
        <>
          <Tab.Screen name="Home" component={ProviderHomeScreen} options={{ title: 'Início', tabBarAccessibilityLabel: tabLabel('Início'), tabBarIcon: icon('home-outline') }} />
          <Tab.Screen name="MyServices" component={MyServicesScreen} options={{ title: 'Meus serviços', tabBarAccessibilityLabel: tabLabel('Meus serviços'), tabBarIcon: icon('briefcase-outline') }} />
          <Tab.Screen name="Wallet" component={WalletScreen} options={{ title: 'Carteira', tabBarAccessibilityLabel: tabLabel('Carteira'), tabBarIcon: icon('wallet-outline') }} />
        </>
      )}
      <Tab.Screen name="Transactions" component={TransactionsScreen} options={{ title: 'Histórico', tabBarAccessibilityLabel: tabLabel('Histórico'), tabBarIcon: icon('document-text-outline') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil', tabBarAccessibilityLabel: tabLabel('Perfil'), tabBarIcon: icon('person-outline') }} />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const { tokens, user } = useAuth();
  const loadFavs = useFavorites((s) => s.load);
  const loadCards = usePayments((s) => s.load);
  const userId = user?.id;
  React.useEffect(() => { if (userId) { loadFavs(userId); loadCards(userId); } }, [userId, loadFavs, loadCards]);
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerTintColor: colors.navy, headerStyle: { backgroundColor: colors.bg }, headerShadowVisible: false }}>
        {tokens && user ? (
          <>
            <Stack.Screen name="Main" component={Tabs} options={{ headerShown: false }} />
            {user.role === 'PROVIDER' && <Stack.Screen name="ServiceForm" component={ServiceFormScreen} options={{ title: '' }} />}
            {user.role === 'CLIENT' && (<>
              <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} options={{ title: '' }} />
              <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: '' }} />
              <Stack.Screen name="Favorites" component={FavoritesScreen} options={{ title: '' }} />
            </>)}
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: '' }} />
            <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} options={{ title: '' }} />
            <Stack.Screen name="Wallet" component={WalletScreen} options={{ title: '' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: '' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
