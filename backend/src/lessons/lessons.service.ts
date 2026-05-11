import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@Injectable()
export class LessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollments: EnrollmentsService,
  ) {}

  private async ensureModule(moduleId: string) {
    const module = await this.prisma.module.findUnique({ where: { id: moduleId } });
    if (!module) {
      throw new NotFoundException('Module not found');
    }
    return module;
  }

  private async ensureLesson(id: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }
    return lesson;
  }

  async create(dto: CreateLessonDto) {
    await this.ensureModule(dto.moduleId);
    return this.prisma.lesson.create({
      data: {
        title: dto.title,
        description: dto.description,
        videoUrl: dto.videoUrl,
        order: dto.order,
        moduleId: dto.moduleId,
      },
    });
  }

  async findByModule(moduleId: string, userId: string) {
    await this.ensureModule(moduleId);
    const lessons = await this.prisma.lesson.findMany({
      where: { moduleId },
      orderBy: { order: 'asc' },
      include: {
        progresses: {
          where: { userId },
          select: { watched: true },
        },
      },
    });

    return lessons.map((lesson) => {
      const watched = lesson.progresses[0]?.watched ?? false;
      const { progresses, ...rest } = lesson;
      return {
        ...rest,
        watched,
      };
    });
  }

  async findOne(id: string) {
    return this.ensureLesson(id);
  }

  async update(id: string, dto: UpdateLessonDto) {
    await this.ensureLesson(id);
    return this.prisma.lesson.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        videoUrl: dto.videoUrl,
        order: dto.order,
      },
    });
  }

  async remove(id: string) {
    await this.ensureLesson(id);
    return this.prisma.lesson.delete({ where: { id } });
  }

  async markAsWatched(id: string, userId: string, role: UserRole) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: { module: { select: { courseId: true } } },
    });
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    if (role === UserRole.ALUNO) {
      const enrolled = await this.enrollments.isEnrolled(
        userId,
        lesson.module.courseId,
      );
      if (!enrolled) {
        throw new ForbiddenException(
          'Você precisa se matricular no curso para registrar progresso.',
        );
      }
    }

    return this.prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId: id,
        },
      },
      create: {
        userId,
        lessonId: id,
        watched: true,
        watchedAt: new Date(),
      },
      update: {
        watched: true,
        watchedAt: new Date(),
      },
      select: {
        lessonId: true,
        watched: true,
        watchedAt: true,
      },
    });
  }
}
