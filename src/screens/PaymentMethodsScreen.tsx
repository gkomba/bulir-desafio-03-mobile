import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CardForm, cardSchema } from '../schemas';
import { usePayments } from '../store/payments';
import { dialog } from '../store/dialog';
import { Button, CardView, Empty, Field, Title } from '../components/ui';
import { Screen } from '../components/Screen';
import { colors, fonts, spacing } from '../theme';

export default function PaymentMethodsScreen() {
  const { cards, add, remove, setDefault } = usePayments();
  const [adding, setAdding] = useState(false);
  const { control, handleSubmit, reset } = useForm<CardForm>({ resolver: zodResolver(cardSchema), defaultValues: { number: '', holder: '', expiry: '', cvv: '' } });

  const submit = handleSubmit((d) => {
    const digits = d.number.replace(/\s/g, '');
    add({ brand: digits.startsWith('4') ? 'visa' : 'mastercard', last4: digits.slice(-4), holder: d.holder.trim(), expiry: d.expiry });
    reset(); setAdding(false);
  });

  return (
    <Screen>
      <Title style={{ marginBottom: spacing.md }}>Métodos de pagamento</Title>
      {cards.length === 0 && !adding && <Empty icon="card-outline" text="Ainda não adicionou nenhum cartão." />}
      {cards.map((c) => (
        <View key={c.id} style={{ marginBottom: spacing.md }}>
          <CardView {...c} onPress={() => setDefault(c.id)} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 6 }}>
            <Pressable onPress={() => setDefault(c.id)}><Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: colors.accent }}>{c.isDefault ? '✓ Predefinido' : 'Tornar predefinido'}</Text></Pressable>
            <Pressable onPress={() => dialog.confirm(`Remover cartão •••• ${c.last4}?`, () => remove(c.id), { title: 'Remover cartão', confirmText: 'Remover', destructive: true })}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: colors.danger }}>Remover</Text>
            </Pressable>
          </View>
        </View>
      ))}
      {adding ? (
        <View style={{ marginTop: spacing.sm }}>
          <Text style={{ fontFamily: fonts.headingSemi, fontSize: 18, color: colors.text, marginBottom: spacing.md }}>Novo cartão</Text>
          <Field control={control} name="number" placeholder="Número do cartão (16 dígitos)" keyboardType="number-pad" maxLength={19} />
          <Field control={control} name="holder" placeholder="Nome do titular" autoCapitalize="characters" />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Field control={control} name="expiry" placeholder="MM/AA" maxLength={5} /></View>
            <View style={{ flex: 1 }}><Field control={control} name="cvv" placeholder="CVV" keyboardType="number-pad" secureTextEntry maxLength={4} /></View>
          </View>
          <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginBottom: spacing.md }}>Por segurança, guardamos apenas os 4 últimos dígitos. O CVV nunca é guardado.</Text>
          <Button title="Guardar cartão" onPress={submit} />
          <View style={{ height: 8 }} />
          <Button title="Cancelar" variant="soft" onPress={() => { reset(); setAdding(false); }} />
        </View>
      ) : <Button title="+ Adicionar cartão" variant="dark" onPress={() => setAdding(true)} />}
    </Screen>
  );
}
