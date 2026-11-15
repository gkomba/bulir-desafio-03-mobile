import React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ArrowButton, Card } from './ui';
import { colors, fonts, radius, shadowSoft, spacing } from '../theme';
import { money } from '../format';
import type { Booking, ServiceCategory, User } from '../types';
import { useNavigation } from '@react-navigation/native';
import { CATEGORIES, type IconName } from '../constants';


const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 19 ? 'Boa tarde' : 'Boa noite'; };

export function HomeHeader({ user }: { user: User }) {
  const nav = useNavigation<any>();
  return (
    <View style={{ marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable onPress={() => nav.navigate('Profile')}>
          <Image source={require('../../assets/logo.png')} style={{ width: 46, height: 46, borderRadius: 23, borderWidth: 3, borderColor: colors.tint }} />
        </Pressable>
      </View>
      <Text style={{ fontFamily: fonts.heading, fontSize: 26, color: colors.text, marginTop: spacing.md }}>{greeting()}, {user.name.split(' ')[0]}!</Text>
    </View>
  );
}

export const Announcement = ({ title, text, onPress }: { title: string; text: string; onPress?: () => void }) => (
  <View style={{ backgroundColor: colors.field, borderRadius: radius.md, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.md }}>
    <View style={{ flex: 1 }}>
      <Text style={{ fontFamily: fonts.bodyBold, color: colors.text, fontSize: 13 }}>{title}</Text>
      <Text style={{ fontFamily: fonts.body, color: colors.muted, fontSize: 11, marginTop: 2 }}>{text}</Text>
    </View>
    <ArrowButton onPress={onPress} />
  </View>
);

/** Círculos das categorias, mais "Todos". `selected` é o código da categoria ou null. */
export function CategoryRow({ selected, onSelect }: { selected: ServiceCategory | null; onSelect: (c: ServiceCategory | null) => void }) {
  const todos: { key: ServiceCategory | null; label: string; icon: IconName }[] = [{ key: null, label: 'Todos', icon: 'grid-outline' }, ...CATEGORIES];
  return (
    <HScroll>
      {todos.map((c) => {
        const active = selected === c.key;
        return (
          <Pressable key={c.label} onPress={() => onSelect(c.key)} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={c.label}
            style={{ alignItems: 'center', marginRight: 14, width: 62 }}>
            <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: active ? colors.primary : '#fff', alignItems: 'center', justifyContent: 'center', ...shadowSoft }}>
              <Ionicons name={c.icon} size={23} color={active ? colors.navy : colors.accent} />
            </View>
            <Text numberOfLines={1} style={{ fontFamily: active ? fonts.bodyBold : fonts.body, fontSize: 11, color: colors.text, marginTop: 5 }}>{c.label}</Text>
          </Pressable>
        );
      })}
    </HScroll>
  );
}

export const MenuItem = ({ icon, label, hint, onPress, danger, right }: { icon: IconName; label: string; hint?: string; onPress?: () => void; danger?: boolean; right?: React.ReactNode }) => (
  <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, opacity: pressed ? 0.6 : 1 })}>
    <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: danger ? colors.dangerSoft : colors.tint, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={19} color={danger ? colors.danger : colors.accent} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: danger ? colors.danger : colors.text }}>{label}</Text>
      {!!hint && <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.muted }}>{hint}</Text>}
    </View>
    {right ?? (onPress && <Ionicons name="chevron-forward" size={18} color={colors.muted} />)}
  </Pressable>
);

export const Stat = ({ label, value, icon }: { label: string; value: string; icon: IconName }) => (
  <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.md, padding: 12 }}>
    <Ionicons name={icon} size={16} color={colors.primary} />
    <Text style={{ fontFamily: fonts.heading, color: '#fff', fontSize: 15, marginTop: 4 }} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    <Text style={{ fontFamily: fonts.body, color: '#B7C3D8', fontSize: 11 }}>{label}</Text>
  </View>
);

export const BalanceCard = ({ title, balance, stats }: { title: string; balance: number; stats: React.ComponentProps<typeof Stat>[] }) => (
  <View style={{ backgroundColor: colors.navy, borderRadius: radius.lg + 4, padding: spacing.md, marginBottom: spacing.lg }}>
    <View style={{ position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: colors.primary, opacity: 0.18 }} />
    <Text style={{ fontFamily: fonts.body, color: '#B7C3D8' }}>{title}</Text>
    <Text style={{ fontFamily: fonts.heading, color: colors.primary, fontSize: 32, marginVertical: 6 }}>{money(balance)}</Text>
    <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>{stats.map((s) => <Stat key={s.label} {...s} />)}</View>
  </View>
);

export const SectionHeader = ({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm, marginTop: spacing.sm }}>
    <Text style={{ fontFamily: fonts.heading, fontSize: 20, color: colors.text }}>{title}</Text>
    {action && <Pressable onPress={onAction} hitSlop={8}><Text style={{ fontFamily: fonts.bodyBold, color: colors.accent }}>{action} ›</Text></Pressable>}
  </View>
);

export const HScroll = ({ children }: { children: React.ReactNode }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.md }} contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 8 }}>{children}</ScrollView>
);

export const QuickAction = ({ icon, label, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) => (
  <Pressable onPress={onPress} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={24} color={colors.accent} />
    </View>
    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: colors.text, textAlign: 'center' }}>{label}</Text>
  </Pressable>
);


export function WeekChart({ txs }: { txs: Booking[] }) {
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - i)); return d; });
  const totals = days.map((d) => txs.filter((t) => new Date(t.createdAt).toDateString() === d.toDateString()).reduce((a, t) => a + t.amount, 0));
  const max = Math.max(...totals, 1);
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 90, gap: 8 }}>
        {totals.map((v, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            <View style={{ width: '100%', height: Math.max(4, (v / max) * 80), borderRadius: 6, backgroundColor: v ? colors.primary : colors.tint }} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
        {days.map((d, i) => <Text key={i} style={{ flex: 1, textAlign: 'center', fontFamily: fonts.body, fontSize: 10, color: colors.muted }}>{d.toLocaleDateString('pt-PT', { weekday: 'narrow' })}</Text>)}
      </View>
    </Card>
  );
}
