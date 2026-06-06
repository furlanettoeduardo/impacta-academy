import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { UploadService } from '../upload/upload.service';
import { CertificatePdfService } from './certificate-pdf.service';

type ViewerContext = { userId: string; role: UserRole };

const certificateInclude = {
  course: { select: { id: true, title: true } },
} as const;

@Injectable()
export class CertificatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollments: EnrollmentsService,
    private readonly upload: UploadService,
    private readonly pdf: CertificatePdfService,
  ) {}

  async issue(courseId: string, userId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          select: {
            lessons: {
              select: {
                progresses: {
                  where: { userId, watched: true },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Curso não encontrado.');
    }

    const enrolled = await this.enrollments.isEnrolled(userId, courseId);
    if (!enrolled) {
      throw new ForbiddenException(
        'Você precisa se matricular neste curso para emitir o certificado.',
      );
    }

    const totalLessons = course.modules.reduce(
      (acc, m) => acc + m.lessons.length,
      0,
    );
    const watchedLessons = course.modules.reduce(
      (acc, m) => acc + m.lessons.filter((l) => l.progresses.length > 0).length,
      0,
    );

    if (totalLessons === 0 || watchedLessons < totalLessons) {
      throw new ForbiddenException(
        'Você ainda não concluiu todas as aulas deste curso.',
      );
    }

    // A contagem de aulas é congelada na emissão: o certificado registra o
    // que foi concluído naquele momento, mesmo que o curso mude depois.
    return this.prisma.certificate.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: {},
      create: { userId, courseId, code: this.generateCode(), totalLessons },
      include: certificateInclude,
    });
  }

  listMine(userId: string) {
    return this.prisma.certificate.findMany({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
      include: certificateInclude,
    });
  }

  async validate(code: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { code },
      include: {
        user: { select: { name: true } },
        course: { select: { title: true } },
      },
    });

    if (!certificate) {
      throw new NotFoundException('Certificado não encontrado.');
    }

    return {
      valid: true,
      code: certificate.code,
      student: certificate.user.name,
      course: certificate.course.title,
      issuedAt: certificate.issuedAt,
    };
  }

  async getPdf(id: string, viewer: ViewerContext) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { id },
      include: {
        user: { select: { name: true } },
        course: {
          select: {
            id: true,
            title: true,
            creator: { select: { name: true, signatureUrl: true } },
          },
        },
      },
    });

    if (!certificate) {
      throw new NotFoundException('Certificado não encontrado.');
    }

    if (
      certificate.userId !== viewer.userId &&
      viewer.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar este certificado.',
      );
    }

    const signatureUrl = certificate.course.creator.signatureUrl;
    const signature = signatureUrl
      ? await this.upload.getObjectBufferFromUrl(signatureUrl)
      : null;

    const buffer = await this.pdf.render({
      studentName: certificate.user.name,
      courseTitle: certificate.course.title,
      instructorName: certificate.course.creator.name,
      signature,
      code: certificate.code,
      issuedAt: certificate.issuedAt,
      totalLessons: certificate.totalLessons,
    });

    return {
      buffer,
      fileName: `certificado-${this.slugify(certificate.course.title)}.pdf`,
    };
  }

  private generateCode() {
    const raw = randomBytes(6).toString('hex').toUpperCase();
    return `CERT-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
  }

  private slugify(value: string) {
    const slug = value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug || 'curso';
  }
}
