import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';

@Injectable()
export class ModulesService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    return course;
  }

  private async ensureModule(id: string) {
    const module = await this.prisma.module.findUnique({ where: { id } });
    if (!module) {
      throw new NotFoundException('Module not found');
    }
    return module;
  }

  async findOne(id: string) {
    return this.ensureModule(id);
  }

  async create(dto: CreateModuleDto) {
    await this.ensureCourse(dto.courseId);
    return this.prisma.module.create({
      data: {
        title: dto.title,
        order: dto.order,
        courseId: dto.courseId,
      },
    });
  }

  async findByCourse(courseId: string) {
    await this.ensureCourse(courseId);
    return this.prisma.module.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
    });
  }

  async update(id: string, dto: UpdateModuleDto) {
    await this.ensureModule(id);
    return this.prisma.module.update({
      where: { id },
      data: {
        title: dto.title,
        order: dto.order,
      },
    });
  }

  async remove(id: string) {
    await this.ensureModule(id);
    return this.prisma.module.delete({ where: { id } });
  }
}
