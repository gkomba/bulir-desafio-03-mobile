import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import { AxiosError } from 'axios';

/** Mostra a tela com o React Query, sem repetições nem temporizadores que prendam o Jest. */
export const renderComQuery = (ui: React.ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

/** Props mínimas que o React Navigation passa a uma tela. */
export const props = <P extends Record<string, unknown>>(params?: P) => ({
  navigation: { navigate: jest.fn(), goBack: jest.fn() } as never,
  route: { key: 'k', name: 'n', params } as never,
});

export const erroHttp = (status: number, message: string) =>
  new AxiosError('x', undefined, undefined, {}, { data: { message }, status, statusText: '', headers: {}, config: {} as never });
