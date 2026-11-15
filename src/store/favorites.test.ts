import { storage } from './storage';
import { useFavorites } from './favorites';

jest.mock('./storage', () => ({ storage: { get: jest.fn(), set: jest.fn(async () => undefined), del: jest.fn() } }));

const get = storage.get as jest.Mock;
const set = storage.set as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  useFavorites.setState({ uid: null, ids: [] });
});

describe('favoritos, guardados no telemóvel por utilizador', () => {
  it('marcar e desmarcar um serviço', () => {
    useFavorites.getState().toggle('s1');
    useFavorites.getState().toggle('s2');
    expect(useFavorites.getState().ids).toEqual(['s1', 's2']);
    useFavorites.getState().toggle('s1');
    expect(useFavorites.getState().ids).toEqual(['s2']);
  });

  it('carrega os favoritos do utilizador', async () => {
    get.mockResolvedValueOnce(JSON.stringify(['s1', 's3']));
    await useFavorites.getState().load('u1');
    expect(get).toHaveBeenCalledWith('bulir.fav.u1');
    expect(useFavorites.getState()).toMatchObject({ uid: 'u1', ids: ['s1', 's3'] });
  });

  it('guarda cada alteração na chave do utilizador', async () => {
    get.mockResolvedValueOnce(null);
    await useFavorites.getState().load('u1');
    useFavorites.getState().toggle('s1');
    expect(set).toHaveBeenCalledWith('bulir.fav.u1', JSON.stringify(['s1']));
  });

  it('um utilizador não vê os favoritos de outro', async () => {
    get.mockImplementation(async (k: string) => (k === 'bulir.fav.u1' ? JSON.stringify(['s1']) : null));
    await useFavorites.getState().load('u1');
    await useFavorites.getState().load('u2');
    expect(useFavorites.getState().ids).toEqual([]);
  });

  it('sem utilizador carregado, não escreve no armazenamento', () => {
    useFavorites.getState().toggle('s1');
    expect(set).not.toHaveBeenCalled();
  });

  it('dados guardados corrompidos não impedem de abrir: começa vazio', async () => {
    get.mockResolvedValueOnce('{não é json');
    await useFavorites.getState().load('u1');
    expect(useFavorites.getState()).toMatchObject({ uid: 'u1', ids: [] });
  });
});
