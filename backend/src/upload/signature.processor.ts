import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

const ALPHA_THRESHOLD = 8;
const PADDING = 8;
const MAX_WIDTH = 600;
const MAX_HEIGHT = 240;
// Limite de pixels decodificados (~2000x2000): evita que uma imagem pequena
// e altamente comprimida exploda em memória ao virar RGBA cru.
const PIXEL_LIMIT = 4_000_000;
// Área mínima de tinta: um toque acidental (ponto isolado) não é assinatura.
const MIN_INK_SIZE = 4;

/**
 * Processa o desenho da assinatura: remove o fundo (pixels claros viram
 * transparentes, preservando o anti-aliasing do traço), recorta a área útil
 * e converte para WebP sem perdas.
 */
export async function processSignatureImage(input: Buffer): Promise<Buffer> {
  let decoded: { data: Buffer; info: sharp.OutputInfo };
  try {
    decoded = await sharp(input, { limitInputPixels: PIXEL_LIMIT })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new BadRequestException(
      'Não foi possível processar a imagem da assinatura. Use uma imagem menor.',
    );
  }
  const { data, info } = decoded;

  const { width, height, channels } = info;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Quanto mais claro o pixel, mais transparente ele fica.
      const ink = 255 - Math.min(r, g, b);
      const alpha = Math.min(a, ink);
      data[i + 3] = alpha;

      if (alpha > ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (
    maxX < minX ||
    maxY < minY ||
    (maxX - minX < MIN_INK_SIZE && maxY - minY < MIN_INK_SIZE)
  ) {
    throw new BadRequestException(
      'A assinatura está em branco. Desenhe a assinatura antes de salvar.',
    );
  }

  const left = Math.max(0, minX - PADDING);
  const top = Math.max(0, minY - PADDING);
  const cropWidth = Math.min(width, maxX + PADDING + 1) - left;
  const cropHeight = Math.min(height, maxY + PADDING + 1) - top;

  return sharp(data, { raw: { width, height, channels: 4 } })
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .resize({
      width: MAX_WIDTH,
      height: MAX_HEIGHT,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ lossless: true })
    .toBuffer();
}
