import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { EnrollmentsService } from './enrollments.service';

type AuthRequest = Request & { user: { userId: string; role: UserRole } };

@Controller()
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('courses/:courseId/enroll')
  enroll(@Param('courseId') courseId: string, @Req() req: AuthRequest) {
    return this.enrollmentsService.enroll(req.user.userId, courseId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('courses/:courseId/enroll')
  unenroll(@Param('courseId') courseId: string, @Req() req: AuthRequest) {
    return this.enrollmentsService.unenroll(req.user.userId, courseId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/enrollments')
  listMine(@Req() req: AuthRequest) {
    return this.enrollmentsService.listMine(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PROFESSOR)
  @Get('courses/:courseId/students')
  listStudents(@Param('courseId') courseId: string) {
    return this.enrollmentsService.listStudents(courseId);
  }
}
