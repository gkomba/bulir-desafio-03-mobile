import { manipulateAsync, SaveFormat, type Action } from 'expo-image-manipulator';

/*
 * Compressão no telemóvel, antes de enviar. Uma foto da câmara tem 3 a 12 MB; a que se envia
 * tem poucas centenas de KB, o que poupa dados móveis e torna o envio muito mais rápido.
 */

/** Lado maior, em píxeis, ao tamanho de origem e em cada nova tentativa. Nunca se amplia. */
export const SIDES = [1280, 1024, 800] as const;
/** A qualidade JPEG de cada tentativa, da melhor para a pior. */
export const QUALITIES = [0.8, 0.7, 0.6, 0.5, 0.4] as const;
/** O tamanho a que se quer chegar. Uma imagem de serviço não precisa de mais. */
export const TARGET_BYTES = 450_000;
/** O que o Cloudinary aceita no plano gratuito (10 MB) com folga. */
export const MAX_UPLOAD_BYTES = 8_000_000;

export interface PickedImage { uri: string; width: number; height: number }
export interface PreparedImage { uri: string; width: number; height: number; bytes: number; quality: number }

/** Como reduzir a imagem para que o lado maior não passe de `maxSide`; `null` se já cabe. */
export function planResize(width: number, height: number, maxSide: number): Action | null {
  if (Math.max(width, height) <= maxSide) return null;
  return width >= height ? { resize: { width: maxSide } } : { resize: { height: maxSide } };
}

interface Deps {
  /** Reduz e comprime a imagem original. */
  encode: (uri: string, actions: Action[], quality: number) => Promise<{ uri: string; width: number; height: number }>;
  /** O tamanho, em bytes, de um ficheiro. */
  sizeOf: (uri: string) => Promise<number>;
}

const defaultDeps: Deps = {
  encode: (uri, actions, quality) => manipulateAsync(uri, actions, { compress: quality, format: SaveFormat.JPEG }),
  sizeOf: async (uri) => (await (await fetch(uri)).blob()).size,
};

export class ImageTooLargeError extends Error {
  constructor() {
    super('A imagem é demasiado grande, mesmo depois de comprimida. Escolha outra.');
    this.name = 'ImageTooLargeError';
  }
}

/**
 * Prepara a imagem para o envio: reduz o lado maior e comprime em JPEG, tentando uma
 * qualidade cada vez menor (e depois um tamanho menor) até caber em `TARGET_BYTES`.
 * Cada tentativa parte do original, para a qualidade não se perder em recodificações
 * sucessivas. O JPEG não leva os metadados da câmara (EXIF), por isso a localização onde a
 * foto foi tirada nunca sai do telemóvel.
 */
export async function prepareImage(picked: PickedImage, deps: Deps = defaultDeps): Promise<PreparedImage> {
  let best: PreparedImage | undefined;
  let triedOriginalSize = false;
  for (const side of SIDES) {
    const resize = planResize(picked.width, picked.height, side);
    // Uma imagem que já cabe em vários lados dá a mesma imagem: não se repete a tentativa.
    if (!resize) {
      if (triedOriginalSize) continue;
      triedOriginalSize = true;
    }
    for (const quality of QUALITIES) {
      const out = await deps.encode(picked.uri, resize ? [resize] : [], quality);
      const bytes = await deps.sizeOf(out.uri);
      const candidate = { uri: out.uri, width: out.width, height: out.height, bytes, quality };
      if (bytes <= TARGET_BYTES) return candidate;
      if (!best || bytes < best.bytes) best = candidate;
    }
  }
  if (!best || best.bytes > MAX_UPLOAD_BYTES) throw new ImageTooLargeError();
  return best;
}

export const formatBytes = (bytes: number): string => (bytes < 1_000_000 ? `${Math.round(bytes / 1000)} KB` : `${(bytes / 1_000_000).toFixed(1).replace('.', ',')} MB`);
