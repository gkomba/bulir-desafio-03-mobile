import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import { CategoryRow } from './home';

const NOMES = ['Todos', 'Casa', 'Beleza', 'Tecnologia', 'Educação', 'Saúde', 'Eventos', 'Automóvel', 'Outros'];

describe('linha de categorias', () => {
  it('mostra "Todos" e as 8 categorias', async () => {
    await render(<CategoryRow selected={null} onSelect={jest.fn()} />);
    for (const nome of NOMES) expect(screen.getByRole('button', { name: nome })).toBeOnTheScreen();
  });

  it('sem categoria escolhida, "Todos" está marcado', async () => {
    await render(<CategoryRow selected={null} onSelect={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Todos' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Casa' })).not.toBeSelected();
  });

  it('marca só a categoria escolhida', async () => {
    await render(<CategoryRow selected="HEALTH" onSelect={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Saúde' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Todos' })).not.toBeSelected();
    expect(screen.getAllByRole('button', { selected: true })).toHaveLength(1);
  });

  it('tocar numa categoria devolve o código da API', async () => {
    const onSelect = jest.fn();
    await render(<CategoryRow selected={null} onSelect={onSelect} />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Automóvel' }));
    expect(onSelect).toHaveBeenCalledWith('AUTOMOTIVE');
  });

  it('tocar em "Todos" limpa o filtro', async () => {
    const onSelect = jest.fn();
    await render(<CategoryRow selected="HOME" onSelect={onSelect} />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Todos' }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
