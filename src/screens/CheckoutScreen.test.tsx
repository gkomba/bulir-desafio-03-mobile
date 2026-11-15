import React from 'react';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { authApi, bookingsApi } from '../api';
import { useAuth } from '../store/auth';
import { useDialog } from '../store/dialog';
import { props, renderComQuery } from '../testing';
import CheckoutScreen from './CheckoutScreen';
import type { Service } from '../types';

jest.mock('../store/storage', () => ({ storage: { get: jest.fn(async () => null), set: jest.fn(async () => undefined), del: jest.fn(async () => undefined) } }));
jest.mock('../api', () => ({ authApi: { me: jest.fn() }, bookingsApi: { place: jest.fn() } }));

const place = bookingsApi.place as jest.Mock;
const me = authApi.me as jest.Mock;
const servico: Service = { id: 's1', title: 'Canalização', description: 'Reparação de fugas', price: 200, providerId: 'p1', category: 'HOME' };
const entrar = (balance: number) => useAuth.getState().setSession({ accessToken: 'a', refreshToken: 'r', user: { id: 'u1', name: 'Ana', email: 'ana@exemplo.com', role: 'CLIENT', balance } });
const pagar = () => screen.getByRole('button', { name: 'Pagar 200,00 Kz' });
const tocar = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

beforeEach(() => {
  jest.clearAllMocks();
  // Segunda-feira, 16 de novembro de 2026, 07:00.
  jest.useFakeTimers({ now: new Date(2026, 10, 16, 7, 0) });
  useDialog.setState({ visible: false, message: '', title: undefined });
});
afterEach(() => jest.useRealTimers());

describe('pagamento: só com data e saldo suficiente', () => {
  it('mostra o serviço, o preço e o saldo que sobra', async () => {
    await entrar(500);
    await renderComQuery(<CheckoutScreen {...props({ service: servico })} />);
    expect(screen.getByText('Canalização')).toBeOnTheScreen();
    expect(screen.getByText('Disponível: 500,00 Kz')).toBeOnTheScreen();
    expect(screen.getByText('300,00 Kz')).toBeOnTheScreen();
  });

  it('não deixa pagar enquanto não houver data e hora', async () => {
    await entrar(1000);
    await renderComQuery(<CheckoutScreen {...props({ service: servico })} />);
    expect(pagar()).toBeDisabled();
    expect(screen.getByText('Escolha a data')).toBeOnTheScreen();
  });

  it('deixa pagar depois de escolher o dia e a hora', async () => {
    await entrar(1000);
    await renderComQuery(<CheckoutScreen {...props({ service: servico })} />);
    const user = tocar();
    await user.press(screen.getByText('17'));
    expect(pagar()).toBeDisabled();
    await user.press(screen.getByText('10:00'));
    expect(pagar()).toBeEnabled();
  });

  it('com saldo a menos do que o preço, não deixa pagar mesmo com data', async () => {
    await entrar(199.99);
    await renderComQuery(<CheckoutScreen {...props({ service: servico })} />);
    const user = tocar();
    await user.press(screen.getByText('17'));
    await user.press(screen.getByText('10:00'));
    expect(pagar()).toBeDisabled();
  });

  it('com saldo igual ao preço, deixa pagar', async () => {
    await entrar(200);
    await renderComQuery(<CheckoutScreen {...props({ service: servico })} />);
    const user = tocar();
    await user.press(screen.getByText('17'));
    await user.press(screen.getByText('10:00'));
    expect(pagar()).toBeEnabled();
  });

  it('paga: reserva o serviço na data escolhida, atualiza o saldo e segue para o histórico', async () => {
    await entrar(1000);
    place.mockResolvedValue({ id: 'b1' });
    me.mockResolvedValue({ id: 'u1', name: 'Ana', email: 'ana@exemplo.com', role: 'CLIENT', balance: 800 });
    const p = props({ service: servico });
    await renderComQuery(<CheckoutScreen {...p} />);
    const user = tocar();
    await user.press(screen.getByText('17'));
    await user.press(screen.getByText('10:00'));
    await user.press(pagar());
    await waitFor(() => expect(place).toHaveBeenCalledTimes(1));
    expect(place).toHaveBeenCalledWith('s1', new Date(2026, 10, 17, 10, 0, 0, 0), expect.any(String));
    await waitFor(() => expect(useAuth.getState().user?.balance).toBe(800));
    expect(useDialog.getState().title).toBe('Sucesso');
    expect((p.navigation as unknown as { navigate: jest.Mock }).navigate).toHaveBeenCalledWith('Main', { screen: 'Transactions' });
  });
});
