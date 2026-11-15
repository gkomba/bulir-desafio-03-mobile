import React from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useServices, useSyncedUser } from '../hooks/queries';
import { useFavorites } from '../store/favorites';
import { CategoryRow, HScroll, HomeHeader, SectionHeader } from '../components/home';
import { ServiceGridCard } from '../components/media';
import { Button, Empty, Loading } from '../components/ui';
import { colors, fonts, radius, spacing } from '../theme';
import type { Service } from '../types';

export default function ClientHomeScreen() {
  const nav = useNavigation<any>();
  const { user, refetch: refetchMe, isRefetching } = useSyncedUser();
  const services = useServices();
  const { ids, toggle } = useFavorites();

  const all = services.data ?? [];
  // A API já devolve os mais recentes primeiro.
  const newest = all.slice(0, 8);
  const cheapest = [...all].sort((a, b) => a.price - b.price).slice(0, 8);
  const favs = all.filter((s) => ids.includes(s.id));
  const open = (service: Service) => nav.navigate('ServiceDetail', { service });
  const row = (list: Service[]) => (
    <HScroll>{list.map((s) => (
      <View key={s.id} style={{ marginRight: 12, width: 150 }}>
        <ServiceGridCard service={s} onPress={() => open(s)} favorite={{ active: ids.includes(s.id), onToggle: () => toggle(s.id) }} />
      </View>
    ))}</HScroll>
  );
  const refresh = () => { refetchMe(); services.refetch(); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refresh} />}>
        <HomeHeader user={user} />

        <Pressable onPress={() => nav.navigate('Explore', { category: null })} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.field, borderRadius: radius.pill, paddingHorizontal: 16, height: 46, marginBottom: spacing.md }}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <Text style={{ marginLeft: 8, fontFamily: fonts.body, color: '#B5B9C4' }}>Pesquisar serviços...</Text>
        </Pressable>

      

        <SectionHeader title="Categorias" action="Ver todas" onAction={() => nav.navigate('Explore', { category: null })} />
        <CategoryRow selected={null} onSelect={(c) => nav.navigate('Explore', { category: c })} />

        {services.isLoading ? <Loading /> : (<>
          <SectionHeader title="Novos serviços" action="Ver todos" onAction={() => nav.navigate('Explore', { category: null })} />
          {newest.length ? row(newest) : <Empty text="Ainda não há serviços." />}

          {!!favs.length && (<><SectionHeader title="Os seus favoritos" action="Ver" onAction={() => nav.navigate('Favorites')} />{row(favs)}</>)}

          <SectionHeader title="Mais baratos" />
          {row(cheapest)}

          
        </>)}
        <View style={{ height: spacing.md }} />
        <Button title="Ver todos os serviços" variant="soft" onPress={() => nav.navigate('Explore', { category: null })} />
      </ScrollView>
    </SafeAreaView>
  );
}
