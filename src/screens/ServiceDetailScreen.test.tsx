import React from 'react';
import { screen, userEvent } from '@testing-library/react-native';
import { useAuth } from '../store/auth';
import { useFavorites } from '../store/favorites';
import { props, renderComQuery } from '../testing';
import ServiceDetailScreen from './ServiceDetailScreen';
import type { Service } from '../types';

jest.mock('../store/storage', () => ({ storage: { get: jest.fn(async () => null), set: jest.fn(async () => undefined), del: jest.fn(async () => undefined) } }));

const servico: Service = { id: 's1', title: 'Canalização', description: 'Reparação de fugas e desentupimentos', price: 200, providerId: 'p1', category: 'HOME' };
const entrar = (balance: number) => useAuth.getState().setSession({ accessToken: 'a', refreshToken: 'r', user: { id: 'u1', name: 'Ana', email: 'ana@exemplo.com', role: 'CLIENT', balance } });
const navegar = (p: ReturnType<typeof props>) => (p.navigation as unknown as { navigate: jest.Mock }).navigate;

beforeEach(() => {
  jest.clearAllMocks();
  useFavorites.setState({ uid: null, ids: [] });
});

describe('detalhe do serviço: o cliente contrata se tiver saldo', () => {
  it('mostra o título, o preço e a descrição', async () => {
    await entrar(500);
    await renderComQuery(<ServiceDetailScreen {...props({ service: servico })} />);
    expect(screen.getByText('Canalização')).toBeOnTheScreen();
    expect(screen.getByText('200,00 Kz')).toBeOnTheScreen();
    expect(screen.getByText('Reparação de fugas e desentupimentos')).toBeOnTheScreen();
  });

  it('mostra a categoria do serviço', async () => {
    await entrar(500);
    await renderComQuery(<ServiceDetailScreen {...props({ service: { ...servico, category: 'BEAUTY' } })} />);
    expect(screen.getByText('Beleza')).toBeOnTheScreen();
  });

  it('com saldo suficiente, oferece "Contratar agora" e segue para o pagamento', async () => {
    await entrar(500);
    const p = props({ service: servico });
    await renderComQuery(<ServiceDetailScreen {...p} />);
    expect(screen.queryByText(/Saldo insuficiente/)).not.toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Contratar agora' }));
    expect(navegar(p)).toHaveBeenCalledWith('Checkout', { service: servico });
  });

  it('com saldo igual ao preço, também pode contratar', async () => {
    await entrar(200);
    await renderComQuery(<ServiceDetailScreen {...props({ service: servico })} />);
    expect(screen.getByRole('button', { name: 'Contratar agora' })).toBeOnTheScreen();
  });

  it('com saldo insuficiente, avisa e leva à carteira em vez de ao pagamento', async () => {
    await entrar(199.99);
    const p = props({ service: servico });
    await renderComQuery(<ServiceDetailScreen {...p} />);
    expect(screen.getByText('Saldo insuficiente. Adicione saldo na carteira.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Contratar agora' })).not.toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Adicionar saldo' }));
    expect(navegar(p)).toHaveBeenCalledWith('Wallet', { service: servico });
  });
});
