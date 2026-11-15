import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 3000;
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * Onde está a API, por esta ordem:
 * 1. `EXPO_PUBLIC_API_URL`, se estiver definida (por exemplo, uma API hospedada);
 * 2. na web, `localhost`;
 * 3. no telemóvel ou no emulador, o IP do computador que serve a app (o Expo sabe-o,
 *    é por ele que a app é carregada), com a porta da API. Num telemóvel real, `localhost`
 *    e `10.0.2.2` não chegam ao computador;
 * 4. sem esse IP (por exemplo, com o Expo em modo túnel): `10.0.2.2` no emulador Android,
 *    que é o computador visto do emulador, e `localhost` no simulador iOS.
 */
export function resolveApiBase(env: string | undefined, platform: string, expoHostUri: string | undefined): string {
  if (env) return env.replace(/\/+$/, '');
  if (platform === 'web') return `http://localhost:${API_PORT}`;
  const host = expoHostUri?.split(':')[0];
  if (host && IPV4.test(host) && host !== '127.0.0.1') return `http://${host}:${API_PORT}`;
  return platform === 'android' ? `http://10.0.2.2:${API_PORT}` : `http://localhost:${API_PORT}`;
}

export const API_URL = `${resolveApiBase(process.env.EXPO_PUBLIC_API_URL, Platform.OS, Constants.expoConfig?.hostUri)}/v1`;
