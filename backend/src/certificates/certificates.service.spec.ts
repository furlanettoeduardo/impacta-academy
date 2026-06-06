import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { UploadService } from '../upload/upload.service';
import { AssessmentsService } from '../assessments/assessments.service';
import { CertificatePdfService } from './certificate-pdf.service';
import { CertificatesService } from './certificates.service';

describe('CertificatesService', () => {
  let service: CertificatesService;

  const prismaMock = {
    course: { findUnique: jest.fn() },
    certificate: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const enrollmentsMock = { isEnrolled: jest.fn() };
  const uploadMock = { getObjectBufferFromUrl: jest.fn() };
  const assessmentsMock = { getCourseAverageStatus: jest.fn() };
  const pdfMock = { render: jest.fn() };

  const noAssessmentsRequired = {
    required: false,
    minAverage: 7,
    totalAssessments: 0,
    missing: 0,
    pending: 0,
    average: null,
  };

  const completedCourse = {
    id: 'course-1',
    modules: [
      {
        lessons: [
          { progresses: [{ id: 'p1' }] },
          { progresses: [{ id: 'p2' }] },
        ],
      },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificatesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EnrollmentsService, useValue: enrollmentsMock },
        { provide: UploadService, useValue: uploadMock },
        { provide: AssessmentsService, useValue: assessmentsMock },
        { provide: CertificatePdfService, useValue: pdfMock },
      ],
    }).compile();

    service = module.get<CertificatesService>(CertificatesService);
    assessmentsMock.getCourseAverageStatus.mockResolvedValue(
      noAssessmentsRequired,
    );
  });

  describe('issue', () => {
    it('emite o certificado quando todas as aulas foram assistidas', async () => {
      const created = {
        id: 'cert-1',
        code: 'CERT-AAAA-BBBB-CCCC',
        course: { id: 'course-1', title: 'Curso' },
      };
      prismaMock.course.findUnique.mockResolvedValue(completedCourse);
      enrollmentsMock.isEnrolled.mockResolvedValue(true);
      prismaMock.certificate.upsert.mockResolvedValue(created);

      const result = await service.issue('course-1', 'user-1');

      expect(result).toBe(created);
      expect(prismaMock.certificate.upsert).toHaveBeenCalledTimes(1);
      const upsertCalls = prismaMock.certificate.upsert.mock
        .calls as unknown as [unknown][];
      const upsertArgs = upsertCalls[0][0] as {
        where: { userId_courseId: { userId: string; courseId: string } };
        update: object;
        create: {
          userId: string;
          courseId: string;
          code: string;
          totalLessons: number;
        };
      };
      expect(upsertArgs.where).toEqual({
        userId_courseId: { userId: 'user-1', courseId: 'course-1' },
      });
      // A reemissão (sempre revalidada pelo gate) atualiza o retrato.
      expect(upsertArgs.update).toEqual({
        totalLessons: 2,
        averageGrade: null,
      });
      expect(upsertArgs.create.userId).toBe('user-1');
      expect(upsertArgs.create.courseId).toBe('course-1');
      // A contagem de aulas é congelada na emissão.
      expect(upsertArgs.create.totalLessons).toBe(2);
      expect(upsertArgs.create.code).toMatch(
        /^CERT-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/,
      );
    });

    it('rejeita quando o curso não existe', async () => {
      prismaMock.course.findUnique.mockResolvedValue(null);

      await expect(service.issue('course-x', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.certificate.upsert).not.toHaveBeenCalled();
    });

    it('rejeita quando o aluno não está matriculado', async () => {
      prismaMock.course.findUnique.mockResolvedValue(completedCourse);
      enrollmentsMock.isEnrolled.mockResolvedValue(false);

      await expect(service.issue('course-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prismaMock.certificate.upsert).not.toHaveBeenCalled();
    });

    it('rejeita quando ainda há aulas não assistidas', async () => {
      prismaMock.course.findUnique.mockResolvedValue({
        id: 'course-1',
        modules: [
          { lessons: [{ progresses: [{ id: 'p1' }] }, { progresses: [] }] },
        ],
      });
      enrollmentsMock.isEnrolled.mockResolvedValue(true);

      await expect(service.issue('course-1', 'user-1')).rejects.toThrow(
        'Você ainda não concluiu todas as aulas deste curso.',
      );
      expect(prismaMock.certificate.upsert).not.toHaveBeenCalled();
    });

    it('rejeita cursos sem aulas cadastradas', async () => {
      prismaMock.course.findUnique.mockResolvedValue({
        id: 'course-1',
        modules: [{ lessons: [] }],
      });
      enrollmentsMock.isEnrolled.mockResolvedValue(true);

      await expect(service.issue('course-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prismaMock.certificate.upsert).not.toHaveBeenCalled();
    });

    describe('quando o curso exige média nas avaliações', () => {
      beforeEach(() => {
        prismaMock.course.findUnique.mockResolvedValue(completedCourse);
        enrollmentsMock.isEnrolled.mockResolvedValue(true);
      });

      it('bloqueia quando ainda não há avaliações com questões', async () => {
        assessmentsMock.getCourseAverageStatus.mockResolvedValue({
          required: true,
          minAverage: 7,
          totalAssessments: 0,
          missing: 0,
          pending: 0,
          average: null,
        });

        await expect(service.issue('course-1', 'user-1')).rejects.toThrow(
          'As avaliações deste curso ainda não estão disponíveis. Tente novamente mais tarde.',
        );
        expect(prismaMock.certificate.upsert).not.toHaveBeenCalled();
      });

      it('bloqueia quando há avaliações não realizadas', async () => {
        assessmentsMock.getCourseAverageStatus.mockResolvedValue({
          required: true,
          minAverage: 7,
          totalAssessments: 2,
          missing: 1,
          pending: 0,
          average: null,
        });

        await expect(service.issue('course-1', 'user-1')).rejects.toThrow(
          'Você precisa realizar todas as avaliações do curso para emitir o certificado.',
        );
        expect(prismaMock.certificate.upsert).not.toHaveBeenCalled();
      });

      it('bloqueia quando há avaliações aguardando correção', async () => {
        assessmentsMock.getCourseAverageStatus.mockResolvedValue({
          required: true,
          minAverage: 7,
          totalAssessments: 2,
          missing: 0,
          pending: 1,
          average: null,
        });

        await expect(service.issue('course-1', 'user-1')).rejects.toThrow(
          'Há avaliações aguardando correção do professor. Tente novamente mais tarde.',
        );
      });

      it('bloqueia quando a média é inferior à mínima', async () => {
        assessmentsMock.getCourseAverageStatus.mockResolvedValue({
          required: true,
          minAverage: 7,
          totalAssessments: 2,
          missing: 0,
          pending: 0,
          average: 6.5,
        });

        await expect(service.issue('course-1', 'user-1')).rejects.toThrow(
          'Sua média nas avaliações (6,5) é inferior à média mínima exigida (7,0).',
        );
      });

      it('emite congelando a média no certificado quando aprovado', async () => {
        assessmentsMock.getCourseAverageStatus.mockResolvedValue({
          required: true,
          minAverage: 7,
          totalAssessments: 2,
          missing: 0,
          pending: 0,
          average: 8.5,
        });
        prismaMock.certificate.upsert.mockResolvedValue({ id: 'cert-1' });

        await service.issue('course-1', 'user-1');

        expect(prismaMock.certificate.upsert).toHaveBeenCalledTimes(1);
        const upsertCalls = prismaMock.certificate.upsert.mock
          .calls as unknown as [unknown][];
        const upsertArgs = upsertCalls[0][0] as {
          create: { averageGrade: number | null };
        };
        expect(upsertArgs.create.averageGrade).toBe(8.5);
      });
    });
  });

  describe('validate', () => {
    it('retorna os dados públicos do certificado', async () => {
      const issuedAt = new Date('2026-06-06T12:00:00Z');
      prismaMock.certificate.findUnique.mockResolvedValue({
        code: 'CERT-AAAA-BBBB-CCCC',
        issuedAt,
        user: { name: 'Maria' },
        course: { title: 'Curso de NestJS' },
      });

      await expect(service.validate('CERT-AAAA-BBBB-CCCC')).resolves.toEqual({
        valid: true,
        code: 'CERT-AAAA-BBBB-CCCC',
        student: 'Maria',
        course: 'Curso de NestJS',
        issuedAt,
      });
    });

    it('rejeita códigos desconhecidos', async () => {
      prismaMock.certificate.findUnique.mockResolvedValue(null);

      await expect(service.validate('CERT-0000-0000-0000')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPdf', () => {
    const certificate = {
      id: 'cert-1',
      userId: 'user-1',
      code: 'CERT-AAAA-BBBB-CCCC',
      totalLessons: 2,
      issuedAt: new Date('2026-06-06T12:00:00Z'),
      user: { name: 'Maria' },
      course: {
        id: 'course-1',
        title: 'Curso de NestJS',
        creator: {
          name: 'Prof. João',
          signatureUrl: 'http://localhost:9000/videos/signatures/sig.webp',
        },
      },
    };

    it('gera o PDF com a assinatura do criador do curso', async () => {
      const signature = Buffer.from('webp-bytes');
      const pdf = Buffer.from('%PDF-fake');
      prismaMock.certificate.findUnique.mockResolvedValue(certificate);
      uploadMock.getObjectBufferFromUrl.mockResolvedValue(signature);
      pdfMock.render.mockResolvedValue(pdf);

      const result = await service.getPdf('cert-1', {
        userId: 'user-1',
        role: UserRole.ALUNO,
      });

      expect(result.buffer).toBe(pdf);
      expect(result.fileName).toBe('certificado-curso-de-nestjs.pdf');
      expect(uploadMock.getObjectBufferFromUrl).toHaveBeenCalledWith(
        certificate.course.creator.signatureUrl,
      );
      expect(pdfMock.render).toHaveBeenCalledWith({
        studentName: 'Maria',
        courseTitle: 'Curso de NestJS',
        instructorName: 'Prof. João',
        signature,
        code: certificate.code,
        issuedAt: certificate.issuedAt,
        totalLessons: 2,
      });
    });

    it('usa fallback sem assinatura quando o criador não possui uma', async () => {
      prismaMock.certificate.findUnique.mockResolvedValue({
        ...certificate,
        course: {
          ...certificate.course,
          creator: { name: 'Prof. João', signatureUrl: null },
        },
      });
      pdfMock.render.mockResolvedValue(Buffer.from('%PDF-fake'));

      await service.getPdf('cert-1', {
        userId: 'user-1',
        role: UserRole.ALUNO,
      });

      expect(uploadMock.getObjectBufferFromUrl).not.toHaveBeenCalled();
      expect(pdfMock.render).toHaveBeenCalledWith(
        expect.objectContaining({ signature: null }),
      );
    });

    it('bloqueia alunos de baixar certificados de terceiros', async () => {
      prismaMock.certificate.findUnique.mockResolvedValue(certificate);

      await expect(
        service.getPdf('cert-1', { userId: 'user-2', role: UserRole.ALUNO }),
      ).rejects.toThrow(ForbiddenException);
      expect(pdfMock.render).not.toHaveBeenCalled();
    });

    it('permite que administradores baixem qualquer certificado', async () => {
      prismaMock.certificate.findUnique.mockResolvedValue({
        ...certificate,
        course: {
          ...certificate.course,
          creator: { name: 'Prof. João', signatureUrl: null },
        },
      });
      pdfMock.render.mockResolvedValue(Buffer.from('%PDF-fake'));

      await expect(
        service.getPdf('cert-1', { userId: 'admin-1', role: UserRole.ADMIN }),
      ).resolves.toMatchObject({ fileName: 'certificado-curso-de-nestjs.pdf' });
    });

    it('rejeita certificados inexistentes', async () => {
      prismaMock.certificate.findUnique.mockResolvedValue(null);

      await expect(
        service.getPdf('cert-x', { userId: 'user-1', role: UserRole.ALUNO }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
