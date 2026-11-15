import { authApi, bookingsApi, servicesApi, signOut, toCents } from './index';
import { servidorFalso } from './testing';
import { useAuth } from '../store/auth';

jest.mock('../store/storage', () => ({ storage: { get: jest.fn(async () => null), set: jest.fn(async () => undefined), del: jest.fn(async () => undefined) } }));

const userDto = { id: 'u1', fullName: 'Ana Silva', email: 'ana@exemplo.com', nif: null, role: 'CLIENT', balanceCents: 123456 };
const serviceDto = { id: 's1', providerId: 'p1', name: 'Canalização', description: 'Fugas', priceCents: 15050 };
const bookingDto = { id: 'b1', serviceId: 's1', serviceName: 'Canalização', providerId: 'p1', clientId: 'u1', priceCents: 15050, status: 'CONFIRMED', scheduledAt: '2026-12-01T10:00:00.000Z', createdAt: '2026-11-15T10:00:00.000Z' };

beforeEach(async () => {
  await useAuth.getState().logout();
});

describe('toCents: a API trabalha em cêntimos, a app em Kwanzas', () => {
  it.each([[0.01, 1], [1, 100], [150.5, 15050], [19.99, 1999], [0.1 + 0.2, 30], [10_000_000, 1_000_000_000]])('%p Kz são %p cêntimos', (kz, cents) => {
    expect(toCents(kz)).toBe(cents);
  });
});

describe('autenticação', () => {
  const sessao = { user: { ...userDto }, accessToken: 'acesso', refreshToken: 'refresh' };

  it('entra com o e-mail: envia { email, password }', async () => {
    const { chamadas } = servidorFalso(() => ({ data: sessao }));
    await authApi.login({ identifier: 'ana@exemplo.com', password: 'senha-forte-1' });
    expect(chamadas[0]).toMatchObject({ method: 'POST', url: '/auth/login', body: { email: 'ana@exemplo.com', password: 'senha-forte-1' } });
  });

  it('entra com o NIF: envia { nif, password }', async () => {
    const { chamadas } = servidorFalso(() => ({ data: sessao }));
    await authApi.login({ identifier: '092402003LA1', password: 'senha-forte-1' });
    expect(chamadas[0].body).toEqual({ nif: '092402003LA1', password: 'senha-forte-1' });
  });

  it('devolve a sessão com o utilizador e o saldo em Kwanzas', async () => {
    servidorFalso(() => ({ data: sessao }));
    const s = await authApi.login({ identifier: 'ana@exemplo.com', password: 'x' });
    expect(s).toEqual({ accessToken: 'acesso', refreshToken: 'refresh', user: { id: 'u1', name: 'Ana Silva', email: 'ana@exemplo.com', nif: undefined, role: 'CLIENT', balance: 1234.56 } });
  });

  it('um prestador regista-se com NIF e entra a seguir', async () => {
    const { chamadas } = servidorFalso(({ url }) => (url === '/auth/register' ? { status: 201, data: userDto } : { data: sessao }));
    await authApi.register({ name: 'Paulo', email: 'p@exemplo.com', nif: '092402003LA1', password: 'senha-forte-1', role: 'PROVIDER' });
    expect(chamadas.map((c) => c.url)).toEqual(['/auth/register', '/auth/login']);
    expect(chamadas[0].body).toEqual({ fullName: 'Paulo', email: 'p@exemplo.com', password: 'senha-forte-1', role: 'PROVIDER', nif: '092402003LA1' });
    expect(chamadas[1].body).toEqual({ email: 'p@exemplo.com', password: 'senha-forte-1' });
  });

  it('um cliente não envia NIF, mesmo que o formulário o traga', async () => {
    const { chamadas } = servidorFalso(({ url }) => (url === '/auth/register' ? { status: 201, data: userDto } : { data: sessao }));
    await authApi.register({ name: 'Ana', email: 'a@exemplo.com', nif: '123456789', password: 'senha-forte-1', role: 'CLIENT' });
    expect(chamadas[0].body).not.toHaveProperty('nif');
  });

  it('lê o utilizador e o saldo de GET /auth/me', async () => {
    const { chamadas } = servidorFalso(() => ({ data: userDto }));
    expect((await authApi.me()).balance).toBe(1234.56);
    expect(chamadas[0]).toMatchObject({ method: 'GET', url: '/auth/me' });
  });

  it('carrega saldo com um pagamento simulado em cêntimos e uma Idempotency-Key', async () => {
    const { chamadas } = servidorFalso(() => ({ status: 201, data: {} }));
    await authApi.deposit(500.25);
    expect(chamadas[0]).toMatchObject({ method: 'POST', url: '/payments', body: { amountCents: 50025, method: 'CARD' } });
    expect(chamadas[0].headers['idempotency-key']).toBeTruthy();
  });

  it('terminar a sessão revoga o refresh token e limpa o estado', async () => {
    await useAuth.getState().setSession({ accessToken: 'a', refreshToken: 'r', user: { id: 'u1', name: 'Ana', email: 'a@x.com', role: 'CLIENT', balance: 0 } });
    const { chamadas } = servidorFalso(() => ({ status: 204 }));
    await signOut();
    expect(chamadas[0]).toMatchObject({ url: '/auth/logout', body: { refreshToken: 'r' } });
    expect(useAuth.getState().tokens).toBeNull();
  });

  it('terminar a sessão limpa o estado mesmo que o servidor falhe', async () => {
    await useAuth.getState().setSession({ accessToken: 'a', refreshToken: 'r', user: { id: 'u1', name: 'Ana', email: 'a@x.com', role: 'CLIENT', balance: 0 } });
    servidorFalso(() => ({ rede: true }));
    await signOut();
    expect(useAuth.getState().tokens).toBeNull();
    expect(useAuth.getState().user).toBeNull();
  });
});

describe('serviços', () => {
  it('lista todos juntando as páginas da API', async () => {
    const { chamadas } = servidorFalso(({ params }) => {
      const page = params['page'] as number;
      const items = page === 1 ? Array.from({ length: 100 }, (_, i) => ({ ...serviceDto, id: `s${i}` })) : Array.from({ length: 30 }, (_, i) => ({ ...serviceDto, id: `t${i}` }));
      return { data: { items, total: 130, page, pageSize: 100 } };
    });
    const todos = await servicesApi.all();
    expect(todos).toHaveLength(130);
    expect(chamadas.map((c) => c.params['page'])).toEqual([1, 2]);
    expect(chamadas[0].params['pageSize']).toBe(100);
  });

  it('não fica em ciclo se a API devolver uma página vazia', async () => {
    const { chamadas } = servidorFalso(() => ({ data: { items: [], total: 5, page: 1, pageSize: 100 } }));
    expect(await servicesApi.all()).toEqual([]);
    expect(chamadas).toHaveLength(1);
  });

  it('os serviços do prestador filtram por providerId', async () => {
    const { chamadas } = servidorFalso(() => ({ data: { items: [serviceDto], total: 1, page: 1, pageSize: 100 } }));
    const lista = await servicesApi.byProvider('p1');
    expect(chamadas[0].params['providerId']).toBe('p1');
    expect(lista[0]).toEqual({ id: 's1', title: 'Canalização', description: 'Fugas', price: 150.5, providerId: 'p1' });
  });

  it('criar envia name, description e priceCents', async () => {
    const { chamadas } = servidorFalso(() => ({ status: 201, data: serviceDto }));
    const s = await servicesApi.create({ title: 'Canalização', description: 'Fugas', price: 150.5 });
    expect(chamadas[0]).toMatchObject({ method: 'POST', url: '/services', body: { name: 'Canalização', description: 'Fugas', priceCents: 15050 } });
    expect(s.price).toBe(150.5);
  });

  it('editar usa PATCH', async () => {
    const { chamadas } = servidorFalso(() => ({ data: serviceDto }));
    await servicesApi.update('s1', { title: 'Novo', description: 'D', price: 20 });
    expect(chamadas[0]).toMatchObject({ method: 'PATCH', url: '/services/s1', body: { name: 'Novo', priceCents: 2000 } });
  });

  it('excluir usa DELETE', async () => {
    const { chamadas } = servidorFalso(() => ({ status: 204 }));
    await servicesApi.remove('s1');
    expect(chamadas[0]).toMatchObject({ method: 'DELETE', url: '/services/s1' });
  });
});

describe('reservas', () => {
  it('contratar envia o serviço, a data em ISO e uma Idempotency-Key', async () => {
    const { chamadas } = servidorFalso(() => ({ status: 201, data: bookingDto }));
    const quando = new Date('2026-12-01T10:00:00.000Z');
    const b = await bookingsApi.place('s1', quando, 'chave-1');
    expect(chamadas[0]).toMatchObject({ method: 'POST', url: '/bookings', body: { serviceId: 's1', scheduledAt: '2026-12-01T10:00:00.000Z' } });
    expect(chamadas[0].headers['idempotency-key']).toBe('chave-1');
    expect(b).toMatchObject({ id: 'b1', amount: 150.5, status: 'CONFIRMED', serviceTitle: 'Canalização' });
  });

  it('o histórico junta as páginas e converte os valores', async () => {
    servidorFalso(() => ({ data: { items: [bookingDto], total: 1, page: 1, pageSize: 100 } }));
    expect(await bookingsApi.list()).toEqual([{ id: 'b1', serviceId: 's1', serviceTitle: 'Canalização', providerId: 'p1', clientId: 'u1', amount: 150.5, status: 'CONFIRMED', scheduledAt: '2026-12-01T10:00:00.000Z', createdAt: '2026-11-15T10:00:00.000Z' }]);
  });

  it('cancelar e concluir são POST nas rotas da reserva', async () => {
    const { chamadas } = servidorFalso(() => ({ data: { ...bookingDto, status: 'CANCELLED' } }));
    expect((await bookingsApi.cancel('b1')).status).toBe('CANCELLED');
    await bookingsApi.complete('b1');
    expect(chamadas.map((c) => `${c.method} ${c.url}`)).toEqual(['POST /bookings/b1/cancel', 'POST /bookings/b1/complete']);
  });
});
