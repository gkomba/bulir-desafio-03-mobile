import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { Controller, Control, FieldValues, Path } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, shadow, shadowSoft, spacing } from '../theme';
import { useDialog } from '../store/dialog';

export function Button({ title, onPress, loading, variant = 'primary', disabled, style }: {
  title: string; onPress: () => void; loading?: boolean; disabled?: boolean; style?: ViewStyle;
  variant?: 'primary' | 'dark' | 'outline' | 'danger' | 'soft';
}) {
  const bg = { primary: colors.primary, dark: colors.dark, outline: '#fff', danger: colors.danger, soft: colors.tint }[variant];
  const fg = variant === 'primary' ? colors.navy : variant === 'outline' || variant === 'soft' ? colors.accent : '#fff';
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} accessibilityRole="button"
      style={({ pressed }) => [s.btn, { backgroundColor: bg, opacity: disabled || pressed ? 0.75 : 1 },
        variant === 'outline' && { borderWidth: 1.5, borderColor: colors.accent }, style]}>
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[s.btnText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

/** Botão circular azul com seta, usado no template (ex.: "I already have an account →") */
export const ArrowButton = ({ onPress, size = 32 }: { onPress?: () => void; size?: number }) => (
  <Pressable onPress={onPress} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
    <Ionicons name="arrow-forward" size={size * 0.55} color={colors.navy} />
  </Pressable>
);

export const Title = ({ children, style }: { children: React.ReactNode; style?: any }) => (
  <Text style={[{ fontFamily: fonts.heading, fontSize: 28, color: colors.text }, style]}>{children}</Text>
);
export const Body = ({ children, style }: { children: React.ReactNode; style?: any }) => (
  <Text style={[{ fontFamily: fonts.body, fontSize: 14, color: colors.muted }, style]}>{children}</Text>
);

type FieldProps<T extends FieldValues> = TextInputProps & { control: Control<T>; name: Path<T>; label?: string };
export function Field<T extends FieldValues>({ control, name, label, ...rest }: FieldProps<T>) {
  return (
    <Controller control={control} name={name} render={({ field, fieldState }) => (
      <View style={{ marginBottom: spacing.md }}>
        {!!label && <Text style={s.label}>{label}</Text>}
        <TextInput {...rest} value={field.value ?? ''} onChangeText={field.onChange} onBlur={field.onBlur}
          placeholderTextColor="#B5B9C4"
          style={[s.input, fieldState.error && { borderColor: colors.danger }, rest.multiline && { height: 110, textAlignVertical: 'top', paddingTop: 14, borderRadius: radius.lg }]} />
        {fieldState.error && <Text style={s.error}>{fieldState.error.message}</Text>}
      </View>
    )} />
  );
}

export const Card = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => (
  <View style={[s.card, style]}>{children}</View>
);

/** Chip azul-claro (como "Pink", "M", "To Pay" no template) */
export const Chip = ({ text, tone = 'tint' }: { text: string; tone?: 'tint' | 'danger' | 'dark' }) => {
  const bg = { tint: colors.tint, danger: colors.dangerSoft, dark: colors.dark }[tone];
  const fg = { tint: colors.accent, danger: colors.danger, dark: '#fff' }[tone];
  return (
    <View style={[s.chip, { backgroundColor: bg }]}><Text style={{ color: fg, fontFamily: fonts.bodyBold, fontSize: 12 }}>{text}</Text></View>
  );
};

export const Empty = ({ text, icon = 'sparkles-outline' }: { text: string; icon?: React.ComponentProps<typeof Ionicons>['name'] }) => (
  <View style={{ padding: spacing.xl, alignItems: 'center', gap: spacing.md }}>
    <View style={[{ width: 90, height: 90, borderRadius: 45, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }, shadow]}>
      <Ionicons name={icon} size={38} color={colors.accent} />
    </View>
    <Text style={{ color: colors.muted, textAlign: 'center', fontFamily: fonts.body }}>{text}</Text>
  </View>
);

export const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <View style={{ padding: spacing.xl, alignItems: 'center', gap: spacing.md }}>
    <Text style={{ color: colors.danger, textAlign: 'center', fontFamily: fonts.bodyBold }}>{message}</Text>
    <Button title="Tentar novamente" variant="outline" onPress={onRetry} />
  </View>
);

export const Loading = () => <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.accent} size="large" />;

/** Diálogo central, como "Maximum Attempts" do template. Montar uma vez no App. */
export function DialogHost() {
  const d = useDialog();
  const ok = () => { d.close(); d.onConfirm?.(); };
  return (
    <Modal transparent visible={d.visible} animationType="fade" onRequestClose={d.close}>
      <View style={s.overlay}>
        <View style={s.dialog}>
          <View style={s.dialogIcon}><Ionicons name={d.onConfirm ? 'help' : 'alert'} size={20} color={colors.danger} /></View>
          {!!d.title && <Text style={{ fontFamily: fonts.headingSemi, fontSize: 18, color: colors.text, marginBottom: 6, textAlign: 'center' }}>{d.title}</Text>}
          <Text style={{ fontFamily: fonts.body, fontSize: 15, color: colors.text, textAlign: 'center', marginBottom: spacing.md }}>{d.message}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch' }}>
            {!!d.cancelText && <Button title={d.cancelText} variant="soft" onPress={d.close} style={{ flex: 1, height: 44 }} />}
            <Button title={d.confirmText} variant={d.destructive ? 'danger' : 'dark'} onPress={ok} style={{ flex: 1, height: 44 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  btn: { height: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  btnText: { fontSize: 16, fontFamily: fonts.body },
  label: { color: colors.text, fontFamily: fonts.bodyBold, marginBottom: 6, marginLeft: 4 },
  input: { backgroundColor: colors.field, borderWidth: 1.5, borderColor: 'transparent', borderRadius: radius.pill, paddingHorizontal: 20, height: 50, color: colors.text, fontSize: 15, fontFamily: fonts.body },
  error: { color: colors.danger, marginTop: 4, marginLeft: 12, fontSize: 12, fontFamily: fonts.body },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, ...shadow },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill, alignSelf: 'flex-start' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: spacing.lg },
  dialog: { backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center' },
  dialogIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center', marginTop: -44, marginBottom: spacing.md, borderWidth: 4, borderColor: '#fff' },
});

/** Cartão bancário no estilo do template (Payment Methods) */
export function CardView({ brand, last4, holder, expiry, isDefault, onPress }: { brand: 'visa' | 'mastercard'; last4: string; holder: string; expiry: string; isDefault?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[{ backgroundColor: colors.tintSoft, borderRadius: radius.lg, padding: spacing.md, borderWidth: isDefault ? 2 : 0, borderColor: colors.primary }, shadowSoft]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        {brand === 'mastercard'
          ? <View style={{ flexDirection: 'row' }}><View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#EB001B' }} /><View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#F79E1B', marginLeft: -10, opacity: 0.9 }} /></View>
          : <Text style={{ fontFamily: fonts.heading, fontSize: 20, fontStyle: 'italic', color: '#1A1F71' }}>VISA</Text>}
        {isDefault && <Chip text="Predefinido" />}
      </View>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 18, letterSpacing: 2, color: colors.text, marginVertical: spacing.md }}>••••  ••••  ••••  {last4}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.muted, textTransform: 'uppercase' }}>{holder}</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.muted }}>{expiry}</Text>
      </View>
    </Pressable>
  );
}
