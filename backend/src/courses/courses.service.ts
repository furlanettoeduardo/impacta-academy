import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

type ViewerContext = { userId: string; role: UserRole };

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollments: EnrollmentsService,
  ) {}

  async create(dto: CreateCourseDto, userId: string) {
    return this.prisma.course.create({
      data: {
        title: dto.title,
        description: dto.description,
        createdBy: userId,
      },
    });
  }

  async findAll(viewer: ViewerContext) {
    const courses = await this.prisma.course.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        modules: {
          select: {
            lessons: {
              select: {
                progresses: {
                  where: { userId: viewer.userId, watched: true },
                  select: { id: true },
                },
              },
            },
          },
        },
        enrollments: {
          where: { userId: viewer.userId },
          select: { id: true },
        },
      },
    });

    return courses.map((course) => {
      const { modules, enrollments, ...rest } = course;
      const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
      const watchedLessons = modules.reduce(
        (acc, m) => acc + m.lessons.filter((l) => l.progresses.length > 0).length,
        0,
      );
      const percent =
        totalLessons > 0 ? Math.round((watchedLessons / totalLessons) * 100) : 0;
      return {
        ...rest,
        enrolled: enrollments.length > 0,
        progress: { totalLessons, watchedLessons, percent },
      };
    });
  }

  async findOne(id: string, viewer?: ViewerContext) {
    if (!viewer) {
      const course = await this.prisma.course.findUnique({ where: { id } });
      if (!course) {
        throw new NotFoundException('Course not found');
      }
      return course;
    }

    if (viewer.role === UserRole.ALUNO) {
      const enrolled = await this.enrollments.isEnrolled(viewer.userId, id);
      if (!enrolled) {
        const exists = await this.prisma.course.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!exists) {
          throw new NotFoundException('Course not found');
        }
        throw new ForbiddenException('Você precisa se matricular neste curso para acessá-lo.');
      }
    }

    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: {
                progresses: {
                  where: { userId: viewer.userId },
                  select: { watched: true },
                },
              },
            },
          },
        },
        enrollments: {
          where: { userId: viewer.userId },
          select: { id: true },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const modulesWithProgress = course.modules.map((m) => {
      const lessons = m.lessons.map((l) => {
        const { progresses, ...rest } = l;
        return {
          ...rest,
          watched: progresses[0]?.watched ?? false,
        };
      });

      const totalLessons = lessons.length;
      const watchedLessons = lessons.filter((l) => l.watched).length;
      const percent =
        totalLessons > 0 ? Math.round((watchedLessons / totalLessons) * 100) : 0;

      return {
        id: m.id,
        title: m.title,
        order: m.order,
        courseId: m.courseId,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        lessons,
        progress: { totalLessons, watchedLessons, percent },
      };
    });

    const totalLessons = modulesWithProgress.reduce(
      (a, b) => a + b.progress.totalLessons,
      0,
    );
    const watchedLessons = modulesWithProgress.reduce(
      (a, b) => a + b.progress.watchedLessons,
      0,
    );
    const percent =
      totalLessons > 0 ? Math.round((watchedLessons / totalLessons) * 100) : 0;

    const { modules: _modules, enrollments, ...rest } = course;

    return {
      ...rest,
      enrolled: enrollments.length > 0,
      modules: modulesWithProgress,
      progress: {
        totalLessons,
        watchedLessons,
        percent,
        modules: modulesWithProgress.map((m) => ({
          moduleId: m.id,
          totalLessons: m.progress.totalLessons,
          watchedLessons: m.progress.watchedLessons,
          percent: m.progress.percent,
        })),
      },
    };
  }

  async update(id: string, dto: UpdateCourseDto) {
    await this.findOne(id);
    return this.prisma.course.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.course.delete({ where: { id } });
  }
}
