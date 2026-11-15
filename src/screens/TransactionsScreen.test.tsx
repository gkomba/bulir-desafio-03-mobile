import React from 'react';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { authApi, bookingsApi } from '../api';
import { useAuth } from '../store/auth';
import { useDialog } from '../store/dialog';
import { renderComQuery } from '../testing';
import TransactionsScreen from './TransactionsScreen';
import type { Booking, Role } from '../types';

jest.mock('../store/storage', () => ({ storage: { get: jest.fn(async () => null), set: jest.fn(async () => undefined), del: jest.fn(async () => undefined) } }));
jest.mock('../api', () => ({ authApi: { me: jest.fn() }, bookingsApi: { list: jest.fn(), cancel: jest.fn(), complete: jest.fn() } }));

const list = bookingsApi.list as jest.Mock;
const cancel = bookingsApi.cancel as jest.Mock;
const complete = bookingsApi.complete as jest.Mock;
const me = authApi.me as jest.Mock;

const reserva = (id: string, extra: Partial<Booking> = {}): Booking => ({
  id, serviceId: 's1', serviceTitle: `Serviço ${id}`, providerId: 'p1', clientId: 'u1', amount: 100, status: 'CONFIRMED',
  scheduledAt: '2026-12-01T10:00:00.000Z', createdAt: '2026-11-15T10:00:00.000Z', ...extra,
});
const entrar = (role: Role, id = 'u1') => useAuth.getState().setSession({ accessToken: 'a', refreshToken: 'r', user: { id, name: 'Ana', email: 'ana@exemplo.com', role, balance: 0 } });

beforeEach(() => {
  jest.clearAllMocks();
  useDialog.setState({ visible: false, message: '', title: undefined, onConfirm: undefined });
});

describe('histórico: o que cada perfil vê e pode fazer', () => {
  it('mostra cada reserva com o serviço, o valor e o estado', async () => {
    await entrar('CLIENT');
    list.mockResolvedValue([reserva('1'), reserva('2', { status: 'COMPLETED' })]);
    await renderComQuery(<TransactionsScreen />);
    expect(await screen.findByText('Serviço 1')).toBeOnTheScreen();
    expect(screen.getByText('Serviço 2')).toBeOnTheScreen();
    expect(screen.getByText('Confirmada')).toBeOnTheScreen();
    expect(screen.getByText('Concluída')).toBeOnTheScreen();
  });

  it('sem reservas, diz que não há nenhuma', async () => {
    await entrar('CLIENT');
    list.mockResolvedValue([]);
    await renderComQuery(<TransactionsScreen />);
    expect(await screen.findByText('Ainda sem reservas.')).toBeOnTheScreen();
  });

  it('o balanço não conta as reservas canceladas', async () => {
    await entrar('CLIENT');
    list.mockResolvedValue([reserva('1', { amount: 100 }), reserva('2', { amount: 50 }), reserva('3', { amount: 999, status: 'CANCELLED' })]);
    await renderComQuery(<TransactionsScreen />);
    expect(await screen.findByText(/3 reserva\(s\)/)).toBeOnTheScreen();
    expect(screen.getByText('-150,00 Kz')).toBeOnTheScreen();
  });

  it('o filtro "Saídas" mostra o que o utilizador comprou, e "Entradas" o que vendeu', async () => {
    await entrar('PROVIDER', 'p1');
    list.mockResolvedValue([reserva('venda', { providerId: 'p1', clientId: 'c9' }), reserva('compra', { providerId: 'p9', clientId: 'p1' })]);
    await renderComQuery(<TransactionsScreen />);
    await screen.findByText('Serviço venda');
    const user = userEvent.setup();
    await user.press(screen.getByText('Saídas'));
    expect(screen.queryByText('Serviço venda')).not.toBeOnTheScreen();
    expect(screen.getByText('Serviço compra')).toBeOnTheScreen();
    await user.press(screen.getByText('Entradas'));
    expect(screen.getByText('Serviço venda')).toBeOnTheScreen();
    expect(screen.queryByText('Serviço compra')).not.toBeOnTheScreen();
  });

  it('o cliente pode cancelar, mas não concluir', async () => {
    await entrar('CLIENT');
    list.mockResolvedValue([reserva('1')]);
    await renderComQuery(<TransactionsScreen />);
    await screen.findByText('Serviço 1');
    expect(screen.getByText('Cancelar')).toBeOnTheScreen();
    expect(screen.queryByText('Concluir')).not.toBeOnTheScreen();
  });

  it('o prestador pode concluir, mas não cancelar', async () => {
    await entrar('PROVIDER', 'p1');
    list.mockResolvedValue([reserva('1', { providerId: 'p1', clientId: 'c9' })]);
    await renderComQuery(<TransactionsScreen />);
    await screen.findByText('Serviço 1');
    expect(screen.getByText('Concluir')).toBeOnTheScreen();
    expect(screen.queryByText('Cancelar')).not.toBeOnTheScreen();
  });

  it('cancelar pede confirmação, avisa que o valor é devolvido e só cancela depois de confirmar', async () => {
    await entrar('CLIENT');
    list.mockResolvedValue([reserva('1')]);
    cancel.mockResolvedValue(reserva('1', { status: 'CANCELLED' }));
    me.mockResolvedValue({ id: 'u1', name: 'Ana', email: 'ana@exemplo.com', role: 'CLIENT', balance: 300 });
    await renderComQuery(<TransactionsScreen />);
    await userEvent.setup().press(await screen.findByText('Cancelar'));
    expect(useDialog.getState()).toMatchObject({ visible: true, title: 'Cancelar reserva', destructive: true });
    expect(useDialog.getState().message).toContain('devolvido');
    expect(cancel).not.toHaveBeenCalled();
    useDialog.getState().onConfirm?.();
    await waitFor(() => expect(cancel).toHaveBeenCalledWith('1'));
    await waitFor(() => expect(useAuth.getState().user?.balance).toBe(300));
  });

  it('concluir pede confirmação e só conclui depois de confirmar', async () => {
    await entrar('PROVIDER', 'p1');
    list.mockResolvedValue([reserva('1', { providerId: 'p1', clientId: 'c9' })]);
    complete.mockResolvedValue(reserva('1', { status: 'COMPLETED' }));
    me.mockResolvedValue({ id: 'p1', name: 'Paulo', email: 'p@exemplo.com', role: 'PROVIDER', balance: 0 });
    await renderComQuery(<TransactionsScreen />);
    await userEvent.setup().press(await screen.findByText('Concluir'));
    expect(useDialog.getState().title).toBe('Concluir reserva');
    expect(complete).not.toHaveBeenCalled();
    useDialog.getState().onConfirm?.();
    await waitFor(() => expect(complete).toHaveBeenCalledWith('1'));
  });
});
