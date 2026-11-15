import { formatBytes, ImageTooLargeError, MAX_UPLOAD_BYTES, planResize, prepareImage, QUALITIES, SIDES, TARGET_BYTES } from './imageUpload';

describe('planResize: reduzir o lado maior, sem nunca ampliar', () => {
  it('uma imagem larga reduz a largura', () => expect(planResize(4000, 3000, 1280)).toEqual({ resize: { width: 1280 } }));
  it('uma imagem alta reduz a altura', () => expect(planResize(3000, 4000, 1280)).toEqual({ resize: { height: 1280 } }));
  it('uma quadrada reduz a largura', () => expect(planResize(3000, 3000, 1280)).toEqual({ resize: { width: 1280 } }));
  it.each([[1280, 1000], [800, 600], [1280, 1280], [1, 1]])('%p x %p já cabe: não se mexe', (w, h) => {
    expect(planResize(w, h, 1280)).toBeNull();
  });
  it('um píxel acima do limite já reduz', () => expect(planResize(1281, 100, 1280)).not.toBeNull());
});

/** Um codificador falso: o tamanho do ficheiro cai com a qualidade e com o lado. */
function fake(sizeFor: (quality: number, longestSide: number) => number) {
  const calls: { uri: string; actions: unknown[]; quality: number }[] = [];
  const sizes = new Map<string, number>();
  return {
    calls,
    deps: {
      encode: async (uri: string, actions: unknown[], quality: number) => {
        calls.push({ uri, actions, quality });
        const resize = (actions[0] as { resize?: { width?: number; height?: number } } | undefined)?.resize;
        const side = resize?.width ?? resize?.height ?? 4000;
        const out = `file:///saida-${calls.length}.jpg`;
        sizes.set(out, sizeFor(quality, side));
        return { uri: out, width: side, height: Math.round(side * 0.75) };
      },
      sizeOf: async (uri: string) => sizes.get(uri) ?? 0,
    },
  };
}
const FOTO = { uri: 'file:///camara.jpg', width: 4000, height: 3000 };

describe('prepareImage: comprimir até caber', () => {
  it('uma foto normal fica à primeira, com a melhor qualidade', async () => {
    const { deps, calls } = fake(() => 300_000);
    const r = await prepareImage(FOTO, deps);
    expect(calls).toHaveLength(1);
    expect(r).toMatchObject({ quality: QUALITIES[0], bytes: 300_000, width: SIDES[0] });
  });

  it('reduz o lado maior a 1280 na primeira tentativa', async () => {
    const { deps, calls } = fake(() => 100_000);
    await prepareImage(FOTO, deps);
    expect(calls[0]?.actions).toEqual([{ resize: { width: 1280 } }]);
  });

  it('baixa a qualidade até caber no tamanho alvo', async () => {
    const { deps, calls } = fake((q) => 900_000 * q); // 0.8 -> 720k, 0.7 -> 630k, 0.6 -> 540k, 0.5 -> 450k
    const r = await prepareImage(FOTO, deps);
    expect(calls.map((c) => c.quality)).toEqual([0.8, 0.7, 0.6, 0.5]);
    expect(r.quality).toBe(0.5);
    expect(r.bytes).toBeLessThanOrEqual(TARGET_BYTES);
  });

  it('cada tentativa parte da imagem original, e não da anterior (a qualidade não se perde em cadeia)', async () => {
    const { deps, calls } = fake((q) => 900_000 * q);
    await prepareImage(FOTO, deps);
    expect(new Set(calls.map((c) => c.uri))).toEqual(new Set([FOTO.uri]));
  });

  it('se nenhuma qualidade chega, reduz o tamanho e volta a tentar', async () => {
    const { deps, calls } = fake((q, side) => 2_000_000 * q * (side / 1280) ** 2);
    const r = await prepareImage(FOTO, deps);
    expect(calls.some((c) => (c.actions[0] as { resize: { width: number } }).resize.width === 1024)).toBe(true);
    expect(r.bytes).toBeLessThanOrEqual(TARGET_BYTES);
  });

  it('se nada chega ao alvo, devolve a mais pequena de todas, desde que seja aceitável', async () => {
    const { deps, calls } = fake((q, side) => 1_000_000 + q * 10_000 + side);
    const r = await prepareImage(FOTO, deps);
    expect(calls).toHaveLength(SIDES.length * QUALITIES.length);
    expect(r.bytes).toBe(Math.min(...calls.map((_, i) => 1_000_000 + QUALITIES[i % QUALITIES.length]! * 10_000 + SIDES[Math.floor(i / QUALITIES.length)]!)));
    expect(r.bytes).toBeGreaterThan(TARGET_BYTES);
  });

  it('se a melhor tentativa continua enorme, recusa a imagem', async () => {
    const { deps } = fake(() => MAX_UPLOAD_BYTES + 1);
    await expect(prepareImage(FOTO, deps)).rejects.toBeInstanceOf(ImageTooLargeError);
  });

  it('uma imagem que já é pequena não se amplia nem se tenta duas vezes ao mesmo tamanho', async () => {
    const { deps, calls } = fake(() => 2_000_000);
    await expect(prepareImage({ uri: 'file:///pequena.jpg', width: 600, height: 400 }, deps)).rejects.not.toBeUndefined().catch(() => undefined);
    expect(calls.every((c) => c.actions.length === 0)).toBe(true);
    expect(calls).toHaveLength(QUALITIES.length);
  });

  it('uma imagem alta reduz a altura', async () => {
    const { deps, calls } = fake(() => 100_000);
    await prepareImage({ uri: 'file:///alta.jpg', width: 3000, height: 4000 }, deps);
    expect(calls[0]?.actions).toEqual([{ resize: { height: 1280 } }]);
  });

  it('devolve o endereço, as dimensões e o tamanho do ficheiro final', async () => {
    const { deps } = fake(() => 123_456);
    const r = await prepareImage(FOTO, deps);
    expect(r).toMatchObject({ uri: expect.stringMatching(/^file:\/\/\/saida-/), bytes: 123_456 });
    expect(r.width).toBeGreaterThan(0);
  });
});

describe('formatBytes', () => {
  it.each([[0, '0 KB'], [999, '1 KB'], [312_400, '312 KB'], [999_999, '1000 KB'], [1_000_000, '1,0 MB'], [2_540_000, '2,5 MB']])('%p', (n, texto) => {
    expect(formatBytes(n)).toBe(texto);
  });
});
