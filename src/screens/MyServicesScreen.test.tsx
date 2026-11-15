import React from 'react';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { servicesApi } from '../api';
import { useAuth } from '../store/auth';
import { useDialog } from '../store/dialog';
import { erroHttp, props, renderComQuery } from '../testing';
import MyServicesScreen from './MyServicesScreen';

jest.mock('../store/storage', () => ({ storage: { get: jest.fn(async () => null), set: jest.fn(async () => undefined), del: jest.fn(async () => undefined) } }));
jest.mock('../api', () => ({ servicesApi: { byProvider: jest.fn(), remove: jest.fn() } }));

const byProvider = servicesApi.byProvider as jest.Mock;
const remove = servicesApi.remove as jest.Mock;
const servico = (id: string, title: string, price: number) => ({ id, title, description: `Descrição de ${title}`, price, providerId: 'u1', category: 'HOME' as const });

beforeEach(async () => {
  jest.clearAllMocks();
  useDialog.setState({ visible: false, message: '', title: undefined, onConfirm: undefined });
  await useAuth.getState().setSession({ accessToken: 'a', refreshToken: 'r', user: { id: 'u1', name: 'Paulo', email: 'p@exemplo.com', role: 'PROVIDER', balance: 0 } });
});

describe('lista dos serviços do prestador', () => {
  it('pede só os serviços do prestador autenticado', async () => {
    byProvider.mockResolvedValue([]);
    await renderComQuery(<MyServicesScreen {...props()} />);
    await waitFor(() => expect(byProvider).toHaveBeenCalledWith('u1'));
  });

  it('mostra os serviços com o preço', async () => {
    byProvider.mockResolvedValue([servico('s1', 'Canalização', 150.5), servico('s2', 'Pintura', 35000)]);
    await renderComQuery(<MyServicesScreen {...props()} />);
    expect(await screen.findByText('Canalização')).toBeOnTheScreen();
    expect(screen.getByText('150,50 Kz')).toBeOnTheScreen();
    expect(screen.getByText('Pintura')).toBeOnTheScreen();
  });

  it('sem serviços, convida a criar o primeiro', async () => {
    byProvider.mockResolvedValue([]);
    await renderComQuery(<MyServicesScreen {...props()} />);
    expect(await screen.findByText('Ainda não criou nenhum serviço.')).toBeOnTheScreen();
  });

  it('"Novo" abre o formulário vazio', async () => {
    byProvider.mockResolvedValue([]);
    const p = props();
    await renderComQuery(<MyServicesScreen {...p} />);
    await userEvent.setup().press(screen.getByText('+ Novo'));
    expect((p.navigation as unknown as { navigate: jest.Mock }).navigate).toHaveBeenCalledWith('ServiceForm');
  });

  it('"Editar" abre o formulário com o serviço', async () => {
    const s = servico('s1', 'Canalização', 150.5);
    byProvider.mockResolvedValue([s]);
    const p = props();
    await renderComQuery(<MyServicesScreen {...p} />);
    await userEvent.setup().press(await screen.findByRole('button', { name: 'Editar' }));
    expect((p.navigation as unknown as { navigate: jest.Mock }).navigate).toHaveBeenCalledWith('ServiceForm', { service: s });
  });

  it('"Excluir" pede confirmação e só apaga depois de confirmar', async () => {
    byProvider.mockResolvedValue([servico('s1', 'Canalização', 150.5)]);
    remove.mockResolvedValue(undefined);
    await renderComQuery(<MyServicesScreen {...props()} />);
    await userEvent.setup().press(await screen.findByRole('button', { name: 'Excluir' }));
    expect(useDialog.getState()).toMatchObject({ visible: true, title: 'Excluir serviço', destructive: true });
    expect(remove).not.toHaveBeenCalled();
    useDialog.getState().onConfirm?.();
    await waitFor(() => expect(remove).toHaveBeenCalledWith('s1'));
  });

  it('se o servidor recusar apagar, mostra o erro', async () => {
    byProvider.mockResolvedValue([servico('s1', 'Canalização', 150.5)]);
    remove.mockRejectedValue(erroHttp(403, 'Só o prestador dono do serviço o pode alterar'));
    await renderComQuery(<MyServicesScreen {...props()} />);
    await userEvent.setup().press(await screen.findByRole('button', { name: 'Excluir' }));
    useDialog.getState().onConfirm?.();
    await waitFor(() => expect(useDialog.getState()).toMatchObject({ title: 'Erro', message: 'Só o prestador dono do serviço o pode alterar' }));
  });
});
