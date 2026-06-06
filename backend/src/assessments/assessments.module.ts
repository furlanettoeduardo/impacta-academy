import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { RolesGuard } from '../auth/roles.guard';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';

@Module({
  imports: [PrismaModule, EnrollmentsModule],
  controllers: [AssessmentsController],
  providers: [AssessmentsService, RolesGuard],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}
