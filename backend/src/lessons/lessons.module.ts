import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesGuard } from '../auth/roles.guard';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { EnrollmentsModule } from '../enrollments/enrollments.module';

@Module({
  imports: [PrismaModule, EnrollmentsModule],
  controllers: [LessonsController],
  providers: [LessonsService, RolesGuard],
})
export class LessonsModule {}
