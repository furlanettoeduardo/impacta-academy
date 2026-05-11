import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    return course;
  }

  async enroll(userId: string, courseId: string) {
    await this.ensureCourse(courseId);
    return this.prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: { userId, courseId },
      update: {},
      select: { id: true, userId: true, courseId: true, enrolledAt: true },
    });
  }

  async unenroll(userId: string, courseId: string) {
    await this.prisma.enrollment.deleteMany({ where: { userId, courseId } });
    return { unenrolled: true };
  }

  async listMine(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      orderBy: { enrolledAt: 'desc' },
      include: { course: true },
    });
    return enrollments.map((e) => ({
      enrollmentId: e.id,
      enrolledAt: e.enrolledAt,
      course: e.course,
    }));
  }

  async listStudents(courseId: string) {
    await this.ensureCourse(courseId);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseId },
      orderBy: { enrolledAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, isActive: true },
        },
      },
    });
    return enrollments.map((e) => ({
      enrollmentId: e.id,
      enrolledAt: e.enrolledAt,
      user: e.user,
    }));
  }

  async isEnrolled(userId: string, courseId: string): Promise<boolean> {
    const e = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { id: true },
    });
    return !!e;
  }
}
