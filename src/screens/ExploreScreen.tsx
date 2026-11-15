// Cliente: catálogo em grelha com pesquisa e ordenação
import React, { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useServices } from '../hooks/queries';
import { useFavorites } from '../store/favorites';
import { errorMessage } from '../api/client';
import { ServiceGridCard } from '../components/media';
import { Empty, ErrorState, Loading, Title } from '../components/ui';
import { Screen } from '../components/Screen';
import { colors, fonts, radius, spacing } from '../theme';

type Sort = 'new' | 'cheap' | 'expensive' | 'az';
const SORTS: [Sort, string][] = [['new', 'Recentes'], ['cheap', 'Mais baratos'], ['expensive', 'Mais caros'], ['az', 'A–Z']];

export default function ExploreScreen({ navigation }: NativeStackScreenProps<any>) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('new');
  const { data, isLoading, error, refetch, isRefetching } = useServices();
  const { ids, toggle } = useFavorites();

  const list = (data ?? [])
    .filter((s) => `${s.title} ${s.description}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => sort === 'cheap' ? a.price - b.price : sort === 'expensive' ? b.price - a.price : sort === 'az' ? a.title.localeCompare(b.title) : 0);
  if (sort === 'new') list.reverse();

  const header = (
    <View>
      <View style={{ flexDirection: 'row', gap: 8, marginVertical: spacing.sm, flexWrap: 'wrap' }}>
        {SORTS.map(([k, l]) => (
          <Pressable key={k} onPress={() => setSort(k)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: sort === k ? colors.navy : colors.tint }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: sort === k ? '#fff' : colors.accent }}>{l}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ fontFamily: fonts.headingSemi, fontSize: 18, color: colors.text, marginBottom: spacing.sm }}>Todos os serviços · {list.length}</Text>
    </View>
  );

  return (
    <Screen scroll={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.md }}>
        <Title style={{ fontSize: 30 }}>Explorar</Title>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.field, borderRadius: radius.pill, paddingHorizontal: 14, height: 42 }}>
          <Ionicons name="search" size={16} color={colors.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Pesquisar" placeholderTextColor="#B5B9C4" style={{ flex: 1, marginLeft: 6, fontFamily: fonts.body }} />
          {!!q && <Pressable onPress={() => setQ('')}><Ionicons name="close-circle" size={16} color={colors.muted} /></Pressable>}
        </View>
      </View>
      {isLoading ? <Loading /> : error ? <ErrorState message={errorMessage(error)} onRetry={refetch} /> : (
        <FlatList data={list} keyExtractor={(s) => s.id} numColumns={2} showsVerticalScrollIndicator={false}
          columnWrapperStyle={{ gap: 12 }} contentContainerStyle={{ gap: 12, paddingBottom: spacing.lg }}
          ListHeaderComponent={header}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); }} />}
          ListEmptyComponent={<Empty icon="search-outline" text="Nenhum serviço encontrado." />}
          renderItem={({ item }) => (
            <View style={{ flex: 1 / 2 }}>
              <ServiceGridCard service={item} onPress={() => navigation.navigate('ServiceDetail', { service: item })}
                favorite={{ active: ids.includes(item.id), onToggle: () => toggle(item.id) }} />
            </View>
          )} />
      )}
    </Screen>
  );
}
