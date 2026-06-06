import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  QuestionType,
  SubmissionStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import {
  CreateQuestionDto,
  QuestionOptionDto,
} from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import {
  SubmitAnswerDto,
  SubmitAssessmentDto,
} from './dto/submit-assessment.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';

type ViewerContext = { userId: string; role: UserRole };

@Injectable()
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollments: EnrollmentsService,
  ) {}

  // ---------------------------------------------------------------- CRUD

  async create(dto: CreateAssessmentDto) {
    await this.ensureCourse(dto.courseId);
    return this.prisma.assessment.create({
      data: {
        title: dto.title,
        description: dto.description,
        order: dto.order,
        courseId: dto.courseId,
      },
    });
  }

  async update(id: string, dto: UpdateAssessmentDto) {
    await this.ensureAssessment(id);
    return this.prisma.assessment.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        order: dto.order,
      },
    });
  }

  async remove(id: string) {
    await this.ensureAssessment(id);
    return this.prisma.assessment.delete({ where: { id } });
  }

  // ----------------------------------------------------------- questions

  async addQuestion(assessmentId: string, dto: CreateQuestionDto) {
    await this.ensureAssessment(assessmentId);
    await this.ensureNoSubmissions(assessmentId);
    this.validateQuestionPayload(dto.type, dto.options);

    return this.prisma.question.create({
      data: {
        assessmentId,
        type: dto.type,
        statement: dto.statement,
        points: dto.points,
        order: dto.order,
        options:
          dto.type === QuestionType.OBJETIVA && dto.options
            ? {
                create: dto.options.map((option, index) => ({
                  text: option.text,
                  isCorrect: option.isCorrect,
                  order: index + 1,
                })),
              }
            : undefined,
      },
      include: { options: { orderBy: { order: 'asc' } } },
    });
  }

  async updateQuestion(id: string, dto: UpdateQuestionDto) {
    const question = await this.ensureQuestion(id);
    await this.ensureNoSubmissions(question.assessmentId);

    if (dto.options !== undefined) {
      if (question.type !== QuestionType.OBJETIVA) {
        throw new BadRequestException(
          'Questões dissertativas não possuem alternativas.',
        );
      }
      this.validateQuestionPayload(question.type, dto.options);
    }

    return this.prisma.question.update({
      where: { id },
      data: {
        statement: dto.statement,
        points: dto.points,
        order: dto.order,
        options:
          dto.options !== undefined
            ? {
                deleteMany: {},
                create: dto.options.map((option, index) => ({
                  text: option.text,
                  isCorrect: option.isCorrect,
                  order: index + 1,
                })),
              }
            : undefined,
      },
      include: { options: { orderBy: { order: 'asc' } } },
    });
  }

  async removeQuestion(id: string) {
    const question = await this.ensureQuestion(id);
    await this.ensureNoSubmissions(question.assessmentId);
    return this.prisma.question.delete({ where: { id } });
  }

  // ------------------------------------------------------------ listagem

  async listForCourse(courseId: string, viewer: ViewerContext) {
    const course = await this.ensureCourse(courseId);

    if (viewer.role === UserRole.ALUNO) {
      const enrolled = await this.enrollments.isEnrolled(
        viewer.userId,
        courseId,
      );
      if (!enrolled) {
        throw new ForbiddenException(
          'Você precisa se matricular neste curso para acessá-lo.',
        );
      }

      const assessments = course.assessmentsEnabled
        ? await this.prisma.assessment.findMany({
            where: { courseId },
            orderBy: { order: 'asc' },
            include: {
              _count: { select: { questions: true } },
              submissions: {
                where: { userId: viewer.userId },
                select: {
                  id: true,
                  status: true,
                  grade: true,
                  submittedAt: true,
                },
              },
            },
          })
        : [];

      const grades = assessments
        .map((assessment) => assessment.submissions[0])
        .filter(
          (submission) =>
            submission &&
            submission.status === SubmissionStatus.CORRIGIDA &&
            submission.grade !== null,
        )
        .map((submission) => submission.grade ?? 0);

      // Avaliações com questões ainda sem nota final (não realizadas ou
      // aguardando correção) — mesma régua usada pelo gate do certificado.
      const pendingAssessments = assessments.filter((assessment) => {
        if (assessment._count.questions === 0) {
          return false;
        }
        const submission = assessment.submissions[0];
        return (
          !submission ||
          submission.status !== SubmissionStatus.CORRIGIDA ||
          submission.grade === null
        );
      }).length;

      const lessonsCompleted = await this.lessonsCompleted(
        viewer.userId,
        courseId,
      );

      return {
        assessmentsEnabled: course.assessmentsEnabled,
        requireAverageForCertificate: course.requireAverageForCertificate,
        minAverage: course.minAverage,
        lessonsCompleted,
        pendingAssessments,
        average:
          grades.length > 0
            ? this.roundGrade(
                grades.reduce((acc, grade) => acc + grade, 0) / grades.length,
              )
            : null,
        assessments: assessments.map((assessment) => ({
          id: assessment.id,
          title: assessment.title,
          description: assessment.description,
          order: assessment.order,
          questionCount: assessment._count.questions,
          submission: assessment.submissions[0] ?? null,
        })),
      };
    }

    const assessments = await this.prisma.assessment.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: { options: { orderBy: { order: 'asc' } } },
        },
        _count: { select: { submissions: true } },
      },
    });

    const pending = await this.prisma.assessmentSubmission.groupBy({
      by: ['assessmentId'],
      where: { assessment: { courseId }, status: SubmissionStatus.PENDENTE },
      _count: { _all: true },
    });
    const pendingByAssessment = new Map(
      pending.map((entry) => [entry.assessmentId, entry._count._all]),
    );

    return {
      assessmentsEnabled: course.assessmentsEnabled,
      requireAverageForCertificate: course.requireAverageForCertificate,
      minAverage: course.minAverage,
      assessments: assessments.map((assessment) => ({
        id: assessment.id,
        title: assessment.title,
        description: assessment.description,
        order: assessment.order,
        questions: assessment.questions,
        submissionCount: assessment._count.submissions,
        pendingCount: pendingByAssessment.get(assessment.id) ?? 0,
      })),
    };
  }

  async getOne(id: string, viewer: ViewerContext) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: {
        course: {
          select: { id: true, title: true, assessmentsEnabled: true },
        },
        questions: {
          orderBy: { order: 'asc' },
          include: { options: { orderBy: { order: 'asc' } } },
        },
      },
    });
    if (!assessment) {
      throw new NotFoundException('Avaliação não encontrada.');
    }

    const totalPoints = assessment.questions.reduce(
      (acc, question) => acc + question.points,
      0,
    );

    if (viewer.role !== UserRole.ALUNO) {
      return {
        mode: 'professor' as const,
        id: assessment.id,
        title: assessment.title,
        description: assessment.description,
        course: { id: assessment.course.id, title: assessment.course.title },
        totalPoints,
        questions: assessment.questions,
      };
    }

    if (!assessment.course.assessmentsEnabled) {
      throw new ForbiddenException(
        'As avaliações deste curso não estão habilitadas.',
      );
    }

    const enrolled = await this.enrollments.isEnrolled(
      viewer.userId,
      assessment.course.id,
    );
    if (!enrolled) {
      throw new ForbiddenException(
        'Você precisa se matricular neste curso para acessá-lo.',
      );
    }

    const submission = await this.prisma.assessmentSubmission.findUnique({
      where: {
        assessmentId_userId: { assessmentId: id, userId: viewer.userId },
      },
      include: {
        answers: {
          select: {
            id: true,
            questionId: true,
            selectedOptionId: true,
            text: true,
            earnedPoints: true,
          },
        },
      },
    });

    if (submission) {
      const answersByQuestion = new Map(
        submission.answers.map((answer) => [answer.questionId, answer]),
      );
      return {
        mode: 'resultado' as const,
        id: assessment.id,
        title: assessment.title,
        description: assessment.description,
        course: { id: assessment.course.id, title: assessment.course.title },
        totalPoints,
        submission: {
          id: submission.id,
          status: submission.status,
          grade: submission.grade,
          submittedAt: submission.submittedAt,
          gradedAt: submission.gradedAt,
        },
        questions: assessment.questions.map((question) => ({
          id: question.id,
          type: question.type,
          statement: question.statement,
          points: question.points,
          order: question.order,
          options: question.options,
          answer: answersByQuestion.get(question.id) ?? null,
        })),
      };
    }

    const lessonsCompleted = await this.lessonsCompleted(
      viewer.userId,
      assessment.course.id,
    );
    if (!lessonsCompleted) {
      throw new ForbiddenException(
        'Conclua todas as aulas do curso para liberar esta avaliação.',
      );
    }

    return {
      mode: 'realizar' as const,
      id: assessment.id,
      title: assessment.title,
      description: assessment.description,
      course: { id: assessment.course.id, title: assessment.course.title },
      totalPoints,
      questions: assessment.questions.map((question) => ({
        id: question.id,
        type: question.type,
        statement: question.statement,
        points: question.points,
        order: question.order,
        // O aluno não vê qual alternativa é a correta antes de enviar.
        options: question.options.map((option) => ({
          id: option.id,
          text: option.text,
          order: option.order,
        })),
      })),
    };
  }

  // ------------------------------------------------------------ submissão

  async submit(assessmentId: string, userId: string, dto: SubmitAssessmentDto) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        course: { select: { id: true, assessmentsEnabled: true } },
        questions: { include: { options: true } },
      },
    });
    if (!assessment) {
      throw new NotFoundException('Avaliação não encontrada.');
    }
    if (!assessment.course.assessmentsEnabled) {
      throw new ForbiddenException(
        'As avaliações deste curso não estão habilitadas.',
      );
    }
    if (assessment.questions.length === 0) {
      throw new ForbiddenException('Esta avaliação ainda não possui questões.');
    }

    const enrolled = await this.enrollments.isEnrolled(
      userId,
      assessment.course.id,
    );
    if (!enrolled) {
      throw new ForbiddenException(
        'Você precisa se matricular neste curso para realizar a avaliação.',
      );
    }

    const lessonsCompleted = await this.lessonsCompleted(
      userId,
      assessment.course.id,
    );
    if (!lessonsCompleted) {
      throw new ForbiddenException(
        'Conclua todas as aulas do curso para liberar esta avaliação.',
      );
    }

    const existing = await this.prisma.assessmentSubmission.findUnique({
      where: { assessmentId_userId: { assessmentId, userId } },
    });
    if (existing) {
      throw new ConflictException(
        'Você já enviou esta avaliação. Peça ao professor para liberar uma nova tentativa.',
      );
    }

    const answersByQuestion = new Map<string, SubmitAnswerDto>();
    for (const answer of dto.answers) {
      if (answersByQuestion.has(answer.questionId)) {
        throw new BadRequestException(
          'Há mais de uma resposta para a mesma questão.',
        );
      }
      answersByQuestion.set(answer.questionId, answer);
    }

    const questionIds = new Set(
      assessment.questions.map((question) => question.id),
    );
    for (const questionId of answersByQuestion.keys()) {
      if (!questionIds.has(questionId)) {
        throw new BadRequestException(
          'Há respostas para questões que não pertencem a esta avaliação.',
        );
      }
    }

    let hasPendingCorrection = false;
    let earnedTotal = 0;
    const answersData = assessment.questions.map((question) => {
      const answer = answersByQuestion.get(question.id);
      if (!answer) {
        throw new BadRequestException(
          'Responda todas as questões antes de enviar.',
        );
      }

      if (question.type === QuestionType.OBJETIVA) {
        const option = question.options.find(
          (candidate) => candidate.id === answer.selectedOptionId,
        );
        if (!option) {
          throw new BadRequestException(
            'Selecione uma alternativa válida em todas as questões objetivas.',
          );
        }
        // Correção automática: vale os pontos da questão se acertou.
        const earnedPoints = option.isCorrect ? question.points : 0;
        earnedTotal += earnedPoints;
        return {
          questionId: question.id,
          selectedOptionId: option.id,
          earnedPoints,
        };
      }

      if (!answer.text?.trim()) {
        throw new BadRequestException(
          'Responda todas as questões dissertativas antes de enviar.',
        );
      }
      // Dissertativa: aguarda correção manual do professor.
      hasPendingCorrection = true;
      return { questionId: question.id, text: answer.text.trim() };
    });

    const totalPoints = assessment.questions.reduce(
      (acc, question) => acc + question.points,
      0,
    );
    const fullyGraded = !hasPendingCorrection;

    try {
      return await this.prisma.assessmentSubmission.create({
        data: {
          assessmentId,
          userId,
          status: fullyGraded
            ? SubmissionStatus.CORRIGIDA
            : SubmissionStatus.PENDENTE,
          grade:
            fullyGraded && totalPoints > 0
              ? this.roundGrade((earnedTotal / totalPoints) * 10)
              : null,
          gradedAt: fullyGraded ? new Date() : null,
          answers: { create: answersData },
        },
        select: { id: true, status: true, grade: true, submittedAt: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Você já enviou esta avaliação. Peça ao professor para liberar uma nova tentativa.',
        );
      }
      throw error;
    }
  }

  // ------------------------------------------------------------- correção

  async listSubmissions(assessmentId: string) {
    await this.ensureAssessment(assessmentId);
    const submissions = await this.prisma.assessmentSubmission.findMany({
      where: { assessmentId },
      orderBy: { submittedAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        answers: { select: { earnedPoints: true } },
      },
    });

    return submissions.map((submission) => ({
      id: submission.id,
      status: submission.status,
      grade: submission.grade,
      submittedAt: submission.submittedAt,
      gradedAt: submission.gradedAt,
      user: submission.user,
      pendingAnswers: submission.answers.filter(
        (answer) => answer.earnedPoints === null,
      ).length,
    }));
  }

  async getSubmission(id: string, viewer: ViewerContext) {
    const submission = await this.prisma.assessmentSubmission.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        assessment: {
          select: {
            id: true,
            title: true,
            courseId: true,
            course: { select: { title: true } },
          },
        },
        answers: {
          include: {
            question: {
              include: { options: { orderBy: { order: 'asc' } } },
            },
            selectedOption: {
              select: { id: true, text: true, isCorrect: true },
            },
          },
        },
      },
    });
    if (!submission) {
      throw new NotFoundException('Envio não encontrado.');
    }

    if (viewer.role === UserRole.ALUNO && submission.userId !== viewer.userId) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar este envio.',
      );
    }

    return {
      ...submission,
      answers: [...submission.answers].sort(
        (a, b) => a.question.order - b.question.order,
      ),
    };
  }

  async grade(
    submissionId: string,
    dto: GradeSubmissionDto,
    viewer: ViewerContext,
  ) {
    const submission = await this.prisma.assessmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        answers: { include: { question: { select: { points: true } } } },
      },
    });
    if (!submission) {
      throw new NotFoundException('Envio não encontrado.');
    }

    const answersById = new Map(
      submission.answers.map((answer) => [answer.id, answer]),
    );
    for (const gradeAnswer of dto.answers) {
      const answer = answersById.get(gradeAnswer.answerId);
      if (!answer) {
        throw new BadRequestException(
          'Há notas para respostas que não pertencem a este envio.',
        );
      }
      if (gradeAnswer.earnedPoints > answer.question.points) {
        throw new BadRequestException(
          `A pontuação de uma resposta não pode exceder o valor da questão (${answer.question.points}).`,
        );
      }
    }

    const gradedPoints = new Map(
      dto.answers.map((answer) => [answer.answerId, answer.earnedPoints]),
    );
    const updatedAnswers = submission.answers.map((answer) => ({
      ...answer,
      earnedPoints: gradedPoints.has(answer.id)
        ? (gradedPoints.get(answer.id) ?? null)
        : answer.earnedPoints,
    }));

    const allGraded = updatedAnswers.every(
      (answer) => answer.earnedPoints !== null,
    );
    const totalPoints = updatedAnswers.reduce(
      (acc, answer) => acc + answer.question.points,
      0,
    );
    const earnedTotal = updatedAnswers.reduce(
      (acc, answer) => acc + (answer.earnedPoints ?? 0),
      0,
    );

    await this.prisma.$transaction([
      ...dto.answers.map((answer) =>
        this.prisma.answer.update({
          where: { id: answer.answerId },
          data: { earnedPoints: answer.earnedPoints },
        }),
      ),
      this.prisma.assessmentSubmission.update({
        where: { id: submissionId },
        data: {
          status: allGraded
            ? SubmissionStatus.CORRIGIDA
            : SubmissionStatus.PENDENTE,
          grade:
            allGraded && totalPoints > 0
              ? this.roundGrade((earnedTotal / totalPoints) * 10)
              : null,
          gradedAt: allGraded ? new Date() : null,
        },
      }),
    ]);

    return this.getSubmission(submissionId, viewer);
  }

  async releaseRetry(submissionId: string) {
    const submission = await this.prisma.assessmentSubmission.findUnique({
      where: { id: submissionId },
    });
    if (!submission) {
      throw new NotFoundException('Envio não encontrado.');
    }
    await this.prisma.assessmentSubmission.delete({
      where: { id: submissionId },
    });
    return { released: true };
  }

  // ------------------------------------------------- gate do certificado

  /**
   * Situação das avaliações do curso para emissão do certificado.
   * Apenas avaliações com questões contam para a média.
   */
  async getCourseAverageStatus(
    courseId: string,
    userId: string,
    preloadedCourse?: {
      assessmentsEnabled: boolean;
      requireAverageForCertificate: boolean;
      minAverage: number;
    },
  ) {
    const course = preloadedCourse ?? (await this.ensureCourse(courseId));
    const required =
      course.assessmentsEnabled && course.requireAverageForCertificate;

    const assessments = await this.prisma.assessment.findMany({
      where: { courseId, questions: { some: {} } },
      select: {
        id: true,
        submissions: {
          where: { userId },
          select: { status: true, grade: true },
        },
      },
    });

    let missing = 0;
    let pending = 0;
    const grades: number[] = [];
    for (const assessment of assessments) {
      const submission = assessment.submissions[0];
      if (!submission) {
        missing += 1;
        continue;
      }
      if (
        submission.status !== SubmissionStatus.CORRIGIDA ||
        submission.grade === null
      ) {
        pending += 1;
        continue;
      }
      grades.push(submission.grade);
    }

    return {
      required,
      minAverage: course.minAverage,
      totalAssessments: assessments.length,
      missing,
      pending,
      average:
        grades.length > 0
          ? this.roundGrade(
              grades.reduce((acc, grade) => acc + grade, 0) / grades.length,
            )
          : null,
    };
  }

  // -------------------------------------------------------------- helpers

  private roundGrade(value: number) {
    return Math.round(value * 10) / 10;
  }

  private validateQuestionPayload(
    type: QuestionType,
    options?: QuestionOptionDto[],
  ) {
    if (type === QuestionType.OBJETIVA) {
      if (!options || options.length < 2) {
        throw new BadRequestException(
          'Questões objetivas precisam de pelo menos duas alternativas.',
        );
      }
      const correctCount = options.filter((option) => option.isCorrect).length;
      if (correctCount !== 1) {
        throw new BadRequestException(
          'Questões objetivas precisam de exatamente uma alternativa correta.',
        );
      }
      return;
    }

    if (options && options.length > 0) {
      throw new BadRequestException(
        'Questões dissertativas não possuem alternativas.',
      );
    }
  }

  private async ensureCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException('Curso não encontrado.');
    }
    return course;
  }

  private async ensureAssessment(id: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
    });
    if (!assessment) {
      throw new NotFoundException('Avaliação não encontrada.');
    }
    return assessment;
  }

  private async ensureQuestion(id: string) {
    const question = await this.prisma.question.findUnique({ where: { id } });
    if (!question) {
      throw new NotFoundException('Questão não encontrada.');
    }
    return question;
  }

  private async ensureNoSubmissions(assessmentId: string) {
    const count = await this.prisma.assessmentSubmission.count({
      where: { assessmentId },
    });
    if (count > 0) {
      throw new ConflictException(
        'Esta avaliação já possui envios de alunos. Libere ou exclua os envios antes de alterar as questões.',
      );
    }
  }

  private async lessonsCompleted(userId: string, courseId: string) {
    const totalLessons = await this.prisma.lesson.count({
      where: { module: { courseId } },
    });
    if (totalLessons === 0) {
      return false;
    }
    const watchedLessons = await this.prisma.lessonProgress.count({
      where: { userId, watched: true, lesson: { module: { courseId } } },
    });
    return watchedLessons >= totalLessons;
  }
}
