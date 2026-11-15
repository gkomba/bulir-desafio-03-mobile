import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Chip } from './ui';
import { dateTime, money } from '../format';
import { STATUS_LABEL } from '../bookings';
import { colors, fonts, spacing } from '../theme';
import type { Booking } from '../types';

const shortId = (id: string) => `#${id.slice(0, 8)}`;

const Action = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable onPress={onPress} style={{ borderWidth: 1.5, borderColor: colors.accent, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: colors.accent }}>{label}</Text>
  </Pressable>
);

/** Uma reserva no histórico. O cliente pode cancelar; o prestador pode concluir. */
export function TxRow({ tx, userId, userName, onCancel, onComplete }: {
  tx: Booking; userId: string; userName: string; onCancel?: () => void; onComplete?: () => void;
}) {
  const outgoing = tx.clientId === userId;
  const cancelled = tx.status === 'CANCELLED';
  // A API só devolve os identificadores da outra parte; o nome do próprio utilizador conhece-se.
  const provider = tx.providerId === userId ? userName : shortId(tx.providerId);
  const client = tx.clientId === userId ? userName : shortId(tx.clientId);
  return (
    <Card style={{ marginBottom: spacing.md, padding: 12, flexDirection: 'row', gap: 12, shadowOpacity: 0.07, opacity: cancelled ? 0.7 : 1 }}>
      <View style={{ width: 64, height: 64, borderRadius: 14, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={outgoing ? 'arrow-up' : 'arrow-down'} size={28} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Text numberOfLines={1} style={{ fontFamily: fonts.headingSemi, fontSize: 15, color: colors.text, flex: 1 }}>{tx.serviceTitle}</Text>
          <Text style={{ fontFamily: fonts.heading, color: cancelled ? colors.muted : outgoing ? colors.danger : colors.success, textDecorationLine: cancelled ? 'line-through' : 'none' }}>{outgoing ? '-' : '+'}{money(tx.amount)}</Text>
        </View>
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 }}>Prestador: {provider}</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted }}>Cliente: {client}</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted }}>Marcado para {dateTime(tx.scheduledAt)}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, gap: 8 }}>
          <Chip text={STATUS_LABEL[tx.status]} />
          {tx.status === 'CONFIRMED' && onCancel && <Action label="Cancelar" onPress={onCancel} />}
          {tx.status === 'CONFIRMED' && onComplete && <Action label="Concluir" onPress={onComplete} />}
        </View>
      </View>
    </Card>
  );
}
