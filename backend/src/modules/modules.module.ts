import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesGuard } from '../auth/roles.guard';
import { ModulesController } from './modules.controller';
import { ModulesService } from './modules.service';

@Module({
  imports: [PrismaModule],
  controllers: [ModulesController],
  providers: [ModulesService, RolesGuard],
})
export class ModulesModule {}
