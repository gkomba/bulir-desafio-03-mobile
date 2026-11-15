// Criar / editar serviço (reutiliza o mesmo formulário)
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { servicesApi } from '../api';
import { errorMessage } from '../api/client';
import { ServiceForm, serviceSchema } from '../schemas';
import { Button, Field, Title } from '../components/ui';
import { Screen } from '../components/Screen';
import { CATEGORIES, DEFAULT_CATEGORY } from '../constants';
import { colors, fonts, spacing } from '../theme';
import type { Service } from '../types';

export default function ServiceFormScreen({ route, navigation }: NativeStackScreenProps<any>) {
  const editing: Service | undefined = route.params?.service;
  const qc = useQueryClient();
  const [apiError, setApiError] = useState('');
  const { control, handleSubmit } = useForm<ServiceForm>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { title: editing?.title ?? '', description: editing?.description ?? '', price: editing ? String(editing.price) : '', category: editing?.category ?? DEFAULT_CATEGORY },
  });
  const save = useMutation({
    mutationFn: (d: ServiceForm) => {
      const payload = { title: d.title.trim(), description: d.description.trim(), price: Number(d.price.replace(',', '.')), category: d.category };
      return editing ? servicesApi.update(editing.id, payload) : servicesApi.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-services'] }); navigation.goBack(); },
    onError: (e) => setApiError(errorMessage(e)),
  });
  return (
    <Screen>
      <Title style={{ marginBottom: spacing.lg }}>{editing ? 'Editar serviço' : 'Novo serviço'}</Title>
      <Field control={control} name="title" label="Título" placeholder="Ex.: Canalização" />
      <Field control={control} name="description" label="Descrição" multiline placeholder="Descreva o serviço" />
      <Controller control={control} name="category" render={({ field, fieldState }) => (
        <View style={{ marginBottom: spacing.md }}>
          <Text style={{ fontFamily: fonts.bodyBold, color: colors.text, marginBottom: 8, marginLeft: 4 }}>Categoria</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORIES.map((c) => (
              <Pressable key={c.key} onPress={() => field.onChange(c.key)} accessibilityRole="button" accessibilityState={{ selected: field.value === c.key }}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: field.value === c.key ? colors.primary : colors.tint }}>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: field.value === c.key ? colors.navy : colors.accent }}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
          {fieldState.error && <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4, marginLeft: 12 }}>{fieldState.error.message}</Text>}
        </View>
      )} />
      <Field control={control} name="price" label="Preço (Kz)" keyboardType="decimal-pad" placeholder="0,00" />
      {!!apiError && <Text style={{ fontFamily: fonts.bodyBold, color: colors.danger, marginBottom: spacing.md }}>{apiError}</Text>}
      <Button title={editing ? 'Guardar alterações' : 'Criar serviço'} loading={save.isPending} onPress={handleSubmit((d) => { setApiError(''); save.mutate(d); })} />
    </Screen>
  );
}
