// Criar / editar serviço (reutiliza o mesmo formulário)
import React, { useState } from 'react';
import { Text } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { servicesApi } from '../api';
import { errorMessage } from '../api/client';
import { ServiceForm, serviceSchema } from '../schemas';
import { Button, Field, Title } from '../components/ui';
import { Screen } from '../components/Screen';
import { colors, fonts, spacing } from '../theme';
import type { Service } from '../types';

export default function ServiceFormScreen({ route, navigation }: NativeStackScreenProps<any>) {
  const editing: Service | undefined = route.params?.service;
  const qc = useQueryClient();
  const [apiError, setApiError] = useState('');
  const { control, handleSubmit } = useForm<ServiceForm>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { title: editing?.title ?? '', description: editing?.description ?? '', price: editing ? String(editing.price) : '' },
  });
  const save = useMutation({
    mutationFn: (d: ServiceForm) => {
      const payload = { title: d.title.trim(), description: d.description.trim(), price: Number(d.price.replace(',', '.')) };
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
      <Field control={control} name="price" label="Preço (Kz)" keyboardType="decimal-pad" placeholder="0,00" />
      {!!apiError && <Text style={{ fontFamily: fonts.bodyBold, color: colors.danger, marginBottom: spacing.md }}>{apiError}</Text>}
      <Button title={editing ? 'Guardar alterações' : 'Criar serviço'} loading={save.isPending} onPress={handleSubmit((d) => { setApiError(''); save.mutate(d); })} />
    </Screen>
  );
}
