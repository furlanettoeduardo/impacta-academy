import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import type { Response } from 'express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CertificatesService } from './certificates.service';

type AuthRequest = Request & { user: { userId: string; role: UserRole } };

@Controller()
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @UseGuards(JwtAuthGuard)
  @Post('courses/:courseId/certificate')
  issue(@Param('courseId') courseId: string, @Req() req: AuthRequest) {
    return this.certificatesService.issue(courseId, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/certificates')
  listMine(@Req() req: AuthRequest) {
    return this.certificatesService.listMine(req.user.userId);
  }

  @Get('certificates/validate/:code')
  validate(@Param('code') code: string) {
    return this.certificatesService.validate(code);
  }

  @UseGuards(JwtAuthGuard)
  @Get('certificates/:id/pdf')
  async downloadPdf(
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { buffer, fileName } = await this.certificatesService.getPdf(
      id,
      req.user,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });

    return new StreamableFile(buffer);
  }
}
