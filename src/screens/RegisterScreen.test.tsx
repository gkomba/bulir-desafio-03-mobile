import React from 'react';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { authApi } from '../api';
import { useAuth } from '../store/auth';
import { erroHttp, renderComQuery } from '../testing';
import RegisterScreen from './RegisterScreen';

jest.mock('../store/storage', () => ({ storage: { get: jest.fn(async () => null), set: jest.fn(async () => undefined), del: jest.fn(async () => undefined) } }));
jest.mock('../api', () => ({ authApi: { register: jest.fn() } }));

const register = authApi.register as jest.Mock;
const NIF = 'NIF (9 a 14 caracteres)';
const sessao = { accessToken: 'a', refreshToken: 'r', user: { id: 'u1', name: 'Ana', email: 'ana@exemplo.com', role: 'CLIENT', balance: 0 } };

const escrever = async (placeholder: string, texto: string) => userEvent.setup().type(screen.getByPlaceholderText(placeholder), texto);
const preencherBase = async () => {
  await escrever('Nome completo', 'Ana Silva');
  await escrever('E-mail', 'ana@exemplo.com');
  await escrever('Palavra-passe', 'senha-forte-1');
};
const registar = async () => userEvent.setup().press(screen.getByRole('button', { name: 'Registar' }));

beforeEach(async () => {
  jest.clearAllMocks();
  await useAuth.getState().logout();
});

describe('ecrã de registo: o NIF é só dos prestadores', () => {
  it('por defeito é um cliente, e não pede NIF', async () => {
    await renderComQuery(<RegisterScreen />);
    expect(screen.queryByPlaceholderText(NIF)).not.toBeOnTheScreen();
  });

  it('escolher "Prestador" mostra o campo do NIF, e voltar a "Cliente" esconde-o', async () => {
    await renderComQuery(<RegisterScreen />);
    const user = userEvent.setup();
    await user.press(screen.getByText('Prestador'));
    expect(screen.getByPlaceholderText(NIF)).toBeOnTheScreen();
    await user.press(screen.getByText('Cliente'));
    expect(screen.queryByPlaceholderText(NIF)).not.toBeOnTheScreen();
  });

  it('um prestador sem NIF não se regista', async () => {
    await renderComQuery(<RegisterScreen />);
    await userEvent.setup().press(screen.getByText('Prestador'));
    await preencherBase();
    await registar();
    expect(await screen.findByText('NIF com 9 a 14 letras ou números')).toBeOnTheScreen();
    expect(register).not.toHaveBeenCalled();
  });

  it('recusa uma senha com menos de 8 caracteres e um e-mail inválido', async () => {
    await renderComQuery(<RegisterScreen />);
    await escrever('Nome completo', 'Ana Silva');
    await escrever('E-mail', 'ana@');
    await escrever('Palavra-passe', '1234567');
    await registar();
    expect(await screen.findByText('E-mail inválido')).toBeOnTheScreen();
    expect(screen.getByText('Mínimo 8 caracteres')).toBeOnTheScreen();
    expect(register).not.toHaveBeenCalled();
  });

  it('regista um cliente e guarda a sessão', async () => {
    register.mockResolvedValue(sessao);
    await renderComQuery(<RegisterScreen />);
    await preencherBase();
    await registar();
    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    expect(register.mock.calls[0][0]).toMatchObject({ name: 'Ana Silva', email: 'ana@exemplo.com', password: 'senha-forte-1', role: 'CLIENT' });
    await waitFor(() => expect(useAuth.getState().tokens).not.toBeNull());
  });

  it('regista um prestador com o NIF', async () => {
    register.mockResolvedValue({ ...sessao, user: { ...sessao.user, role: 'PROVIDER' } });
    await renderComQuery(<RegisterScreen />);
    await userEvent.setup().press(screen.getByText('Prestador'));
    await preencherBase();
    await escrever(NIF, '092402003LA1');
    await registar();
    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    expect(register.mock.calls[0][0]).toMatchObject({ role: 'PROVIDER', nif: '092402003LA1' });
  });

  it('mostra o erro do servidor (por exemplo, e-mail já registado) e não guarda sessão', async () => {
    register.mockRejectedValue(erroHttp(409, 'E-mail ou NIF já registado'));
    await renderComQuery(<RegisterScreen />);
    await preencherBase();
    await registar();
    expect(await screen.findByText('E-mail ou NIF já registado')).toBeOnTheScreen();
    expect(useAuth.getState().tokens).toBeNull();
  });
});
