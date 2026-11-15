/** Como a app obtém a autorização (assinada pelo backend) para enviar uma imagem. */
export interface UploadAuthorization {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  allowedFormats: string;
  signature: string;
}

export interface UploadFile { uri: string; name: string; type: string }

export interface SendRequest {
  url: string;
  fields: Record<string, string>;
  file: UploadFile;
  onProgress: (fraction: number) => void;
  signal?: AbortSignal;
  timeoutMs: number;
}

/** O envio em si. Separado para se poder trocar nos testes. */
export type Sender = (request: SendRequest) => Promise<{ status: number; body: unknown }>;

export class UploadError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
    this.name = 'UploadError';
  }
}

export class UploadCancelled extends Error {
  constructor() {
    super('Envio cancelado');
    this.name = 'UploadCancelled';
  }
}

/** XMLHttpRequest, porque é o que dá o progresso do envio (o `fetch` não o dá no React Native). */
export const xhrSender: Sender = ({ url, fields, file, onProgress, signal, timeoutMs }) =>
  new Promise((resolve, reject) => {
    const form = new FormData();
    for (const [name, value] of Object.entries(fields)) form.append(name, value);
    form.append('file', file as unknown as Blob);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.timeout = timeoutMs;
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && e.total > 0) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      let body: unknown = null;
      try { body = JSON.parse(xhr.responseText); } catch { /* resposta sem JSON */ }
      resolve({ status: xhr.status, body });
    };
    xhr.onerror = () => reject(new UploadError('Sem ligação ao enviar a imagem. Verifique a rede.', true));
    xhr.ontimeout = () => reject(new UploadError('O envio da imagem demorou demasiado.', true));
    xhr.onabort = () => reject(new UploadCancelled());
    signal?.addEventListener('abort', () => xhr.abort());
    xhr.send(form);
  });

/** Traduz a recusa do Cloudinary para uma mensagem que o utilizador percebe. */
export function messageFor(status: number, body: unknown): UploadError {
  const text = String((body as { error?: { message?: unknown } } | null)?.error?.message ?? '');
  if (/format .* not allowed/i.test(text)) return new UploadError('Esse formato de imagem não é aceite. Use JPG, PNG ou WebP.', false);
  if (/file size too large|too large/i.test(text)) return new UploadError('A imagem é demasiado grande.', false);
  if (status === 401 || /signature|timestamp/i.test(text)) return new UploadError('O envio expirou. Tente outra vez.', false);
  if (status >= 500 || status === 429) return new UploadError('O serviço de imagens está ocupado. Tente outra vez.', true);
  return new UploadError('Não foi possível enviar a imagem.', false);
}

export interface UploadOptions {
  send?: Sender;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Quantas vezes repete, ao falhar por rede ou por o serviço estar ocupado. */
  retries?: number;
}

/**
 * Envia a imagem diretamente ao Cloudinary, com a autorização assinada pelo backend, e devolve o
 * endereço seguro da imagem. Repete uma vez se a falha for de rede (a assinatura vale muito mais
 * do que isso) e nunca repete uma recusa, que daria sempre o mesmo resultado.
 */
export async function uploadImage(file: UploadFile, auth: UploadAuthorization, options: UploadOptions = {}): Promise<string> {
  const { send = xhrSender, onProgress = () => {}, signal, timeoutMs = 60_000, retries = 1 } = options;
  const fields = {
    api_key: auth.apiKey,
    timestamp: String(auth.timestamp),
    folder: auth.folder,
    allowed_formats: auth.allowedFormats,
    signature: auth.signature,
  };
  let last: UploadError | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal?.aborted) throw new UploadCancelled();
    onProgress(0);
    try {
      const { status, body } = await send({ url: auth.uploadUrl, fields, file, onProgress, signal, timeoutMs });
      const secureUrl = (body as { secure_url?: unknown } | null)?.secure_url;
      if (status >= 200 && status < 300 && typeof secureUrl === 'string' && secureUrl.startsWith('https://')) {
        onProgress(1);
        return secureUrl;
      }
      const failure = messageFor(status, body);
      if (!failure.retryable) throw failure;
      last = failure;
    } catch (e) {
      if (!(e instanceof UploadError) || !e.retryable) throw e;
      last = e;
    }
  }
  throw last ?? new UploadError('Não foi possível enviar a imagem.', false);
}
