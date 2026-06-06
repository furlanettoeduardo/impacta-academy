import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { QuestionType, SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { AssessmentsService } from './assessments.service';

describe('AssessmentsService', () => {
  let service: AssessmentsService;

  const prismaMock = {
    course: { findUnique: jest.fn() },
    assessment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    question: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    assessmentSubmission: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    answer: { update: jest.fn() },
    lesson: { count: jest.fn() },
    lessonProgress: { count: jest.fn() },
    $transaction: jest.fn(),
  };
  const enrollmentsMock = { isEnrolled: jest.fn() };

  const mixedAssessment = {
    id: 'assessment-1',
    title: 'Prova 1',
    course: { id: 'course-1', assessmentsEnabled: true },
    questions: [
      {
        id: 'q1',
        type: QuestionType.OBJETIVA,
        points: 2,
        order: 1,
        options: [
          { id: 'q1-a', isCorrect: true },
          { id: 'q1-b', isCorrect: false },
        ],
      },
      {
        id: 'q2',
        type: QuestionType.OBJETIVA,
        points: 3,
        order: 2,
        options: [
          { id: 'q2-a', isCorrect: false },
          { id: 'q2-b', isCorrect: true },
        ],
      },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EnrollmentsService, useValue: enrollmentsMock },
      ],
    }).compile();

    service = module.get<AssessmentsService>(AssessmentsService);
  });

  const unlockStudent = () => {
    enrollmentsMock.isEnrolled.mockResolvedValue(true);
    prismaMock.lesson.count.mockResolvedValue(2);
    prismaMock.lessonProgress.count.mockResolvedValue(2);
    prismaMock.assessmentSubmission.findUnique.mockResolvedValue(null);
  };

  describe('submit', () => {
    it('corrige questões objetivas automaticamente e normaliza a nota para 0-10', async () => {
      prismaMock.assessment.findUnique.mockResolvedValue(mixedAssessment);
      unlockStudent();
      prismaMock.assessmentSubmission.create.mockResolvedValue({
        id: 'sub-1',
        status: SubmissionStatus.CORRIGIDA,
        grade: 4,
        submittedAt: new Date(),
      });

      await service.submit('assessment-1', 'user-1', {
        answers: [
          { questionId: 'q1', selectedOptionId: 'q1-a' },
          { questionId: 'q2', selectedOptionId: 'q2-a' },
        ],
      });

      expect(prismaMock.assessmentSubmission.create).toHaveBeenCalledTimes(1);
      const createCalls = prismaMock.assessmentSubmission.create.mock
        .calls as unknown as [unknown][];
      const createArgs = createCalls[0][0] as {
        data: {
          status: SubmissionStatus;
          grade: number | null;
          gradedAt: Date | null;
          answers: {
            create: Array<{
              questionId: string;
              selectedOptionId?: string;
              earnedPoints?: number;
            }>;
          };
        };
      };

      // 2 pts acertados de 5 => nota 4,0
      expect(createArgs.data.status).toBe(SubmissionStatus.CORRIGIDA);
      expect(createArgs.data.grade).toBe(4);
      expect(createArgs.data.gradedAt).toBeInstanceOf(Date);
      expect(createArgs.data.answers.create).toEqual([
        { questionId: 'q1', selectedOptionId: 'q1-a', earnedPoints: 2 },
        { questionId: 'q2', selectedOptionId: 'q2-a', earnedPoints: 0 },
      ]);
    });

    it('marca como PENDENTE quando há questões dissertativas', async () => {
      prismaMock.assessment.findUnique.mockResolvedValue({
        ...mixedAssessment,
        questions: [
          ...mixedAssessment.questions,
          {
            id: 'q3',
            type: QuestionType.DISSERTATIVA,
            points: 5,
            order: 3,
            options: [],
          },
        ],
      });
      unlockStudent();
      prismaMock.assessmentSubmission.create.mockResolvedValue({
        id: 'sub-1',
        status: SubmissionStatus.PENDENTE,
        grade: null,
        submittedAt: new Date(),
      });

      await service.submit('assessment-1', 'user-1', {
        answers: [
          { questionId: 'q1', selectedOptionId: 'q1-a' },
          { questionId: 'q2', selectedOptionId: 'q2-b' },
          { questionId: 'q3', text: 'Minha resposta dissertativa.' },
        ],
      });

      const createCalls = prismaMock.assessmentSubmission.create.mock
        .calls as unknown as [unknown][];
      const createArgs = createCalls[0][0] as {
        data: {
          status: SubmissionStatus;
          grade: number | null;
          answers: { create: Array<Record<string, unknown>> };
        };
      };

      expect(createArgs.data.status).toBe(SubmissionStatus.PENDENTE);
      expect(createArgs.data.grade).toBeNull();
      expect(createArgs.data.answers.create[2]).toEqual({
        questionId: 'q3',
        text: 'Minha resposta dissertativa.',
      });
    });

    it('bloqueia envio antes de concluir todas as aulas', async () => {
      prismaMock.assessment.findUnique.mockResolvedValue(mixedAssessment);
      enrollmentsMock.isEnrolled.mockResolvedValue(true);
      prismaMock.lesson.count.mockResolvedValue(2);
      prismaMock.lessonProgress.count.mockResolvedValue(1);

      await expect(
        service.submit('assessment-1', 'user-1', {
          answers: [
            { questionId: 'q1', selectedOptionId: 'q1-a' },
            { questionId: 'q2', selectedOptionId: 'q2-b' },
          ],
        }),
      ).rejects.toThrow(
        'Conclua todas as aulas do curso para liberar esta avaliação.',
      );
      expect(prismaMock.assessmentSubmission.create).not.toHaveBeenCalled();
    });

    it('bloqueia envio sem matrícula', async () => {
      prismaMock.assessment.findUnique.mockResolvedValue(mixedAssessment);
      enrollmentsMock.isEnrolled.mockResolvedValue(false);

      await expect(
        service.submit('assessment-1', 'user-1', {
          answers: [{ questionId: 'q1', selectedOptionId: 'q1-a' }],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('bloqueia segunda tentativa', async () => {
      prismaMock.assessment.findUnique.mockResolvedValue(mixedAssessment);
      enrollmentsMock.isEnrolled.mockResolvedValue(true);
      prismaMock.lesson.count.mockResolvedValue(2);
      prismaMock.lessonProgress.count.mockResolvedValue(2);
      prismaMock.assessmentSubmission.findUnique.mockResolvedValue({
        id: 'sub-existente',
      });

      await expect(
        service.submit('assessment-1', 'user-1', {
          answers: [
            { questionId: 'q1', selectedOptionId: 'q1-a' },
            { questionId: 'q2', selectedOptionId: 'q2-b' },
          ],
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('exige resposta para todas as questões', async () => {
      prismaMock.assessment.findUnique.mockResolvedValue(mixedAssessment);
      unlockStudent();

      await expect(
        service.submit('assessment-1', 'user-1', {
          answers: [{ questionId: 'q1', selectedOptionId: 'q1-a' }],
        }),
      ).rejects.toThrow('Responda todas as questões antes de enviar.');
    });

    it('bloqueia quando as avaliações do curso estão desabilitadas', async () => {
      prismaMock.assessment.findUnique.mockResolvedValue({
        ...mixedAssessment,
        course: { id: 'course-1', assessmentsEnabled: false },
      });

      await expect(
        service.submit('assessment-1', 'user-1', {
          answers: [{ questionId: 'q1', selectedOptionId: 'q1-a' }],
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('grade', () => {
    const gradingSubmission = {
      id: 'sub-1',
      answers: [
        {
          id: 'a1',
          earnedPoints: 2,
          question: { points: 2 },
        },
        {
          id: 'a2',
          earnedPoints: null,
          question: { points: 3 },
        },
      ],
    };

    it('finaliza a correção e recalcula a nota', async () => {
      prismaMock.assessmentSubmission.findUnique.mockResolvedValue(
        gradingSubmission,
      );
      prismaMock.$transaction.mockResolvedValue([]);
      const getSubmissionSpy = jest
        .spyOn(service, 'getSubmission')
        .mockResolvedValue({ id: 'sub-1' } as never);

      await service.grade(
        'sub-1',
        { answers: [{ answerId: 'a2', earnedPoints: 1.5 }] },
        { userId: 'prof-1', role: 'PROFESSOR' },
      );

      expect(prismaMock.answer.update).toHaveBeenCalledWith({
        where: { id: 'a2' },
        data: { earnedPoints: 1.5 },
      });
      // 2 + 1,5 de 5 pontos => nota 7,0
      const updateCalls = prismaMock.assessmentSubmission.update.mock
        .calls as unknown as [unknown][];
      const updateArgs = updateCalls[0][0] as {
        where: { id: string };
        data: { status: SubmissionStatus; grade: number | null };
      };
      expect(updateArgs.where).toEqual({ id: 'sub-1' });
      expect(updateArgs.data.status).toBe(SubmissionStatus.CORRIGIDA);
      expect(updateArgs.data.grade).toBe(7);
      expect(getSubmissionSpy).toHaveBeenCalled();
    });

    it('mantém PENDENTE enquanto houver respostas sem nota', async () => {
      prismaMock.assessmentSubmission.findUnique.mockResolvedValue({
        id: 'sub-1',
        answers: [
          { id: 'a1', earnedPoints: null, question: { points: 2 } },
          { id: 'a2', earnedPoints: null, question: { points: 3 } },
        ],
      });
      prismaMock.$transaction.mockResolvedValue([]);
      jest
        .spyOn(service, 'getSubmission')
        .mockResolvedValue({ id: 'sub-1' } as never);

      await service.grade(
        'sub-1',
        { answers: [{ answerId: 'a1', earnedPoints: 1 }] },
        { userId: 'prof-1', role: 'PROFESSOR' },
      );

      const updateCalls = prismaMock.assessmentSubmission.update.mock
        .calls as unknown as [unknown][];
      const updateArgs = updateCalls[0][0] as {
        data: { status: SubmissionStatus; grade: number | null };
      };
      expect(updateArgs.data.status).toBe(SubmissionStatus.PENDENTE);
      expect(updateArgs.data.grade).toBeNull();
    });

    it('rejeita pontuação acima do valor da questão', async () => {
      prismaMock.assessmentSubmission.findUnique.mockResolvedValue(
        gradingSubmission,
      );

      await expect(
        service.grade(
          'sub-1',
          { answers: [{ answerId: 'a2', earnedPoints: 5 }] },
          { userId: 'prof-1', role: 'PROFESSOR' },
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('addQuestion', () => {
    beforeEach(() => {
      prismaMock.assessment.findUnique.mockResolvedValue({
        id: 'assessment-1',
      });
      prismaMock.assessmentSubmission.count.mockResolvedValue(0);
    });

    it('rejeita questão objetiva sem exatamente uma alternativa correta', async () => {
      await expect(
        service.addQuestion('assessment-1', {
          type: QuestionType.OBJETIVA,
          statement: 'Enunciado',
          points: 2,
          order: 1,
          options: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: true },
          ],
        }),
      ).rejects.toThrow(
        'Questões objetivas precisam de exatamente uma alternativa correta.',
      );
    });

    it('rejeita questão dissertativa com alternativas', async () => {
      await expect(
        service.addQuestion('assessment-1', {
          type: QuestionType.DISSERTATIVA,
          statement: 'Enunciado',
          points: 2,
          order: 1,
          options: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: false },
          ],
        }),
      ).rejects.toThrow('Questões dissertativas não possuem alternativas.');
    });

    it('bloqueia alterações quando a avaliação já possui envios', async () => {
      prismaMock.assessmentSubmission.count.mockResolvedValue(3);

      await expect(
        service.addQuestion('assessment-1', {
          type: QuestionType.DISSERTATIVA,
          statement: 'Enunciado',
          points: 2,
          order: 1,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getCourseAverageStatus', () => {
    const requiringCourse = {
      id: 'course-1',
      assessmentsEnabled: true,
      requireAverageForCertificate: true,
      minAverage: 7,
    };

    it('calcula a média quando todas as avaliações estão corrigidas', async () => {
      prismaMock.course.findUnique.mockResolvedValue(requiringCourse);
      prismaMock.assessment.findMany.mockResolvedValue([
        {
          id: 'a1',
          submissions: [{ status: SubmissionStatus.CORRIGIDA, grade: 8 }],
        },
        {
          id: 'a2',
          submissions: [{ status: SubmissionStatus.CORRIGIDA, grade: 6 }],
        },
      ]);

      await expect(
        service.getCourseAverageStatus('course-1', 'user-1'),
      ).resolves.toEqual({
        required: true,
        minAverage: 7,
        totalAssessments: 2,
        missing: 0,
        pending: 0,
        average: 7,
      });
    });

    it('aponta avaliações não realizadas e pendentes de correção', async () => {
      prismaMock.course.findUnique.mockResolvedValue(requiringCourse);
      prismaMock.assessment.findMany.mockResolvedValue([
        { id: 'a1', submissions: [] },
        {
          id: 'a2',
          submissions: [{ status: SubmissionStatus.PENDENTE, grade: null }],
        },
        {
          id: 'a3',
          submissions: [{ status: SubmissionStatus.CORRIGIDA, grade: 9 }],
        },
      ]);

      await expect(
        service.getCourseAverageStatus('course-1', 'user-1'),
      ).resolves.toMatchObject({ missing: 1, pending: 1, average: 9 });
    });

    it('não exige média quando as avaliações estão desabilitadas', async () => {
      prismaMock.course.findUnique.mockResolvedValue({
        ...requiringCourse,
        assessmentsEnabled: false,
      });
      prismaMock.assessment.findMany.mockResolvedValue([]);

      await expect(
        service.getCourseAverageStatus('course-1', 'user-1'),
      ).resolves.toMatchObject({ required: false });
    });
  });
});
