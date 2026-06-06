import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { UploadModule } from '../upload/upload.module';
import { AssessmentsModule } from '../assessments/assessments.module';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { CertificatePdfService } from './certificate-pdf.service';

@Module({
  imports: [PrismaModule, EnrollmentsModule, UploadModule, AssessmentsModule],
  controllers: [CertificatesController],
  providers: [CertificatesService, CertificatePdfService],
})
export class CertificatesModule {}
