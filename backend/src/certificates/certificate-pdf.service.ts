import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';

export type CertificatePdfData = {
  studentName: string;
  courseTitle: string;
  instructorName: string;
  /** Assinatura do instrutor em WebP (como armazenada no MinIO) ou null. */
  signature: Buffer | null;
  code: string;
  issuedAt: Date;
  totalLessons: number;
  /** Média final nas avaliações (0-10), quando o curso exige média. */
  averageGrade?: number | null;
};

type SignatureImage = {
  buffer: Buffer;
  width: number;
  height: number;
};

const NAVY = '#1f2a44';
const GOLD = '#c9a227';
const GRAY = '#64748b';

const SIGNATURE_MAX_WIDTH = 180;
const SIGNATURE_MAX_HEIGHT = 62;

@Injectable()
export class CertificatePdfService {
  async render(data: CertificatePdfData): Promise<Buffer> {
    // pdfkit não suporta WebP; a assinatura é convertida para PNG.
    const signature = data.signature
      ? await this.toPngImage(data.signature)
      : null;

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 0,
      });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.drawTemplate(doc, data, signature);
      doc.end();
    });
  }

  private async toPngImage(webp: Buffer): Promise<SignatureImage | null> {
    try {
      const { data, info } = await sharp(webp)
        .png()
        .toBuffer({ resolveWithObject: true });
      return { buffer: data, width: info.width, height: info.height };
    } catch {
      return null;
    }
  }

  private drawTemplate(
    doc: PDFKit.PDFDocument,
    data: CertificatePdfData,
    signature: SignatureImage | null,
  ) {
    const width = doc.page.width;
    const height = doc.page.height;

    // Fundo e molduras
    doc.rect(0, 0, width, height).fill('#ffffff');
    doc
      .lineWidth(3)
      .strokeColor(NAVY)
      .rect(24, 24, width - 48, height - 48)
      .stroke();
    doc
      .lineWidth(1)
      .strokeColor(GOLD)
      .rect(34, 34, width - 68, height - 68)
      .stroke();

    // Cabeçalho
    doc
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor(GOLD)
      .text('IMPACTA ACADEMY', 0, 70, {
        align: 'center',
        width,
        characterSpacing: 5,
      });

    doc
      .font('Helvetica-Bold')
      .fontSize(40)
      .fillColor(NAVY)
      .text('CERTIFICADO', 0, 104, {
        align: 'center',
        width,
        characterSpacing: 8,
      });

    doc
      .font('Helvetica')
      .fontSize(14)
      .fillColor(GRAY)
      .text('DE CONCLUSÃO', 0, 154, {
        align: 'center',
        width,
        characterSpacing: 6,
      });

    doc
      .moveTo(width / 2 - 80, 186)
      .lineTo(width / 2 + 80, 186)
      .lineWidth(2)
      .strokeColor(GOLD)
      .stroke();

    // Corpo — os blocos seguintes fluem a partir do fim do anterior (doc.y),
    // então nomes/títulos longos quebram linha sem sobrepor o próximo bloco.
    doc
      .font('Helvetica')
      .fontSize(13)
      .fillColor(GRAY)
      .text('Certificamos que', 0, 214, { align: 'center', width });

    const nameFontSize = data.studentName.length > 45 ? 24 : 32;
    doc
      .font('Times-BoldItalic')
      .fontSize(nameFontSize)
      .fillColor(NAVY)
      .text(data.studentName, 70, doc.y + 6, {
        align: 'center',
        width: width - 140,
      });

    doc
      .font('Helvetica')
      .fontSize(13)
      .fillColor(GRAY)
      .text('concluiu com êxito todas as aulas do curso', 70, doc.y + 12, {
        align: 'center',
        width: width - 140,
      });

    const titleFontSize = data.courseTitle.length > 70 ? 16 : 22;
    doc
      .font('Helvetica-Bold')
      .fontSize(titleFontSize)
      .fillColor(NAVY)
      .text(data.courseTitle, 90, doc.y + 8, {
        align: 'center',
        width: width - 180,
      });

    const lessonsLabel =
      data.totalLessons === 1 ? 'aula concluída' : 'aulas concluídas';
    const metadataParts = [`${data.totalLessons} ${lessonsLabel}`];
    if (data.averageGrade !== null && data.averageGrade !== undefined) {
      metadataParts.push(
        `Média final: ${data.averageGrade.toFixed(1).replace('.', ',')}`,
      );
    }
    metadataParts.push(`Emitido em ${this.formatDate(data.issuedAt)}`);
    doc
      .font('Helvetica')
      .fontSize(12)
      .fillColor(GRAY)
      .text(metadataParts.join('  •  '), 0, doc.y + 16, {
        align: 'center',
        width,
      });

    // Bloco de assinatura
    const centerX = width / 2;
    const signatureLineY = 488;

    if (signature) {
      const scale = Math.min(
        SIGNATURE_MAX_WIDTH / signature.width,
        SIGNATURE_MAX_HEIGHT / signature.height,
        1,
      );
      const drawWidth = signature.width * scale;
      const drawHeight = signature.height * scale;
      doc.image(
        signature.buffer,
        centerX - drawWidth / 2,
        signatureLineY - 6 - drawHeight,
        { width: drawWidth, height: drawHeight },
      );
    } else {
      doc
        .font('Times-Italic')
        .fontSize(26)
        .fillColor(NAVY)
        .text(data.instructorName, 0, signatureLineY - 42, {
          align: 'center',
          width,
        });
    }

    doc
      .moveTo(centerX - 110, signatureLineY)
      .lineTo(centerX + 110, signatureLineY)
      .lineWidth(1)
      .strokeColor(NAVY)
      .stroke();

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(NAVY)
      .text(data.instructorName, 0, signatureLineY + 8, {
        align: 'center',
        width,
      });

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(GRAY)
      .text('Instrutor(a) responsável', 0, signatureLineY + 24, {
        align: 'center',
        width,
      });

    // Rodapé
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(GRAY)
      .text(`Código de validação: ${data.code}`, 0, height - 52, {
        align: 'center',
        width,
      });
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }
}
