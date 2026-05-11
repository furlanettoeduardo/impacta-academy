import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesGuard } from '../auth/roles.guard';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { EnrollmentsModule } from '../enrollments/enrollments.module';

@Module({
  imports: [PrismaModule, EnrollmentsModule],
  controllers: [CoursesController],
  providers: [CoursesService, RolesGuard],
})
export class CoursesModule {}
