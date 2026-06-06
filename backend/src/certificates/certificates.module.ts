import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { UploadModule } from '../upload/upload.module';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { CertificatePdfService } from './certificate-pdf.service';

@Module({
  imports: [PrismaModule, EnrollmentsModule, UploadModule],
  controllers: [CertificatesController],
  providers: [CertificatesService, CertificatePdfService],
})
export class CertificatesModule {}
