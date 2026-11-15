// Cliente: catálogo em grelha com pesquisa, categorias e ordenação
import React, { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useServices } from '../hooks/queries';
import { useFavorites } from '../store/favorites';
import { errorMessage } from '../api/client';
import { ServiceGridCard } from '../components/media';
import { CategoryRow } from '../components/home';
import { Empty, ErrorState, Loading, Title } from '../components/ui';
import { categoryLabel } from '../constants';
import type { ServiceCategory } from '../types';
import { Screen } from '../components/Screen';
import { colors, fonts, radius, spacing } from '../theme';

type Sort = 'new' | 'cheap' | 'expensive' | 'az';
const SORTS: [Sort, string][] = [['new', 'Recentes'], ['cheap', 'Mais baratos'], ['expensive', 'Mais caros'], ['az', 'A–Z']];

export default function ExploreScreen({ navigation, route }: NativeStackScreenProps<any>) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('new');
  const [category, setCategory] = useState<ServiceCategory | null>(route.params?.category ?? null);
  // Vindo do início, a categoria já chega escolhida. Ajusta-se durante o render, sem efeito:
  // cada navegação traz um objeto de parâmetros novo, mesmo com a mesma categoria.
  const [params, setParams] = useState(route.params);
  if (route.params !== params) {
    setParams(route.params);
    if (route.params && 'category' in route.params) setCategory(route.params.category ?? null);
  }
  const { data, isLoading, error, refetch, isRefetching } = useServices();
  const { ids, toggle } = useFavorites();

  const list = (data ?? [])
    .filter((s) => !category || s.category === category)
    .filter((s) => `${s.title} ${s.description}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => sort === 'cheap' ? a.price - b.price : sort === 'expensive' ? b.price - a.price : sort === 'az' ? a.title.localeCompare(b.title) : 0);
  if (sort === 'new') list.reverse();

  const header = (
    <View>
      <CategoryRow selected={category} onSelect={setCategory} />
      <View style={{ flexDirection: 'row', gap: 8, marginVertical: spacing.sm, flexWrap: 'wrap' }}>
        {SORTS.map(([k, l]) => (
          <Pressable key={k} onPress={() => setSort(k)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: sort === k ? colors.navy : colors.tint }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: sort === k ? '#fff' : colors.accent }}>{l}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ fontFamily: fonts.headingSemi, fontSize: 18, color: colors.text, marginBottom: spacing.sm }}>{category ? categoryLabel(category) : 'Todos os serviços'} · {list.length}</Text>
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
