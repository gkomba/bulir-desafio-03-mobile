import React from 'react';
import { screen, userEvent } from '@testing-library/react-native';
import { servicesApi } from '../api';
import { useFavorites } from '../store/favorites';
import { props, renderComQuery } from '../testing';
import ExploreScreen from './ExploreScreen';
import type { ServiceCategory } from '../types';

jest.mock('../store/storage', () => ({ storage: { get: jest.fn(async () => null), set: jest.fn(async () => undefined), del: jest.fn(async () => undefined) } }));
jest.mock('../api', () => ({ servicesApi: { all: jest.fn() } }));

const all = servicesApi.all as jest.Mock;
const s = (id: string, title: string, price: number, category: ServiceCategory, description = `Descrição de ${title}`) => ({ id, title, description, price, providerId: 'p1', category });
const CATALOGO = [s('1', 'Pintura', 350, 'HOME'), s('2', 'Canalização', 80, 'HOME', 'Reparação de fugas'), s('3', 'Limpeza', 120, 'HOME'), s('4', 'Eletricista', 95, 'TECHNOLOGY')];
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

  it('por defeito mostra os mais recentes primeiro (a API já os devolve nessa ordem)', async () => {
    await renderComQuery(<ExploreScreen {...props()} />);
    await screen.findByText('Pintura');
    expect(titulos()).toEqual(['Pintura', 'Canalização', 'Limpeza', 'Eletricista']);
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

  describe('categorias', () => {
    const catalogoComCategorias = [s('1', 'Pintura', 350, 'HOME'), s('2', 'Corte', 80, 'BEAUTY'), s('3', 'Manicure', 60, 'BEAUTY'), s('4', 'Massagem', 120, 'HEALTH')];
    const nomes = () => screen.getAllByText(/^(Pintura|Corte|Manicure|Massagem)$/).map((t) => String(t.props.children));

    beforeEach(() => all.mockResolvedValue(catalogoComCategorias));

    it('mostra a linha de categorias', async () => {
      await renderComQuery(<ExploreScreen {...props()} />);
      expect(await screen.findByRole('button', { name: 'Beleza' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Todos' })).toBeSelected();
    });

    it('filtra por categoria e mostra o nome e a contagem', async () => {
      await renderComQuery(<ExploreScreen {...props()} />);
      await screen.findByText('Pintura');
      await userEvent.setup().press(screen.getByRole('button', { name: 'Beleza' }));
      expect(nomes()).toEqual(['Corte', 'Manicure']);
      expect(screen.getByText('Beleza · 2')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Beleza' })).toBeSelected();
    });

    it('"Todos" volta a mostrar tudo', async () => {
      await renderComQuery(<ExploreScreen {...props()} />);
      await screen.findByText('Pintura');
      const user = userEvent.setup();
      await user.press(screen.getByRole('button', { name: 'Saúde' }));
      expect(nomes()).toEqual(['Massagem']);
      await user.press(screen.getByRole('button', { name: 'Todos' }));
      expect(nomes()).toHaveLength(4);
      expect(screen.getByText('Todos os serviços · 4')).toBeOnTheScreen();
    });

    it('combina a categoria com a pesquisa', async () => {
      await renderComQuery(<ExploreScreen {...props()} />);
      await screen.findByText('Pintura');
      const user = userEvent.setup();
      await user.press(screen.getByRole('button', { name: 'Beleza' }));
      await user.type(screen.getByPlaceholderText('Pesquisar'), 'mani');
      expect(nomes()).toEqual(['Manicure']);
    });

    it('uma categoria sem serviços diz que nenhum foi encontrado', async () => {
      await renderComQuery(<ExploreScreen {...props()} />);
      await screen.findByText('Pintura');
      await userEvent.setup().press(screen.getByRole('button', { name: 'Automóvel' }));
      expect(screen.getByText('Nenhum serviço encontrado.')).toBeOnTheScreen();
    });

    it('vindo do início com uma categoria, já chega filtrada', async () => {
      await renderComQuery(<ExploreScreen {...props({ category: 'BEAUTY' })} />);
      await screen.findByText('Corte');
      expect(nomes()).toEqual(['Corte', 'Manicure']);
      expect(screen.getByRole('button', { name: 'Beleza' })).toBeSelected();
    });

    describe('com o ecrã já aberto, a navegação traz parâmetros novos', () => {
      it('outra categoria muda o filtro', async () => {
        const { rerenderComQuery } = await renderComQuery(<ExploreScreen {...props({ category: 'BEAUTY' })} />);
        await screen.findByText('Corte');
        await rerenderComQuery(<ExploreScreen {...props({ category: 'HEALTH' })} />);
        expect(nomes()).toEqual(['Massagem']);
        expect(screen.getByRole('button', { name: 'Saúde' })).toBeSelected();
      });

      it('a mesma categoria volta a aplicar-se depois de o utilizador escolher "Todos"', async () => {
        const { rerenderComQuery } = await renderComQuery(<ExploreScreen {...props({ category: 'BEAUTY' })} />);
        await screen.findByText('Corte');
        await userEvent.setup().press(screen.getByRole('button', { name: 'Todos' }));
        expect(nomes()).toHaveLength(4);
        await rerenderComQuery(<ExploreScreen {...props({ category: 'BEAUTY' })} />);
        expect(nomes()).toEqual(['Corte', 'Manicure']);
      });

      it('"category: null" (Ver todas) limpa o filtro anterior', async () => {
        const { rerenderComQuery } = await renderComQuery(<ExploreScreen {...props({ category: 'BEAUTY' })} />);
        await screen.findByText('Corte');
        await rerenderComQuery(<ExploreScreen {...props({ category: null })} />);
        expect(nomes()).toHaveLength(4);
        expect(screen.getByRole('button', { name: 'Todos' })).toBeSelected();
      });

      it('um novo render com os mesmos parâmetros não desfaz a escolha do utilizador', async () => {
        const p = props({ category: 'BEAUTY' });
        const { rerenderComQuery } = await renderComQuery(<ExploreScreen {...p} />);
        await screen.findByText('Corte');
        await userEvent.setup().press(screen.getByRole('button', { name: 'Saúde' }));
        await rerenderComQuery(<ExploreScreen {...p} />);
        expect(nomes()).toEqual(['Massagem']);
      });
    });

    it('"Ver todas" no início (sem categoria) não filtra', async () => {
      await renderComQuery(<ExploreScreen {...props({ category: null })} />);
      await screen.findByText('Pintura');
      expect(nomes()).toHaveLength(4);
    });
  });

  it('abrir um serviço leva ao detalhe com esse serviço', async () => {
    const p = props();
    await renderComQuery(<ExploreScreen {...p} />);
    await userEvent.setup().press(await screen.findByText('Canalização'));
    expect((p.navigation as unknown as { navigate: jest.Mock }).navigate).toHaveBeenCalledWith('ServiceDetail', { service: CATALOGO[1] });
  });
});
