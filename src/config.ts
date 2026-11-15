import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 3000;

/** Um IPv4 que serve para chegar a outra máquina: quatro números até 255, sem ser o próprio dispositivo. */
function usableIpv4(host: string): boolean {
  const parts = host.split('.');
  if (parts.length !== 4 || !parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)) return false;
  return parts[0] !== '127' && host !== '0.0.0.0';
}

/** O anfitrião de um `hostUri` do Expo (`192.168.8.6:8081`, com ou sem esquema). */
const hostOf = (hostUri: string | undefined): string | undefined => hostUri?.replace(/^[a-z]+:\/\//i, '').split(/[:/]/)[0];

/**
 * Onde está a API, por esta ordem:
 * 1. `EXPO_PUBLIC_API_URL`, se estiver definida (por exemplo, uma API hospedada);
 * 2. na web, `localhost`;
 * 3. no telemóvel ou no emulador, o IP do computador que serve a app (o Expo sabe-o,
 *    é por ele que a app é carregada), com a porta da API. Num telemóvel real, `localhost`
 *    e `10.0.2.2` não chegam ao computador;
 * 4. sem esse IP (modo túnel do Expo, ou uma app instalada fora do Expo Go): `10.0.2.2` no
 *    emulador Android, que é o computador visto do emulador, e `localhost` no simulador iOS.
 *    Num telemóvel real, nesse caso, `EXPO_PUBLIC_API_URL` é obrigatória.
 */
export function resolveApiBase(env: string | undefined, platform: string, expoHostUri: string | undefined): string {
  if (env) return env.replace(/\/+$/, '');
  if (platform === 'web') return `http://localhost:${API_PORT}`;
  const host = hostOf(expoHostUri);
  if (host && usableIpv4(host)) return `http://${host}:${API_PORT}`;
  return platform === 'android' ? `http://10.0.2.2:${API_PORT}` : `http://localhost:${API_PORT}`;
}

export const API_URL = `${resolveApiBase(process.env.EXPO_PUBLIC_API_URL, Platform.OS, Constants.expoConfig?.hostUri)}/v1`;
