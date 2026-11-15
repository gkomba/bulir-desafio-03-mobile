import React from 'react';
import { screen, waitFor } from '@testing-library/react-native';
import { authApi, bookingsApi, servicesApi } from '../api';
import { useAuth } from '../store/auth';
import { renderComQuery } from '../testing';
import Navigation from './index';
import type { Role } from '../types';

jest.mock('../store/storage', () => ({ storage: { get: jest.fn(async () => null), set: jest.fn(async () => undefined), del: jest.fn(async () => undefined) } }));
jest.mock('../api', () => ({
  authApi: { me: jest.fn() },
  servicesApi: { all: jest.fn(), byProvider: jest.fn() },
  bookingsApi: { list: jest.fn() },
  signOut: jest.fn(),
}));

const utilizador = (role: Role) => ({ id: 'u1', name: 'Ana Silva', email: 'ana@exemplo.com', role, balance: 100 });
const entrar = (role: Role) => useAuth.getState().setSession({ accessToken: 'a', refreshToken: 'r', user: utilizador(role) });

beforeEach(async () => {
  jest.clearAllMocks();
  await useAuth.getState().logout();
  (servicesApi.all as jest.Mock).mockResolvedValue([]);
  (servicesApi.byProvider as jest.Mock).mockResolvedValue([]);
  (bookingsApi.list as jest.Mock).mockResolvedValue([]);
});

/** Os separadores têm o rótulo "Explorar, tab, 2 of 5". */
const separador = (nome: string) => screen.queryByLabelText(new RegExp(`^${nome}, tab`));

describe('permissões na navegação: cada perfil só vê as suas telas', () => {
  it('sem sessão, só se vê o login', async () => {
    await renderComQuery(<Navigation />);
    expect(await screen.findByText('Entrar na minha conta')).toBeOnTheScreen();
    expect(separador('Histórico')).not.toBeOnTheScreen();
  });

  it('o cliente vê Explorar, Carteira, Histórico e Perfil, e não vê "Meus serviços"', async () => {
    (authApi.me as jest.Mock).mockResolvedValue(utilizador('CLIENT'));
    await entrar('CLIENT');
    await renderComQuery(<Navigation />);
    await waitFor(() => expect(separador('Explorar')).toBeOnTheScreen());
    expect(separador('Carteira')).toBeOnTheScreen();
    expect(separador('Histórico')).toBeOnTheScreen();
    expect(separador('Perfil')).toBeOnTheScreen();
    expect(separador('Meus serviços')).not.toBeOnTheScreen();
  });

  it('o prestador vê "Meus serviços", Carteira, Histórico e Perfil, e não vê Explorar', async () => {
    (authApi.me as jest.Mock).mockResolvedValue(utilizador('PROVIDER'));
    await entrar('PROVIDER');
    await renderComQuery(<Navigation />);
    await waitFor(() => expect(separador('Meus serviços')).toBeOnTheScreen());
    expect(separador('Carteira')).toBeOnTheScreen();
    expect(separador('Histórico')).toBeOnTheScreen();
    expect(separador('Perfil')).toBeOnTheScreen();
    expect(separador('Explorar')).not.toBeOnTheScreen();
  });

  it('o prestador não pede o catálogo de serviços, e o cliente não pede os serviços de um prestador', async () => {
    (authApi.me as jest.Mock).mockResolvedValue(utilizador('PROVIDER'));
    await entrar('PROVIDER');
    const { unmount } = await renderComQuery(<Navigation />);
    await waitFor(() => expect(servicesApi.byProvider).toHaveBeenCalled());
    expect(servicesApi.all).not.toHaveBeenCalled();
    await unmount();
    jest.clearAllMocks();
    (authApi.me as jest.Mock).mockResolvedValue(utilizador('CLIENT'));
    (servicesApi.all as jest.Mock).mockResolvedValue([]);
    await entrar('CLIENT');
    await renderComQuery(<Navigation />);
    await waitFor(() => expect(servicesApi.all).toHaveBeenCalled());
    expect(servicesApi.byProvider).not.toHaveBeenCalled();
  });
});
