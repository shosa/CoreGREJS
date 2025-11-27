import { Module } from '@nestjs/common';
import { RiparazioniService } from './riparazioni.service';
import { RiparazioniController } from './riparazioni.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RiparazioniController],
  providers: [RiparazioniService],
  exports: [RiparazioniService],
})
export class RiparazioniModule {}
