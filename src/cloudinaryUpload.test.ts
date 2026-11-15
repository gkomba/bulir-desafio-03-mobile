import { messageFor, UploadCancelled, UploadError, uploadImage, type Sender, type UploadAuthorization } from './cloudinaryUpload';

const auth: UploadAuthorization = {
  uploadUrl: 'https://api.cloudinary.com/v1_1/conta/image/upload', apiKey: '123', timestamp: 1700000000,
  folder: 'bulir/services', allowedFormats: 'jpg,jpeg,png,webp', signature: 'abc',
};
const file = { uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg' };
const SECURE = 'https://res.cloudinary.com/conta/image/upload/v1/bulir/services/x.jpg';
const ok: Sender = jest.fn(async () => ({ status: 200, body: { secure_url: SECURE } }));

describe('uploadImage', () => {
  it('envia à conta certa com os campos assinados, e devolve o endereço seguro', async () => {
    const send = jest.fn(ok);
    await expect(uploadImage(file, auth, { send })).resolves.toBe(SECURE);
    expect(send.mock.calls[0]![0]).toMatchObject({
      url: auth.uploadUrl, file,
      fields: { api_key: '123', timestamp: '1700000000', folder: 'bulir/services', allowed_formats: 'jpg,jpeg,png,webp', signature: 'abc' },
    });
  });

  it('indica o progresso, de 0 a 1', async () => {
    const onProgress = jest.fn();
    await uploadImage(file, auth, { send: ok, onProgress });
    expect(onProgress).toHaveBeenNthCalledWith(1, 0);
    expect(onProgress).toHaveBeenLastCalledWith(1);
  });

  it('repete uma vez se o serviço estiver ocupado, e depois consegue', async () => {
    const send = jest.fn<ReturnType<Sender>, Parameters<Sender>>()
      .mockResolvedValueOnce({ status: 503, body: null }).mockResolvedValueOnce({ status: 200, body: { secure_url: SECURE } });
    await expect(uploadImage(file, auth, { send })).resolves.toBe(SECURE);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('repete uma vez se faltar a rede, e desiste se voltar a falhar', async () => {
    const send = jest.fn(async () => { throw new UploadError('Sem ligação', true); });
    await expect(uploadImage(file, auth, { send })).rejects.toThrow('Sem ligação');
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('nunca repete uma recusa (daria sempre o mesmo)', async () => {
    const send = jest.fn(async () => ({ status: 400, body: { error: { message: 'Image file format gif not allowed' } } }));
    await expect(uploadImage(file, auth, { send })).rejects.toThrow('formato');
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('não aceita uma resposta sem endereço https', async () => {
    const send = jest.fn(async () => ({ status: 200, body: { secure_url: 'http://x/a.jpg' } }));
    await expect(uploadImage(file, auth, { send, retries: 0 })).rejects.toBeInstanceOf(UploadError);
  });

  it('não envia se já foi cancelado', async () => {
    const send = jest.fn(ok);
    const c = new AbortController(); c.abort();
    await expect(uploadImage(file, auth, { send, signal: c.signal })).rejects.toBeInstanceOf(UploadCancelled);
    expect(send).not.toHaveBeenCalled();
  });
});

describe('messageFor', () => {
  it.each([
    [400, 'Image file format gif not allowed', /formato/, false],
    [400, 'File size too large', /grande/, false],
    [401, 'Invalid Signature', /expirou/, false],
    [429, '', /ocupado/, true],
    [500, '', /ocupado/, true],
    [418, '', /Não foi possível/, false],
  ])('%p "%s"', (status, text, re, retryable) => {
    const e = messageFor(status, { error: { message: text } });
    expect(e.message).toMatch(re);
    expect(e.retryable).toBe(retryable);
  });
});
