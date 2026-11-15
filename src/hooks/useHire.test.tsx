import React from 'react';
import { AxiosError } from 'axios';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import { authApi, bookingsApi } from '../api';
import { useAuth } from '../store/auth';
import { useDialog } from '../store/dialog';
import { useHire } from './useHire';
import type { Service, User } from '../types';

jest.mock('../store/storage', () => ({ storage: { get: jest.fn(async () => null), set: jest.fn(async () => undefined), del: jest.fn(async () => undefined) } }));
jest.mock('../api', () => ({ authApi: { me: jest.fn() }, bookingsApi: { place: jest.fn() } }));

const place = bookingsApi.place as jest.Mock;
const me = authApi.me as jest.Mock;
const servico: Service = { id: 's1', title: 'Canalização', description: 'Fugas', price: 200, providerId: 'p1', category: 'HOME' };
const cliente = (balance: number): User => ({ id: 'u1', name: 'Ana', email: 'ana@exemplo.com', role: 'CLIENT', balance });
const quando = new Date('2026-12-01T10:00:00.000Z');
const outroDia = new Date('2026-12-02T10:00:00.000Z');
const erroDeRede = () => new AxiosError('Network Error', AxiosError.ERR_NETWORK);
const erroHttp = (status: number) => new AxiosError('x', undefined, undefined, {}, { data: { message: 'Erro' }, status, statusText: '', headers: {}, config: {} as never });

let queryClient: QueryClient;
const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

const entrar = (saldo: number) => useAuth.getState().setSession({ accessToken: 'a', refreshToken: 'r', user: cliente(saldo) });
const mensagem = () => useDialog.getState();
/** Toca em "contratar" e espera que o React Query assente (propaga o estado no ciclo seguinte). */
const tocar = async (hire: () => void) => {
  await act(async () => hire());
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
};

afterEach(() => queryClient.clear());

beforeEach(async () => {
  jest.clearAllMocks();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } } });
  useDialog.setState({ visible: false, message: '', title: undefined });
  me.mockResolvedValue(cliente(800));
});

describe('contratar: o saldo tem de chegar', () => {
  it('com saldo a menos do que o preço, não faz o pedido e avisa', async () => {
    await entrar(199.99);
    const { result } = await renderHook(() => useHire(), { wrapper });
    await tocar(() => result.current.hire(servico, quando));
    expect(place).not.toHaveBeenCalled();
    expect(mensagem()).toMatchObject({ visible: true, title: 'Saldo insuficiente' });
  });

  it('com saldo igual ao preço, contrata (um saldo igual ao preço é suficiente)', async () => {
    await entrar(200);
    place.mockResolvedValue({ id: 'b1' });
    const { result } = await renderHook(() => useHire(), { wrapper });
    await tocar(() => result.current.hire(servico, quando));
    expect(place).toHaveBeenCalledTimes(1);
  });
});

describe('contratar com sucesso', () => {
  beforeEach(async () => {
    await entrar(1000);
    place.mockResolvedValue({ id: 'b1' });
  });

  it('envia o serviço, a data e uma chave de idempotência', async () => {
    const { result } = await renderHook(() => useHire(), { wrapper });
    await tocar(() => result.current.hire(servico, quando));
    expect(place).toHaveBeenCalledWith('s1', quando, expect.any(String));
  });

  it('relê o saldo, atualiza o histórico, avisa e deixa a tela seguir', async () => {
    const onDone = jest.fn();
    const invalidar = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = await renderHook(() => useHire(onDone), { wrapper });
    await tocar(() => result.current.hire(servico, quando));
    expect(useAuth.getState().user?.balance).toBe(800);
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['transactions'] });
    expect(mensagem()).toMatchObject({ visible: true, title: 'Sucesso' });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('se não conseguir reler o saldo, a reserva continua a contar como feita', async () => {
    me.mockRejectedValue(erroDeRede());
    const { result } = await renderHook(() => useHire(), { wrapper });
    await tocar(() => result.current.hire(servico, quando));
    expect(mensagem().title).toBe('Sucesso');
  });
});

describe('contratar com falhas', () => {
  beforeEach(async () => {
    await entrar(1000);
  });

  it('mostra o erro do servidor', async () => {
    place.mockRejectedValue(erroHttp(409));
    const { result } = await renderHook(() => useHire(), { wrapper });
    await tocar(() => result.current.hire(servico, quando));
    expect(mensagem()).toMatchObject({ visible: true, title: 'Não foi possível contratar', message: 'Erro' });
  });

  it('repetir o mesmo pedido depois de uma falha de rede usa a mesma chave (não cobra duas vezes)', async () => {
    place.mockRejectedValueOnce(erroDeRede()).mockResolvedValueOnce({ id: 'b1' });
    const { result } = await renderHook(() => useHire(), { wrapper });
    await tocar(() => result.current.hire(servico, quando));
    await tocar(() => result.current.hire(servico, quando));
    expect(place.mock.calls[0][2]).toBe(place.mock.calls[1][2]);
  });

  it('repetir depois de um 5xx também usa a mesma chave: o servidor pode já ter cobrado', async () => {
    place.mockRejectedValueOnce(erroHttp(503)).mockResolvedValueOnce({ id: 'b1' });
    const { result } = await renderHook(() => useHire(), { wrapper });
    await tocar(() => result.current.hire(servico, quando));
    await tocar(() => result.current.hire(servico, quando));
    expect(place.mock.calls[0][2]).toBe(place.mock.calls[1][2]);
  });

  it('mudar a data é um pedido novo e leva outra chave', async () => {
    place.mockRejectedValueOnce(erroDeRede()).mockResolvedValueOnce({ id: 'b1' });
    const { result } = await renderHook(() => useHire(), { wrapper });
    await tocar(() => result.current.hire(servico, quando));
    await tocar(() => result.current.hire(servico, outroDia));
    expect(place.mock.calls[0][2]).not.toBe(place.mock.calls[1][2]);
  });

  it('depois de um erro 4xx, o pedido seguinte leva outra chave', async () => {
    place.mockRejectedValueOnce(erroHttp(400)).mockResolvedValueOnce({ id: 'b1' });
    const { result } = await renderHook(() => useHire(), { wrapper });
    await tocar(() => result.current.hire(servico, quando));
    await tocar(() => result.current.hire(servico, quando));
    expect(place.mock.calls[0][2]).not.toBe(place.mock.calls[1][2]);
  });

  it('um segundo toque enquanto o pedido está em curso é ignorado', async () => {
    let terminar!: (b: unknown) => void;
    place.mockReturnValue(new Promise((r) => { terminar = r; }));
    const { result } = await renderHook(() => useHire(), { wrapper });
    await act(async () => {
      result.current.hire(servico, quando);
      result.current.hire(servico, quando);
    });
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(place).toHaveBeenCalledTimes(1);
    expect(result.current.pendingId).toBe('s1');
    await act(async () => terminar({ id: 'b1' }));
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    place.mockResolvedValue({ id: 'b2' });
    await tocar(() => result.current.hire(servico, quando));
    expect(place).toHaveBeenCalledTimes(2);
  });
});
