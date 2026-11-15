import { storage } from './storage';
import { useAuth } from './auth';
import type { User } from '../types';

jest.mock('./storage', () => ({ storage: { get: jest.fn(), set: jest.fn(async () => undefined), del: jest.fn(async () => undefined) } }));

const get = storage.get as jest.Mock;
const set = storage.set as jest.Mock;
const del = storage.del as jest.Mock;
const user: User = { id: 'u1', name: 'Ana', email: 'ana@exemplo.com', role: 'CLIENT', balance: 10 };
const tokens = { accessToken: 'a', refreshToken: 'r' };

beforeEach(async () => {
  jest.clearAllMocks();
  useAuth.setState({ tokens: null, user: null, hydrated: false });
});

describe('sessão (estado global e armazenamento seguro)', () => {
  it('guardar a sessão põe os tokens e o utilizador no estado e no armazenamento', async () => {
    await useAuth.getState().setSession({ ...tokens, user });
    expect(useAuth.getState()).toMatchObject({ tokens, user });
    expect(JSON.parse(set.mock.calls[0][1])).toEqual({ tokens, user });
  });

  it('o armazenamento nunca recebe o utilizador sem tokens', () => {
    useAuth.getState().setUser(user);
    expect(useAuth.getState().user).toEqual(user);
    expect(set).not.toHaveBeenCalled();
  });

  it('renovar os tokens atualiza o armazenamento', async () => {
    await useAuth.getState().setSession({ ...tokens, user });
    set.mockClear();
    useAuth.getState().setTokens({ accessToken: 'a2', refreshToken: 'r2' });
    expect(JSON.parse(set.mock.calls[0][1])).toEqual({ tokens: { accessToken: 'a2', refreshToken: 'r2' }, user });
  });

  it('atualizar o utilizador (saldo) mantém os tokens', async () => {
    await useAuth.getState().setSession({ ...tokens, user });
    useAuth.getState().setUser({ ...user, balance: 99 });
    expect(useAuth.getState().tokens).toEqual(tokens);
    expect(useAuth.getState().user?.balance).toBe(99);
  });

  it('terminar a sessão limpa o estado e o armazenamento', async () => {
    await useAuth.getState().setSession({ ...tokens, user });
    await useAuth.getState().logout();
    expect(useAuth.getState()).toMatchObject({ tokens: null, user: null });
    expect(del).toHaveBeenCalled();
  });

  it('ao abrir a app, recupera a sessão guardada', async () => {
    get.mockResolvedValueOnce(JSON.stringify({ tokens, user }));
    await useAuth.getState().hydrate();
    expect(useAuth.getState()).toMatchObject({ tokens, user, hydrated: true });
  });

  it('sem sessão guardada, fica sem sessão', async () => {
    get.mockResolvedValueOnce(null);
    await useAuth.getState().hydrate();
    expect(useAuth.getState()).toMatchObject({ tokens: null, user: null, hydrated: true });
  });

  it('um armazenamento corrompido é apagado e não impede a app de abrir', async () => {
    get.mockResolvedValueOnce('{isto não é json');
    await useAuth.getState().hydrate();
    expect(useAuth.getState()).toMatchObject({ tokens: null, user: null, hydrated: true });
    expect(del).toHaveBeenCalled();
  });
});
