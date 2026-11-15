import { PixelRatio } from 'react-native';
import { Image } from 'expo-image';

/**
 * Larguras, em píxeis, em que se pede cada imagem ao Cloudinary. Em vez de pedir "o tamanho
 * exato" de cada sítio (que daria dezenas de versões diferentes), arredonda-se para o escalão
 * seguinte: a rede de distribuição guarda poucas versões e reaproveita-as entre ecrãs.
 */
export const WIDTH_STEPS = [96, 192, 320, 480, 720, 1080, 1440] as const;

/** Acima de 3x a diferença já não se vê e o custo em dados cresce. */
const MAX_PIXEL_RATIO = 3;

const UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

/** Só as imagens do Cloudinary se transformam; qualquer outro endereço segue como está. */
export const isCloudinaryUrl = (url: string): boolean => UPLOAD.test(url);

/** O escalão de largura (em píxeis) para uma largura de ecrã, na densidade do dispositivo. */
export function widthStep(cssWidth: number, pixelRatio: number = PixelRatio.get()): number {
  const needed = Math.ceil(cssWidth * Math.min(Math.max(pixelRatio, 1), MAX_PIXEL_RATIO));
  return WIDTH_STEPS.find((step) => step >= needed) ?? WIDTH_STEPS[WIDTH_STEPS.length - 1]!;
}

export interface ImageSize {
  /** Largura no ecrã, em pontos. */
  width: number;
  /** Altura no ecrã. Sem ela, mantém-se a proporção da imagem. */
  height?: number;
  pixelRatio?: number;
}

/**
 * O endereço da imagem já no tamanho certo para o sítio onde vai aparecer: recortada de forma
 * inteligente (`g_auto` fica no assunto da foto), com formato e qualidade automáticos
 * (WebP ou AVIF onde o dispositivo os aceita, e uma qualidade que não se nota).
 */
export function optimizedUrl(url: string, { width, height, pixelRatio }: ImageSize): string {
  const match = UPLOAD.exec(url);
  if (!match) return url;
  const [, prefix, rest] = match;
  const w = widthStep(width, pixelRatio);
  const crop = height ? `c_fill,g_auto,w_${w},h_${Math.round((w * height) / width)}` : `c_limit,w_${w}`;
  return `${prefix}${crop},q_auto,f_auto/${rest}`;
}

/**
 * Uma miniatura minúscula e desfocada, que carrega quase de imediato e ocupa o lugar da
 * imagem até esta chegar. O utilizador vê uma "mancha" com as cores certas, em vez de um vazio.
 */
export function placeholderUrl(url: string, aspect = 1): string {
  const match = UPLOAD.exec(url);
  if (!match) return url;
  const [, prefix, rest] = match;
  const w = 24;
  return `${prefix}c_fill,g_auto,w_${w},h_${Math.max(1, Math.round(w / aspect))},q_auto:low,e_blur:300,f_auto/${rest}`;
}

/**
 * Descarrega para a cache (memória e disco) as primeiras imagens de uma lista, antes de
 * aparecerem no ecrã. Falhar não tem importância: a imagem carrega quando for precisa.
 */
export function prefetchImages(urls: (string | undefined)[], size: ImageSize, max = 8): void {
  const wanted = urls.filter((u): u is string => !!u && isCloudinaryUrl(u)).slice(0, max);
  if (wanted.length) Image.prefetch(wanted.map((u) => optimizedUrl(u, size)), 'memory-disk').catch(() => undefined);
}
