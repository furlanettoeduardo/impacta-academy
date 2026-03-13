import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { ModulesService } from './modules.service';

@Controller()
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PROFESSOR)
  @Post('modules')
  create(@Body() body: CreateModuleDto) {
    return this.modulesService.create(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('courses/:courseId/modules')
  findByCourse(@Param('courseId') courseId: string) {
    return this.modulesService.findByCourse(courseId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('modules/:id')
  findOne(@Param('id') id: string) {
    return this.modulesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PROFESSOR)
  @Patch('modules/:id')
  update(@Param('id') id: string, @Body() body: UpdateModuleDto) {
    return this.modulesService.update(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PROFESSOR)
  @Delete('modules/:id')
  remove(@Param('id') id: string) {
    return this.modulesService.remove(id);
  }
}
