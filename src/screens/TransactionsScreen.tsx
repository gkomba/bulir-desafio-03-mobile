import React, { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, bookingsApi } from '../api';
import { errorMessage } from '../api/client';
import { counts } from '../bookings';
import { dialog } from '../store/dialog';
import { useAuth } from '../store/auth';
import { useTransactions } from '../hooks/queries';
import { Empty, ErrorState, Loading, Title } from '../components/ui';
import { TxRow } from '../components/TxRow';
import { Screen } from '../components/Screen';
import { money } from '../format';
import { colors, fonts, spacing } from '../theme';

type Filter = 'all' | 'in' | 'out';

export default function TransactionsScreen() {
  const user = useAuth((s) => s.user)!;
  const setUser = useAuth((s) => s.setUser);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const { data, isLoading, error, refetch, isRefetching } = useTransactions();
  const list = (data ?? []).filter((t) => filter === 'all' || (filter === 'out' ? t.clientId === user.id : t.providerId === user.id));
  const total = list.filter(counts).reduce((a, t) => a + (t.clientId === user.id ? -t.amount : t.amount), 0);
  // Cancelar devolve o valor ao cliente e concluir não mexe no saldo; em qualquer caso, relê-se o saldo.
  const change = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'cancel' | 'complete' }) => (action === 'cancel' ? bookingsApi.cancel(id) : bookingsApi.complete(id)),
    onSuccess: async () => { qc.invalidateQueries({ queryKey: ['transactions'] }); setUser(await authApi.me()); },
    onError: (e) => dialog.alert(errorMessage(e), 'Operação falhou'),
  });
  const ask = (id: string, action: 'cancel' | 'complete') => dialog.confirm(
    action === 'cancel' ? 'Cancelar esta reserva? O valor é devolvido.' : 'Marcar esta reserva como concluída?',
    () => change.mutate({ id, action }),
    { title: action === 'cancel' ? 'Cancelar reserva' : 'Concluir reserva', confirmText: action === 'cancel' ? 'Cancelar reserva' : 'Concluir', destructive: action === 'cancel' },
  );
  return (
    <Screen scroll={false}>
      <Title style={{ fontSize: 30, marginBottom: spacing.sm }}>Histórico</Title>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.sm }}>
        {([['all', 'Todas'], ['out', 'Saídas'], ['in', 'Entradas']] as [Filter, string][]).map(([k, l]) => (
          <Pressable key={k} onPress={() => setFilter(k)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: filter === k ? colors.navy : colors.tint }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: filter === k ? '#fff' : colors.accent }}>{l}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ fontFamily: fonts.body, color: colors.muted, marginBottom: spacing.md }}>
        {list.length} reserva(s) · Balanço <Text style={{ fontFamily: fonts.bodyBold, color: total < 0 ? colors.danger : colors.success }}>{money(total)}</Text>
      </Text>
      {isLoading ? <Loading /> : error ? <ErrorState message={errorMessage(error)} onRetry={refetch} /> : (
        <FlatList data={list} keyExtractor={(t) => t.id} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); }} />}
          ListEmptyComponent={<Empty icon="receipt-outline" text="Ainda sem reservas." />}
          renderItem={({ item }) => (
            <TxRow tx={item} userId={user.id} userName={user.name}
              onCancel={user.role === 'CLIENT' ? () => ask(item.id, 'cancel') : undefined}
              onComplete={user.role === 'PROVIDER' ? () => ask(item.id, 'complete') : undefined} />
          )} />
      )}
    </Screen>
  );
}
