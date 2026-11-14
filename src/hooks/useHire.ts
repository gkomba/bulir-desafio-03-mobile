import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, bookingsApi } from '../api';
import { errorMessage } from '../api/client';
import { useAuth } from '../store/auth';
import { dialog } from '../store/dialog';
import { money } from '../format';
import type { Service } from '../types';

/** Contratação de um serviço para uma data e hora. O servidor volta a validar o saldo de forma atómica. */
export function useHire(onDone?: () => void) {
  const user = useAuth((s) => s.user)!;
  const setUser = useAuth((s) => s.setUser);
  const qc = useQueryClient();
  // A mesma chave para a mesma tentativa: se o pedido se repetir, a API não cobra duas vezes.
  const key = useRef<string | null>(null);
  const m = useMutation({
    mutationFn: ({ service, scheduledAt }: { service: Service; scheduledAt: Date }) => {
      key.current ??= `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      return bookingsApi.place(service.id, scheduledAt, key.current);
    },
    onSuccess: async () => {
      key.current = null;
      setUser(await authApi.me());
      qc.invalidateQueries({ queryKey: ['transactions'] });
      dialog.alert('Serviço contratado com sucesso!', 'Sucesso');
      onDone?.();
    },
    onError: (e) => {
      // Um erro de negócio (saldo, data) é definitivo: a próxima tentativa é um pedido novo.
      if ((e as { response?: unknown }).response) key.current = null;
      dialog.alert(errorMessage(e), 'Não foi possível contratar');
    },
  });
  const hire = (service: Service, scheduledAt: Date) => {
    // Verificação prévia (UX); o servidor decide.
    if (user.balance < service.price) {
      return dialog.alert(`Precisa de ${money(service.price)} e tem ${money(user.balance)}.`, 'Saldo insuficiente');
    }
    m.mutate({ service, scheduledAt });
  };
  return { hire, pendingId: m.isPending ? m.variables?.service.id : undefined };
}
