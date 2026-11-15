// Pagamento (estilo "Payment" do template): resumo, método e total
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../store/auth';
import { useHire } from '../hooks/useHire';
import { Body, Button, Card, Chip, Title } from '../components/ui';
import { ServiceImage } from '../components/media';
import { SectionHeader } from '../components/home';
import { SchedulePicker } from '../components/SchedulePicker';
import { Screen } from '../components/Screen';
import { dateTime, money } from '../format';
import { colors, fonts, spacing } from '../theme';
import type { Service } from '../types';

export default function CheckoutScreen({ route, navigation }: NativeStackScreenProps<any>) {
  const service: Service = route.params!.service;
  const user = useAuth((s) => s.user)!;
  const { hire, pendingId } = useHire(() => navigation.navigate('Main', { screen: 'Transactions' }));
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const paying = pendingId === service.id;
  const after = user.balance - service.price;
  return (
    <Screen>
      <Title style={{ marginBottom: spacing.md }}>Pagamento</Title>

      <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: spacing.md }}>
        <ServiceImage category={service.category} style={{ width: 64, height: 64, borderRadius: 32 }} iconSize={26} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontFamily: fonts.headingSemi, color: colors.text }}>{service.title}</Text>
          <Body>{service.description.slice(0, 60)}</Body>
        </View>
        <Text style={{ fontFamily: fonts.heading, color: colors.text }}>{money(service.price)}</Text>
      </Card>

      <SectionHeader title="Data e hora" />
      <SchedulePicker onChange={setScheduledAt} />

      <SectionHeader title="Método de pagamento" />
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderColor: colors.primary }}>
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="wallet" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.bodyBold, color: colors.text }}>Saldo Bulir</Text>
          <Body>Disponível: {money(user.balance)}</Body>
        </View>
        <Chip text="Selecionado" />
      </Card>

      <SectionHeader title="Resumo" />
      <Card style={{ gap: 8 }}>
        <Line l="Serviço" v={money(service.price)} />
        <Line l="Quando" v={scheduledAt ? dateTime(scheduledAt.toISOString()) : 'Escolha a data'} />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <Line l="Total" v={money(service.price)} bold />
        <Line l="Saldo depois" v={money(after)} bad={after < 0} />
      </Card>

      <View style={{ marginTop: spacing.lg }}>
        <Button title={`Pagar ${money(service.price)}`} variant="dark" disabled={after < 0 || !scheduledAt} onPress={() => scheduledAt && hire(service, scheduledAt)} />
      </View>

      <Modal transparent visible={paying} animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: spacing.lg }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: spacing.lg, alignItems: 'center', gap: 8 }}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={{ fontFamily: fonts.headingSemi, fontSize: 18, color: colors.text }}>Pagamento em curso</Text>
            <Body>Aguarde alguns instantes...</Body>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
const Line = ({ l, v, bold, bad }: { l: string; v: string; bold?: boolean; bad?: boolean }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
    <Text style={{ fontFamily: fonts.body, color: colors.muted }}>{l}</Text>
    <Text style={{ fontFamily: bold ? fonts.heading : fonts.bodyBold, color: bad ? colors.danger : colors.text }}>{v}</Text>
  </View>
);
