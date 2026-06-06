import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CoursesModule } from './courses/courses.module';
import { ModulesModule } from './modules/modules.module';
import { LessonsModule } from './lessons/lessons.module';
import { UploadModule } from './upload/upload.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { CertificatesModule } from './certificates/certificates.module';
import { AssessmentsModule } from './assessments/assessments.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    CoursesModule,
    ModulesModule,
    LessonsModule,
    UploadModule,
    EnrollmentsModule,
    CertificatesModule,
    AssessmentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
