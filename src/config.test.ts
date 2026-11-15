import { resolveApiBase } from './config';

describe('endereço da API', () => {
  describe('com EXPO_PUBLIC_API_URL definida', () => {
    it.each(['android', 'ios', 'web'])('manda sempre, em %s', (plataforma) => {
      expect(resolveApiBase('https://api.exemplo.com', plataforma, '192.168.8.6:8081')).toBe('https://api.exemplo.com');
    });

    it('tira a barra final, para não ficar "//v1"', () => {
      expect(resolveApiBase('http://192.168.8.6:3000/', 'android', undefined)).toBe('http://192.168.8.6:3000');
      expect(resolveApiBase('http://192.168.8.6:3000///', 'android', undefined)).toBe('http://192.168.8.6:3000');
    });

    it('uma variável vazia conta como ausente', () => {
      expect(resolveApiBase('', 'ios', undefined)).toBe('http://localhost:3000');
    });
  });

  describe('num telemóvel ou emulador, usa o IP do computador que serve a app', () => {
    it.each(['android', 'ios'])('em %s, com o Expo na rede local', (plataforma) => {
      expect(resolveApiBase(undefined, plataforma, '192.168.8.6:8081')).toBe('http://192.168.8.6:3000');
    });

    it('ignora a porta do Expo e usa a da API', () => {
      expect(resolveApiBase(undefined, 'android', '10.1.2.3:19000')).toBe('http://10.1.2.3:3000');
    });

    it('aceita o IP sem porta', () => {
      expect(resolveApiBase(undefined, 'android', '192.168.1.20')).toBe('http://192.168.1.20:3000');
    });
  });

  describe('sem um IP utilizável do Expo', () => {
    it('no Android cai no 10.0.2.2 do emulador', () => {
      expect(resolveApiBase(undefined, 'android', undefined)).toBe('http://10.0.2.2:3000');
    });

    it('no iOS cai no localhost do simulador', () => {
      expect(resolveApiBase(undefined, 'ios', undefined)).toBe('http://localhost:3000');
    });

    it.each(['abc123.exp.direct:80', 'localhost:8081', '127.0.0.1:8081', '', 'não é um endereço'])(
      'ignora o endereço "%s" do Expo (modo túnel ou local): no Android usa 10.0.2.2',
      (hostUri) => {
        expect(resolveApiBase(undefined, 'android', hostUri)).toBe('http://10.0.2.2:3000');
      },
    );
  });

  describe('na web', () => {
    it('usa o localhost, mesmo que o Expo tenha um IP', () => {
      expect(resolveApiBase(undefined, 'web', '192.168.8.6:8081')).toBe('http://localhost:3000');
    });
  });
});
