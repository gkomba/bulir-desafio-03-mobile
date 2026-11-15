import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { authApi, bookingsApi } from '../api';
import { errorMessage } from '../api/client';
import { useAuth } from '../store/auth';
import { dialog } from '../store/dialog';
import { money } from '../format';
import type { Service } from '../types';

const novaChave = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Contratação de um serviço para uma data e hora. O servidor volta a validar o saldo de forma atómica. */
export function useHire(onDone?: () => void) {
  const user = useAuth((s) => s.user)!;
  const setUser = useAuth((s) => s.setUser);
  const qc = useQueryClient();
  // A mesma chave para o mesmo pedido (serviço e data): se for repetido, a API não cobra duas vezes.
  // Outro serviço ou outra data é um pedido novo e leva outra chave.
  const tentativa = useRef<{ pedido: string; chave: string } | null>(null);
  const m = useMutation({
    mutationFn: ({ service, scheduledAt }: { service: Service; scheduledAt: Date }) => {
      const pedido = `${service.id}|${scheduledAt.toISOString()}`;
      if (tentativa.current?.pedido !== pedido) tentativa.current = { pedido, chave: novaChave() };
      return bookingsApi.place(service.id, scheduledAt, tentativa.current.chave);
    },
    onSuccess: () => {
      tentativa.current = null;
      // A reserva já foi feita: se não for possível reler o saldo, aparece na próxima atualização.
      authApi.me().then(setUser).catch(() => undefined);
      qc.invalidateQueries({ queryKey: ['transactions'] });
      dialog.alert('Serviço contratado com sucesso!', 'Sucesso');
      onDone?.();
    },
    onError: (e) => {
      // Um erro 4xx é definitivo. Numa falha de rede ou num 5xx, o servidor pode ter cobrado:
      // a próxima tentativa repete a mesma chave e não cobra outra vez.
      const estado = isAxiosError(e) ? e.response?.status : undefined;
      if (estado !== undefined && estado >= 400 && estado < 500) tentativa.current = null;
      dialog.alert(errorMessage(e), 'Não foi possível contratar');
    },
  });
  const hire = (service: Service, scheduledAt: Date) => {
    if (m.isPending) return;
    // Verificação prévia (UX); o servidor decide.
    if (user.balance < service.price) {
      return dialog.alert(`Precisa de ${money(service.price)} e tem ${money(user.balance)}.`, 'Saldo insuficiente');
    }
    m.mutate({ service, scheduledAt });
  };
  return { hire, pendingId: m.isPending ? m.variables?.service.id : undefined };
}
