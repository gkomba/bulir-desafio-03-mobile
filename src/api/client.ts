import { AxiosError, create, isAxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '../config';
import { useAuth } from '../store/auth';
import type { Tokens } from '../types';

/** Diz à API que o cliente é a app móvel: os tokens vêm no corpo, em vez de cookies. */
const MOBILE = { 'X-Client-Type': 'mobile' };

export const http = create({ baseURL: API_URL, timeout: 10000, headers: MOBILE });

http.interceptors.request.use((cfg) => {
  const tokens = useAuth.getState().tokens;
  if (tokens) cfg.headers.Authorization = `Bearer ${tokens.accessToken}`;
  return cfg;
});

/** Uma só renovação de cada vez: o refresh token roda, e dois pedidos em paralelo revogariam a sessão. */
let renovacao: Promise<string> | null = null;

const renovar = (): Promise<string> => {
  renovacao ??= http
    .post<Tokens>('/auth/refresh', { refreshToken: useAuth.getState().tokens?.refreshToken })
    .then(({ data }) => {
      useAuth.getState().setTokens(data);
      return data.accessToken;
    })
    .finally(() => { renovacao = null; });
  return renovacao;
};

const ROTA_DE_SESSAO = /\/auth\/(login|register|refresh|logout)$/;

http.interceptors.response.use(
  (r) => r,
  async (e: AxiosError) => {
    const cfg = e.config as (InternalAxiosRequestConfig & { jaRepetido?: boolean }) | undefined;
    const sessaoAberta = useAuth.getState().tokens !== null;
    if (e.response?.status !== 401 || !cfg || cfg.jaRepetido || !sessaoAberta || ROTA_DE_SESSAO.test(cfg.url ?? '')) {
      return Promise.reject(e);
    }
    cfg.jaRepetido = true;
    try {
      cfg.headers.Authorization = `Bearer ${await renovar()}`;
      return await http(cfg);
    } catch {
      // Sem renovação possível (refresh expirado ou revogado): termina a sessão.
      await useAuth.getState().logout();
      return Promise.reject(e);
    }
  },
);

export const errorMessage = (e: unknown): string => {
  if (isAxiosError(e)) {
    if (!e.response) return 'Sem ligação ao servidor. Verifique a rede.';
    const message = (e.response.data as { message?: string | string[] } | undefined)?.message;
    if (Array.isArray(message)) return message[0] ?? 'Dados inválidos.';
    return message ?? 'Ocorreu um erro inesperado.';
  }
  return 'Ocorreu um erro inesperado.';
};
