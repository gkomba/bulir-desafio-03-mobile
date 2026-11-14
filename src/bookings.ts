import type { Booking } from './types';

/** Uma reserva cancelada devolveu o dinheiro: não conta como compra nem como venda. */
export const counts = (b: Booking): boolean => b.status !== 'CANCELLED';

export const STATUS_LABEL: Record<Booking['status'], string> = {
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};
