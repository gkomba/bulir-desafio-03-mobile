import React from 'react';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { authApi, bookingsApi, servicesApi } from '../api';
import { useAuth } from '../store/auth';
import { useDialog } from '../store/dialog';
import { usePayments } from '../store/payments';
import { erroHttp, props, renderComQuery } from '../testing';
import WalletScreen from './WalletScreen';
import type { Role } from '../types';

jest.mock('../store/storage', () => ({ storage: { get: jest.fn(async () => null), set: jest.fn(async () => undefined), del: jest.fn(async () => undefined) } }));
jest.mock('../api', () => ({ authApi: { deposit: jest.fn(), me: jest.fn() }, servicesApi: { byProvider: jest.fn() }, bookingsApi: { list: jest.fn() } }));

const deposit = authApi.deposit as jest.Mock;
const me = authApi.me as jest.Mock;
const cartao = { id: 'c1', brand: 'visa' as const, last4: '4242', holder: 'Ana Silva', expiry: '12/30', isDefault: true };
const entrar = (role: Role, balance = 100) => useAuth.getState().setSession({ accessToken: 'a', refreshToken: 'r', user: { id: 'u1', name: 'Ana', email: 'ana@exemplo.com', role, balance } });
const botao = () => screen.getByRole('button', { name: 'Adicionar saldo' });

beforeEach(async () => {
  jest.clearAllMocks();
  (servicesApi.byProvider as jest.Mock).mockResolvedValue([]);
  (bookingsApi.list as jest.Mock).mockResolvedValue([]);
  usePayments.setState({ cards: [], uid: null });
  useDialog.setState({ visible: false, message: '', title: undefined });
});

describe('carteira do cliente', () => {
  it('mostra o saldo e o formulário para o aumentar', async () => {
    await entrar('CLIENT', 250);
    await renderComQuery(<WalletScreen {...props()} />);
    expect(screen.getByText('Saldo atual')).toBeOnTheScreen();
    expect(screen.getByPlaceholderText('Valor em Kz')).toBeOnTheScreen();
    expect(botao()).toBeOnTheScreen();
  });

  it('sem cartão, pede para adicionar um e não carrega', async () => {
    await entrar('CLIENT');
    await renderComQuery(<WalletScreen {...props()} />);
    await userEvent.setup().type(screen.getByPlaceholderText('Valor em Kz'), '500');
    await userEvent.setup().press(botao());
    await waitFor(() => expect(useDialog.getState().title).toBe('Sem cartão'));
    expect(deposit).not.toHaveBeenCalled();
  });

  it.each(['0', '-5', 'abc', '1000001'])('recusa o valor "%s"', async (valor) => {
    await entrar('CLIENT');
    usePayments.setState({ cards: [cartao] });
    await renderComQuery(<WalletScreen {...props()} />);
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Valor em Kz'), valor);
    await user.press(botao());
    expect(await screen.findByText('Valor entre 0,01 e 1 000 000 Kz')).toBeOnTheScreen();
    expect(deposit).not.toHaveBeenCalled();
  });

  it('com um cartão guardado, carrega o valor (em vírgula ou ponto) e atualiza o saldo', async () => {
    await entrar('CLIENT', 100);
    usePayments.setState({ cards: [cartao] });
    deposit.mockResolvedValue(undefined);
    me.mockResolvedValue({ id: 'u1', name: 'Ana', email: 'ana@exemplo.com', role: 'CLIENT', balance: 600.5 });
    await renderComQuery(<WalletScreen {...props()} />);
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Valor em Kz'), '500,50');
    await user.press(botao());
    await waitFor(() => expect(deposit).toHaveBeenCalledWith(500.5));
    await waitFor(() => expect(useAuth.getState().user?.balance).toBe(600.5));
    expect(useDialog.getState().title).toBe('Sucesso');
  });

  it('mostra o erro do servidor se o carregamento falhar', async () => {
    await entrar('CLIENT');
    usePayments.setState({ cards: [cartao] });
    deposit.mockRejectedValue(erroHttp(400, 'O saldo máximo é 50 000 000 Kz'));
    await renderComQuery(<WalletScreen {...props()} />);
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Valor em Kz'), '500');
    await user.press(botao());
    await waitFor(() => expect(useDialog.getState()).toMatchObject({ title: 'Operação falhou', message: 'O saldo máximo é 50 000 000 Kz' }));
  });

  it('o cliente não faz pedidos de serviços de prestador', async () => {
    await entrar('CLIENT');
    await renderComQuery(<WalletScreen {...props()} />);
    expect(servicesApi.byProvider).not.toHaveBeenCalled();
    expect(bookingsApi.list).not.toHaveBeenCalled();
  });
});

describe('carteira do prestador', () => {
  it('mostra o saldo e não deixa carregar saldo', async () => {
    await entrar('PROVIDER', 300);
    await renderComQuery(<WalletScreen {...props()} />);
    expect(screen.getByText('Saldo (ganhos)')).toBeOnTheScreen();
    expect(screen.queryByPlaceholderText('Valor em Kz')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Adicionar saldo' })).not.toBeOnTheScreen();
  });

  it('conta só as vendas que não foram canceladas', async () => {
    await entrar('PROVIDER');
    const venda = (id: string, status: string, amount: number) => ({ id, serviceId: 's', serviceTitle: 'S', providerId: 'u1', clientId: 'c', amount, status, scheduledAt: '', createdAt: '' });
    (bookingsApi.list as jest.Mock).mockResolvedValue([venda('1', 'CONFIRMED', 100), venda('2', 'COMPLETED', 300), venda('3', 'CANCELLED', 999)]);
    await renderComQuery(<WalletScreen {...props()} />);
    expect(await screen.findByText('200,00 Kz')).toBeOnTheScreen();
    expect(screen.getByText('2')).toBeOnTheScreen();
  });
});
