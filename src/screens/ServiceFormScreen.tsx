// Criar / editar serviço (reutiliza o mesmo formulário)
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { servicesApi, type ServicePayload } from '../api';
import { UploadError, uploadImage } from '../cloudinaryUpload';
import { ImageField, type ImageChoice } from '../components/ImageField';
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
  const [image, setImage] = useState<ImageChoice>({ kind: 'keep' });
  const [progress, setProgress] = useState<number | null>(null);
  // A imagem já enviada fica guardada: se guardar o serviço falhar, tentar de novo não a reenvia.
  const uploaded = useRef<{ from: string; url: string } | undefined>(undefined);
  // Sair do ecrã cancela o envio em curso.
  const abort = useRef(new AbortController());
  useEffect(() => { const c = abort.current; return () => c.abort(); }, []);
  const { control, handleSubmit } = useForm<ServiceForm>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { title: editing?.title ?? '', description: editing?.description ?? '', price: editing ? String(editing.price) : '', category: editing?.category ?? DEFAULT_CATEGORY },
  });
  const save = useMutation({
    mutationFn: async (d: ServiceForm) => {
      const payload: ServicePayload = { title: d.title.trim(), description: d.description.trim(), price: Number(d.price.replace(',', '.')), category: d.category };
      if (image.kind === 'remove') payload.imageUrl = null;
      if (image.kind === 'new') {
        // Só agora, ao guardar, a imagem sai do telemóvel: diretamente para o Cloudinary.
        if (uploaded.current?.from !== image.image.uri) {
          const auth = await servicesApi.imageAuthorization();
          setProgress(0);
          const url = await uploadImage({ uri: image.image.uri, name: 'servico.jpg', type: 'image/jpeg' }, auth, { onProgress: setProgress, signal: abort.current.signal });
          uploaded.current = { from: image.image.uri, url };
        }
        payload.imageUrl = uploaded.current.url;
      }
      return editing ? servicesApi.update(editing.id, payload) : servicesApi.create(payload);
    },
    onSettled: () => setProgress(null),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-services'] }); if (!abort.current.signal.aborted) navigation.goBack(); },
    onError: (e) => setApiError(e instanceof UploadError ? e.message : errorMessage(e)),
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
      <Controller control={control} name="category" render={({ field }) => (
        <ImageField category={field.value} currentUrl={editing?.imageUrl} value={image} onChange={setImage} />
      )} />
      <Field control={control} name="price" label="Preço (Kz)" keyboardType="decimal-pad" placeholder="0,00" />
      {!!apiError && <Text style={{ fontFamily: fonts.bodyBold, color: colors.danger, marginBottom: spacing.md }}>{apiError}</Text>}
      <Button title={progress !== null ? `A enviar a imagem… ${Math.round(progress * 100)}%` : editing ? 'Guardar alterações' : 'Criar serviço'} loading={save.isPending} onPress={handleSubmit((d) => { setApiError(''); save.mutate(d); })} />
    </Screen>
  );
}
