import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api';
import { errorMessage } from '../api/client';
import { useAuth } from '../store/auth';
import { RegisterForm, registerSchema } from '../schemas';
import { Button, Field, Title } from '../components/ui';
import { Screen } from '../components/Screen';
import { colors, fonts, radius, spacing } from '../theme';

export default function RegisterScreen() {
  const setSession = useAuth((s) => s.setSession);
  const [apiError, setApiError] = useState('');
  const { control, handleSubmit } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', nif: '', password: '', role: 'CLIENT' },
  });
  const role = useWatch({ control, name: 'role' });
  const register = useMutation({
    mutationFn: authApi.register,
    onSuccess: setSession,
    onError: (e) => setApiError(errorMessage(e)),
  });
  return (
    <Screen blobs="topRight" style={{ paddingTop: 20, paddingHorizontal: spacing.lg }}>
      <Title style={{ fontSize: 34, marginBottom: spacing.lg }}>Criar{'\n'}conta agora</Title>
      <Controller control={control} name="role" render={({ field }) => (
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, marginTop: 120 }}>
          {([['CLIENT', 'Cliente'], ['PROVIDER', 'Prestador']] as const).map(([v, l]) => (
            <Pressable key={v} onPress={() => field.onChange(v)} style={{
              flex: 1, padding: 12, borderRadius: radius.pill, alignItems: 'center',
              backgroundColor: field.value === v ? colors.tint : colors.field,
              borderWidth: 1.5, borderColor: field.value === v ? colors.accent : 'transparent',
            }}>
              <Text style={{ fontFamily: fonts.bodyBold, color: field.value === v ? colors.accent : colors.muted }}>{l}</Text>
            </Pressable>
          ))}
        </View>
      )} />
      <Field control={control} name="name" placeholder="Nome completo" />
      <Field control={control} name="email" placeholder="E-mail" autoCapitalize="none" keyboardType="email-address" />
      {role === 'PROVIDER' && (
        <Field control={control} name="nif" placeholder="NIF (9 a 14 caracteres)" autoCapitalize="characters" />
      )}
      <Field control={control} name="password" placeholder="Palavra-passe" secureTextEntry />
      {!!apiError && <Text style={{ fontFamily: fonts.bodyBold, color: colors.danger, marginBottom: spacing.md }}>{apiError}</Text>}
      <Button title="Registar" loading={register.isPending} onPress={handleSubmit((d) => { setApiError(''); register.mutate(d); })} />
    </Screen>
  );
}
