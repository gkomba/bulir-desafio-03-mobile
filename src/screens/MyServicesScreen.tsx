// Prestador: lista dos seus serviços, com editar e excluir
import React from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { servicesApi } from '../api';
import { errorMessage } from '../api/client';
import { dialog } from '../store/dialog';
import { useMyServices } from '../hooks/queries';
import { ServiceRow } from '../components/media';
import { Button, Empty, ErrorState, Loading, Title } from '../components/ui';
import { Screen } from '../components/Screen';
import { spacing } from '../theme';
import type { Service } from '../types';

export default function MyServicesScreen({ navigation }: NativeStackScreenProps<any>) {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch, isRefetching } = useMyServices();
  const del = useMutation({
    mutationFn: servicesApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-services'] }),
    onError: (e) => dialog.alert(errorMessage(e), 'Erro'),
  });
  const onDelete = (s: Service) =>
    dialog.confirm(`Excluir "${s.title}"?`, () => del.mutate(s.id), { title: 'Excluir serviço', confirmText: 'Excluir', destructive: true });
  return (
    <Screen scroll={false}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
        <Title style={{ fontSize: 30 }}>Meus serviços</Title>
        <Button title="+ Novo" onPress={() => navigation.navigate('ServiceForm')} style={{ height: 40 }} />
      </View>
      {isLoading ? <Loading /> : error ? <ErrorState message={errorMessage(error)} onRetry={refetch} /> : (
        <FlatList data={data} keyExtractor={(s) => s.id} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); }} />}
          ListEmptyComponent={<Empty icon="briefcase-outline" text="Ainda não criou nenhum serviço." />}
          renderItem={({ item }) => (
            <ServiceRow service={item} actions={<>
              <Button title="Editar" variant="soft" onPress={() => navigation.navigate('ServiceForm', { service: item })} style={{ flex: 1, height: 42 }} />
              <Button title="Excluir" variant="danger" onPress={() => onDelete(item)} style={{ flex: 1, height: 42 }} />
            </>} />
          )} />
      )}
    </Screen>
  );
}
