import React from 'react';
import { screen, userEvent } from '@testing-library/react-native';
import { servicesApi } from '../api';
import { useFavorites } from '../store/favorites';
import { props, renderComQuery } from '../testing';
import ExploreScreen from './ExploreScreen';

jest.mock('../store/storage', () => ({ storage: { get: jest.fn(async () => null), set: jest.fn(async () => undefined), del: jest.fn(async () => undefined) } }));
jest.mock('../api', () => ({ servicesApi: { all: jest.fn() } }));

const all = servicesApi.all as jest.Mock;
const s = (id: string, title: string, price: number, description = `Descrição de ${title}`) => ({ id, title, description, price, providerId: 'p1' });
const CATALOGO = [s('1', 'Pintura', 350), s('2', 'Canalização', 80, 'Reparação de fugas'), s('3', 'Limpeza', 120), s('4', 'Eletricista', 95)];
const titulos = () => screen.getAllByText(/^(Pintura|Canalização|Limpeza|Eletricista)$/).map((t) => String(t.props.children));

beforeEach(() => {
  jest.clearAllMocks();
  useFavorites.setState({ uid: null, ids: [] });
  all.mockResolvedValue(CATALOGO);
});

describe('catálogo do cliente', () => {
  it('mostra todos os serviços e quantos são', async () => {
    await renderComQuery(<ExploreScreen {...props()} />);
    expect(await screen.findByText('Todos os serviços · 4')).toBeOnTheScreen();
    expect(titulos()).toHaveLength(4);
  });

  it('por defeito mostra os mais recentes primeiro (os últimos da API)', async () => {
    await renderComQuery(<ExploreScreen {...props()} />);
    await screen.findByText('Pintura');
    expect(titulos()).toEqual(['Eletricista', 'Limpeza', 'Canalização', 'Pintura']);
  });

  it.each([
    ['Mais baratos', ['Canalização', 'Eletricista', 'Limpeza', 'Pintura']],
    ['Mais caros', ['Pintura', 'Limpeza', 'Eletricista', 'Canalização']],
    ['A–Z', ['Canalização', 'Eletricista', 'Limpeza', 'Pintura']],
  ])('ordena por "%s"', async (ordem, esperado) => {
    await renderComQuery(<ExploreScreen {...props()} />);
    await screen.findByText('Pintura');
    await userEvent.setup().press(screen.getByText(ordem));
    expect(titulos()).toEqual(esperado);
  });

  it('pesquisa pelo título, sem distinguir maiúsculas', async () => {
    await renderComQuery(<ExploreScreen {...props()} />);
    await screen.findByText('Pintura');
    await userEvent.setup().type(screen.getByPlaceholderText('Pesquisar'), 'LIMP');
    expect(titulos()).toEqual(['Limpeza']);
    expect(screen.getByText('Todos os serviços · 1')).toBeOnTheScreen();
  });

  it('pesquisa também pela descrição', async () => {
    await renderComQuery(<ExploreScreen {...props()} />);
    await screen.findByText('Pintura');
    await userEvent.setup().type(screen.getByPlaceholderText('Pesquisar'), 'fugas');
    expect(titulos()).toEqual(['Canalização']);
  });

  it('sem resultados, diz que nenhum serviço foi encontrado', async () => {
    await renderComQuery(<ExploreScreen {...props()} />);
    await screen.findByText('Pintura');
    await userEvent.setup().type(screen.getByPlaceholderText('Pesquisar'), 'zzz');
    expect(screen.getByText('Nenhum serviço encontrado.')).toBeOnTheScreen();
  });

  it('abrir um serviço leva ao detalhe com esse serviço', async () => {
    const p = props();
    await renderComQuery(<ExploreScreen {...p} />);
    await userEvent.setup().press(await screen.findByText('Canalização'));
    expect((p.navigation as unknown as { navigate: jest.Mock }).navigate).toHaveBeenCalledWith('ServiceDetail', { service: CATALOGO[1] });
  });
});
