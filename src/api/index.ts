import { http } from './client';
import { useAuth } from '../store/auth';
import type { Booking, BookingStatus, Role, Service, ServiceCategory, Session, User } from '../types';
import type { LoginForm, RegisterForm } from '../schemas';
import type { UploadAuthorization } from '../cloudinaryUpload';

/*
 * Formato da API (Desafio 1) e conversão para os tipos da app.
 * A API guarda dinheiro em cêntimos; a app mostra e edita Kwanzas.
 */
interface UserDto { id: string; fullName: string; email: string; nif: string | null; role: Role; balanceCents: number }
interface ServiceDto { id: string; providerId: string; name: string; description: string; priceCents: number; category: ServiceCategory; imageUrl: string | null }
interface BookingDto {
  id: string; serviceId: string; serviceName: string; providerId: string; providerName: string; clientId: string; clientName: string;
  priceCents: number; status: BookingStatus; scheduledAt: string; createdAt: string;
}
interface Page<T> { items: T[]; total: number; page: number; pageSize: number }

export const toCents = (kwanzas: number): number => Math.round(kwanzas * 100);
const toKwanzas = (cents: number): number => cents / 100;

const toUser = (u: UserDto): User => ({
  id: u.id, name: u.fullName, email: u.email, nif: u.nif ?? undefined, role: u.role, balance: toKwanzas(u.balanceCents),
});
const toService = (s: ServiceDto): Service => ({
  id: s.id, title: s.name, description: s.description, price: toKwanzas(s.priceCents), providerId: s.providerId, category: s.category, imageUrl: s.imageUrl ?? undefined,
});
const toBooking = (b: BookingDto): Booking => ({
  id: b.id, serviceId: b.serviceId, serviceTitle: b.serviceName, providerId: b.providerId, providerName: b.providerName, clientId: b.clientId, clientName: b.clientName,
  amount: toKwanzas(b.priceCents), status: b.status, scheduledAt: b.scheduledAt, createdAt: b.createdAt,
});

const PAGE_SIZE = 100;

/** A API pagina as listas; junta todas as páginas. */
async function allPages<T>(url: string, params: Record<string, unknown> = {}): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const { data } = await http.get<Page<T>>(url, { params: { ...params, page, pageSize: PAGE_SIZE } });
    items.push(...data.items);
    if (items.length >= data.total || data.items.length === 0) return items;
  }
}

export const authApi = {
  /** O identificador é um e-mail ou um NIF (só os prestadores têm NIF). */
  login: async ({ identifier, password }: LoginForm): Promise<Session> => {
    const credentials = identifier.includes('@') ? { email: identifier, password } : { nif: identifier, password };
    const { data } = await http.post<{ user: UserDto; accessToken: string; refreshToken: string }>('/auth/login', credentials);
    return { accessToken: data.accessToken, refreshToken: data.refreshToken, user: toUser(data.user) };
  },
  /** Regista e entra logo. */
  register: async ({ name, email, nif, password, role }: RegisterForm): Promise<Session> => {
    await http.post('/auth/register', { fullName: name, email, password, role, ...(role === 'PROVIDER' && { nif }) });
    return authApi.login({ identifier: email, password });
  },
  me: () => http.get<UserDto>('/auth/me').then((r) => toUser(r.data)),
  logout: (refreshToken: string) => http.post('/auth/logout', { refreshToken }).then(() => undefined),
  /** Carrega saldo com um pagamento simulado (a API aprova e credita). */
  deposit: async (kwanzas: number): Promise<void> => {
    await http.post('/payments', { amountCents: toCents(kwanzas), method: 'CARD' }, { headers: { 'Idempotency-Key': `${Date.now()}-${Math.random().toString(36).slice(2)}` } });
  },
};

/** Termina a sessão: revoga o refresh token no servidor (se der) e limpa o telemóvel. */
export const signOut = async (): Promise<void> => {
  const tokens = useAuth.getState().tokens;
  if (tokens) await authApi.logout(tokens.refreshToken).catch(() => undefined);
  await useAuth.getState().logout();
};

/** `imageUrl`: um endereço põe/muda a imagem, `null` tira-a e ausente deixa-a como está. */
export interface ServicePayload { title: string; description: string; price: number; category: ServiceCategory; imageUrl?: string | null }

const toBody = ({ title, description, price, category, imageUrl }: ServicePayload) => ({
  name: title, description, priceCents: toCents(price), category, ...(imageUrl !== undefined && { imageUrl }),
});

export const servicesApi = {
  all: () => allPages<ServiceDto>('/services').then((l) => l.map(toService)),
  byProvider: (providerId: string) => allPages<ServiceDto>('/services', { providerId }).then((l) => l.map(toService)),
  create: (d: ServicePayload) => http.post<ServiceDto>('/services', toBody(d)).then((r) => toService(r.data)),
  update: (id: string, d: ServicePayload) => http.patch<ServiceDto>(`/services/${id}`, toBody(d)).then((r) => toService(r.data)),
  remove: (id: string) => http.delete(`/services/${id}`).then(() => undefined),
  /** A autorização, assinada pelo backend, para enviar uma imagem diretamente ao Cloudinary. */
  imageAuthorization: () => http.post<UploadAuthorization>('/services/image-signature').then((r) => r.data),
};

export const bookingsApi = {
  /** `Idempotency-Key`: repetir o pedido (por exemplo, com rede instável) não cobra duas vezes. */
  place: (serviceId: string, scheduledAt: Date, idempotencyKey: string) =>
    http.post<BookingDto>('/bookings', { serviceId, scheduledAt: scheduledAt.toISOString() }, { headers: { 'Idempotency-Key': idempotencyKey } }).then((r) => toBooking(r.data)),
  list: () => allPages<BookingDto>('/bookings').then((l) => l.map(toBooking)),
  cancel: (id: string) => http.post<BookingDto>(`/bookings/${id}/cancel`).then((r) => toBooking(r.data)),
  complete: (id: string) => http.post<BookingDto>(`/bookings/${id}/complete`).then((r) => toBooking(r.data)),
};
