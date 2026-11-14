import React from 'react';
import { Pressable, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './ui';
import { colors, fonts, radius, shadowSoft, spacing } from '../theme';
import { money } from '../format';
import type { Service } from '../types';

/** A API não guarda imagens nem categorias dos serviços: mostra um ícone. */
export function ServiceImage({ style, iconSize = 34 }: { service?: Service; style?: ViewStyle; iconSize?: number }) {
  return (
    <View style={[{ backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, style]}>
      <Ionicons name="construct-outline" size={iconSize} color={colors.accent} />
    </View>
  );
}

/** Cartão de produto do template: imagem grande, legenda pequena, preço em negrito, sombra suave. */
export function ServiceGridCard({ service, onPress, favorite, width }: {
  service: Service; onPress?: () => void; width?: number;
  favorite?: { active: boolean; onToggle: () => void };
}) {
  return (
    <Pressable onPress={onPress} style={[{ width: width ?? '100%' }, { backgroundColor: '#fff', borderRadius: radius.lg, padding: 6, ...shadowSoft }]}>
      <View>
        <ServiceImage service={service} style={{ width: '100%', aspectRatio: 1, borderRadius: radius.md }} iconSize={44} />
        {favorite && (
          <Pressable onPress={favorite.onToggle} hitSlop={8} style={{ position: 'absolute', right: 8, top: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={favorite.active ? 'heart' : 'heart-outline'} size={17} color={favorite.active ? colors.danger : colors.muted} />
          </Pressable>
        )}
      </View>
      <View style={{ paddingHorizontal: 6, paddingTop: 8, paddingBottom: 6 }}>
        <Text numberOfLines={2} style={{ fontFamily: fonts.body, fontSize: 12, color: colors.text, minHeight: 32 }}>{service.title}</Text>
        <Text style={{ fontFamily: fonts.heading, fontSize: 15, color: colors.text, marginTop: 2 }}>{money(service.price)}</Text>
      </View>
    </Pressable>
  );
}

/** Linha de serviço (estilo Wishlist): imagem à esquerda, texto suave, ações opcionais. */
export function ServiceRow({ service, actions, onPress, favorite }: {
  service: Service; actions?: React.ReactNode; onPress?: () => void;
  favorite?: { active: boolean; onToggle: () => void };
}) {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: radius.lg, padding: 10, marginBottom: spacing.md, ...shadowSoft }}>
      <Pressable onPress={onPress} disabled={!onPress} style={{ flexDirection: 'row', gap: 12 }}>
        <ServiceImage service={service} style={{ width: 92, height: 92, borderRadius: radius.md }} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: fonts.headingSemi, fontSize: 15, color: colors.text }}>{service.title}</Text>
            {favorite && (
              <Pressable onPress={favorite.onToggle} hitSlop={10}>
                <Ionicons name={favorite.active ? 'heart' : 'heart-outline'} size={20} color={favorite.active ? colors.danger : colors.muted} />
              </Pressable>
            )}
          </View>
          <Text numberOfLines={2} style={{ fontFamily: fonts.body, color: colors.muted, fontSize: 12, marginTop: 2 }}>{service.description}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ fontFamily: fonts.heading, fontSize: 15, color: colors.text }}>{money(service.price)}</Text>
          </View>
        </View>
      </Pressable>
      {actions && <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: 10 }}>{actions}</View>}
    </View>
  );
}

export { Card };
