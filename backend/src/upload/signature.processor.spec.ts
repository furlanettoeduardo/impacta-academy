import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { processSignatureImage } from './signature.processor';

describe('processSignatureImage', () => {
  const createDrawingOnWhite = () =>
    sharp({
      create: {
        width: 200,
        height: 100,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([
        {
          input: {
            create: {
              width: 40,
              height: 10,
              channels: 4,
              background: { r: 20, g: 20, b: 80, alpha: 1 },
            },
          },
          left: 80,
          top: 45,
        },
      ])
      .png()
      .toBuffer();

  it('converte o desenho para WebP com fundo transparente e recorte', async () => {
    const input = await createDrawingOnWhite();

    const output = await processSignatureImage(input);

    const metadata = await sharp(output).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.hasAlpha).toBe(true);

    // Recorte: traço de 40x10 + 8px de padding em cada lado.
    expect(metadata.width).toBe(56);
    expect(metadata.height).toBe(26);

    const { data, info } = await sharp(output)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Canto (era fundo branco) deve ficar transparente.
    expect(data[3]).toBe(0);

    // Centro (traço azul-escuro) deve permanecer visível.
    const centerIndex =
      (Math.floor(info.height / 2) * info.width + Math.floor(info.width / 2)) *
      info.channels;
    expect(data[centerIndex + 3]).toBeGreaterThan(200);
  });

  it('rejeita um toque acidental (ponto isolado não é assinatura)', async () => {
    const singleDot = await sharp({
      create: {
        width: 200,
        height: 100,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([
        {
          input: {
            create: {
              width: 3,
              height: 3,
              channels: 4,
              background: { r: 30, g: 58, b: 138, alpha: 1 },
            },
          },
          left: 100,
          top: 50,
        },
      ])
      .png()
      .toBuffer();

    await expect(processSignatureImage(singleDot)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejeita desenhos em branco', async () => {
    const blank = await sharp({
      create: {
        width: 200,
        height: 100,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    await expect(processSignatureImage(blank)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('aceita desenhos feitos sobre fundo transparente (canvas)', async () => {
    const transparent = await sharp({
      create: {
        width: 200,
        height: 100,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: {
            create: {
              width: 30,
              height: 8,
              channels: 4,
              background: { r: 30, g: 58, b: 138, alpha: 1 },
            },
          },
          left: 10,
          top: 10,
        },
      ])
      .png()
      .toBuffer();

    const output = await processSignatureImage(transparent);
    const metadata = await sharp(output).metadata();

    expect(metadata.format).toBe('webp');
    expect(metadata.hasAlpha).toBe(true);
  });
});
