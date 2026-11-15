import { counts, STATUS_LABEL } from './bookings';
import type { Booking } from './types';

const reserva = (status: Booking['status']): Booking => ({ id: 'b', serviceId: 's', serviceTitle: 'S', providerId: 'p', providerName: 'Paulo', clientId: 'c', clientName: 'Ana', amount: 10, status, scheduledAt: '', createdAt: '' });

describe('reservas que contam como compra ou venda', () => {
  it('confirmadas e concluídas contam', () => {
    expect(counts(reserva('CONFIRMED'))).toBe(true);
    expect(counts(reserva('COMPLETED'))).toBe(true);
  });
  it('uma reserva cancelada devolveu o dinheiro e não conta', () => {
    expect(counts(reserva('CANCELLED'))).toBe(false);
  });
  it('todos os estados têm texto em português', () => {
    expect(STATUS_LABEL).toEqual({ CONFIRMED: 'Confirmada', COMPLETED: 'Concluída', CANCELLED: 'Cancelada' });
  });
});
