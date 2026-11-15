import React from 'react';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { servicesApi } from '../api';
import { erroHttp, props, renderComQuery } from '../testing';
import ServiceFormScreen from './ServiceFormScreen';
import type { Service } from '../types';

jest.mock('../store/storage', () => ({ storage: { get: jest.fn(async () => null), set: jest.fn(async () => undefined), del: jest.fn(async () => undefined) } }));
jest.mock('../api', () => ({ servicesApi: { create: jest.fn(), update: jest.fn() } }));

const create = servicesApi.create as jest.Mock;
const update = servicesApi.update as jest.Mock;
const existente: Service = { id: 's1', title: 'Canalização', description: 'Reparação de fugas', price: 150.5, providerId: 'p1' };

const escrever = async (placeholder: string, texto: string) => userEvent.setup().type(screen.getByPlaceholderText(placeholder), texto);
const preencher = async (titulo: string, descricao: string, preco: string) => {
  if (titulo) await escrever('Ex.: Canalização', titulo);
  if (descricao) await escrever('Descreva o serviço', descricao);
  if (preco) await escrever('0,00', preco);
};
const guardar = (nome: string) => userEvent.setup().press(screen.getByRole('button', { name: nome }));

beforeEach(() => jest.clearAllMocks());

describe('criar um serviço', () => {
  it('pede nome, descrição e preço', async () => {
    await renderComQuery(<ServiceFormScreen {...props()} />);
    expect(screen.getByText('Novo serviço')).toBeOnTheScreen();
    expect(screen.getByText('Título')).toBeOnTheScreen();
    expect(screen.getByText('Descrição')).toBeOnTheScreen();
    expect(screen.getByText('Preço (Kz)')).toBeOnTheScreen();
  });

  it('não cria com o formulário vazio e mostra o que falta', async () => {
    await renderComQuery(<ServiceFormScreen {...props()} />);
    await guardar('Criar serviço');
    expect(await screen.findByText('Mínimo 3 caracteres')).toBeOnTheScreen();
    expect(screen.getByText('Introduza uma descrição')).toBeOnTheScreen();
    expect(screen.getByText('Preço entre 0,01 e 10 000 000 Kz')).toBeOnTheScreen();
    expect(create).not.toHaveBeenCalled();
  });

  it.each(['0', '0,00', '-10', 'abc', '10000001'])('recusa o preço "%s": tem de ser maior que zero', async (preco) => {
    await renderComQuery(<ServiceFormScreen {...props()} />);
    await preencher('Canalização', 'Reparação de fugas', preco);
    await guardar('Criar serviço');
    expect(await screen.findByText('Preço entre 0,01 e 10 000 000 Kz')).toBeOnTheScreen();
    expect(create).not.toHaveBeenCalled();
  });

  it('recusa um título com mais de 120 caracteres', async () => {
    await renderComQuery(<ServiceFormScreen {...props()} />);
    await preencher('a'.repeat(121), 'Descrição', '10');
    await guardar('Criar serviço');
    expect(await screen.findByText('Máximo 120 caracteres')).toBeOnTheScreen();
    expect(create).not.toHaveBeenCalled();
  });

  it('cria o serviço com o preço em número (a vírgula conta como ponto) e volta atrás', async () => {
    create.mockResolvedValue(existente);
    const p = props();
    await renderComQuery(<ServiceFormScreen {...p} />);
    await preencher('  Canalização ', 'Reparação de fugas', '150,50');
    await guardar('Criar serviço');
    await waitFor(() => expect(create).toHaveBeenCalledWith({ title: 'Canalização', description: 'Reparação de fugas', price: 150.5 }));
    await waitFor(() => expect((p.navigation as unknown as { goBack: jest.Mock }).goBack).toHaveBeenCalled());
  });

  it('mostra o erro do servidor e não volta atrás', async () => {
    create.mockRejectedValue(erroHttp(403, 'Só os prestadores podem criar serviços'));
    const p = props();
    await renderComQuery(<ServiceFormScreen {...p} />);
    await preencher('Canalização', 'Reparação de fugas', '100');
    await guardar('Criar serviço');
    expect(await screen.findByText('Só os prestadores podem criar serviços')).toBeOnTheScreen();
    expect((p.navigation as unknown as { goBack: jest.Mock }).goBack).not.toHaveBeenCalled();
  });
});

describe('editar um serviço', () => {
  it('abre com os dados do serviço', async () => {
    await renderComQuery(<ServiceFormScreen {...props({ service: existente })} />);
    expect(screen.getByText('Editar serviço')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('Canalização')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('Reparação de fugas')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('150.5')).toBeOnTheScreen();
  });

  it('guarda as alterações no mesmo serviço, sem criar outro', async () => {
    update.mockResolvedValue(existente);
    await renderComQuery(<ServiceFormScreen {...props({ service: existente })} />);
    const user = userEvent.setup();
    await user.clear(screen.getByDisplayValue('150.5'));
    await user.type(screen.getByPlaceholderText('0,00'), '200');
    await guardar('Guardar alterações');
    await waitFor(() => expect(update).toHaveBeenCalledWith('s1', { title: 'Canalização', description: 'Reparação de fugas', price: 200 }));
    expect(create).not.toHaveBeenCalled();
  });
});
