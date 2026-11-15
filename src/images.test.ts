import { isCloudinaryUrl, optimizedUrl, placeholderUrl, widthStep, WIDTH_STEPS } from './images';

const BASE = 'https://res.cloudinary.com/dp5ja9xrl/image/upload';
const URL = `${BASE}/v1700000000/bulir/services/abc123.jpg`;

describe('widthStep: o escalão de largura para pedir ao Cloudinary', () => {
  it.each([
    [100, 1, 192], [100, 2, 320], [100, 3, 320], [150, 2, 320], [150, 3, 480],
    [240, 3, 720], [360, 3, 1080], [360, 2, 720], [1, 1, 96], [96, 1, 96], [97, 1, 192],
  ])('%p pontos a %px dá %p', (css, ratio, esperado) => {
    expect(widthStep(css, ratio)).toBe(esperado);
  });

  it('nunca passa do maior escalão, por muito grande que seja o ecrã', () => {
    expect(widthStep(5000, 3)).toBe(WIDTH_STEPS.at(-1));
  });

  it('limita a densidade a 3x: um ecrã de 4x não pede mais do que um de 3x', () => {
    expect(widthStep(240, 4)).toBe(widthStep(240, 3));
  });

  it('trata uma densidade abaixo de 1 como 1', () => {
    expect(widthStep(100, 0.5)).toBe(widthStep(100, 1));
  });

  it('só devolve escalões da lista', () => {
    for (let css = 1; css < 700; css += 7) for (const r of [1, 1.5, 2, 2.75, 3]) expect(WIDTH_STEPS).toContain(widthStep(css, r));
  });

  it('larguras próximas caem no mesmo escalão (a rede de distribuição reaproveita a versão)', () => {
    const passos = new Set([140, 145, 150, 152, 155, 158].map((w) => widthStep(w, 2)));
    expect(passos.size).toBe(1);
  });
});

describe('optimizedUrl', () => {
  it('com altura, recorta no assunto da foto, com formato e qualidade automáticos', () => {
    expect(optimizedUrl(URL, { width: 150, height: 150, pixelRatio: 2 })).toBe(`${BASE}/c_fill,g_auto,w_320,h_320,q_auto,f_auto/v1700000000/bulir/services/abc123.jpg`);
  });

  it('mantém a proporção pedida: um retângulo de 300 por 200', () => {
    expect(optimizedUrl(URL, { width: 150, height: 100, pixelRatio: 2 })).toContain('w_320,h_213');
  });

  it('sem altura, não recorta: mantém a proporção da imagem', () => {
    expect(optimizedUrl(URL, { width: 150, pixelRatio: 2 })).toBe(`${BASE}/c_limit,w_320,q_auto,f_auto/v1700000000/bulir/services/abc123.jpg`);
  });

  it('o resto do endereço (versão, pasta e nome) não muda', () => {
    expect(optimizedUrl(URL, { width: 200, pixelRatio: 1 })).toMatch(/\/v1700000000\/bulir\/services\/abc123\.jpg$/);
  });

  it('um ecrã mais denso pede uma imagem maior, e um menos denso uma mais pequena', () => {
    const w = (ratio: number) => Number(/w_(\d+)/.exec(optimizedUrl(URL, { width: 150, pixelRatio: ratio }))?.[1]);
    expect(w(3)).toBeGreaterThan(w(2));
    expect(w(2)).toBeGreaterThan(w(1));
  });

  it.each([
    'https://evil.com/dp5ja9xrl/image/upload/v1/bulir/services/a.jpg',
    'http://res.cloudinary.com/dp5ja9xrl/image/upload/v1/bulir/services/a.jpg',
    'https://exemplo.com/imagem.jpg',
    '',
  ])('um endereço que não é do Cloudinary segue como está: "%s"', (url) => {
    expect(optimizedUrl(url, { width: 150, pixelRatio: 2 })).toBe(url);
  });

  it('um endereço que já tem uma transformação mantém-na, depois da nossa', () => {
    const jaTransformado = `${BASE}/c_fill,w_32/v1/bulir/services/a.jpg`;
    expect(optimizedUrl(jaTransformado, { width: 150, pixelRatio: 2 })).toBe(`${BASE}/c_limit,w_320,q_auto,f_auto/c_fill,w_32/v1/bulir/services/a.jpg`);
  });
});

describe('placeholderUrl: a mancha desfocada que ocupa o lugar da imagem', () => {
  it('é minúscula, desfocada e de baixa qualidade', () => {
    expect(placeholderUrl(URL)).toBe(`${BASE}/c_fill,g_auto,w_24,h_24,q_auto:low,e_blur:300,f_auto/v1700000000/bulir/services/abc123.jpg`);
  });

  it('respeita a proporção', () => {
    expect(placeholderUrl(URL, 2)).toContain('w_24,h_12');
    expect(placeholderUrl(URL, 0.5)).toContain('w_24,h_48');
  });

  it('nunca pede uma altura de zero', () => {
    expect(placeholderUrl(URL, 1000)).toContain('h_1,');
  });

  it('é muito mais pequena do que a imagem final (largura de 24 contra pelo menos 96)', () => {
    const final = Number(/w_(\d+)/.exec(optimizedUrl(URL, { width: 20, pixelRatio: 1 }))?.[1]);
    expect(24).toBeLessThan(final);
  });

  it('um endereço que não é do Cloudinary segue como está', () => {
    expect(placeholderUrl('https://exemplo.com/a.jpg')).toBe('https://exemplo.com/a.jpg');
  });
});

describe('isCloudinaryUrl', () => {
  it('reconhece as imagens da plataforma', () => expect(isCloudinaryUrl(URL)).toBe(true));
  it.each(['http://res.cloudinary.com/x/image/upload/a.jpg', 'https://res.cloudinary.com/x/video/upload/a.mp4', 'https://exemplo.com/a.jpg', ''])('recusa "%s"', (url) => {
    expect(isCloudinaryUrl(url)).toBe(false);
  });
});
