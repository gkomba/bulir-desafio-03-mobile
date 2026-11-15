import { AxiosError, type AxiosResponse } from 'axios';
import { http } from './client';

/** Um pedido que a app fez, como o servidor o recebeu. */
export interface Chamada {
  method: string;
  url: string;
  params: Record<string, unknown>;
  body: unknown;
  headers: Record<string, string>;
}

/** O que o servidor falso responde: um estado HTTP e um corpo, ou uma falha de rede. */
export type Resposta = { status?: number; data?: unknown } | { rede: true };

/**
 * Servidor falso para os testes: troca o adaptador do cliente HTTP, por isso passa por
 * todos os interceptors reais (Bearer, renovação da sessão), mas sem rede.
 */
export function servidorFalso(responder: (chamada: Chamada) => Resposta | Promise<Resposta>): { chamadas: Chamada[] } {
  const chamadas: Chamada[] = [];
  http.defaults.adapter = async (config) => {
    const cabecalhos = (config.headers as unknown as { toJSON: () => Record<string, string> }).toJSON();
    const chamada: Chamada = {
      method: (config.method ?? 'get').toUpperCase(),
      url: config.url ?? '',
      params: (config.params as Record<string, unknown>) ?? {},
      body: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
      headers: Object.fromEntries(Object.entries(cabecalhos).map(([k, v]) => [k.toLowerCase(), String(v)])),
    };
    chamadas.push(chamada);
    const resposta = await responder(chamada);
    if ('rede' in resposta) throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config);
    const { status = 200, data } = resposta;
    const response = { data, status, statusText: '', headers: {}, config, request: {} } as AxiosResponse;
    if (status >= 200 && status < 300) return response;
    throw new AxiosError(`HTTP ${status}`, AxiosError.ERR_BAD_RESPONSE, config, {}, response);
  };
  return { chamadas };
}
