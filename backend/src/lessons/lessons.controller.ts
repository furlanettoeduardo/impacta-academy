import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { LessonsService } from './lessons.service';

type AuthRequest = Request & { user: { userId: string; role: UserRole } };

@Controller()
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PROFESSOR)
  @Post('lessons')
  create(@Body() body: CreateLessonDto) {
    return this.lessonsService.create(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('modules/:moduleId/lessons')
  findByModule(@Param('moduleId') moduleId: string, @Req() req: AuthRequest) {
    return this.lessonsService.findByModule(moduleId, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('lessons/:id')
  findOne(@Param('id') id: string) {
    return this.lessonsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PROFESSOR)
  @Patch('lessons/:id')
  update(@Param('id') id: string, @Body() body: UpdateLessonDto) {
    return this.lessonsService.update(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PROFESSOR)
  @Delete('lessons/:id')
  remove(@Param('id') id: string) {
    return this.lessonsService.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('lessons/:id/watch')
  markAsWatched(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.lessonsService.markAsWatched(id, req.user.userId, req.user.role);
  }
}
