import React from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMyServices, useSyncedUser, useTransactions } from '../hooks/queries';
import { Announcement, BalanceCard, HScroll, HomeHeader, QuickAction, SectionHeader, WeekChart } from '../components/home';
import { ServiceGridCard } from '../components/media';
import { TxRow } from '../components/TxRow';
import { Button, Card, Chip, Empty } from '../components/ui';
import { colors, fonts, spacing } from '../theme';
import { money } from '../format';
import { counts as isSale } from '../bookings';

export default function ProviderHomeScreen() {
  const nav = useNavigation<any>();
  const { user, refetch: refetchMe, isRefetching } = useSyncedUser();
  const services = useMyServices();
  const txs = useTransactions();

  const sales = (txs.data ?? []).filter((t) => t.providerId === user.id && isSale(t));
  const revenue = sales.reduce((a, t) => a + t.amount, 0);
  const mine = services.data ?? [];


  const counts = new Map<string, number>();
  sales.forEach((t) => counts.set(t.serviceId, (counts.get(t.serviceId) ?? 0) + 1));
  const topId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const top = mine.find((s) => s.id === topId);
  const refresh = () => { refetchMe(); services.refetch(); txs.refetch(); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refresh} />}>
        <HomeHeader user={user} />
        <Announcement title={sales.length ? `Tem ${sales.length} venda(s) concluída(s)` : 'Comece a vender'} text={sales.length ? 'Levante os seus ganhos a qualquer momento na carteira.' : 'Publique serviços com boas fotos e descrições para atrair clientes.'} onPress={() => nav.navigate(sales.length ? 'Wallet' : 'ServiceForm')} />

        <BalanceCard
          title="Saldo (ganhos)"
          balance={user.balance}
          stats={[
            { label: 'Vendas', value: String(sales.length), icon: 'bag-check-outline' },
            { label: 'Serviços ativos', value: String(mine.length), icon: 'briefcase-outline' },
            { label: 'Ticket médio', value: money(sales.length ? revenue / sales.length : 0), icon: 'stats-chart-outline' },
          ]}
        />

        <View style={{ flexDirection: 'row', marginBottom: spacing.sm }}>
          <QuickAction icon="add-circle-outline" label="Novo serviço" onPress={() => nav.navigate('ServiceForm')} />
          <QuickAction icon="briefcase-outline" label="Meus serviços" onPress={() => nav.navigate('MyServices')} />
          <QuickAction icon="receipt-outline" label="Histórico" onPress={() => nav.navigate('Transactions')} />
          <QuickAction icon="person-outline" label="Perfil" onPress={() => nav.navigate('Profile')} />
        </View>

        <SectionHeader title="Receita · últimos 7 dias" />
        <WeekChart txs={sales} />

        {top && (<>
          <SectionHeader title="Mais vendido" />
          <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontFamily: fonts.headingSemi, fontSize: 17, color: colors.text }}>{top.title}</Text>
              <Text style={{ fontFamily: fonts.body, color: colors.muted }}>{money(top.price)}</Text>
            </View>
            <Chip text={`${counts.get(top.id)} venda(s)`} />
          </Card>
        </>)}

        <SectionHeader title="Vendas recentes" action="Ver tudo" onAction={() => nav.navigate('Transactions')} />
        {sales.length ? sales.slice(0, 3).map((t) => <TxRow key={t.id} tx={t} userId={user.id} />) : <Empty icon="receipt-outline" text="Ainda não tem vendas." />}

        <SectionHeader title="Os seus serviços" action="Gerir" onAction={() => nav.navigate('MyServices')} />
        {mine.length
          ? <HScroll>{mine.map((s) => <View key={s.id} style={{ marginRight: 12, width: 150 }}><ServiceGridCard service={s} onPress={() => nav.navigate('ServiceForm', { service: s })} /></View>)}</HScroll>
          : <Card><Text style={{ fontFamily: fonts.body, color: colors.muted, marginBottom: 12 }}>Crie o seu primeiro serviço para começar a receber pedidos.</Text><Button title="Criar serviço" onPress={() => nav.navigate('ServiceForm')} /></Card>}
      </ScrollView>
    </SafeAreaView>
  );
}
