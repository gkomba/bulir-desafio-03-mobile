import React from 'react';
import { Image, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { signOut } from '../api';
import { dialog } from '../store/dialog';
import { useSyncedUser, useTransactions } from '../hooks/queries';
import { MenuItem } from '../components/home';
import { Button, Card, Chip, Title } from '../components/ui';
import { Screen } from '../components/Screen';
import { money } from '../format';
import { counts } from '../bookings';
import { colors, fonts, spacing } from '../theme';

const Metric = ({ v, l }: { v: string; l: string }) => (
  <View style={{ flex: 1, alignItems: 'center' }}>
    <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: fonts.heading, fontSize: 17, color: colors.text }}>{v}</Text>
    <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.muted }}>{l}</Text>
  </View>
);

export default function ProfileScreen({ navigation }: NativeStackScreenProps<any>) {
  const { user } = useSyncedUser();
  const txs = useTransactions();
  const isClient = user.role === 'CLIENT';
  const list = (txs.data ?? []).filter((t) => (isClient ? t.clientId : t.providerId) === user.id && counts(t));
  const total = list.reduce((a, t) => a + t.amount, 0);
  const go = (n: string) => () => navigation.navigate(n);

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
        <Image source={require('../../assets/logo-perfil.jpeg')} style={{ width: 92, height: 92, borderRadius: 46, borderWidth: 4, borderColor: colors.tint }} />
        <Title style={{ fontSize: 22, marginTop: 10 }}>{user.name}</Title>
        <Text style={{ fontFamily: fonts.body, color: colors.muted }}>{user.email}</Text>
        <View style={{ marginTop: 6 }}><Chip text={isClient ? 'Cliente' : 'Prestador'} /></View>
      </View>

      {!isClient && (
        <Card style={{ flexDirection: 'row', marginBottom: spacing.md, shadowOpacity: 0.07 }}>
          <Metric v={money(user.balance)} l="Saldo" />
          <Metric v={String(list.length)} l="Vendas" />
          <Metric v={money(total)} l="Receita" />
        </Card>
      )}

      <Card style={{ paddingVertical: 4, marginBottom: spacing.md, shadowOpacity: 0.07 }}>
        <MenuItem icon="wallet-outline" label="Carteira" hint={isClient ? 'Adicionar saldo' : 'Ver saldo'} onPress={go('Wallet')} />
        <MenuItem icon="receipt-outline" label="Histórico de transações" onPress={() => navigation.navigate('Transactions')} />
        {isClient
          ? <MenuItem icon="heart-outline" label="Favoritos" onPress={() => navigation.navigate('Favorites')} />
          : <MenuItem icon="briefcase-outline" label="Meus serviços" onPress={() => navigation.navigate('MyServices')} />}
        <MenuItem icon="card-outline" label="Métodos de pagamento" onPress={go('PaymentMethods')} />
      </Card>
      <Card style={{ paddingVertical: 4, marginBottom: spacing.lg, shadowOpacity: 0.07 }}>
        <MenuItem icon="person-outline" label="Dados pessoais" hint={user.nif ? `NIF ${user.nif}` : user.email} />
        <MenuItem icon="settings-outline" label="Definições" onPress={go('Settings')} />
        <MenuItem icon="help-circle-outline" label="Ajuda e suporte" onPress={() => dialog.alert('Contacte-nos em suporte@bulir.com', 'Ajuda')} />
      </Card>
      <Button title="Terminar sessão" variant="dark" onPress={() => dialog.confirm('Tem a certeza que quer sair?', signOut, { title: 'Terminar sessão', confirmText: 'Sair', destructive: true })} />
    </Screen>
  );
}
