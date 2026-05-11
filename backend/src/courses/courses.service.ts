import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

type ModuleProgress = {
  moduleId: string;
  totalLessons: number;
  watchedLessons: number;
  percent: number;
};

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCourseDto, userId: string) {
    return this.prisma.course.create({
      data: {
        title: dto.title,
        description: dto.description,
        createdBy: userId,
      },
    });
  }

  async findAll(userId: string) {
    const courses = await this.prisma.course.findMany({
      orderBy: { createdAt: 'desc' },
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

    return courses.map((course) => {
      const { modules, ...rest } = course;
      const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
      const watchedLessons = modules.reduce(
        (acc, m) => acc + m.lessons.filter((l) => l.progresses.length > 0).length,
        0,
      );
      const percent =
        totalLessons > 0 ? Math.round((watchedLessons / totalLessons) * 100) : 0;
      return {
        ...rest,
        progress: { totalLessons, watchedLessons, percent },
      };
    });
  }

  async findOne(id: string, userId?: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: userId
        ? {
            modules: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
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
          }
        : undefined,
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (!userId || !('modules' in course)) {
      return course;
    }

    const courseWithModules = course as typeof course & {
      modules: {
        id: string;
        lessons: { progresses: { id: string }[] }[];
      }[];
    };

    const moduleProgress: ModuleProgress[] = courseWithModules.modules.map((m) => {
      const totalLessons = m.lessons.length;
      const watchedLessons = m.lessons.filter((l) => l.progresses.length > 0).length;
      const percent =
        totalLessons > 0 ? Math.round((watchedLessons / totalLessons) * 100) : 0;
      return { moduleId: m.id, totalLessons, watchedLessons, percent };
    });

    const totalLessons = moduleProgress.reduce((a, b) => a + b.totalLessons, 0);
    const watchedLessons = moduleProgress.reduce((a, b) => a + b.watchedLessons, 0);
    const percent =
      totalLessons > 0 ? Math.round((watchedLessons / totalLessons) * 100) : 0;

    const { modules, ...rest } = courseWithModules;
    return {
      ...rest,
      progress: {
        totalLessons,
        watchedLessons,
        percent,
        modules: moduleProgress,
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
