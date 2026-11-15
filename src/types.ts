export type Role = 'CLIENT' | 'PROVIDER';

/** Valores monetários em Kwanzas (a API trabalha em cêntimos; a conversão é feita em src/api). */
export interface User { id: string; name: string; email: string; nif?: string; role: Role; balance: number }

export interface Service {
  id: string; title: string; description: string; price: number; providerId: string;
}

export type BookingStatus = 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

/** Uma contratação (reserva) de um serviço. É o que o histórico mostra. */
export interface Booking {
  id: string; serviceId: string; serviceTitle: string; providerId: string; clientId: string;
  amount: number; status: BookingStatus; scheduledAt: string; createdAt: string;
}

export interface Tokens { accessToken: string; refreshToken: string }
export interface Session extends Tokens { user: User }
