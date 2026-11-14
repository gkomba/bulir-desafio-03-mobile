import React, { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { authApi } from '../api';
import { errorMessage } from '../api/client';
import { useAuth } from '../store/auth';
import { LoginForm, loginSchema } from '../schemas';
import { Button, Field, Title } from '../components/ui';
import { Screen } from '../components/Screen';
import { colors, fonts, shadow, spacing } from '../theme';

export default function LoginScreen({ navigation }: NativeStackScreenProps<any>) {
  const setSession = useAuth((s) => s.setSession);
  const [apiError, setApiError] = useState('');
  const { control, handleSubmit } = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { identifier: '', password: '' } });
  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: setSession,
    onError: (e) => setApiError(errorMessage(e)),
  });
  return (
    <Screen blobs="top" style={{ paddingTop: 70, paddingHorizontal: spacing.lg }}>
      <View style={[{ width: 96, height: 96, borderRadius: 55, overflow: 'hidden', backgroundColor: '#fff', marginBottom: spacing.xl, borderWidth: 4, borderColor: '#fff' }, shadow]}>
        <Image source={require('../../assets/logo.png')} style={{ width: 88, height: 88 }} resizeMode="cover" />
      </View>
      <View style={{ height: 70 }} />
      <Title style={{ fontSize: 34, marginBottom: 40 }}>Entrar na minha conta</Title>
      <Field control={control} name="identifier" placeholder="E-mail ou NIF" autoCapitalize="none" keyboardType="email-address" />
      <Field control={control} name="password" placeholder="Palavra-passe" secureTextEntry />
      {!!apiError && <Text style={{ color: colors.danger, marginBottom: spacing.md, fontFamily: fonts.bodyBold }}>{apiError}</Text>}
      <Button title="Entrar" loading={login.isPending} onPress={handleSubmit((d) => { setApiError(''); login.mutate(d); })} />
      <Pressable onPress={() => navigation.navigate('Register')} style={{ alignSelf: 'center', marginTop: spacing.md, padding: 8 }}>
        <Text style={{ fontFamily: fonts.body, color: colors.text }}>Ainda não tem conta? <Text style={{ color: colors.accent, fontFamily: fonts.bodyBold }}>Criar conta</Text></Text>
      </Pressable>
    </Screen>
  );
}
