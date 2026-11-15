import { AxiosError } from 'axios';
import { errorMessage, http } from './client';
import { servidorFalso, type Chamada } from './testing';
import { useAuth } from '../store/auth';
import type { User } from '../types';

jest.mock('../store/storage', () => ({ storage: { get: jest.fn(async () => null), set: jest.fn(async () => undefined), del: jest.fn(async () => undefined) } }));

const user: User = { id: 'u1', name: 'Ana', email: 'ana@exemplo.com', role: 'CLIENT', balance: 0 };
const entrar = (accessToken = 'acesso-1', refreshToken = 'refresh-1') => useAuth.getState().setSession({ accessToken, refreshToken, user });
const bearer = (c: Chamada) => c.headers['authorization'];

beforeEach(async () => {
  await useAuth.getState().logout();
});

describe('cabeçalhos', () => {
  it('diz à API que é a app móvel, em todos os pedidos', async () => {
    const { chamadas } = servidorFalso(() => ({ data: {} }));
    await http.get('/services');
    expect(chamadas[0].headers['x-client-type']).toBe('mobile');
  });

  it('com sessão, envia o access token em Bearer', async () => {
    await entrar();
    const { chamadas } = servidorFalso(() => ({ data: {} }));
    await http.get('/auth/me');
    expect(bearer(chamadas[0])).toBe('Bearer acesso-1');
  });

  it('sem sessão, não envia Authorization', async () => {
    const { chamadas } = servidorFalso(() => ({ data: {} }));
    await http.get('/services');
    expect(bearer(chamadas[0])).toBeUndefined();
  });
});

describe('renovação da sessão num 401', () => {
  /** Responde 401 a um access token expirado e aceita o novo. */
  const servidor = (extra?: (c: Chamada) => ReturnType<Parameters<typeof servidorFalso>[0]> | undefined) =>
    servidorFalso((c) => {
      const especial = extra?.(c);
      if (especial) return especial;
      if (c.url === '/auth/refresh') return { data: { accessToken: 'acesso-2', refreshToken: 'refresh-2' } };
      return bearer(c) === 'Bearer acesso-2' ? { data: { ok: true } } : { status: 401, data: { message: 'Token inválido ou expirado' } };
    });

  it('renova com o refresh token e repete o pedido com o token novo', async () => {
    await entrar();
    const { chamadas } = servidor();
    const r = await http.get('/auth/me');
    expect(r.data).toEqual({ ok: true });
    expect(chamadas.map((c) => c.url)).toEqual(['/auth/me', '/auth/refresh', '/auth/me']);
    expect(chamadas[1].body).toEqual({ refreshToken: 'refresh-1' });
    expect(bearer(chamadas[2])).toBe('Bearer acesso-2');
  });

  it('guarda o par de tokens novo (o refresh token roda)', async () => {
    await entrar();
    servidor();
    await http.get('/auth/me');
    expect(useAuth.getState().tokens).toEqual({ accessToken: 'acesso-2', refreshToken: 'refresh-2' });
  });

  it('vários pedidos em paralelo fazem uma só renovação', async () => {
    await entrar();
    const { chamadas } = servidor();
    const r = await Promise.all([http.get('/auth/me'), http.get('/services'), http.get('/bookings')]);
    expect(r.every((x) => x.status === 200)).toBe(true);
    expect(chamadas.filter((c) => c.url === '/auth/refresh')).toHaveLength(1);
  });

  it('um erro do pedido repetido não termina a sessão', async () => {
    await entrar();
    servidor((c) => (c.url === '/bookings/x/cancel' && bearer(c) === 'Bearer acesso-2' ? { status: 404, data: { message: 'Reserva não encontrada' } } : undefined));
    await expect(http.post('/bookings/x/cancel')).rejects.toMatchObject({ response: { status: 404 } });
    expect(useAuth.getState().tokens).not.toBeNull();
  });

  it.each([401, 403])('termina a sessão se o servidor recusar o refresh token (%s)', async (estado) => {
    await entrar();
    servidorFalso((c) => (c.url === '/auth/refresh' ? { status: estado, data: { message: 'Sessão inválida' } } : { status: 401 }));
    await expect(http.get('/auth/me')).rejects.toBeInstanceOf(AxiosError);
    expect(useAuth.getState().tokens).toBeNull();
    expect(useAuth.getState().user).toBeNull();
  });

  it.each([['uma falha de rede', { rede: true } as const], ['um erro 500', { status: 500 }]])('não termina a sessão por %s na renovação', async (_nome, falha) => {
    await entrar();
    servidorFalso((c) => (c.url === '/auth/refresh' ? falha : { status: 401 }));
    await expect(http.get('/auth/me')).rejects.toBeInstanceOf(AxiosError);
    expect(useAuth.getState().tokens).not.toBeNull();
  });

  it('não tenta renovar mais de uma vez o mesmo pedido', async () => {
    await entrar();
    const { chamadas } = servidorFalso((c) => (c.url === '/auth/refresh' ? { data: { accessToken: 'acesso-2', refreshToken: 'refresh-2' } } : { status: 401 }));
    await expect(http.get('/auth/me')).rejects.toBeInstanceOf(AxiosError);
    expect(chamadas.filter((c) => c.url === '/auth/refresh')).toHaveLength(1);
    expect(chamadas.filter((c) => c.url === '/auth/me')).toHaveLength(2);
  });

  it.each(['/auth/login', '/auth/register', '/auth/logout'])('um 401 em %s não dispara a renovação', async (url) => {
    await entrar();
    const { chamadas } = servidorFalso(() => ({ status: 401, data: { message: 'Credenciais inválidas' } }));
    await expect(http.post(url)).rejects.toMatchObject({ response: { status: 401 } });
    expect(chamadas).toHaveLength(1);
    expect(useAuth.getState().tokens).not.toBeNull();
  });

  it('sem sessão, um 401 não tenta renovar', async () => {
    const { chamadas } = servidorFalso(() => ({ status: 401 }));
    await expect(http.get('/auth/me')).rejects.toBeInstanceOf(AxiosError);
    expect(chamadas).toHaveLength(1);
  });

  it('um 403 (permissão) e um 400 não renovam nem terminam a sessão', async () => {
    await entrar();
    for (const status of [400, 403, 409]) {
      const { chamadas } = servidorFalso(() => ({ status }));
      await expect(http.get('/bookings')).rejects.toMatchObject({ response: { status } });
      expect(chamadas).toHaveLength(1);
    }
    expect(useAuth.getState().tokens).not.toBeNull();
  });
});

describe('errorMessage', () => {
  const erro = (data: unknown, status = 400) => new AxiosError('x', undefined, undefined, {}, { data, status, statusText: '', headers: {}, config: {} as never });

  it('mostra a mensagem da API', () => expect(errorMessage(erro({ message: 'Saldo insuficiente' }, 409))).toBe('Saldo insuficiente'));
  it('mostra a primeira mensagem de uma lista de validação', () => expect(errorMessage(erro({ message: ['name must be longer', 'x'] }))).toBe('name must be longer'));
  it('sem corpo, dá uma mensagem genérica', () => expect(errorMessage(erro(undefined, 500))).toBe('Ocorreu um erro inesperado.'));
  it('sem resposta, é um problema de rede', () => expect(errorMessage(new AxiosError('Network Error'))).toBe('Sem ligação ao servidor. Verifique a rede.'));
  it('um erro que não é do Axios é genérico', () => expect(errorMessage(new Error('boom'))).toBe('Ocorreu um erro inesperado.'));
});
