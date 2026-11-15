import React from 'react';
import { FlatList, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useServices } from '../hooks/queries';
import { useFavorites } from '../store/favorites';
import { ServiceGridCard } from '../components/media';
import { Empty, Loading, Title } from '../components/ui';
import { Screen } from '../components/Screen';
import { spacing } from '../theme';

export default function FavoritesScreen({ navigation }: NativeStackScreenProps<any>) {
  const { data, isLoading } = useServices();
  const { ids, toggle } = useFavorites();
  const list = (data ?? []).filter((s) => ids.includes(s.id));
  return (
    <Screen scroll={false}>
      <Title style={{ fontSize: 30, marginBottom: spacing.md }}>Favoritos</Title>
      {isLoading ? <Loading /> : (
        <FlatList data={list} keyExtractor={(s) => s.id} numColumns={2} showsVerticalScrollIndicator={false}
          columnWrapperStyle={{ gap: 12 }} contentContainerStyle={{ gap: 12, paddingBottom: spacing.lg }}
          ListEmptyComponent={<Empty icon="heart-outline" text="Toque no coração de um serviço para o guardar aqui." />}
          renderItem={({ item }) => (
            <View style={{ flex: 1 / 2 }}>
              <ServiceGridCard service={item} onPress={() => navigation.navigate('ServiceDetail', { service: item })} favorite={{ active: true, onToggle: () => toggle(item.id) }} />
            </View>
          )} />
      )}
    </Screen>
  );
}
