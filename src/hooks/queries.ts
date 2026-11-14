import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authApi, bookingsApi, servicesApi } from '../api';
import { useAuth } from '../store/auth';

export const useServices = () => useQuery({ queryKey: ['services'], queryFn: servicesApi.all });

export const useMyServices = () => {
  const providerId = useAuth((s) => s.user!.id);
  return useQuery({ queryKey: ['my-services'], queryFn: () => servicesApi.byProvider(providerId) });
};

/** Reservas do utilizador: as que o cliente fez ou as dos serviços do prestador. É o histórico. */
export const useTransactions = () => useQuery({ queryKey: ['transactions'], queryFn: bookingsApi.list });

/** Mantém o saldo/utilizador sincronizado com o servidor (ex.: prestador recebe pagamentos). */
export function useSyncedUser() {
  const { user, setUser } = useAuth();
  const q = useQuery({ queryKey: ['me'], queryFn: authApi.me });
  useEffect(() => { if (q.data) setUser(q.data); }, [q.data, setUser]);
  return { user: user!, refetch: q.refetch, isRefetching: q.isRefetching };
}
