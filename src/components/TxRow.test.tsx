import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import { TxRow } from './TxRow';
import type { Booking } from '../types';

const reserva = (extra: Partial<Booking> = {}): Booking => ({
  id: 'b1', serviceId: 's1', serviceTitle: 'Canalização', providerId: 'p1234567-aaaa', providerName: 'Paulo Barbeiro', clientId: 'c7654321-bbbb', clientName: 'Ana Silva', amount: 150.5,
  status: 'CONFIRMED', scheduledAt: '2026-12-01T10:00:00.000Z', createdAt: '2026-11-15T10:00:00.000Z', ...extra,
});

describe('uma reserva no histórico', () => {
  it('mostra o serviço, o valor e o estado', async () => {
    await render(<TxRow tx={reserva()} userId="c7654321-bbbb" />);
    expect(screen.getByText('Canalização')).toBeOnTheScreen();
    expect(screen.getByText('-150,50 Kz')).toBeOnTheScreen();
    expect(screen.getByText('Confirmada')).toBeOnTheScreen();
  });

  it('para o cliente é uma saída, e para o prestador uma entrada', async () => {
    const { unmount } = await render(<TxRow tx={reserva()} userId="c7654321-bbbb" />);
    expect(screen.getByText(/^-150,50/)).toBeOnTheScreen();
    await unmount();
    await render(<TxRow tx={reserva()} userId="p1234567-aaaa" />);
    expect(screen.getByText(/^\+150,50/)).toBeOnTheScreen();
  });

  it('mostra o nome do prestador e o do cliente, vistos por qualquer das partes', async () => {
    const { unmount } = await render(<TxRow tx={reserva()} userId="c7654321-bbbb" />);
    expect(screen.getByText('Prestador: Paulo Barbeiro')).toBeOnTheScreen();
    expect(screen.getByText('Cliente: Ana Silva')).toBeOnTheScreen();
    await unmount();
    await render(<TxRow tx={reserva()} userId="p1234567-aaaa" />);
    expect(screen.getByText('Prestador: Paulo Barbeiro')).toBeOnTheScreen();
    expect(screen.getByText('Cliente: Ana Silva')).toBeOnTheScreen();
  });

  it('já não mostra identificadores no lugar dos nomes', async () => {
    await render(<TxRow tx={reserva()} userId="c7654321-bbbb" />);
    expect(screen.queryByText(/#p1234567|#c7654321/)).not.toBeOnTheScreen();
  });

  it('o cliente pode cancelar uma reserva confirmada', async () => {
    const onCancel = jest.fn();
    await render(<TxRow tx={reserva()} userId="c7654321-bbbb" onCancel={onCancel} />);
    await userEvent.setup().press(screen.getByText('Cancelar'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('o prestador pode concluir uma reserva confirmada', async () => {
    const onComplete = jest.fn();
    await render(<TxRow tx={reserva()} userId="p1234567-aaaa" onComplete={onComplete} />);
    await userEvent.setup().press(screen.getByText('Concluir'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('sem a ação para o perfil, o botão não aparece', async () => {
    await render(<TxRow tx={reserva()} userId="c7654321-bbbb" />);
    expect(screen.queryByText('Cancelar')).not.toBeOnTheScreen();
    expect(screen.queryByText('Concluir')).not.toBeOnTheScreen();
  });

  it.each(['COMPLETED', 'CANCELLED'] as const)('uma reserva %s já não se pode cancelar nem concluir', async (status) => {
    await render(<TxRow tx={reserva({ status })} userId="c7654321-bbbb" onCancel={jest.fn()} onComplete={jest.fn()} />);
    expect(screen.queryByText('Cancelar')).not.toBeOnTheScreen();
    expect(screen.queryByText('Concluir')).not.toBeOnTheScreen();
  });

  it('mostra o estado em português', async () => {
    await render(<TxRow tx={reserva({ status: 'CANCELLED' })} userId="c7654321-bbbb" />);
    expect(screen.getByText('Cancelada')).toBeOnTheScreen();
  });
});
