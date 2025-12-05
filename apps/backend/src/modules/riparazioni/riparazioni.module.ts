import { Module } from '@nestjs/common';
import { RiparazioniService } from './riparazioni.service';
import { RiparazioniController } from './riparazioni.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Module({
  imports: [PrismaModule],
  controllers: [RiparazioniController],
  providers: [RiparazioniService, PermissionsGuard],
  exports: [RiparazioniService],
})
export class RiparazioniModule {}
