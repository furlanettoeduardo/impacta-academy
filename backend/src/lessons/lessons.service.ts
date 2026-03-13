import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

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
        order: dto.order,
        moduleId: dto.moduleId,
      },
    });
  }

  async findByModule(moduleId: string) {
    await this.ensureModule(moduleId);
    return this.prisma.lesson.findMany({
      where: { moduleId },
      orderBy: { order: 'asc' },
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
        order: dto.order,
      },
    });
  }

  async remove(id: string) {
    await this.ensureLesson(id);
    return this.prisma.lesson.delete({ where: { id } });
  }
}
