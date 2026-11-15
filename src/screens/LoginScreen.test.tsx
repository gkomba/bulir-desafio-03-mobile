import React from 'react';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { authApi } from '../api';
import { useAuth } from '../store/auth';
import { erroHttp, props, renderComQuery } from '../testing';
import LoginScreen from './LoginScreen';

jest.mock('../store/storage', () => ({ storage: { get: jest.fn(async () => null), set: jest.fn(async () => undefined), del: jest.fn(async () => undefined) } }));
jest.mock('../api', () => ({ authApi: { login: jest.fn() } }));

const login = authApi.login as jest.Mock;
const sessao = { accessToken: 'a', refreshToken: 'r', user: { id: 'u1', name: 'Ana', email: 'ana@exemplo.com', role: 'CLIENT', balance: 0 } };

const preencher = async (identificador: string, senha: string) => {
  const user = userEvent.setup();
  if (identificador) await user.type(screen.getByPlaceholderText('E-mail ou NIF'), identificador);
  if (senha) await user.type(screen.getByPlaceholderText('Palavra-passe'), senha);
  await user.press(screen.getByRole('button', { name: 'Entrar' }));
};

beforeEach(async () => {
  jest.clearAllMocks();
  await useAuth.getState().logout();
});

describe('ecrã de login: e-mail ou NIF e senha', () => {
  it('não deixa entrar sem preencher e mostra o que falta', async () => {
    await renderComQuery(<LoginScreen {...props()} />);
    await preencher('', '');
    expect(await screen.findByText('Introduza e-mail ou NIF')).toBeOnTheScreen();
    expect(screen.getByText('Introduza a palavra-passe')).toBeOnTheScreen();
    expect(login).not.toHaveBeenCalled();
  });

  it('recusa um identificador que não é e-mail nem NIF', async () => {
    await renderComQuery(<LoginScreen {...props()} />);
    await preencher('ana', 'senha');
    expect(await screen.findByText('E-mail ou NIF (9 a 14 caracteres) inválido')).toBeOnTheScreen();
    expect(login).not.toHaveBeenCalled();
  });

  it.each([['com o e-mail', 'ana@exemplo.com'], ['com o NIF', '092402003LA1']])('entra %s', async (_nome, identifier) => {
    login.mockResolvedValue(sessao);
    await renderComQuery(<LoginScreen {...props()} />);
    await preencher(identifier, 'senha-forte-1');
    await waitFor(() => expect(login).toHaveBeenCalledTimes(1));
    expect(login.mock.calls[0][0]).toEqual({ identifier, password: 'senha-forte-1' });
  });

  it('guarda a sessão no estado global depois de entrar', async () => {
    login.mockResolvedValue(sessao);
    await renderComQuery(<LoginScreen {...props()} />);
    await preencher('ana@exemplo.com', 'senha-forte-1');
    await waitFor(() => expect(useAuth.getState().tokens).toEqual({ accessToken: 'a', refreshToken: 'r' }));
    expect(useAuth.getState().user?.email).toBe('ana@exemplo.com');
  });

  it('mostra o erro do servidor se as credenciais estiverem erradas, sem guardar sessão', async () => {
    login.mockRejectedValue(erroHttp(401, 'Credenciais inválidas'));
    await renderComQuery(<LoginScreen {...props()} />);
    await preencher('ana@exemplo.com', 'errada-errada');
    expect(await screen.findByText('Credenciais inválidas')).toBeOnTheScreen();
    expect(useAuth.getState().tokens).toBeNull();
  });

  it('o erro desaparece quando se tenta outra vez', async () => {
    login.mockRejectedValueOnce(erroHttp(401, 'Credenciais inválidas')).mockResolvedValueOnce(sessao);
    await renderComQuery(<LoginScreen {...props()} />);
    await preencher('ana@exemplo.com', 'errada-errada');
    await screen.findByText('Credenciais inválidas');
    await userEvent.setup().press(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(screen.queryByText('Credenciais inválidas')).not.toBeOnTheScreen());
  });

  it('"Criar conta" leva ao registo', async () => {
    const p = props();
    await renderComQuery(<LoginScreen {...p} />);
    await userEvent.setup().press(screen.getByText('Criar conta'));
    expect((p.navigation as unknown as { navigate: jest.Mock }).navigate).toHaveBeenCalledWith('Register');
  });
});
