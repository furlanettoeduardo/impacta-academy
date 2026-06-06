import sharp from 'sharp';
import { CertificatePdfService } from './certificate-pdf.service';

describe('CertificatePdfService', () => {
  const service = new CertificatePdfService();

  const baseData = {
    studentName: 'Maria da Silva',
    courseTitle: 'Curso de NestJS Avançado',
    instructorName: 'Prof. João Souza',
    signature: null,
    code: 'CERT-AAAA-BBBB-CCCC',
    issuedAt: new Date('2026-06-06T12:00:00Z'),
    totalLessons: 12,
  };

  it('gera um PDF válido sem assinatura (fallback em texto)', async () => {
    const buffer = await service.render(baseData);

    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('gera um PDF válido embutindo a assinatura WebP', async () => {
    const signature = await sharp({
      create: {
        width: 120,
        height: 40,
        channels: 4,
        background: { r: 30, g: 58, b: 138, alpha: 1 },
      },
    })
      .webp({ lossless: true })
      .toBuffer();

    const buffer = await service.render({ ...baseData, signature });

    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('renderiza títulos e nomes longos sem falhar (layout fluido)', async () => {
    const buffer = await service.render({
      ...baseData,
      studentName:
        'Maria Aparecida da Conceição dos Santos Oliveira de Albuquerque',
      courseTitle:
        'Introdução ao Desenvolvimento de Aplicações Web Modernas com NestJS, Prisma, PostgreSQL e Integração Contínua na Prática',
    });

    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('não quebra com assinatura corrompida (ignora e usa fallback)', async () => {
    const buffer = await service.render({
      ...baseData,
      signature: Buffer.from('not-an-image'),
    });

    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
