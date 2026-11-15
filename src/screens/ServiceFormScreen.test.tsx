import React from 'react';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { servicesApi } from '../api';
import { erroHttp, props, renderComQuery } from '../testing';
import ServiceFormScreen from './ServiceFormScreen';
import * as ImagePicker from 'expo-image-picker';
import { prepareImage } from '../imageUpload';
import { uploadImage } from '../cloudinaryUpload';
import type { Service } from '../types';

jest.mock('../store/storage', () => ({ storage: { get: jest.fn(async () => null), set: jest.fn(async () => undefined), del: jest.fn(async () => undefined) } }));
jest.mock('../api', () => ({ servicesApi: { create: jest.fn(), update: jest.fn(), imageAuthorization: jest.fn() } }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('../imageUpload', () => ({ ...jest.requireActual('../imageUpload'), prepareImage: jest.fn() }));
jest.mock('../cloudinaryUpload', () => ({ ...jest.requireActual('../cloudinaryUpload'), uploadImage: jest.fn() }));

const create = servicesApi.create as jest.Mock;
const update = servicesApi.update as jest.Mock;
const existente: Service = { id: 's1', title: 'Canalização', description: 'Reparação de fugas', price: 150.5, providerId: 'p1', category: 'HOME' };

const escrever = async (placeholder: string, texto: string) => userEvent.setup().type(screen.getByPlaceholderText(placeholder), texto);
const preencher = async (titulo: string, descricao: string, preco: string) => {
  if (titulo) await escrever('Ex.: Canalização', titulo);
  if (descricao) await escrever('Descreva o serviço', descricao);
  if (preco) await escrever('0,00', preco);
};
const guardar = (nome: string) => userEvent.setup().press(screen.getByRole('button', { name: nome }));

beforeEach(() => jest.clearAllMocks());

describe('criar um serviço', () => {
  it('pede nome, descrição e preço', async () => {
    await renderComQuery(<ServiceFormScreen {...props()} />);
    expect(screen.getByText('Novo serviço')).toBeOnTheScreen();
    expect(screen.getByText('Título')).toBeOnTheScreen();
    expect(screen.getByText('Descrição')).toBeOnTheScreen();
    expect(screen.getByText('Preço (Kz)')).toBeOnTheScreen();
  });

  it('não cria com o formulário vazio e mostra o que falta', async () => {
    await renderComQuery(<ServiceFormScreen {...props()} />);
    await guardar('Criar serviço');
    expect(await screen.findByText('Mínimo 3 caracteres')).toBeOnTheScreen();
    expect(screen.getByText('Introduza uma descrição')).toBeOnTheScreen();
    expect(screen.getByText('Preço entre 0,01 e 10 000 000 Kz')).toBeOnTheScreen();
    expect(create).not.toHaveBeenCalled();
  });

  it.each(['0', '0,00', '-10', 'abc', '10000001'])('recusa o preço "%s": tem de ser maior que zero', async (preco) => {
    await renderComQuery(<ServiceFormScreen {...props()} />);
    await preencher('Canalização', 'Reparação de fugas', preco);
    await guardar('Criar serviço');
    expect(await screen.findByText('Preço entre 0,01 e 10 000 000 Kz')).toBeOnTheScreen();
    expect(create).not.toHaveBeenCalled();
  });

  it('recusa um título com mais de 120 caracteres', async () => {
    await renderComQuery(<ServiceFormScreen {...props()} />);
    await preencher('a'.repeat(121), 'Descrição', '10');
    await guardar('Criar serviço');
    expect(await screen.findByText('Máximo 120 caracteres')).toBeOnTheScreen();
    expect(create).not.toHaveBeenCalled();
  });

  it('cria o serviço com o preço em número (a vírgula conta como ponto) e volta atrás', async () => {
    create.mockResolvedValue(existente);
    const p = props();
    await renderComQuery(<ServiceFormScreen {...p} />);
    await preencher('  Canalização ', 'Reparação de fugas', '150,50');
    await guardar('Criar serviço');
    await waitFor(() => expect(create).toHaveBeenCalledWith({ title: 'Canalização', description: 'Reparação de fugas', price: 150.5, category: 'OTHER' }));
    await waitFor(() => expect((p.navigation as unknown as { goBack: jest.Mock }).goBack).toHaveBeenCalled());
  });

  it('mostra o erro do servidor e não volta atrás', async () => {
    create.mockRejectedValue(erroHttp(403, 'Só os prestadores podem criar serviços'));
    const p = props();
    await renderComQuery(<ServiceFormScreen {...p} />);
    await preencher('Canalização', 'Reparação de fugas', '100');
    await guardar('Criar serviço');
    expect(await screen.findByText('Só os prestadores podem criar serviços')).toBeOnTheScreen();
    expect((p.navigation as unknown as { goBack: jest.Mock }).goBack).not.toHaveBeenCalled();
  });
});

describe('categoria do serviço', () => {
  const nomes = ['Casa', 'Beleza', 'Tecnologia', 'Educação', 'Saúde', 'Eventos', 'Automóvel', 'Outros'];

  it('oferece as 8 categorias, em português', async () => {
    await renderComQuery(<ServiceFormScreen {...props()} />);
    for (const nome of nomes) expect(screen.getByRole('button', { name: nome })).toBeOnTheScreen();
  });

  it('um serviço novo começa em "Outros"', async () => {
    await renderComQuery(<ServiceFormScreen {...props()} />);
    expect(screen.getByRole('button', { name: 'Outros' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Beleza' })).not.toBeSelected();
  });

  it('escolher uma categoria desmarca a anterior e envia o código da API', async () => {
    create.mockResolvedValue(existente);
    await renderComQuery(<ServiceFormScreen {...props()} />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Beleza' }));
    expect(screen.getByRole('button', { name: 'Beleza' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Outros' })).not.toBeSelected();
    await preencher('Corte', 'Corte masculino', '50');
    await guardar('Criar serviço');
    await waitFor(() => expect(create).toHaveBeenCalledWith({ title: 'Corte', description: 'Corte masculino', price: 50, category: 'BEAUTY' }));
  });
});

describe('editar um serviço', () => {
  it('abre com os dados do serviço', async () => {
    await renderComQuery(<ServiceFormScreen {...props({ service: existente })} />);
    expect(screen.getByText('Editar serviço')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('Canalização')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('Reparação de fugas')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('150.5')).toBeOnTheScreen();
  });

  it('abre com a categoria do serviço escolhida, e muda-a', async () => {
    update.mockResolvedValue(existente);
    await renderComQuery(<ServiceFormScreen {...props({ service: { ...existente, category: 'HEALTH' } })} />);
    expect(screen.getByRole('button', { name: 'Saúde' })).toBeSelected();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Eventos' }));
    await guardar('Guardar alterações');
    await waitFor(() => expect(update).toHaveBeenCalledWith('s1', expect.objectContaining({ category: 'EVENTS' })));
  });

  it('guarda as alterações no mesmo serviço, sem criar outro', async () => {
    update.mockResolvedValue(existente);
    await renderComQuery(<ServiceFormScreen {...props({ service: existente })} />);
    const user = userEvent.setup();
    await user.clear(screen.getByDisplayValue('150.5'));
    await user.type(screen.getByPlaceholderText('0,00'), '200');
    await guardar('Guardar alterações');
    await waitFor(() => expect(update).toHaveBeenCalledWith('s1', { title: 'Canalização', description: 'Reparação de fugas', price: 200, category: 'HOME' }));
    expect(create).not.toHaveBeenCalled();
  });
});

describe('imagem do serviço', () => {
  const IMG = 'https://res.cloudinary.com/conta/image/upload/v1/bulir/services/x.jpg';
  const auth = { uploadUrl: 'u', apiKey: 'k', timestamp: 1, folder: 'f', allowedFormats: 'jpg', signature: 's' };
  const escolher = async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///foto.jpg', width: 4000, height: 3000 }] });
    (prepareImage as jest.Mock).mockResolvedValue({ uri: 'file:///pequena.jpg', width: 1280, height: 960, bytes: 300000, quality: 0.8 });
    await userEvent.setup().press(screen.getByRole('button', { name: 'Escolher imagem' }));
    await screen.findByText('Pronta a enviar (300 KB)');
  };

  it('comprime a foto escolhida, envia-a ao guardar e grava o endereço devolvido', async () => {
    (uploadImage as jest.Mock).mockResolvedValue(IMG);
    (servicesApi.imageAuthorization as jest.Mock).mockResolvedValue(auth);
    create.mockResolvedValue({ ...existente });
    await renderComQuery(<ServiceFormScreen {...props()} />);
    await preencher('Pintura', 'Pintar paredes', '100');
    await escolher();
    expect(prepareImage).toHaveBeenCalledWith({ uri: 'file:///foto.jpg', width: 4000, height: 3000 });
    expect(uploadImage).not.toHaveBeenCalled(); // só ao guardar
    await guardar('Criar serviço');
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ imageUrl: IMG })));
    expect(uploadImage).toHaveBeenCalledWith(expect.objectContaining({ uri: 'file:///pequena.jpg', type: 'image/jpeg' }), auth, expect.anything());
  });

  it('se o envio da imagem falha, o serviço não é criado e o erro aparece', async () => {
    (servicesApi.imageAuthorization as jest.Mock).mockResolvedValue(auth);
    (uploadImage as jest.Mock).mockRejectedValue(new (jest.requireActual('../cloudinaryUpload').UploadError)('Sem ligação ao enviar a imagem.', true));
    await renderComQuery(<ServiceFormScreen {...props()} />);
    await preencher('Pintura', 'Pintar paredes', '100');
    await escolher();
    await guardar('Criar serviço');
    expect(await screen.findByText('Sem ligação ao enviar a imagem.')).toBeOnTheScreen();
    expect(create).not.toHaveBeenCalled();
  });

  it('cancelar a escolha não muda nada', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: null });
    await renderComQuery(<ServiceFormScreen {...props()} />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Escolher imagem' }));
    expect(prepareImage).not.toHaveBeenCalled();
    expect(screen.queryByText(/Pronta a enviar/)).toBeNull();
  });

  it('uma imagem que não se consegue comprimir mostra o motivo', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///x.jpg', width: 9, height: 9 }] });
    (prepareImage as jest.Mock).mockRejectedValue(new Error('A imagem é demasiado grande, mesmo depois de comprimida. Escolha outra.'));
    await renderComQuery(<ServiceFormScreen {...props()} />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Escolher imagem' }));
    expect(await screen.findByText(/demasiado grande/)).toBeOnTheScreen();
  });

  it('ao editar, "Tirar imagem" envia imageUrl: null', async () => {
    update.mockResolvedValue({ ...existente });
    await renderComQuery(<ServiceFormScreen {...props({ service: { ...existente, imageUrl: IMG } })} />);
    await userEvent.setup().press(screen.getByRole('button', { name: /Tirar imagem/ }));
    await guardar('Guardar alterações');
    await waitFor(() => expect(update).toHaveBeenCalledWith('s1', expect.objectContaining({ imageUrl: null })));
  });

  it('ao editar sem mexer na imagem, não envia imageUrl (fica como está)', async () => {
    update.mockResolvedValue({ ...existente });
    await renderComQuery(<ServiceFormScreen {...props({ service: { ...existente, imageUrl: IMG } })} />);
    await guardar('Guardar alterações');
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0]![1]).not.toHaveProperty('imageUrl');
  });
});
