import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AssessmentsService } from './assessments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { SubmitAssessmentDto } from './dto/submit-assessment.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';

type AuthRequest = Request & { user: { userId: string; role: UserRole } };

@Controller()
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PROFESSOR)
  @Post('assessments')
  create(@Body() body: CreateAssessmentDto) {
    return this.assessmentsService.create(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('courses/:courseId/assessments')
  listForCourse(@Param('courseId') courseId: string, @Req() req: AuthRequest) {
    return this.assessmentsService.listForCourse(courseId, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('assessments/:id')
  getOne(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.assessmentsService.getOne(id, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PROFESSOR)
  @Patch('assessments/:id')
  update(@Param('id') id: string, @Body() body: UpdateAssessmentDto) {
    return this.assessmentsService.update(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PROFESSOR)
  @Delete('assessments/:id')
  remove(@Param('id') id: string) {
    return this.assessmentsService.remove(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PROFESSOR)
  @Post('assessments/:id/questions')
  addQuestion(@Param('id') id: string, @Body() body: CreateQuestionDto) {
    return this.assessmentsService.addQuestion(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PROFESSOR)
  @Patch('questions/:id')
  updateQuestion(@Param('id') id: string, @Body() body: UpdateQuestionDto) {
    return this.assessmentsService.updateQuestion(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PROFESSOR)
  @Delete('questions/:id')
  removeQuestion(@Param('id') id: string) {
    return this.assessmentsService.removeQuestion(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ALUNO)
  @Post('assessments/:id/submit')
  submit(
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Body() body: SubmitAssessmentDto,
  ) {
    return this.assessmentsService.submit(id, req.user.userId, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PROFESSOR)
  @Get('assessments/:id/submissions')
  listSubmissions(@Param('id') id: string) {
    return this.assessmentsService.listSubmissions(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('submissions/:id')
  getSubmission(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.assessmentsService.getSubmission(id, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PROFESSOR)
  @Patch('submissions/:id/grade')
  grade(
    @Param('id') id: string,
    @Body() body: GradeSubmissionDto,
    @Req() req: AuthRequest,
  ) {
    return this.assessmentsService.grade(id, body, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PROFESSOR)
  @Delete('submissions/:id')
  releaseRetry(@Param('id') id: string) {
    return this.assessmentsService.releaseRetry(id);
  }
}
