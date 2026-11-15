import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../store/auth';
import { useFavorites } from '../store/favorites';
import { Body, Button, Title } from '../components/ui';
import { ServiceImage } from '../components/media';
import { Screen } from '../components/Screen';
import { money } from '../format';
import { colors, fonts, radius, spacing } from '../theme';
import type { Service } from '../types';

export default function ServiceDetailScreen({ route, navigation }: NativeStackScreenProps<any>) {
  const service: Service = route.params!.service;
  const user = useAuth((s) => s.user)!;
  const { ids, toggle } = useFavorites();
  const fav = ids.includes(service.id);
  const enough = user.balance >= service.price;

  return (
    <Screen>
      <View>
        <ServiceImage style={{ height: 240, borderRadius: radius.lg }} iconSize={72} />
        <Ionicons onPress={() => toggle(service.id)} name={fav ? 'heart' : 'heart-outline'} size={22} color={fav ? colors.danger : colors.muted}
          style={{ position: 'absolute', top: 12, right: 12, backgroundColor: '#fff', borderRadius: 18, padding: 7, overflow: 'hidden' }} />
      </View>
      <Title style={{ fontSize: 26, marginTop: spacing.md }}>{service.title}</Title>
      <Text style={{ fontFamily: fonts.heading, fontSize: 28, color: colors.text, marginVertical: spacing.sm }}>{money(service.price)}</Text>
      <Text style={{ fontFamily: fonts.headingSemi, fontSize: 16, color: colors.text, marginBottom: 4 }}>Descrição</Text>
      <Body style={{ lineHeight: 22, marginBottom: spacing.md }}>{service.description}</Body>

      {!enough && <Text style={{ color: colors.danger, fontFamily: fonts.bodyBold, marginBottom: spacing.sm }}>Saldo insuficiente. Adicione saldo na carteira.</Text>}
      <Button title={enough ? 'Contratar agora' : 'Adicionar saldo'} onPress={() => navigation.navigate(enough ? 'Checkout' : 'Wallet', { service })} />

    </Screen>
  );
}
