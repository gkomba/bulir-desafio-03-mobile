// Carteira: o cliente adiciona saldo (pagamento simulado pela API); o prestador vê o que recebeu
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { authApi } from '../api';
import { errorMessage } from '../api/client';
import { useAuth } from '../store/auth';
import { usePayments } from '../store/payments';
import { dialog } from '../store/dialog';
import { AmountForm, amountSchema } from '../schemas';
import { BalanceCard } from '../components/home';
import { Button, CardView, Field, Title } from '../components/ui';
import { Screen } from '../components/Screen';
import { money } from '../format';
import { counts } from '../bookings';
import { colors, fonts, spacing } from '../theme';
import { useMyServices, useTransactions } from '../hooks/queries';

const QUICK = [5000, 10000, 25000, 50000];

/** Saldo do prestador e os números das suas vendas. */
function ProviderBalance() {
  const user = useAuth((s) => s.user)!;
  const services = useMyServices();
  const txs = useTransactions();
  const sales = (txs.data ?? []).filter((t) => t.providerId === user.id && counts(t));
  const revenue = sales.reduce((a, t) => a + t.amount, 0);
  return (
    <BalanceCard
      title="Saldo (ganhos)"
      balance={user.balance}
      stats={[
        { label: 'Vendas', value: String(sales.length), icon: 'bag-check-outline' },
        { label: 'Serviços ativos', value: String((services.data ?? []).length), icon: 'briefcase-outline' },
        { label: 'Ticket médio', value: money(sales.length ? revenue / sales.length : 0), icon: 'stats-chart-outline' },
      ]}
    />
  );
}

export default function WalletScreen({ navigation }: NativeStackScreenProps<any>) {
  const { user, setUser } = useAuth();
  const { cards } = usePayments();
  const isClient = user!.role === 'CLIENT';
  const [chosen, setChosen] = useState<string | undefined>();
  // Os cartões chegam do armazenamento depois do primeiro ecrã e podem ser removidos:
  // o cartão efetivo é o escolhido, se ainda existir, ou o predefinido.
  const cardId = cards.some((c) => c.id === chosen) ? chosen : cards.find((c) => c.isDefault)?.id;
  const { control, handleSubmit, setValue, reset } = useForm<AmountForm>({ resolver: zodResolver(amountSchema), defaultValues: { amount: '' } });

  const m = useMutation({
    mutationFn: async (amount: number) => { await authApi.deposit(amount); return authApi.me(); },
    onSuccess: (u) => { setUser(u); reset(); dialog.alert('Saldo adicionado com sucesso!', 'Sucesso'); },
    onError: (e) => dialog.alert(errorMessage(e), 'Operação falhou'),
  });
  const submit = handleSubmit(({ amount }) => {
    if (!cardId) return dialog.alert('Adicione um cartão em Métodos de pagamento.', 'Sem cartão');
    m.mutate(Number(amount.replace(',', '.')));
  });

  return (
    <Screen>
      <Title style={{ marginBottom: spacing.md }}>Carteira</Title>
      {isClient ? <BalanceCard title="Saldo atual" balance={user!.balance} stats={[]} /> : <ProviderBalance />}
      {!isClient ? (
        <Text style={{ fontFamily: fonts.body, color: colors.muted }}>O saldo de um prestador aumenta quando um cliente contrata um serviço, e diminui se a reserva for cancelada.</Text>
      ) : (
        <>
          <Text style={{ fontFamily: fonts.headingSemi, fontSize: 18, color: colors.text, marginBottom: spacing.sm }}>Adicionar saldo</Text>
          <Field control={control} name="amount" placeholder="Valor em Kz" keyboardType="decimal-pad" />
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.md, flexWrap: 'wrap' }}>
            {QUICK.map((v) => (
              <Pressable key={v} onPress={() => setValue('amount', String(v), { shouldValidate: true })} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.tint }}>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: colors.accent }}>{money(v).replace(',00', '')}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ marginBottom: spacing.md }}>
            <Text style={{ fontFamily: fonts.bodyBold, color: colors.text, marginBottom: 8 }}>Pagar com</Text>
            {cards.length === 0
              ? <Button title="Adicionar cartão" variant="soft" onPress={() => navigation.navigate('PaymentMethods')} />
              : cards.map((c) => (
                <View key={c.id} style={{ marginBottom: 10 }}>
                  <CardView {...c} isDefault={c.id === cardId} onPress={() => setChosen(c.id)} />
                </View>
              ))}
          </View>
          <Button title="Adicionar saldo" loading={m.isPending} onPress={submit} />
        </>
      )}
    </Screen>
  );
}
